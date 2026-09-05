import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const JWT_SECRET = new TextEncoder().encode(
    process.env.JWT_SECRET || "your-secret-key-change-in-production"
);

const SESSION_COOKIE_NAME = "booking_session";

export type BookingRole = "admin" | "user" | "trainer";

export interface BookingUser {
    id: string;
    name: string;
    email: string;
    cardNumber?: string;
    phone?: string;
    role?: BookingRole;
    hasMultisport?: boolean;
}

export interface SessionPayload {
    userId: string;
    email: string;
    name: string;
    phone?: string;
    role: BookingRole;
    hasMultisport?: boolean;
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
                return verified.payload as unknown as SessionPayload;
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
