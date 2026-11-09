import crypto from "node:crypto";

export const UNVERIFIED_HASH_PREFIX = "UNVERIFIED:";

export const MIN_PASSWORD_VERSION = 1;
export const MAX_STORED_PASSWORD_VERSION = 2_147_483_640;
export const MAX_INCREMENTABLE_PASSWORD_VERSION = 2_147_483_639;

export const MAX_VERIFY_PASSWORD_UTF8_BYTES = 1024;
export const MAX_NEW_PASSWORD_UTF16_CHARS = 128;
export const MAX_NEW_PASSWORD_UTF8_BYTES = 512;

export const MAX_INNER_CREDENTIAL_LENGTH = 256;
export const SCRYPT_V1_CANONICAL_LENGTH = 129;

export type ScryptV1Profile = {
    readonly id: string;
    readonly ln: number;
    readonly N: number;
    readonly r: number;
    readonly p: number;
    readonly saltBytes: number;
    readonly dkBytes: number;
    readonly maxmem: number;
};

/**
 * Kandidát schválený z lokálneho benchmarku (OWASP 19 MiB):
 * N = 2^15 = 32768, r = 8, p = 3, maxmem = 36 MiB.
 * Pred produkčným nasadením vyžaduje potvrdenie na Vercel Preview.
 */
export const ACTIVE_SCRYPT_V1_PROFILE: ScryptV1Profile = Object.freeze({
    id: "ln=15$r=8$p=3",
    ln: 15,
    N: 32768,
    r: 8,
    p: 3,
    saltBytes: 16,
    dkBytes: 32,
    maxmem: 36 * 1024 * 1024,
});

export const ALLOWED_SCRYPT_V1_PROFILES: ReadonlyMap<string, ScryptV1Profile> = new Map([
    [ACTIVE_SCRYPT_V1_PROFILE.id, ACTIVE_SCRYPT_V1_PROFILE],
]);

export type ParsedInnerCredential =
    | {
          kind: "scrypt-v1";
          canonical: string;
          profile: ScryptV1Profile;
          salt: Buffer;
          dk: Buffer;
      }
    | {
          kind: "legacy-sha256";
          canonical: string;
          digest: Buffer;
      }
    | {
          kind: "invalid";
      };

export type VerifyPasswordResult =
    | {
          matched: true;
          scheme: "scrypt-v1" | "legacy-sha256";
      }
    | {
          matched: false;
          reason: "mismatch" | "invalid-stored-credential" | "invalid-password-input";
      };

export class CryptoInternalError extends Error {
    public readonly operation: "scrypt_hash" | "scrypt_verify";
    public readonly errorCode?: string;

    constructor(operation: "scrypt_hash" | "scrypt_verify", cause?: unknown) {
        super(`Internal KDF operation failed: ${operation}`);
        this.name = "CryptoInternalError";
        this.operation = operation;
        if (cause && typeof cause === "object" && "code" in cause && typeof (cause as { code?: unknown }).code === "string") {
            this.errorCode = (cause as { code: string }).code;
        }
    }
}

const LOWERCASE_HEX_32_RE = /^[0-9a-f]{32}$/;
const LOWERCASE_HEX_64_RE = /^[0-9a-f]{64}$/;
const LEGACY_SHA256_HEX_64_RE = /^[0-9a-fA-F]{64}$/;

/**
 * Overí, či uložený password_hash začína prefixom `UNVERIFIED:`.
 */
export function isUserHashUnverified(passwordHash?: string | null): boolean {
    if (typeof passwordHash !== "string" || passwordHash.length === 0) {
        return false;
    }
    return passwordHash.startsWith(UNVERIFIED_HASH_PREFIX);
}

/**
 * Odstráni najviac jeden prefix `UNVERIFIED:` zo začiatku reťazca.
 * Ak bol reťazec zabalený dvakrát (`UNVERIFIED:UNVERIFIED:...`), výsledok
 * stále začína `UNVERIFIED:` a `parseInnerCredential` ho odmietne ako `invalid`.
 */
export function stripUnverifiedPrefix(passwordHash?: string | null): string {
    if (typeof passwordHash !== "string" || passwordHash.length === 0) {
        return "";
    }
    if (passwordHash.startsWith(UNVERIFIED_HASH_PREFIX)) {
        return passwordHash.slice(UNVERIFIED_HASH_PREFIX.length);
    }
    return passwordHash;
}

/**
 * Zabalí platný vnútorný `scrypt-v1` credential do `UNVERIFIED:` obálky.
 * Odmieta prázdne hodnoty, už zabalené hodnoty (`UNVERIFIED:...`), legacy SHA-256
 * aj poškodené reťazce (fail-closed).
 */
export function markHashUnverified(innerPasswordHash: string): string {
    if (typeof innerPasswordHash !== "string" || innerPasswordHash.startsWith(UNVERIFIED_HASH_PREFIX)) {
        throw new Error("markHashUnverified requires a valid unwrapped scrypt-v1 credential.");
    }
    const parsed = parseInnerCredential(innerPasswordHash);
    if (parsed.kind !== "scrypt-v1") {
        throw new Error("markHashUnverified only accepts valid scrypt-v1 credentials.");
    }
    return `${UNVERIFIED_HASH_PREFIX}${parsed.canonical}`;
}

/**
 * Prísny parser vnútorného credentialu (bez prefixu `UNVERIFIED:`).
 * NIKDY nevolá `crypto.scrypt` pred úspešným overením whitelistu profilov.
 */
export function parseInnerCredential(rawInner?: string | null): ParsedInnerCredential {
    if (typeof rawInner !== "string" || rawInner.length === 0 || rawInner.length > MAX_INNER_CREDENTIAL_LENGTH) {
        return { kind: "invalid" };
    }

    // Dvojitý alebo neodstránený UNVERIFIED prefix nie je platný vnútorný credential
    if (rawInner.startsWith(UNVERIFIED_HASH_PREFIX)) {
        return { kind: "invalid" };
    }

    // 1. Kontrola formátu scrypt-v1
    if (rawInner.startsWith("scrypt-v1$")) {
        if (rawInner.length !== SCRYPT_V1_CANONICAL_LENGTH) {
            return { kind: "invalid" };
        }

        const parts = rawInner.split("$");
        if (parts.length !== 6) {
            return { kind: "invalid" };
        }

        const [versionPart, lnPart, rPart, pPart, saltPart, dkPart] = parts;
        if (versionPart !== "scrypt-v1") {
            return { kind: "invalid" };
        }

        const profileKey = `${lnPart}$${rPart}$${pPart}`;
        const profile = ALLOWED_SCRYPT_V1_PROFILES.get(profileKey);
        if (!profile) {
            return { kind: "invalid" };
        }

        if (!saltPart.startsWith("salt=") || !dkPart.startsWith("dk=")) {
            return { kind: "invalid" };
        }

        const saltHex = saltPart.slice(5);
        const dkHex = dkPart.slice(3);

        if (!LOWERCASE_HEX_32_RE.test(saltHex) || !LOWERCASE_HEX_64_RE.test(dkHex)) {
            return { kind: "invalid" };
        }

        const saltBuf = Buffer.from(saltHex, "hex");
        const dkBuf = Buffer.from(dkHex, "hex");

        if (saltBuf.byteLength !== profile.saltBytes || dkBuf.byteLength !== profile.dkBytes) {
            return { kind: "invalid" };
        }

        return {
            kind: "scrypt-v1",
            canonical: rawInner,
            profile,
            salt: saltBuf,
            dk: dkBuf,
        };
    }

    // 2. Kontrola legacy SHA-256 (presne 64 hex znakov, lowercase/uppercase/mixed)
    if (rawInner.length === 64 && LEGACY_SHA256_HEX_64_RE.test(rawInner)) {
        const canonicalHex = rawInner.toLowerCase();
        const digestBuf = Buffer.from(canonicalHex, "hex");
        if (digestBuf.byteLength !== 32) {
            return { kind: "invalid" };
        }
        return {
            kind: "legacy-sha256",
            canonical: canonicalHex,
            digest: digestBuf,
        };
    }

    return { kind: "invalid" };
}

/**
 * Validácia dĺžky nového / meneného hesla pred zápisom (UX + DoS ochrana).
 * Heslo sa nikdy netrimuje ani Unicode-nenormalizuje.
 */
export function validateNewPasswordBounds(
    password: unknown,
    minChars = 6
): { valid: true } | { valid: false; reason: "empty" | "too_short" | "too_long"; error: string } {
    if (typeof password !== "string" || password.length === 0) {
        return {
            valid: false,
            reason: "empty",
            error: "Heslo je povinné.",
        };
    }

    if (password.length < minChars) {
        return {
            valid: false,
            reason: "too_short",
            error: `Heslo musí mať aspoň ${minChars} znakov.`,
        };
    }

    if (password.length > MAX_NEW_PASSWORD_UTF16_CHARS) {
        return {
            valid: false,
            reason: "too_long",
            error: `Heslo môže mať maximálne ${MAX_NEW_PASSWORD_UTF16_CHARS} znakov.`,
        };
    }

    const utf8ByteLength = Buffer.byteLength(password, "utf8");
    if (utf8ByteLength > MAX_NEW_PASSWORD_UTF8_BYTES) {
        return {
            valid: false,
            reason: "too_long",
            error: `Heslo môže mať maximálne ${MAX_NEW_PASSWORD_UTF16_CHARS} znakov.`,
        };
    }

    return { valid: true };
}

/**
 * Validácia uloženej alebo tokenovej hodnoty `password_version` (1..2147483640).
 */
export function parseStoredOrTokenPasswordVersion(value: unknown): number | null {
    if (typeof value !== "number" || !Number.isSafeInteger(value)) {
        return null;
    }
    if (value < MIN_PASSWORD_VERSION || value > MAX_STORED_PASSWORD_VERSION) {
        return null;
    }
    return value;
}

/**
 * Validácia `currentVersion` pred mutáciou a výpočet `nextVersion = currentVersion + 1`.
 * Ak je `currentVersion` chýbajúca, mimo rozsahu alebo už na maxime (2147483640), vráti `null` (fail-closed).
 */
export function computeNextPasswordVersion(
    currentValue: unknown
): { currentVersion: number; nextVersion: number } | null {
    if (typeof currentValue !== "number" || !Number.isSafeInteger(currentValue)) {
        return null;
    }
    if (currentValue < MIN_PASSWORD_VERSION || currentValue > MAX_INCREMENTABLE_PASSWORD_VERSION) {
        return null;
    }
    const nextVersion = currentValue + 1;
    if (nextVersion > MAX_STORED_PASSWORD_VERSION) {
        return null;
    }
    return {
        currentVersion: currentValue,
        nextVersion,
    };
}

function runScryptAsync(
    passwordBytes: Buffer,
    salt: Buffer,
    dkBytes: number,
    options: { N: number; r: number; p: number; maxmem: number },
    operation: "scrypt_hash" | "scrypt_verify"
): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        try {
            crypto.scrypt(passwordBytes, salt, dkBytes, options, (err, derivedKey) => {
                if (err || !Buffer.isBuffer(derivedKey) || derivedKey.byteLength !== dkBytes) {
                    reject(new CryptoInternalError(operation, err));
                    return;
                }
                resolve(derivedKey);
            });
        } catch (syncErr) {
            reject(new CryptoInternalError(operation, syncErr));
        }
    });
}

/**
 * Vytvorí nový `scrypt-v1` password credential.
 * Žiadny export v tomto module nikdy nevytvára nový SHA-256 password credential.
 */
export async function hashPassword(password: string): Promise<string> {
    if (typeof password !== "string" || password.length === 0 || password.length > MAX_NEW_PASSWORD_UTF16_CHARS) {
        throw new Error("Invalid password length for hashing.");
    }

    const passwordBytes = Buffer.from(password, "utf8");
    if (passwordBytes.byteLength === 0 || passwordBytes.byteLength > MAX_NEW_PASSWORD_UTF8_BYTES) {
        throw new Error("Invalid UTF-8 byte length for hashing.");
    }

    const profile = ACTIVE_SCRYPT_V1_PROFILE;
    const salt = crypto.randomBytes(profile.saltBytes);
    const derivedKey = await runScryptAsync(
        passwordBytes,
        salt,
        profile.dkBytes,
        {
            N: profile.N,
            r: profile.r,
            p: profile.p,
            maxmem: profile.maxmem,
        },
        "scrypt_hash"
    );

    const saltHex = salt.toString("hex").toLowerCase();
    const dkHex = derivedKey.toString("hex").toLowerCase();

    return `scrypt-v1$ln=${profile.ln}$r=${profile.r}$p=${profile.p}$salt=${saltHex}$dk=${dkHex}`;
}

/**
 * Detailné overenie hesla voči vnútornému credentialu (`scrypt-v1` alebo `legacy-sha256`).
 * Neakceptuje `UNVERIFIED:` obálku — volajúci musí najprv explicitne použiť `stripUnverifiedPrefix`.
 */
export async function verifyPasswordDetailed(
    password: string,
    storedInnerCredential: string
): Promise<VerifyPasswordResult> {
    if (typeof password !== "string" || password.length === 0) {
        return { matched: false, reason: "invalid-password-input" };
    }

    const passwordBytes = Buffer.from(password, "utf8");
    if (passwordBytes.byteLength === 0 || passwordBytes.byteLength > MAX_VERIFY_PASSWORD_UTF8_BYTES) {
        return { matched: false, reason: "invalid-password-input" };
    }

    const parsed = parseInnerCredential(storedInnerCredential);
    if (parsed.kind === "invalid") {
        return { matched: false, reason: "invalid-stored-credential" };
    }

    if (parsed.kind === "scrypt-v1") {
        const derivedKey = await runScryptAsync(
            passwordBytes,
            parsed.salt,
            parsed.profile.dkBytes,
            {
                N: parsed.profile.N,
                r: parsed.profile.r,
                p: parsed.profile.p,
                maxmem: parsed.profile.maxmem,
            },
            "scrypt_verify"
        );

        if (derivedKey.byteLength !== parsed.dk.byteLength) {
            return { matched: false, reason: "mismatch" };
        }

        const matched = crypto.timingSafeEqual(derivedKey, parsed.dk);
        if (!matched) {
            return { matched: false, reason: "mismatch" };
        }
        return { matched: true, scheme: "scrypt-v1" };
    }

    // Legacy SHA-256 verification-only branch
    const candidateDigest = crypto.createHash("sha256").update(passwordBytes).digest();
    if (candidateDigest.byteLength !== parsed.digest.byteLength) {
        return { matched: false, reason: "mismatch" };
    }

    const matched = crypto.timingSafeEqual(candidateDigest, parsed.digest);
    if (!matched) {
        return { matched: false, reason: "mismatch" };
    }
    return { matched: true, scheme: "legacy-sha256" };
}

/**
 * Jednoduchý boolean wrapper nad `verifyPasswordDetailed`.
 * Poznámka: `CryptoInternalError` sa pri zlyhaní `crypto.scrypt` propaguje nahor,
 * aby ho volajúci vedel odlíšiť od nesprávneho hesla (fail-closed bez zvýšenia lockout počítadla).
 */
export async function verifyPassword(password: string, storedInnerCredential: string): Promise<boolean> {
    const result = await verifyPasswordDetailed(password, storedInnerCredential);
    return result.matched;
}

