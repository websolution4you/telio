import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { SignJWT } from "jose";

import { fileURLToPath } from "node:url";

import {
    UNVERIFIED_HASH_PREFIX,
    MIN_PASSWORD_VERSION,
    MAX_STORED_PASSWORD_VERSION,
    MAX_INCREMENTABLE_PASSWORD_VERSION,
    SCRYPT_V1_CANONICAL_LENGTH,
    ACTIVE_SCRYPT_V1_PROFILE,
    CryptoInternalError,
    isUserHashUnverified,
    stripUnverifiedPrefix,
    markHashUnverified,
    parseInnerCredential,
    validateNewPasswordBounds,
    parseStoredOrTokenPasswordVersion,
    computeNextPasswordVersion,
    hashPassword,
    verifyPasswordDetailed,
    verifyPassword,
} from "../lib/auth/passwordHash";

import {
    getJwtSecretKey,
    createSession,
    verifySession,
    createPasswordResetToken,
    verifyPasswordResetToken,
    createEmailVerificationToken,
    verifyEmailVerificationToken,
} from "../lib/auth/bookingAuth";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SYNTHETIC_JWT_SECRET = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

function withJwtSecret<T>(secret: string | undefined, fn: () => Promise<T> | T): Promise<T> {
    const prev = process.env.JWT_SECRET;
    if (secret === undefined) {
        delete process.env.JWT_SECRET;
    } else {
        process.env.JWT_SECRET = secret;
    }
    return Promise.resolve()
        .then(fn)
        .finally(() => {
            if (prev === undefined) {
                delete process.env.JWT_SECRET;
            } else {
                process.env.JWT_SECRET = prev;
            }
        });
}

function createLegacySha256Hex(password: string, uppercase = false): string {
    const hex = crypto.createHash("sha256").update(Buffer.from(password, "utf8")).digest("hex");
    return uppercase ? hex.toUpperCase() : hex.toLowerCase();
}

// ============================================================================
// 1. UNIT TESTY: scrypt-v1 generovanie, overovanie a formát (129 / 140 znakov)
// ============================================================================

test("1. hashPassword vytvára odlišné salty pre rovnaké heslo a presný 129-znakový formát", async () => {
    const h1 = await hashPassword("SyntheticPass123!");
    const h2 = await hashPassword("SyntheticPass123!");

    assert.notEqual(h1, h2, "Dva hashe rovnakého hesla musia mať odlišný náhodný salt");
    assert.equal(h1.length, SCRYPT_V1_CANONICAL_LENGTH);
    assert.equal(ACTIVE_SCRYPT_V1_PROFILE.maxmem, 36 * 1024 * 1024);
    assert.equal(h1.length, 129);
    assert.equal(h2.length, 129);
    assert.match(
        h1,
        /^scrypt-v1\$ln=15\$r=8\$p=3\$salt=[0-9a-f]{32}\$dk=[0-9a-f]{64}$/
    );

    const unverified = markHashUnverified(h1);
    assert.equal(unverified.length, 140);
    assert.equal(unverified.startsWith("UNVERIFIED:scrypt-v1$"), true);
});

test("2-3. scrypt-v1 verify správneho a nesprávneho hesla", async () => {
    const hash = await hashPassword("CorrectHorseBatteryStaple9");

    const okDetail = await verifyPasswordDetailed("CorrectHorseBatteryStaple9", hash);
    assert.deepEqual(okDetail, { matched: true, scheme: "scrypt-v1" });
    assert.equal(await verifyPassword("CorrectHorseBatteryStaple9", hash), true);

    const badDetail = await verifyPasswordDetailed("WrongHorseBatteryStaple9", hash);
    assert.deepEqual(badDetail, { matched: false, reason: "mismatch" });
    assert.equal(await verifyPassword("WrongHorseBatteryStaple9", hash), false);
});

// ============================================================================
// 2. UNIT TESTY: Legacy SHA-256 kompatibilita (lowercase, uppercase, mixed-case, krátke heslá)
// ============================================================================

test("4-7. legacy SHA-256 lowercase, uppercase, mixed-case a krátke heslo '0000'", async () => {
    const pass = "TesterLegacyPass42";
    const lowerHash = createLegacySha256Hex(pass, false);
    const upperHash = createLegacySha256Hex(pass, true);
    const mixedHash = lowerHash.slice(0, 32).toUpperCase() + lowerHash.slice(32).toLowerCase();

    assert.deepEqual(await verifyPasswordDetailed(pass, lowerHash), {
        matched: true,
        scheme: "legacy-sha256",
    });
    assert.deepEqual(await verifyPasswordDetailed(pass, upperHash), {
        matched: true,
        scheme: "legacy-sha256",
    });
    assert.deepEqual(await verifyPasswordDetailed(pass, mixedHash), {
        matched: true,
        scheme: "legacy-sha256",
    });
    assert.deepEqual(await verifyPasswordDetailed("WrongPass", lowerHash), {
        matched: false,
        reason: "mismatch",
    });

    // Existujúce krátke admin default heslo "0000" musí zostať overiteľné
    const shortLegacy = createLegacySha256Hex("0000", false);
    assert.equal(await verifyPassword("0000", shortLegacy), true);
    assert.equal(await verifyPassword("0001", shortLegacy), false);
});

// ============================================================================
// 3. UNIT TESTY: Prísny parser a whitelist scrypt-v1 profilov (pred volaním crypto.scrypt)
// ============================================================================

test("8-12. odmietnutie poškodených credentialov, neznámych profilov, extra segmentov a zlého hexu bez volania crypto.scrypt", async () => {
    let scryptCalled = false;
    const origScrypt = crypto.scrypt;
    const cryptoMutable = crypto as unknown as { scrypt: (...args: unknown[]) => unknown };
    cryptoMutable.scrypt = (...args: unknown[]) => {
        scryptCalled = true;
        return (origScrypt as unknown as (...a: unknown[]) => unknown).apply(crypto, args);
    };

    try {
        const validSalt = "a".repeat(32);
        const validDk = "b".repeat(64);

        const invalidInputs = [
            "",
            "not-a-valid-hash",
            "deleted_550e8400-e29b-41d4-a716-446655440000",
            // Neznámy profil (ln=17, ln=14, p=1, r=16)
            `scrypt-v1$ln=17$r=8$p=1$salt=${validSalt}$dk=${validDk}`,
            `scrypt-v1$ln=15$r=8$p=1$salt=${validSalt}$dk=${validDk}`,
            `scrypt-v1$ln=16$r=8$p=2$salt=${validSalt}$dk=${validDk}`,
            // Zlé poradie polí
            `scrypt-v1$r=8$ln=15$p=3$salt=${validSalt}$dk=${validDk}`,
            // Extra alebo chýbajúce segmenty
            `scrypt-v1$ln=15$r=8$p=3$salt=${validSalt}$dk=${validDk}$extra=1`,
            `scrypt-v1$ln=15$r=8$salt=${validSalt}$dk=${validDk}`,
            // Uppercase hex v scrypt-v1 (povoľujeme iba lowercase)
            `scrypt-v1$ln=15$r=8$p=3$salt=${"A".repeat(32)}$dk=${validDk}`,
            `scrypt-v1$ln=15$r=8$p=3$salt=${validSalt}$dk=${"B".repeat(64)}`,
            // Neplatný hex znak 'g'
            `scrypt-v1$ln=15$r=8$p=3$salt=${"g".repeat(32)}$dk=${validDk}`,
            // Zlá dĺžka saltu alebo dk
            `scrypt-v1$ln=15$r=8$p=3$salt=${"a".repeat(30)}$dk=${validDk}`,
            `scrypt-v1$ln=15$r=8$p=3$salt=${validSalt}$dk=${"b".repeat(62)}`,
            // Legacy SHA-256 s neplatnou dĺžkou alebo znakom
            "a".repeat(63),
            "a".repeat(65),
            "g".repeat(64),
        ];

        for (const bad of invalidInputs) {
            assert.deepEqual(parseInnerCredential(bad), { kind: "invalid" }, `Malo odmietnuť: ${bad}`);
            const res = await verifyPasswordDetailed("AnyPassword123", bad);
            assert.deepEqual(res, { matched: false, reason: "invalid-stored-credential" });
        }

        assert.equal(scryptCalled, false, "crypto.scrypt sa vôbec nesmie zavolať pre neplatné alebo ne-whitelistované vstupy");
    } finally {
        cryptoMutable.scrypt = origScrypt as unknown as (...args: unknown[]) => unknown;
    }
});

// ============================================================================
// 4. UNIT TESTY: UNVERIFIED: obálka a dvojité zabalenie
// ============================================================================

test("13-15. UNVERIFIED: obálka pre legacy aj scrypt-v1 a odmietnutie UNVERIFIED:UNVERIFIED: a priameho verifyPassword", async () => {
    const scryptHash = await hashPassword("UnverifiedUserPass1");
    const wrappedScrypt = markHashUnverified(scryptHash);

    assert.equal(isUserHashUnverified(wrappedScrypt), true);
    assert.equal(isUserHashUnverified(scryptHash), false);

    // verifyPassword priamo nad UNVERIFIED:... musí zlyhať fail-closed bez volania KDF
    assert.deepEqual(await verifyPasswordDetailed("UnverifiedUserPass1", wrappedScrypt), {
        matched: false,
        reason: "invalid-stored-credential",
    });
    assert.equal(await verifyPassword("UnverifiedUserPass1", wrappedScrypt), false);

    // Po jednom stripUnverifiedPrefix musí overenie prejsť
    const strippedScrypt = stripUnverifiedPrefix(wrappedScrypt);
    assert.equal(strippedScrypt, scryptHash);
    assert.equal(await verifyPassword("UnverifiedUserPass1", strippedScrypt), true);

    // Legacy SHA-256 v UNVERIFIED: obálke
    const legacyHash = createLegacySha256Hex("UnverifiedLegacy1");
    const wrappedLegacy = `${UNVERIFIED_HASH_PREFIX}${legacyHash}`;
    assert.equal(isUserHashUnverified(wrappedLegacy), true);
    assert.equal(await verifyPassword("UnverifiedLegacy1", wrappedLegacy), false);
    assert.equal(await verifyPassword("UnverifiedLegacy1", stripUnverifiedPrefix(wrappedLegacy)), true);

    // Dvojitý prefix UNVERIFIED:UNVERIFIED:... musí zlyhať aj po jednom stripUnverifiedPrefix
    const doubleWrapped = `${UNVERIFIED_HASH_PREFIX}${wrappedScrypt}`;
    const strippedOnce = stripUnverifiedPrefix(doubleWrapped);
    assert.equal(strippedOnce.startsWith(UNVERIFIED_HASH_PREFIX), true);
    assert.deepEqual(parseInnerCredential(strippedOnce), { kind: "invalid" });
    assert.equal(await verifyPassword("UnverifiedUserPass1", strippedOnce), false);

    // markHashUnverified musí odmietnuť už zabalený hash aj legacy SHA-256
    assert.throws(() => markHashUnverified(wrappedScrypt));
    assert.throws(() => markHashUnverified(legacyHash));
    assert.throws(() => markHashUnverified("invalid"));
});

// ============================================================================
// 5. UNIT TESTY: Dĺžkové limity hesiel (DoS ochrana) a CryptoInternalError
// ============================================================================

test("16-17. dĺžkové limity hesiel pri zápise (128 znakov / 512 B) a pri overení (1024 B) + ošetrenie CryptoInternalError", async () => {
    // 129 ASCII znakov -> odmietnuté pri zápise
    const chars129 = "A1" + "a".repeat(127);
    assert.equal(chars129.length, 129);
    const bounds129 = validateNewPasswordBounds(chars129, 8);
    assert.equal(bounds129.valid, false);
    await assert.rejects(() => hashPassword(chars129));

    // 128 ASCII znakov -> povolené
    const chars128 = "A1" + "a".repeat(126);
    assert.equal(chars128.length, 128);
    assert.deepEqual(validateNewPasswordBounds(chars128, 8), { valid: true });

    // 1025 UTF-8 bajtov pri verifyPassword -> odmietnuté pred volaním KDF
    const validHash = await hashPassword("NormalPass123");
    const bytes1025 = "x".repeat(1025);
    assert.deepEqual(await verifyPasswordDetailed(bytes1025, validHash), {
        matched: false,
        reason: "invalid-password-input",
    });

    // Simulácia interného zlyhania crypto.scrypt -> vyhodí CryptoInternalError bez úniku hesla/saltu
    const origScrypt = crypto.scrypt;
    const cryptoMutable = crypto as unknown as {
        scrypt: (_pw: unknown, _salt: unknown, _keylen: unknown, _opts: unknown, cb: (err: Error) => void) => void;
    };
    cryptoMutable.scrypt = (_pw: unknown, _salt: unknown, _keylen: unknown, _opts: unknown, cb: (err: Error) => void) => {
        const fakeErr = Object.assign(new Error("ERR_CRYPTO_SCRYPT_NOT_SUPPORTED"), {
            code: "ERR_CRYPTO_SCRYPT_NOT_SUPPORTED",
        });
        cb(fakeErr);
    };
    try {
        await assert.rejects(
            () => verifyPassword("SecretPassThatMustNotLeak", validHash),
            (err: unknown) => {
                assert.equal(err instanceof CryptoInternalError, true);
                if (err instanceof CryptoInternalError) {
                    assert.equal(err.operation, "scrypt_verify");
                    assert.equal(err.errorCode, "ERR_CRYPTO_SCRYPT_NOT_SUPPORTED");
                    assert.equal(err.message.includes("SecretPassThatMustNotLeak"), false);
                    assert.equal(err.message.includes(validHash), false);
                }
                return true;
            }
        );
    } finally {
        cryptoMutable.scrypt = origScrypt as unknown as typeof cryptoMutable.scrypt;
    }
});

// ============================================================================
// 6. UNIT TESTY: JWT_SECRET validácia a passwordVersion tokeny
// ============================================================================

test("18-19 & 28. tokeny obsahujú iba passwordVersion (žiadny passHashFragment), staré tokeny sú odmietnuté a JWT_SECRET je fail-closed", async () => {
    // Chýbajúci alebo neplatný JWT_SECRET musí zlyhať fail-closed
    await withJwtSecret(undefined, async () => {
        assert.throws(() => getJwtSecretKey(), /CRITICAL_AUTH_CONFIG/);
    });
    await withJwtSecret("your-secret-key-change-in-production", async () => {
        assert.throws(() => getJwtSecretKey(), /CRITICAL_AUTH_CONFIG/);
    });
    await withJwtSecret("short", async () => {
        assert.throws(() => getJwtSecretKey(), /CRITICAL_AUTH_CONFIG/);
    });
    // Uppercase hex alebo koncový riadok / whitespace z viacriadkového poľa vo Verceli sa bezpečne normalizuje
    const expectedKeyBytes = new TextEncoder().encode(SYNTHETIC_JWT_SECRET);
    await withJwtSecret(SYNTHETIC_JWT_SECRET.toUpperCase(), async () => {
        assert.deepEqual(getJwtSecretKey(), expectedKeyBytes);
    });
    await withJwtSecret(`  ${SYNTHETIC_JWT_SECRET}\r\n`, async () => {
        assert.deepEqual(getJwtSecretKey(), expectedKeyBytes);
    });

    await withJwtSecret(SYNTHETIC_JWT_SECRET, async () => {
        const resetToken = await createPasswordResetToken("user-123", "  Test@Example.com ", 5);
        const verifyToken = await createEmailVerificationToken("user-123", "  Test@Example.com ", 5);

        // Dekódujeme payload a overíme, že v ňom nie je žiadny passHashFragment ani credFp
        const resetPayloadJson = JSON.parse(Buffer.from(resetToken.split(".")[1], "base64url").toString("utf8"));
        assert.equal(resetPayloadJson.userId, "user-123");
        assert.equal(resetPayloadJson.email, "test@example.com");
        assert.equal(resetPayloadJson.purpose, "password_reset");
        assert.equal(resetPayloadJson.passwordVersion, 5);
        assert.equal("passHashFragment" in resetPayloadJson, false);
        assert.equal("credFp" in resetPayloadJson, false);
        assert.equal("password_hash" in resetPayloadJson, false);

        const verifiedReset = await verifyPasswordResetToken(resetToken);
        assert.deepEqual(verifiedReset, {
            userId: "user-123",
            email: "test@example.com",
            passwordVersion: 5,
        });

        const verifiedEmail = await verifyEmailVerificationToken(verifyToken);
        assert.deepEqual(verifiedEmail, {
            userId: "user-123",
            email: "test@example.com",
            passwordVersion: 5,
        });

        // Cross-purpose odmietnutie: reset token nesmie prejsť ako email_verification ani ako session
        assert.equal(await verifyEmailVerificationToken(resetToken), null);
        assert.equal(await verifyPasswordResetToken(verifyToken), null);
        assert.equal(await verifySession(resetToken), null);
        assert.equal(await verifySession(verifyToken), null);

        // Platný session token musí prejsť cez verifySession, ale nesmie prejsť ako reset alebo email_verification token
        const sessionToken = await createSession({
            id: "user-123",
            name: "Tester",
            email: "test@example.com",
            role: "user",
        });
        const verifiedSess = await verifySession(sessionToken);
        assert.equal(verifiedSess?.userId, "user-123");
        assert.equal(await verifyPasswordResetToken(sessionToken), null);
        assert.equal(await verifyEmailVerificationToken(sessionToken), null);

        // Starý token s passHashFragment podpísaný rovnakým kľúčom musí byť odmietnutý
        const secretKey = getJwtSecretKey();
        const legacyResetToken = await new SignJWT({
            userId: "user-123",
            email: "test@example.com",
            purpose: "password_reset",
            passHashFragment: "0123456789abcdef",
        })
            .setProtectedHeader({ alg: "HS256" })
            .setExpirationTime("1h")
            .sign(secretKey);

        assert.equal(await verifyPasswordResetToken(legacyResetToken), null);
    });
});

// ============================================================================
// 7. TESTY HRANÍC password_version A ATOMICKÝCH CAS SCENÁROV (20-27)
// ============================================================================

test("27. hranice password_version: MIN=1, MAX_INCREMENTABLE=2147483639, MAX_STORED=2147483640", () => {
    assert.equal(parseStoredOrTokenPasswordVersion(0), null);
    assert.equal(parseStoredOrTokenPasswordVersion(-1), null);
    assert.equal(parseStoredOrTokenPasswordVersion(null), null);
    assert.equal(parseStoredOrTokenPasswordVersion(undefined), null);
    assert.equal(parseStoredOrTokenPasswordVersion("1"), null);
    assert.equal(parseStoredOrTokenPasswordVersion(1.5), null);
    assert.equal(parseStoredOrTokenPasswordVersion(MIN_PASSWORD_VERSION), 1);
    assert.equal(parseStoredOrTokenPasswordVersion(MAX_INCREMENTABLE_PASSWORD_VERSION), 2_147_483_639);
    assert.equal(parseStoredOrTokenPasswordVersion(MAX_STORED_PASSWORD_VERSION), 2_147_483_640);
    assert.equal(parseStoredOrTokenPasswordVersion(MAX_STORED_PASSWORD_VERSION + 1), null);

    // computeNextPasswordVersion povolí 2147483639 -> 2147483640, ale odmietne 2147483640
    assert.deepEqual(computeNextPasswordVersion(1), { currentVersion: 1, nextVersion: 2 });
    assert.deepEqual(computeNextPasswordVersion(MAX_INCREMENTABLE_PASSWORD_VERSION), {
        currentVersion: 2_147_483_639,
        nextVersion: 2_147_483_640,
    });
    assert.equal(computeNextPasswordVersion(MAX_STORED_PASSWORD_VERSION), null);
    assert.equal(computeNextPasswordVersion(null), null);
    assert.equal(computeNextPasswordVersion(0), null);
});

/**
 * In-memory simulátor tabuľky `booking_users` s presnou sémantikou PostgREST `.update().eq("id", ...).eq("password_version", ...)`
 * na overenie súbehových CAS operácií, replay ochrany a pretekov medzi resetom a verifikáciou.
 */
class InMemoryBookingUsersCasStore {
    private rows = new Map<
        string,
        {
            id: string;
            email: string;
            password_hash: string;
            password_version: number;
            email_verified: boolean;
        }
    >();

    insert(row: { id: string; email: string; password_hash: string; password_version?: number; email_verified?: boolean }) {
        const stored = {
            id: row.id,
            email: row.email.trim().toLowerCase(),
            password_hash: row.password_hash,
            password_version: row.password_version ?? 1,
            email_verified: row.email_verified ?? !isUserHashUnverified(row.password_hash),
        };
        this.rows.set(stored.id, stored);
        return { ...stored };
    }

    selectById(id: string) {
        const r = this.rows.get(id);
        return r ? { ...r } : null;
    }

    casUpdate(
        id: string,
        expectedPasswordVersion: number,
        patch: Partial<{ password_hash: string; password_version: number; email_verified: boolean; email: string }>
    ): { data: { id: string; password_version: number } | null; error: Error | null } {
        const current = this.rows.get(id);
        if (!current) {
            return { data: null, error: null };
        }
        if (current.password_version !== expectedPasswordVersion) {
            // CAS mismatch -> 0 riadkov zmenených, maybeSingle() vráti { data: null, error: null }
            return { data: null, error: null };
        }
        const nextVersion = patch.password_version ?? current.password_version;
        if (nextVersion < MIN_PASSWORD_VERSION || nextVersion > MAX_STORED_PASSWORD_VERSION) {
            return { data: null, error: new Error("new row for relation \"booking_users\" violates check constraint \"booking_users_password_version_check\"") };
        }
        const updated = {
            ...current,
            ...patch,
            password_version: nextVersion,
        };
        this.rows.set(id, updated);
        return {
            data: { id: updated.id, password_version: updated.password_version },
            error: null,
        };
    }
}

test("20-26. CAS scenáre: reset replay, súbežný reset, súbežná zmena hesla, verifikácia e-mailu, pretek reset vs. verifikácia, admin verify, soft-delete a read-only login", async () => {
    await withJwtSecret(SYNTHETIC_JWT_SECRET, async () => {
        const store = new InMemoryBookingUsersCasStore();
        const initialScrypt = await hashPassword("InitialPass123!");
        const unverifiedInitial = markHashUnverified(initialScrypt);

        store.insert({
            id: "u-cas-1",
            email: "tester@example.com",
            password_hash: unverifiedInitial,
            password_version: 1,
            email_verified: false,
        });

        // Vydáme email verification token (passwordVersion = 1) a reset token (passwordVersion = 1)
        const emailTokenV1 = await createEmailVerificationToken("u-cas-1", "tester@example.com", 1);
        const resetTokenV1 = await createPasswordResetToken("u-cas-1", "tester@example.com", 1);

        // 26. Obyčajný login nezmení password_hash ani password_version
        const beforeLogin = store.selectById("u-cas-1")!;
        const loginMatched = await verifyPassword("InitialPass123!", stripUnverifiedPrefix(beforeLogin.password_hash));
        assert.equal(loginMatched, true);
        const afterLogin = store.selectById("u-cas-1")!;
        assert.equal(afterLogin.password_hash, beforeLogin.password_hash);
        assert.equal(afterLogin.password_version, 1);

        // 21 & 24. Pretek: dve súbežné žiadosti s resetTokenV1 (verzia 1) -> prvá uspeje (verzia 1 -> 2), druhá zlyhá na CAS
        const tokenData = (await verifyPasswordResetToken(resetTokenV1))!;
        const snapshotA = store.selectById(tokenData.userId)!;
        const snapshotB = store.selectById(tokenData.userId)!;

        const stepA = computeNextPasswordVersion(snapshotA.password_version)!;
        const stepB = computeNextPasswordVersion(snapshotB.password_version)!;

        const newHashA = await hashPassword("ResetPassA123!");
        const newHashB = await hashPassword("ResetPassB123!");

        const casResA = store.casUpdate("u-cas-1", stepA.currentVersion, {
            password_hash: newHashA,
            password_version: stepA.nextVersion,
            email_verified: true,
        });
        const casResB = store.casUpdate("u-cas-1", stepB.currentVersion, {
            password_hash: newHashB,
            password_version: stepB.nextVersion,
            email_verified: true,
        });

        assert.deepEqual(casResA, { data: { id: "u-cas-1", password_version: 2 }, error: null });
        assert.deepEqual(casResB, { data: null, error: null }, "Druhý súbežný reset musí skončiť CAS konfliktom (0 riadkov)");

        // 20. Replay rovnakého resetTokenV1 po zmene verzie na 2 je okamžite zamietnutý (currentVersion 2 !== token.passwordVersion 1)
        const afterReset = store.selectById("u-cas-1")!;
        assert.equal(afterReset.password_version, 2);
        assert.notEqual(afterReset.password_version, tokenData.passwordVersion);

        // 24. Starý emailTokenV1 (vydaný pre verziu 1) už nesmie prepísať nové heslo!
        // Keďže účet bol resetom hesla zároveň overený (email_verified = true, bez UNVERIFIED: prefixu),
        // krok 4 vo verifyEmailWithTokenAction vráti idempotentný alreadyVerified bez dotknutia password_hash:
        assert.equal(isUserHashUnverified(afterReset.password_hash), false);
        assert.equal(await verifyPassword("ResetPassA123!", afterReset.password_hash), true);

        // A čo ak by bol účet stále UNVERIFIED, ale verzia sa zvýšila? CAS s emailTokenV1 (verzia 1) zlyhá:
        const emailTokenData = (await verifyEmailVerificationToken(emailTokenV1))!;
        assert.equal(emailTokenData.passwordVersion, 1);
        assert.notEqual(afterReset.password_version, emailTokenData.passwordVersion);

        // 23. Admin manuálna aktivácia (verifyBookingUserByAdminAction CAS):
        // Vytvoríme druhého neovereného používateľa u-cas-admin-verify a otestujeme súbežnú aktiváciu adminom
        const unverifiedUser2Hash = markHashUnverified(await hashPassword("User2Pass123!"));
        store.insert({
            id: "u-cas-2",
            email: "unverified2@example.com",
            password_hash: unverifiedUser2Hash,
            password_version: 1,
            email_verified: false,
        });
        const adminTargetSnap1 = store.selectById("u-cas-2")!;
        const adminTargetSnap2 = store.selectById("u-cas-2")!;
        const adminStep1 = computeNextPasswordVersion(adminTargetSnap1.password_version)!;
        const adminStep2 = computeNextPasswordVersion(adminTargetSnap2.password_version)!;
        const rawInner2 = stripUnverifiedPrefix(adminTargetSnap1.password_hash);
        assert.equal(parseInnerCredential(rawInner2).kind, "scrypt-v1");

        const adminCas1 = store.casUpdate("u-cas-2", adminStep1.currentVersion, {
            password_hash: rawInner2,
            password_version: adminStep1.nextVersion,
            email_verified: true,
        });
        const adminCas2 = store.casUpdate("u-cas-2", adminStep2.currentVersion, {
            password_hash: rawInner2,
            password_version: adminStep2.nextVersion,
            email_verified: true,
        });
        assert.deepEqual(adminCas1, { data: { id: "u-cas-2", password_version: 2 }, error: null });
        assert.deepEqual(adminCas2, { data: null, error: null }, "Druhý súbežný admin verify musí zlyhať na CAS");

        // 22. Súbežná zmena hesla (changePasswordAction CAS): verzia 2 -> 3
        const stepChange = computeNextPasswordVersion(afterReset.password_version)!;
        const changedHash = await hashPassword("ChangedPass333!");
        const changeCas = store.casUpdate("u-cas-1", stepChange.currentVersion, {
            password_hash: changedHash,
            password_version: stepChange.nextVersion,
        });
        assert.deepEqual(changeCas, { data: { id: "u-cas-1", password_version: 3 }, error: null });

        // 25. Soft-delete fallback zvýši password_version (3 -> 4) a zneplatní všetky tokeny vydané pre verziu 3
        const resetTokenV3 = await createPasswordResetToken("u-cas-1", "tester@example.com", 3);
        const beforeDelete = store.selectById("u-cas-1")!;
        const deleteStep = computeNextPasswordVersion(beforeDelete.password_version)!;
        const archiveCas = store.casUpdate("u-cas-1", deleteStep.currentVersion, {
            email: "deleted_u-cas-1@deleted.local",
            password_hash: `deleted_${crypto.randomUUID()}`,
            password_version: deleteStep.nextVersion,
        });
        assert.deepEqual(archiveCas, { data: { id: "u-cas-1", password_version: 4 }, error: null });

        const afterDelete = store.selectById("u-cas-1")!;
        const parsedResetV3 = (await verifyPasswordResetToken(resetTokenV3))!;
        assert.equal(afterDelete.password_version === parsedResetV3.passwordVersion, false);
        assert.deepEqual(parseInnerCredential(afterDelete.password_hash), { kind: "invalid" });
    });
});

// ============================================================================
// 8. SOURCE-CONTRACT A CLIENT BUNDLE HRANICA (29)
// ============================================================================

test("29. klientske komponenty ani lib/auth/bookingAuth.ts neimportujú node:crypto ani passwordHash scrypt runtime", () => {
    const repoRoot = path.resolve(__dirname, "..");

    // 1. Overiť, že lib/auth/bookingAuth.ts neimportuje node:crypto ani hashPassword/verifyPassword
    const bookingAuthSource = fs.readFileSync(path.join(repoRoot, "lib/auth/bookingAuth.ts"), "utf8");
    assert.equal(/node:crypto|from\s+["']crypto["']/.test(bookingAuthSource), false, "bookingAuth.ts nesmie importovať node:crypto");
    assert.equal(/your-secret-key-change-in-production/.test(bookingAuthSource), false, "bookingAuth.ts nesmie obsahovať verejný fallback JWT_SECRET");
    assert.equal(/passHashFragment\s*:/.test(bookingAuthSource), false, "bookingAuth.ts nesmie vydávať passHashFragment");

    // 2. Overiť, že žiadny súbor s "use client" neimportuje lib/auth/passwordHash ani node:crypto
    function walkFiles(dir: string, out: string[] = []): string[] {
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
            if (["node_modules", ".next", ".git"].includes(entry.name)) continue;
            const full = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                walkFiles(full, out);
            } else if (/\.(ts|tsx)$/.test(entry.name)) {
                out.push(full);
            }
        }
        return out;
    }

    const allSourceFiles = [
        ...walkFiles(path.join(repoRoot, "app")),
        ...walkFiles(path.join(repoRoot, "components")),
        ...walkFiles(path.join(repoRoot, "lib")),
    ];

    for (const filePath of allSourceFiles) {
        const content = fs.readFileSync(filePath, "utf8");
        const isClientModule = /^\s*["']use client["']/m.test(content);
        if (isClientModule) {
            assert.equal(
                /lib\/auth\/passwordHash|from\s+["']\.\/passwordHash["']/.test(content),
                false,
                `Klientsky modul ${filePath} nesmie importovať passwordHash.ts`
            );
            assert.equal(
                /node:crypto/.test(content),
                false,
                `Klientsky modul ${filePath} nesmie importovať node:crypto`
            );
        }
    }

    // 3. Overiť, že mutačné auth súbory nikdy neposielajú password_hash vo filtri .eq("password_hash", ...)
    const authActionSource = fs.readFileSync(path.join(repoRoot, "app/actions/auth.ts"), "utf8");
    const adminUsersActionSource = fs.readFileSync(path.join(repoRoot, "app/actions/adminUsers.ts"), "utf8");
    assert.equal(/\.eq\(\s*["']password_hash["']/.test(authActionSource), false, "auth.ts nesmie filtrovať podľa .eq('password_hash', ...)");
    assert.equal(/\.eq\(\s*["']password_hash["']/.test(adminUsersActionSource), false, "adminUsers.ts nesmie filtrovať podľa .eq('password_hash', ...)");
    assert.equal(/passHashFragment/.test(authActionSource), false, "auth.ts nesmie používať passHashFragment");
});
