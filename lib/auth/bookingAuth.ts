import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import type { BookingRole, BookingUser, SessionPayload } from "./types";
import { parseStoredOrTokenPasswordVersion } from "./passwordHash";

export type { BookingRole, BookingUser, SessionPayload } from "./types";

const SESSION_COOKIE_NAME = "booking_session";

const JWT_SECRET_HEX_64_RE = /^[0-9a-f]{64}$/;

/**
 * Lazy fail-closed načítanie a validácia `JWT_SECRET`.
 * - Bez akéhokoľvek hardcoded fallbacku.
 * - Odstráni prípadný koncový riadok / whitespace z viacriadkového poľa vo Vercel UI (`.trim()`).
 * - Vyžaduje presne 64 hex znakov (`/^[0-9a-f]{64}$/`).
 * - Zachováva UTF-8 TextEncoder reprezentáciu kľúča pre kompatibilitu so SignJWT / jwtVerify.
 */
export function getJwtSecretKey(): Uint8Array {
    const rawSecret = process.env.JWT_SECRET;
    if (typeof rawSecret !== "string" || rawSecret.trim().length === 0) {
        throw new Error(
            "CRITICAL_AUTH_CONFIG: Missing JWT_SECRET environment variable (not loaded in current deployment)."
        );
    }
    const cleanSecret = rawSecret
        .trim()
        .replace(/^JWT_SECRET\s*=\s*/i, "")
        .replace(/^["']|["']$/g, "")
        .replace(/^0x/i, "")
        .trim()
        .toLowerCase();
    if (!JWT_SECRET_HEX_64_RE.test(cleanSecret)) {
        const hexMatches = cleanSecret.match(/[0-9a-f]{64}/);
        if (hexMatches && cleanSecret.length <= 80) {
            return new TextEncoder().encode(hexMatches[0]);
        }
        throw new Error(
            `CRITICAL_AUTH_CONFIG: Invalid JWT_SECRET format (trimmed length=${cleanSecret.length}, expected 64 hex characters).`
        );
    }
    return new TextEncoder().encode(cleanSecret);
}

function canonicalizeEmailClaim(rawEmail: unknown): string | null {
    if (typeof rawEmail !== "string") {
        return null;
    }
    const normalized = rawEmail.trim().toLowerCase();
    if (!normalized) {
        return null;
    }
    return normalized;
}

function isValidBookingRole(role: unknown): role is BookingRole {
    return role === "user" || role === "trainer" || role === "ntc_team" || role === "admin";
}

/**
 * Create JWT session token
 */
export async function createSession(user: BookingUser): Promise<string> {
    const secretKey = getJwtSecretKey();
    const payload: SessionPayload = {
        userId: user.id,
        email: user.email,
        name: user.name,
        cardNumber: user.cardNumber,
        phone: user.phone,
        role: user.role || "user",
        hasMultisport: Boolean(user.hasMultisport),
        discountTierId: user.discountTierId || "tier-base",
        exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7, // 7 days
    };

    const token = await new SignJWT({ ...payload })
        .setProtectedHeader({ alg: "HS256" })
        .setExpirationTime("7d")
        .sign(secretKey);

    return token;
}

/**
 * Verify JWT session token
 */
export async function verifySession(token: string): Promise<SessionPayload | null> {
    try {
        const secretKey = getJwtSecretKey();
        const verified = await jwtVerify(token, secretKey, {
            algorithms: ["HS256"],
        });
        const payload = verified.payload as Record<string, unknown>;

        // Session token nesmie mať claim `purpose` (zabránenie zámene s reset / email_verification tokenmi)
        if ("purpose" in payload && payload.purpose !== undefined) {
            return null;
        }

        if (
            typeof payload.userId !== "string" ||
            !payload.userId ||
            typeof payload.email !== "string" ||
            !payload.email ||
            typeof payload.name !== "string" ||
            !isValidBookingRole(payload.role) ||
            typeof payload.exp !== "number"
        ) {
            return null;
        }

        return {
            userId: payload.userId,
            email: payload.email,
            name: payload.name,
            cardNumber: typeof payload.cardNumber === "string" ? payload.cardNumber : undefined,
            phone: typeof payload.phone === "string" ? payload.phone : undefined,
            role: payload.role,
            hasMultisport: Boolean(payload.hasMultisport),
            discountTierId: typeof payload.discountTierId === "string" ? payload.discountTierId : "tier-base",
            exp: payload.exp,
        };
    } catch {
        return null;
    }
}

/**
 * Set session cookie
 */
export async function setSessionCookie(token: string) {
    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE_NAME, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 7, // 7 days
        path: "/",
    });
}

/**
 * Get session from cookie
 */
export async function getSession(): Promise<SessionPayload | null> {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

        if (!token) {
            return null;
        }

        return verifySession(token);
    } catch {
        return null;
    }
}

/**
 * Clear session cookie
 */
export async function clearSession() {
    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE_NAME, "", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 0,
        path: "/",
    });
    cookieStore.delete(SESSION_COOKIE_NAME);
}

/**
 * Require authentication - redirect to login if not authenticated
 */
export async function requireAuth(): Promise<SessionPayload> {
    const session = await getSession();

    if (!session) {
        throw new Error("Unauthorized");
    }

    return session;
}

export function normalizePhone(rawPhone?: string): string | null {
    if (!rawPhone) return null;
    const clean = rawPhone.trim().replace(/\s+/g, "");
    if (!clean) return null;
    if (clean.startsWith("09") && clean.length === 10) {
        return "+421" + clean.slice(1);
    }
    return clean;
}

/**
 * Create a secure time-limited token for password reset (valid for 1 hour).
 * Binds validity to the non-sensitive `passwordVersion` integer (never embeds password_hash fragments).
 */
export async function createPasswordResetToken(
    userId: string,
    email: string,
    passwordVersion: number
): Promise<string> {
    const secretKey = getJwtSecretKey();
    const canonicalEmail = canonicalizeEmailClaim(email);
    const validatedVersion = parseStoredOrTokenPasswordVersion(passwordVersion);

    if (typeof userId !== "string" || !userId || !canonicalEmail || validatedVersion === null) {
        throw new Error("Invalid parameters for password reset token.");
    }

    return await new SignJWT({
        userId,
        email: canonicalEmail,
        purpose: "password_reset",
        passwordVersion: validatedVersion,
    })
        .setProtectedHeader({ alg: "HS256" })
        .setExpirationTime("1h")
        .setIssuedAt()
        .sign(secretKey);
}

/**
 * Verify password reset token
 */
export async function verifyPasswordResetToken(
    token: string
): Promise<{ userId: string; email: string; passwordVersion: number } | null> {
    try {
        const secretKey = getJwtSecretKey();
        const verified = await jwtVerify(token, secretKey, {
            algorithms: ["HS256"],
        });
        const payload = verified.payload as Record<string, unknown>;

        if (payload?.purpose !== "password_reset") {
            return null;
        }

        if ("passHashFragment" in payload || "credFp" in payload || "password_hash" in payload) {
            return null;
        }

        const canonicalEmail = canonicalizeEmailClaim(payload.email);
        const validatedVersion = parseStoredOrTokenPasswordVersion(payload.passwordVersion);

        if (
            typeof payload.userId !== "string" ||
            !payload.userId ||
            !canonicalEmail ||
            validatedVersion === null ||
            typeof payload.exp !== "number"
        ) {
            return null;
        }

        return {
            userId: payload.userId,
            email: canonicalEmail,
            passwordVersion: validatedVersion,
        };
    } catch {
        return null;
    }
}

/**
 * Create a secure time-limited token for email verification on registration (valid for 24 hours).
 * Binds validity to the non-sensitive `passwordVersion` integer.
 */
export async function createEmailVerificationToken(
    userId: string,
    email: string,
    passwordVersion: number
): Promise<string> {
    const secretKey = getJwtSecretKey();
    const canonicalEmail = canonicalizeEmailClaim(email);
    const validatedVersion = parseStoredOrTokenPasswordVersion(passwordVersion);

    if (typeof userId !== "string" || !userId || !canonicalEmail || validatedVersion === null) {
        throw new Error("Invalid parameters for email verification token.");
    }

    return await new SignJWT({
        userId,
        email: canonicalEmail,
        purpose: "email_verification",
        passwordVersion: validatedVersion,
    })
        .setProtectedHeader({ alg: "HS256" })
        .setExpirationTime("24h")
        .setIssuedAt()
        .sign(secretKey);
}

/**
 * Verify email verification token (strictly checks purpose === "email_verification")
 */
export async function verifyEmailVerificationToken(
    token: string
): Promise<{ userId: string; email: string; passwordVersion: number } | null> {
    try {
        const secretKey = getJwtSecretKey();
        const verified = await jwtVerify(token, secretKey, {
            algorithms: ["HS256"],
        });
        const payload = verified.payload as Record<string, unknown>;

        if (payload?.purpose !== "email_verification") {
            return null;
        }

        if ("passHashFragment" in payload || "credFp" in payload || "password_hash" in payload) {
            return null;
        }

        const canonicalEmail = canonicalizeEmailClaim(payload.email);
        const validatedVersion = parseStoredOrTokenPasswordVersion(payload.passwordVersion);

        if (
            typeof payload.userId !== "string" ||
            !payload.userId ||
            !canonicalEmail ||
            validatedVersion === null ||
            typeof payload.exp !== "number"
        ) {
            return null;
        }

        return {
            userId: payload.userId,
            email: canonicalEmail,
            passwordVersion: validatedVersion,
        };
    } catch {
        return null;
    }
}
