import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const JWT_SECRET = new TextEncoder().encode(
    process.env.JWT_SECRET || "your-secret-key-change-in-production"
);

const SESSION_COOKIE_NAME = "booking_session";

export type BookingRole = "admin" | "user" | "trainer" | "ntc_team";

export interface BookingUser {
    id: string;
    name: string;
    email: string;
    cardNumber?: string;
    phone?: string;
    role?: BookingRole;
    hasMultisport?: boolean;
    discountTierId?: string;
}

export interface SessionPayload {
    userId: string;
    email: string;
    name: string;
    phone?: string;
    role: BookingRole;
    hasMultisport?: boolean;
    discountTierId?: string;
    exp: number;
}

/**
 * Hash password using Web Crypto API
 */
export async function hashPassword(password: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
    return hashHex;
}

/**
 * Verify password against hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
    const passwordHash = await hashPassword(password);
    return passwordHash === hash;
}

/**
 * Create JWT session token
 */
export async function createSession(user: BookingUser): Promise<string> {
    const payload: SessionPayload = {
        userId: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        role: user.role || "user",
        hasMultisport: Boolean(user.hasMultisport),
        discountTierId: user.discountTierId || "tier-base",
        exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7, // 7 days
    };

    const token = await new SignJWT({ ...payload })
        .setProtectedHeader({ alg: "HS256" })
        .setExpirationTime("7d")
        .sign(JWT_SECRET);

    return token;
}

/**
 * Verify JWT session token
 */
export async function verifySession(token: string): Promise<SessionPayload | null> {
    try {
        const verified = await jwtVerify(token, JWT_SECRET);
        const payload = verified.payload as any;
        if (payload?.purpose || !payload?.userId || !payload?.email) {
            return null;
        }
        return payload as SessionPayload;
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
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

    if (!token) {
        return null;
    }

    return verifySession(token);
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

export const UNVERIFIED_HASH_PREFIX = "UNVERIFIED:";

/**
 * Check whether a stored password_hash indicates an unverified email account
 */
export function isUserHashUnverified(passwordHash?: string | null): boolean {
    if (!passwordHash) return false;
    return passwordHash.startsWith(UNVERIFIED_HASH_PREFIX);
}

/**
 * Strip the UNVERIFIED: prefix to obtain the raw 64-char SHA-256 hex hash
 */
export function stripUnverifiedPrefix(passwordHash?: string | null): string {
    if (!passwordHash) return "";
    if (passwordHash.startsWith(UNVERIFIED_HASH_PREFIX)) {
        return passwordHash.slice(UNVERIFIED_HASH_PREFIX.length);
    }
    return passwordHash;
}

/**
 * Mark a raw password hash as unverified until email confirmation is completed
 */
export function markHashUnverified(rawPasswordHash: string): string {
    const clean = stripUnverifiedPrefix(rawPasswordHash);
    return `${UNVERIFIED_HASH_PREFIX}${clean}`;
}

/**
 * Create a secure time-limited token for password reset (valid for 1 hour)
 */
export async function createPasswordResetToken(
    userId: string,
    email: string,
    passwordHash: string
): Promise<string> {
    const rawHash = stripUnverifiedPrefix(passwordHash);
    const payload = {
        userId,
        email: email.toLowerCase().trim(),
        passHashFragment: rawHash.slice(0, 16),
        purpose: "password_reset",
    };

    return await new SignJWT(payload)
        .setProtectedHeader({ alg: "HS256" })
        .setExpirationTime("1h")
        .sign(JWT_SECRET);
}

/**
 * Verify password reset token
 */
export async function verifyPasswordResetToken(
    token: string
): Promise<{ userId: string; email: string; passHashFragment: string } | null> {
    try {
        const verified = await jwtVerify(token, JWT_SECRET);
        const payload = verified.payload as any;
        if (payload?.purpose !== "password_reset" || !payload.userId || !payload.email || !payload.passHashFragment) {
            return null;
        }
        return {
            userId: String(payload.userId),
            email: String(payload.email).toLowerCase().trim(),
            passHashFragment: String(payload.passHashFragment),
        };
    } catch {
        return null;
    }
}

/**
 * Create a secure time-limited token for email verification on registration (valid for 24 hours)
 */
export async function createEmailVerificationToken(
    userId: string,
    email: string,
    passwordHash: string
): Promise<string> {
    const rawHash = stripUnverifiedPrefix(passwordHash);
    const payload = {
        userId,
        email: email.toLowerCase().trim(),
        passHashFragment: rawHash.slice(0, 16),
        purpose: "email_verification",
    };

    return await new SignJWT(payload)
        .setProtectedHeader({ alg: "HS256" })
        .setExpirationTime("24h")
        .sign(JWT_SECRET);
}

/**
 * Verify email verification token (strictly checks purpose === "email_verification")
 */
export async function verifyEmailVerificationToken(
    token: string
): Promise<{ userId: string; email: string; passHashFragment: string } | null> {
    try {
        const verified = await jwtVerify(token, JWT_SECRET);
        const payload = verified.payload as any;
        if (payload?.purpose !== "email_verification" || !payload.userId || !payload.email || !payload.passHashFragment) {
            return null;
        }
        return {
            userId: String(payload.userId),
            email: String(payload.email).toLowerCase().trim(),
            passHashFragment: String(payload.passHashFragment),
        };
    } catch {
        return null;
    }
}


