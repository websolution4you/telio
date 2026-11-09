"use server";

import { getCoreDb } from "@/lib/server/supabase";
import {
    createSession,
    setSessionCookie,
    clearSession,
    getSession,
    type BookingUser,
    normalizePhone,
    createPasswordResetToken,
    verifyPasswordResetToken,
    createEmailVerificationToken,
    verifyEmailVerificationToken,
} from "@/lib/auth/bookingAuth";
import {
    hashPassword,
    verifyPassword,
    isUserHashUnverified,
    stripUnverifiedPrefix,
    markHashUnverified,
    parseInnerCredential,
    validateNewPasswordBounds,
    parseStoredOrTokenPasswordVersion,
    computeNextPasswordVersion,
    CryptoInternalError,
} from "@/lib/auth/passwordHash";
import { Resend } from "resend";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { logActivity } from "@/lib/server/auditLog";

const TENANT_ID = "595cbb6c-1019-41ae-b1c2-a60c13c8dcdf";

// Brute-force protection constants
const MAX_FAILED_LOGIN_ATTEMPTS = 5;
const LOGIN_LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes lockout
const ATTEMPT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes attempt window

// Email verification & password reset rate-limiting constants
const MAX_EMAIL_DISPATCH_ATTEMPTS = 3;
const EMAIL_DISPATCH_WINDOW_MS = 15 * 60 * 1000; // 15 minutes window

interface EmailDispatchRecord {
    count: number;
    windowStartAt: number;
}

const emailDispatchStore: Map<string, EmailDispatchRecord> =
    (globalThis as any).__telioEmailDispatchLimits ||
    ((globalThis as any).__telioEmailDispatchLimits = new Map<string, EmailDispatchRecord>());

function checkAndRecordEmailDispatch(key: string): { allowed: boolean; retryAfterMs: number } {
    const now = Date.now();
    const existing = emailDispatchStore.get(key);

    if (!existing || now - existing.windowStartAt > EMAIL_DISPATCH_WINDOW_MS) {
        emailDispatchStore.set(key, { count: 1, windowStartAt: now });
        return { allowed: true, retryAfterMs: 0 };
    }

    if (existing.count >= MAX_EMAIL_DISPATCH_ATTEMPTS) {
        const retryAfterMs = Math.max(1000, EMAIL_DISPATCH_WINDOW_MS - (now - existing.windowStartAt));
        return { allowed: false, retryAfterMs };
    }

    existing.count += 1;
    emailDispatchStore.set(key, existing);
    return { allowed: true, retryAfterMs: 0 };
}

/**
 * Escape HTML special characters to prevent HTML/XSS injection in transactional emails
 */
function escapeHtml(value: string): string {
    return String(value || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

/**
 * Strictly validate email format (RFC-safe subset, no HTML/control characters, max 254 chars)
 */
function isValidEmailFormat(email: string): boolean {
    if (!email || email.length > 254) return false;
    if (/[\r\n<>"'`\s]/.test(email)) return false;
    return /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/.test(email);
}

/**
 * Prevent Host Header / clientOrigin Phishing & Open Redirect attacks when constructing email links.
 * Only allows canonical NEXT_PUBLIC_APP_URL, official telio.sk domains, or localhost in non-production.
 */
function getSafeAppBaseUrl(clientOrigin?: string): string {
    const envUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
    let canonicalOrigin = "https://www.telio.sk";

    if (envUrl) {
        try {
            canonicalOrigin = new URL(envUrl).origin;
        } catch {
            // Keep default canonical origin if env var is malformed
        }
    } else if (process.env.NODE_ENV !== "production") {
        canonicalOrigin = "http://localhost:3000";
    }

    if (!clientOrigin) {
        return canonicalOrigin;
    }

    try {
        const parsed = new URL(clientOrigin);
        if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
            return canonicalOrigin;
        }

        const host = parsed.hostname.toLowerCase();
        const isTrustedProdHost =
            host === "telio.sk" ||
            host === "www.telio.sk" ||
            host.endsWith(".telio.sk");

        const isLocalDevHost =
            process.env.NODE_ENV !== "production" &&
            (host === "localhost" || host === "127.0.0.1");

        let matchesEnvHost = false;
        if (envUrl) {
            try {
                matchesEnvHost = new URL(envUrl).origin === parsed.origin;
            } catch {
                matchesEnvHost = false;
            }
        }

        if (isTrustedProdHost || isLocalDevHost || matchesEnvHost) {
            return parsed.origin;
        }
    } catch {
        // Ignore malformed clientOrigin and return canonicalOrigin
    }

    return canonicalOrigin;
}

function logCryptoInternalFailure(context: string, err: CryptoInternalError): void {
    console.error(`[AUTH_CRYPTO_INTERNAL_ERROR] context=${context} operation=${err.operation} code=${err.errorCode || "none"}`);
}

async function sendEmailVerificationMessage(params: {
    userId: string;
    name: string;
    email: string;
    passwordVersion: number;
    clientOrigin?: string;
}): Promise<{ sent: boolean; verifyUrl: string; errorReason?: string }> {
    const token = await createEmailVerificationToken(params.userId, params.email, params.passwordVersion);
    const baseUrl = getSafeAppBaseUrl(params.clientOrigin);
    const verifyUrl = `${baseUrl}/newbookings?verify_email_token=${encodeURIComponent(token)}`;
    const safeName = escapeHtml(params.name);

    const resend = getResendClient();
    if (!resend) {
        console.warn("[EMAIL VERIFICATION] RESEND_API_KEY is not configured in environment variables!");
        return { sent: false, verifyUrl, errorReason: "RESEND_API_KEY nie je nakonfigurovaný v prostredí" };
    }

    try {
        const fromEmail = process.env.RESEND_FROM || "NTC Rezervacie <rezervacie@telio.sk>";
        const { data: resData, error: sendError } = await resend.emails.send({
            from: fromEmail,
            to: params.email,
            subject: "Overenie e-mailovej adresy - NTC Rezervacie",
            html: `
                <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 580px; margin: 0 auto; padding: 32px 24px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px;">
                    <div style="margin-bottom: 24px;">
                        <span style="font-size: 18px; font-weight: 800; color: #0f172a; letter-spacing: -0.5px;">NTC Rezervačný systém</span>
                    </div>
                    <h2 style="font-size: 20px; font-weight: 700; color: #0f172a; margin-top: 0; margin-bottom: 16px;">Potvrdenie registrácie účtu</h2>
                    <p style="color: #475569; font-size: 15px; line-height: 1.6; margin-bottom: 12px;">Dobrý deň <strong>${safeName}</strong>,</p>
                    <p style="color: #475569; font-size: 15px; line-height: 1.6; margin-bottom: 24px;">ďakujeme za registráciu v rezervačnom systéme NTC Bratislava. Pre aktiváciu vášho účtu a overenie platnosti e-mailovej adresy kliknite na tlačidlo nižšie:</p>
                    <div style="margin: 28px 0;">
                        <a href="${verifyUrl}" style="background-color: #10b981; color: #ffffff; padding: 13px 28px; font-size: 15px; font-weight: 700; text-decoration: none; border-radius: 10px; display: inline-block;">Overiť e-mail a aktivovať účet</a>
                    </div>
                    <p style="color: #64748b; font-size: 13px; line-height: 1.5; margin-bottom: 24px;">Overovací odkaz je platný <strong>24 hodín</strong>. Ak ste si účet nevytvárali vy, tento e-mail môžete bez obáv ignorovať.</p>
                    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
                    <p style="color: #94a3b8; font-size: 12px; line-height: 1.5;">Ak tlačidlo nefunguje, skopírujte tento odkaz do prehliadača:<br /><a href="${verifyUrl}" style="color: #0284c7; word-break: break-all;">${verifyUrl}</a></p>
                </div>
            `,
            text: `Dobrý deň ${params.name},\n\nĎakujeme za registráciu v rezervačnom systéme NTC Bratislava.\nPre overenie e-mailovej adresy a aktiváciu účtu kliknite na nasledujúci odkaz (platný 24 hodín):\n${verifyUrl}\n\nAk ste sa neregistrovali vy, tento e-mail ignorujte.`,
        });

        if (sendError) {
            console.error("[EMAIL VERIFICATION] Resend send error:", sendError.message || "send_error");
            return { sent: false, verifyUrl, errorReason: sendError.message || "Chyba Resend servera" };
        }
        console.log("[EMAIL VERIFICATION] Resend email dispatched successfully, id:", resData?.id);
        return { sent: true, verifyUrl };
    } catch (emailErr: any) {
        console.error("[EMAIL VERIFICATION] Exception while calling Resend:", emailErr?.message || "unknown_error");
        return { sent: false, verifyUrl, errorReason: emailErr?.message || "Zlyhalo volanie Resend API" };
    }
}

interface FailedLoginRecord {
    count: number;
    lastFailedAt: number;
    lockedUntil?: number;
}

const loginAttemptsStore: Map<string, FailedLoginRecord> =
    (globalThis as any).__telioLoginAttempts ||
    ((globalThis as any).__telioLoginAttempts = new Map<string, FailedLoginRecord>());

function formatRemainingTime(ms: number): string {
    const totalSeconds = Math.max(1, Math.ceil(ms / 1000));
    if (totalSeconds < 60) {
        if (totalSeconds === 1) return "1 sekundu";
        if (totalSeconds >= 2 && totalSeconds <= 4) return `${totalSeconds} sekundy`;
        return `${totalSeconds} sekúnd`;
    }
    const mins = Math.ceil(totalSeconds / 60);
    if (mins === 1) return "1 minútu";
    if (mins >= 2 && mins <= 4) return `${mins} minúty`;
    return `${mins} minút`;
}

function checkLoginLockout(emailKey: string): { isLocked: boolean; remainingMs: number } {
    const record = loginAttemptsStore.get(emailKey);
    if (!record) return { isLocked: false, remainingMs: 0 };

    const now = Date.now();

    if (record.lockedUntil && record.lockedUntil > now) {
        return { isLocked: true, remainingMs: record.lockedUntil - now };
    }

    if (record.lockedUntil && record.lockedUntil <= now) {
        loginAttemptsStore.delete(emailKey);
        return { isLocked: false, remainingMs: 0 };
    }

    if (now - record.lastFailedAt > ATTEMPT_WINDOW_MS) {
        loginAttemptsStore.delete(emailKey);
        return { isLocked: false, remainingMs: 0 };
    }

    return { isLocked: false, remainingMs: 0 };
}

function recordFailedLogin(emailKey: string): { isNowLocked: boolean; remainingAttempts: number; lockoutTimeText?: string } {
    const now = Date.now();
    let record = loginAttemptsStore.get(emailKey);

    if (!record || (now - record.lastFailedAt > ATTEMPT_WINDOW_MS && !record.lockedUntil)) {
        record = { count: 1, lastFailedAt: now };
    } else {
        record.count += 1;
        record.lastFailedAt = now;
    }

    if (record.count >= MAX_FAILED_LOGIN_ATTEMPTS) {
        record.lockedUntil = now + LOGIN_LOCKOUT_MS;
        loginAttemptsStore.set(emailKey, record);
        return {
            isNowLocked: true,
            remainingAttempts: 0,
            lockoutTimeText: formatRemainingTime(LOGIN_LOCKOUT_MS),
        };
    }

    loginAttemptsStore.set(emailKey, record);
    return {
        isNowLocked: false,
        remainingAttempts: MAX_FAILED_LOGIN_ATTEMPTS - record.count,
    };
}

function clearFailedLogins(emailKey: string) {
    loginAttemptsStore.delete(emailKey);
}

function getResendClient() {
    const key = process.env.RESEND_API_KEY;
    if (!key) return null;
    try {
        return new Resend(key);
    } catch {
        return null;
    }
}

export async function loginAction(email: string, password: string) {
    try {
        if (!email || !password) {
            return { success: false, error: "Email a heslo sú povinné" };
        }

        const normalizedEmail = email.toLowerCase().trim();

        // 1. Check client cookie lock (persists across serverless container restarts for this specific email)
        let cookieLockUntil: number | null = null;
        try {
            const cookieStore = await cookies();
            const lockVal = cookieStore.get("telio_login_lock")?.value;
            if (lockVal) {
                try {
                    const parsed = JSON.parse(lockVal);
                    if (parsed?.email === normalizedEmail && typeof parsed?.lockedUntil === "number" && parsed.lockedUntil > Date.now()) {
                        cookieLockUntil = parsed.lockedUntil;
                    }
                } catch {
                    // Legacy plain-timestamp cookie: delete it so it does not block different accounts
                    try {
                        cookieStore.delete("telio_login_lock");
                    } catch {}
                }
            }
        } catch {
            // Ignore cookie reading errors
        }

        // 2. Check in-memory lockout
        const lockStatus = checkLoginLockout(normalizedEmail);
        const effectiveLockUntil = lockStatus.isLocked
            ? (loginAttemptsStore.get(normalizedEmail)?.lockedUntil || 0)
            : (cookieLockUntil || 0);

        if (effectiveLockUntil > Date.now()) {
            const remainingText = formatRemainingTime(effectiveLockUntil - Date.now());
            return {
                success: false,
                error: `Bolo zadaných 5 nesprávnych hesiel. Z dôvodu ochrany pred neoprávneným prístupom je prihlásenie dočasne zablokované na ${remainingText}.`,
            };
        }

        const db = getCoreDb();

        // Find user by email (read-only login: does NOT select or update password_version)
        let { data: user, error: dbError } = await db
            .from("booking_users")
            .select("id, name, email, password_hash, card_number, phone, role, has_multisport, discount_tier_id")
            .eq("email", normalizedEmail)
            .maybeSingle();

        if (dbError && (dbError.message?.includes("has_multisport") || dbError.message?.includes("discount_tier_id") || (dbError as any).code === "PGRST204")) {
            const fallback = await db
                .from("booking_users")
                .select("id, name, email, password_hash, card_number, phone, role")
                .eq("email", normalizedEmail)
                .maybeSingle();
            user = fallback.data ? { ...fallback.data, has_multisport: false, discount_tier_id: "tier-base" } : null;
            dbError = fallback.error;
        }

        if (dbError) {
            console.error("Login DB Error:", dbError.message || "db_error");
        }

        if (dbError || !user) {
            const fail = recordFailedLogin(normalizedEmail);

            await logActivity({
                action: "auth.login_failed",
                category: "auth",
                entityType: "user",
                entityId: null,
                entityName: normalizedEmail,
                description: `Neúspešný pokus o prihlásenie pre ${normalizedEmail} (používateľ sa nenašiel)`,
                actor: {
                    name: normalizedEmail,
                    email: normalizedEmail,
                    role: "user",
                },
                metadata: {
                    email: normalizedEmail,
                    locked: fail.isNowLocked,
                    remainingAttempts: fail.remainingAttempts,
                },
                level: fail.isNowLocked ? "critical" : "warning",
            });

            if (fail.isNowLocked) {
                try {
                    const cookieStore = await cookies();
                    cookieStore.set(
                        "telio_login_lock",
                        JSON.stringify({ email: normalizedEmail, lockedUntil: Date.now() + LOGIN_LOCKOUT_MS }),
                        {
                            httpOnly: true,
                            secure: process.env.NODE_ENV === "production",
                            sameSite: "lax",
                            maxAge: Math.floor(LOGIN_LOCKOUT_MS / 1000),
                            path: "/",
                        }
                    );
                } catch {}
                return {
                    success: false,
                    error: `Bolo zadaných 5 nesprávnych pokusov. Účet bol z bezpečnostných dôvodov zablokovaný na ${fail.lockoutTimeText}.`,
                };
            }
            return {
                success: false,
                userNotFound: true,
                error: `Používateľ s e-mailom "${normalizedEmail}" neexistuje. Skontrolujte prosím správnosť e-mailu, alebo sa zaregistrujte.`,
            };
        }

        // Verify password against raw inner credential (even if account is still unverified, we verify password first to prevent user enumeration).
        // Never modifies password_hash or password_version during login.
        const rawStoredHash = stripUnverifiedPrefix(user.password_hash);
        let isValid = false;
        try {
            isValid = await verifyPassword(password, rawStoredHash);
        } catch (verifyErr) {
            if (verifyErr instanceof CryptoInternalError) {
                logCryptoInternalFailure("loginAction.verifyPassword", verifyErr);
                return {
                    success: false,
                    error: "Chyba pri prihlasovaní. Skúste to prosím znova.",
                };
            }
            throw verifyErr;
        }

        if (!isValid) {
            const fail = recordFailedLogin(normalizedEmail);

            await logActivity({
                action: "auth.login_failed",
                category: "auth",
                entityType: "user",
                entityId: user.id,
                entityName: user.name,
                description: `Neúspešný pokus o prihlásenie pre ${user.name} (${normalizedEmail}) - nesprávne heslo`,
                actor: {
                    id: user.id,
                    name: user.name,
                    email: normalizedEmail,
                    role: user.role,
                },
                metadata: {
                    userId: user.id,
                    email: normalizedEmail,
                    role: user.role,
                    locked: fail.isNowLocked,
                    remainingAttempts: fail.remainingAttempts,
                },
                level: fail.isNowLocked ? "critical" : "warning",
            });

            if (fail.isNowLocked) {
                try {
                    const cookieStore = await cookies();
                    cookieStore.set(
                        "telio_login_lock",
                        JSON.stringify({ email: normalizedEmail, lockedUntil: Date.now() + LOGIN_LOCKOUT_MS }),
                        {
                            httpOnly: true,
                            secure: process.env.NODE_ENV === "production",
                            sameSite: "lax",
                            maxAge: Math.floor(LOGIN_LOCKOUT_MS / 1000),
                            path: "/",
                        }
                    );
                } catch {}
                return {
                    success: false,
                    error: `Bolo zadaných 5 nesprávnych hesiel. Účet bol z bezpečnostných dôvodov zablokovaný na ${fail.lockoutTimeText}.`,
                };
            }
            return {
                success: false,
                error: `Nesprávne heslo. Zostávajúce pokusy pred zablokovaním: ${fail.remainingAttempts}.`,
            };
        }

        // Password is valid — enforce mandatory email verification before issuing a session
        if (isUserHashUnverified(user.password_hash) || (user as any).email_verified === false) {
            await logActivity({
                action: "auth.login_blocked_unverified",
                category: "auth",
                entityType: "user",
                entityId: user.id,
                entityName: user.name,
                description: `Pokus o prihlásenie neovereného účtu "${user.name}" (${user.email})`,
                actor: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                },
                metadata: {
                    userId: user.id,
                    email: user.email,
                },
                level: "warning",
            });

            return {
                success: false,
                requiresEmailVerification: true,
                email: user.email,
                error: "Váš e-mail ešte nebol overený. Potvrďte prosím registráciu kliknutím na overovací odkaz v e-maile (skontrolujte aj priečinok Spam / Nevyžiadaná pošta).",
            };
        }

        // Successful login: Clear failed login attempts and cookie (only if matching this email)
        clearFailedLogins(normalizedEmail);
        try {
            const cookieStore = await cookies();
            const lockVal = cookieStore.get("telio_login_lock")?.value;
            if (lockVal) {
                try {
                    const parsed = JSON.parse(lockVal);
                    if (parsed?.email === normalizedEmail) {
                        cookieStore.delete("telio_login_lock");
                    }
                } catch {
                    cookieStore.delete("telio_login_lock");
                }
            }
        } catch {}

        // Create session
        const bookingUser: BookingUser = {
            id: user.id,
            name: user.name,
            email: user.email,
            cardNumber: user.card_number,
            phone: user.phone,
            role: user.role,
            hasMultisport: Boolean((user as any).has_multisport),
            discountTierId: (user as any).discount_tier_id || "tier-base",
        };

        const token = await createSession(bookingUser);
        await setSessionCookie(token);

        await logActivity({
            action: "auth.login",
            category: "auth",
            entityType: "user",
            entityId: user.id,
            entityName: user.name,
            description: `Prihlásenie používateľa "${user.name}" (${user.email}, rola: ${user.role})`,
            actor: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
            },
            metadata: {
                userId: user.id,
                role: user.role,
                cardNumber: user.card_number || null,
            },
            level: "info",
        });

        return { success: true, user: bookingUser };
    } catch (error: any) {
        console.error("Login error:", error?.message || "unknown_error");
        return { success: false, error: "Chyba pri prihlasovaní" };
    }
}

export async function registerAction(
    name: string,
    email: string,
    password: string,
    cardNumber?: string,
    phone?: string,
    clientOrigin?: string
) {
    try {
        if (!name || !email || !password) {
            return { success: false, error: "Meno, email a heslo sú povinné" };
        }

        const cleanName = name.trim();
        if (cleanName.length < 2 || cleanName.length > 120) {
            return { success: false, error: "Meno a priezvisko musí mať 2 až 120 znakov" };
        }

        const passwordBounds = validateNewPasswordBounds(password, 8);
        if (!passwordBounds.valid) {
            return { success: false, error: passwordBounds.error };
        }

        if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
            return { success: false, error: "Heslo musí obsahovať aspoň jedno písmeno a jednu číslicu" };
        }

        const cleanEmail = email.toLowerCase().trim();
        if (!isValidEmailFormat(cleanEmail)) {
            return { success: false, error: "Zadajte platnú e-mailovú adresu" };
        }

        const cleanPhone = normalizePhone(phone);
        const cleanCard = cardNumber?.trim() || null;

        const db = getCoreDb();

        // Check if user already exists by email
        const { data: existingEmail, error: existingLookupError } = await db
            .from("booking_users")
            .select("id, name, email, password_hash, password_version")
            .eq("email", cleanEmail)
            .maybeSingle();

        if (existingLookupError) {
            console.error("Registration email lookup error:", existingLookupError.message || "db_error");
            return { success: false, error: "Chyba pri registrácii" };
        }

        if (existingEmail) {
            // If the existing account is still unverified, offer a clear message and resend verification if within rate limit
            if (isUserHashUnverified(existingEmail.password_hash)) {
                const existingVersion = parseStoredOrTokenPasswordVersion((existingEmail as any).password_version);
                const parsedExistingInner = parseInnerCredential(stripUnverifiedPrefix(existingEmail.password_hash));

                if (existingVersion !== null && parsedExistingInner.kind !== "invalid") {
                    const rateCheck = checkAndRecordEmailDispatch(`verify:${cleanEmail}`);
                    if (rateCheck.allowed) {
                        await sendEmailVerificationMessage({
                            userId: existingEmail.id,
                            name: existingEmail.name || cleanName,
                            email: existingEmail.email,
                            passwordVersion: existingVersion,
                            clientOrigin,
                        });
                    }
                }
                return {
                    success: false,
                    requiresEmailVerification: true,
                    email: cleanEmail,
                    error: "Účet s týmto e-mailom už bol vytvorený, ale ešte nie je aktivovaný. Na váš e-mail sme znova odoslali overovací odkaz.",
                };
            }
            return { success: false, error: "Používateľ s týmto emailom už existuje" };
        }

        // Rate limit verification email dispatch for this address
        const rateCheck = checkAndRecordEmailDispatch(`verify:${cleanEmail}`);
        if (!rateCheck.allowed) {
            const waitText = formatRemainingTime(rateCheck.retryAfterMs);
            return {
                success: false,
                error: `Príliš veľa pokusov o odoslanie overovacieho e-mailu. Skúste to prosím znova o ${waitText}.`,
            };
        }

        // Hash password with scrypt-v1 and mark as UNVERIFIED until the user clicks the email verification link
        let rawPasswordHash: string;
        try {
            rawPasswordHash = await hashPassword(password);
        } catch (hashErr) {
            if (hashErr instanceof CryptoInternalError) {
                logCryptoInternalFailure("registerAction.hashPassword", hashErr);
                return { success: false, error: "Chyba pri registrácii. Skúste to prosím znova." };
            }
            throw hashErr;
        }
        const unverifiedPasswordHash = markHashUnverified(rawPasswordHash);

        // If no card number provided (e.g. self-registration), auto-assign the next unique PIN
        let finalCardNumber = cleanCard;
        if (!finalCardNumber) {
            const { data: existingCardUsers } = await db
                .from("booking_users")
                .select("card_number")
                .not("card_number", "is", null);

            const existingPins = new Set<string>();
            let maxPin = 0;

            if (existingCardUsers && existingCardUsers.length > 0) {
                for (const u of existingCardUsers) {
                    if (u.card_number) {
                        const trimmed = String(u.card_number).trim();
                        existingPins.add(trimmed);
                        if (/^\d+$/.test(trimmed)) {
                            const num = parseInt(trimmed, 10);
                            if (num > maxPin) {
                                maxPin = num;
                            }
                        }
                    }
                }
            }

            let nextPin = maxPin + 1;
            let candidate = String(nextPin).padStart(4, "0");
            while (existingPins.has(candidate)) {
                nextPin++;
                candidate = String(nextPin).padStart(4, "0");
            }
            finalCardNumber = candidate;
        }

        // Create user in unverified state (supports optional email_verified column with automatic fallback,
        // but strictly requires password_version column from migration — fail-closed if missing).
        let { data: user, error: dbError } = await db
            .from("booking_users")
            .insert({
                name: cleanName,
                email: cleanEmail,
                password_hash: unverifiedPasswordHash,
                card_number: finalCardNumber,
                phone: cleanPhone,
                role: "user",
                email_verified: false,
            } as any)
            .select("id, name, email, card_number, phone, role, password_version")
            .single();

        if (
            dbError &&
            !dbError.message?.includes("password_version") &&
            (dbError.message?.includes("email_verified") || (dbError as any).code === "PGRST204")
        ) {
            const fallbackInsert = await db
                .from("booking_users")
                .insert({
                    name: cleanName,
                    email: cleanEmail,
                    password_hash: unverifiedPasswordHash,
                    card_number: finalCardNumber,
                    phone: cleanPhone,
                    role: "user",
                })
                .select("id, name, email, card_number, phone, role, password_version")
                .single();
            user = fallbackInsert.data;
            dbError = fallbackInsert.error;
        }

        if (dbError || !user) {
            console.error("Registration DB error:", dbError?.message || "insert_failed");
            return { success: false, error: "Chyba pri registrácii" };
        }

        const insertedPasswordVersion = parseStoredOrTokenPasswordVersion((user as any).password_version);
        if (insertedPasswordVersion === null) {
            console.error("Registration DB error: missing or invalid password_version on inserted user");
            return { success: false, error: "Chyba pri registrácii" };
        }

        // Ensure wallet exists for user
        try {
            await db.from("wallets").insert({
                tenant_id: TENANT_ID,
                user_id: user.id,
                balance_eur: 0,
            });
        } catch (walletErr) {
            console.warn("Could not create initial wallet for user:", walletErr);
        }

        // Send verification email via Resend (do NOT set session cookie until email is verified)
        const sendResult = await sendEmailVerificationMessage({
            userId: user.id,
            name: user.name,
            email: user.email,
            passwordVersion: insertedPasswordVersion,
            clientOrigin,
        });

        if (!sendResult.sent) {
            await logActivity({
                action: "auth.email_verification_failed",
                category: "auth",
                entityType: "user",
                entityId: user.id,
                entityName: user.name,
                description: `Zlyhalo odoslanie overovacieho e-mailu pre nový účet "${user.name}" (${user.email}): ${sendResult.errorReason || "neznáma chyba"}`,
                actor: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                },
                metadata: {
                    userId: user.id,
                    email: user.email,
                    error: sendResult.errorReason,
                },
                level: "warning",
            });
        }

        await logActivity({
            action: "auth.register",
            category: "auth",
            entityType: "user",
            entityId: user.id,
            entityName: user.name,
            description: `Nová registrácia používateľa "${user.name}" (${user.email}) – čaká na overenie e-mailu`,
            actor: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
            },
            metadata: {
                userId: user.id,
                email: user.email,
                role: user.role,
                cardNumber: cleanCard,
                emailVerified: false,
                emailSent: sendResult.sent,
            },
            level: "info",
        });

        const successNotice = sendResult.sent
            ? `Registrácia prebehla úspešne! Na adresu ${user.email} sme odoslali overovací odkaz. Pre dokončenie registrácie a prihlásenie kliknite na odkaz v e-maile.`
            : `Registrácia prebehla, ale overovací e-mail sa nepodarilo odoslať (${sendResult.errorReason || "chyba odosielania"}). Účet vám môže na počkanie aktivovať recepcia NTC.`;

        return {
            success: true,
            requiresEmailVerification: true,
            email: user.email,
            message: successNotice,
        };
    } catch (error: any) {
        console.error("Registration error:", error?.message || "unknown_error");
        return { success: false, error: "Chyba pri registrácii" };
    }
}

export async function logoutAction() {
    try {
        const session = await getSession();
        if (session) {
            await logActivity({
                action: "auth.logout",
                category: "auth",
                entityType: "user",
                entityId: session.userId,
                entityName: session.name,
                description: `Odhlásenie používateľa "${session.name}" (${session.email})`,
                actor: {
                    id: session.userId,
                    name: session.name,
                    email: session.email,
                    role: session.role,
                },
                metadata: { role: session.role },
                level: "info",
            });
        }
        await clearSession();
        return { success: true };
    } catch (error: any) {
        console.error("Logout error:", error?.message || "unknown_error");
        return { success: false, error: "Chyba pri odhlasovaní" };
    }
}

export async function getCurrentUserAction() {
    try {
        const session = await getSession();

        if (!session) {
            return { success: false, user: null };
        }

        const db = getCoreDb();

        let { data: user, error: dbError } = await db
            .from("booking_users")
            .select("id, name, email, password_hash, card_number, phone, role, has_multisport, discount_tier_id")
            .eq("id", session.userId)
            .single();

        if (dbError && (dbError.message?.includes("has_multisport") || dbError.message?.includes("discount_tier_id") || (dbError as any).code === "PGRST204")) {
            const fallback = await db
                .from("booking_users")
                .select("id, name, email, password_hash, card_number, phone, role")
                .eq("id", session.userId)
                .single();
            user = fallback.data ? { ...fallback.data, has_multisport: false, discount_tier_id: "tier-base" } : null;
            dbError = fallback.error;
        }

        if (dbError || !user || isUserHashUnverified(user.password_hash) || (user as any).email_verified === false) {
            await clearSession();
            return { success: false, user: null };
        }

        const bookingUser: BookingUser = {
            id: user.id,
            name: user.name,
            email: user.email,
            cardNumber: user.card_number,
            phone: user.phone,
            role: user.role,
            hasMultisport: Boolean((user as any).has_multisport),
            discountTierId: (user as any).discount_tier_id || "tier-base",
        };

        return { success: true, user: bookingUser };
    } catch (error: any) {
        console.error("Get current user error:", error?.message || "unknown_error");
        return { success: false, user: null };
    }
}

/**
 * Update profile details (name and phone) for current logged-in user
 */
export async function updateProfileDetailsAction(name: string, phone?: string) {
    try {
        const session = await getSession();
        if (!session) {
            return { success: false, error: "Nie ste prihlásený" };
        }

        const cleanName = name?.trim();
        if (!cleanName || cleanName.length < 2) {
            return { success: false, error: "Meno a priezvisko musí mať aspoň 2 znaky" };
        }

        const cleanPhone = normalizePhone(phone);
        const db = getCoreDb();

        // Update booking_users table
        const { error: updateError } = await db
            .from("booking_users")
            .update({
                name: cleanName,
                phone: cleanPhone,
            })
            .eq("id", session.userId);

        if (updateError) {
            console.error("Update profile DB error:", updateError.message || "db_error");
            return { success: false, error: "Chyba pri ukladaní údajov" };
        }

        // Fetch fresh user data to recreate session cookie
        let { data: updatedUser } = await db
            .from("booking_users")
            .select("id, name, email, card_number, phone, role, has_multisport, discount_tier_id")
            .eq("id", session.userId)
            .single();

        const bookingUser: BookingUser = {
            id: session.userId,
            name: cleanName,
            email: session.email,
            cardNumber: updatedUser?.card_number,
            phone: cleanPhone || undefined,
            role: session.role,
            hasMultisport: Boolean((updatedUser as any)?.has_multisport),
            discountTierId: (updatedUser as any)?.discount_tier_id || (session as any).discountTierId || "tier-base",
        };

        const token = await createSession(bookingUser);
        await setSessionCookie(token);

        return { success: true, user: bookingUser, message: "Profil bol úspešne aktualizovaný" };
    } catch (error: any) {
        console.error("Update profile error:", error?.message || "unknown_error");
        return { success: false, error: "Nepodarilo sa aktualizovať profil" };
    }
}

/**
 * Change password for current logged-in user (uses atomic Compare-And-Set on password_version)
 */
export async function changePasswordAction(currentPassword: string, newPassword: string) {
    try {
        const session = await getSession();
        if (!session) {
            return { success: false, error: "Nie ste prihlásený" };
        }

        if (!currentPassword || !newPassword) {
            return { success: false, error: "Vyplňte aktuálne aj nové heslo" };
        }

        const newPasswordBounds = validateNewPasswordBounds(newPassword, 6);
        if (!newPasswordBounds.valid) {
            if (newPasswordBounds.reason === "too_short") {
                return { success: false, error: "Nové heslo musí mať aspoň 6 znakov" };
            }
            return { success: false, error: newPasswordBounds.error };
        }

        const db = getCoreDb();

        const { data: user, error: dbError } = await db
            .from("booking_users")
            .select("id, password_hash, password_version")
            .eq("id", session.userId)
            .single();

        if (dbError || !user) {
            return { success: false, error: "Používateľ nebol nájdený" };
        }

        const versionStep = computeNextPasswordVersion((user as any).password_version);
        if (!versionStep) {
            console.error("Change password error: missing or non-incrementable password_version");
            return { success: false, error: "Chyba pri ukladaní nového hesla" };
        }

        const rawCurrentStoredHash = stripUnverifiedPrefix(user.password_hash);
        let isValid = false;
        try {
            isValid = await verifyPassword(currentPassword, rawCurrentStoredHash);
        } catch (verifyErr) {
            if (verifyErr instanceof CryptoInternalError) {
                logCryptoInternalFailure("changePasswordAction.verifyPassword", verifyErr);
                return { success: false, error: "Nepodarilo sa overiť aktuálne heslo. Skúste to prosím znova." };
            }
            throw verifyErr;
        }

        if (!isValid) {
            return { success: false, error: "Aktuálne heslo nie je správne" };
        }

        let newHash: string;
        try {
            newHash = await hashPassword(newPassword);
        } catch (hashErr) {
            if (hashErr instanceof CryptoInternalError) {
                logCryptoInternalFailure("changePasswordAction.hashPassword", hashErr);
                return { success: false, error: "Chyba pri ukladaní nového hesla" };
            }
            throw hashErr;
        }

        const { data: updatedRow, error: updateError } = await db
            .from("booking_users")
            .update({
                password_hash: newHash,
                password_version: versionStep.nextVersion,
            } as any)
            .eq("id", session.userId)
            .eq("password_version", versionStep.currentVersion)
            .select("id, password_version")
            .maybeSingle();

        if (updateError) {
            console.error("Change password DB error:", updateError.message || "db_error");
            return { success: false, error: "Chyba pri ukladaní nového hesla" };
        }

        if (!updatedRow) {
            return {
                success: false,
                error: "Účet bol medzičasom zmenený v inom okne alebo relácii. Obnovte stránku a skúste to znova.",
            };
        }

        return { success: true, message: "Heslo bolo úspešne zmenené" };
    } catch (error: any) {
        console.error("Change password error:", error?.message || "unknown_error");
        return { success: false, error: "Nepodarilo sa zmeniť heslo" };
    }
}

/**
 * Request password reset email for unauthenticated user
 */
export async function requestPasswordResetAction(email: string, clientOrigin?: string) {
    try {
        if (!email) {
            return { success: false, error: "Zadajte váš email" };
        }

        const cleanEmail = email.toLowerCase().trim();
        if (!isValidEmailFormat(cleanEmail)) {
            return { success: false, error: "Zadajte platnú e-mailovú adresu" };
        }

        const rateCheck = checkAndRecordEmailDispatch(`reset:${cleanEmail}`);
        if (!rateCheck.allowed) {
            const waitText = formatRemainingTime(rateCheck.retryAfterMs);
            return {
                success: false,
                error: `Príliš veľa žiadostí o obnovu hesla. Skúste to prosím znova o ${waitText}.`,
            };
        }

        const db = getCoreDb();

        const { data: user, error: lookupError } = await db
            .from("booking_users")
            .select("id, name, email, password_hash, password_version")
            .eq("email", cleanEmail)
            .maybeSingle();

        if (lookupError) {
            console.error("Request password reset DB error:", lookupError.message || "db_error");
            return { success: false, error: "Požiadavku sa nepodarilo spracovať" };
        }

        if (!user) {
            return {
                success: false,
                notFound: true,
                error: `Účet s e-mailovou adresou "${cleanEmail}" u nás neexistuje. Skontrolujte prosím prípadný preklep, alebo sa zaregistrujte.`,
            };
        }

        // Fail-closed: verify that password_version is valid and incrementable, and that stored inner credential is valid
        const versionStep = computeNextPasswordVersion((user as any).password_version);
        const parsedInner = parseInnerCredential(stripUnverifiedPrefix(user.password_hash));
        if (!versionStep || parsedInner.kind === "invalid") {
            console.error("Request password reset blocked: invalid stored password_version or credential format");
            return { success: false, error: "Požiadavku sa nepodarilo spracovať" };
        }

        const token = await createPasswordResetToken(user.id, user.email, versionStep.currentVersion);
        const baseUrl = getSafeAppBaseUrl(clientOrigin);
        const resetUrl = `${baseUrl}/newbookings?reset_token=${encodeURIComponent(token)}`;
        const safeName = escapeHtml(user.name);

        const resend = getResendClient();
        if (!resend) {
            console.warn("[PASSWORD RESET] RESEND_API_KEY is not configured in environment variables!");
            await logActivity({
                action: "auth.password_reset_failed",
                category: "auth",
                entityType: "user",
                entityId: user.id,
                entityName: user.name,
                description: `Zlyhalo odoslanie e-mailu na obnovu hesla pre "${user.name}" (${user.email}) – chýba RESEND_API_KEY`,
                level: "warning",
            });
            return {
                success: false,
                error: "E-mailový systém nie je momentálne nakonfigurovaný (chýba RESEND_API_KEY). Kontaktujte prosím recepciu.",
            };
        }

        try {
            const fromEmail = process.env.RESEND_FROM || "NTC Rezervacie <rezervacie@telio.sk>";
            const { data: resData, error: sendError } = await resend.emails.send({
                from: fromEmail,
                to: user.email,
                subject: "Obnova hesla - NTC Rezervacie",
                html: `
                    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 580px; margin: 0 auto; padding: 32px 24px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px;">
                        <div style="margin-bottom: 24px;">
                            <span style="font-size: 18px; font-weight: 800; color: #0f172a; letter-spacing: -0.5px;">NTC Rezervačný systém</span>
                        </div>
                        <h2 style="font-size: 20px; font-weight: 700; color: #0f172a; margin-top: 0; margin-bottom: 16px;">Žiadosť o obnovu hesla</h2>
                        <p style="color: #475569; font-size: 15px; line-height: 1.6; margin-bottom: 12px;">Dobrý deň <strong>${safeName}</strong>,</p>
                        <p style="color: #475569; font-size: 15px; line-height: 1.6; margin-bottom: 24px;">obdržali sme žiadosť o obnovu hesla k vášmu účtu. Kliknite na tlačidlo nižšie pre nastavenie nového hesla:</p>
                        <div style="margin: 28px 0;">
                            <a href="${resetUrl}" style="background-color: #10b981; color: #ffffff; padding: 13px 28px; font-size: 15px; font-weight: 700; text-decoration: none; border-radius: 10px; display: inline-block;">Nastaviť nové heslo</a>
                        </div>
                        <p style="color: #64748b; font-size: 13px; line-height: 1.5; margin-bottom: 24px;">Odkaz je platný <strong>1 hodinu</strong>. Ak ste o obnovu hesla nežiadali, tento email môžete bez obáv ignorovať, vaše existujúce heslo zostane nezmenené.</p>
                        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
                        <p style="color: #94a3b8; font-size: 12px; line-height: 1.5;">Ak tlačidlo nefunguje, skopírujte tento odkaz do prehliadača:<br /><a href="${resetUrl}" style="color: #0284c7; word-break: break-all;">${resetUrl}</a></p>
                    </div>
                `,
                text: `Dobrý deň ${user.name},\n\nPre obnovu hesla kliknite na nasledujúci odkaz (platný 1 hodinu):\n${resetUrl}\n\nAk ste o zmenu nežiadali, tento email ignorujte.`
            });

            if (sendError) {
                console.error("[PASSWORD RESET] Resend send error:", sendError.message || "send_error");
                await logActivity({
                    action: "auth.password_reset_failed",
                    category: "auth",
                    entityType: "user",
                    entityId: user.id,
                    entityName: user.name,
                    description: `Zlyhalo odoslanie e-mailu na obnovu hesla pre "${user.name}" (${user.email}): ${sendError.message}`,
                    metadata: { error: sendError },
                    level: "warning",
                });
                return {
                    success: false,
                    error: `Nepodarilo sa odoslať resetovací e-mail (${sendError.message || "chyba poštového servera"}). Skúste to prosím znova neskôr.`,
                };
            }

            console.log("[PASSWORD RESET] Resend email dispatched successfully, id:", resData?.id);
        } catch (emailErr: any) {
            console.error("[PASSWORD RESET] Exception while calling Resend:", emailErr?.message || "unknown_error");
            return {
                success: false,
                error: "Vyskytla sa neočakávaná chyba pri odosielaní e-mailu. Skúste to prosím znova neskôr.",
            };
        }

        return {
            success: true,
            message: "Inštrukcie na obnovu hesla sme vám úspešne odoslali na váš e-mail.",
        };
    } catch (error: any) {
        console.error("Request password reset error:", error?.message || "unknown_error");
        return { success: false, error: "Požiadavku sa nepodarilo spracovať" };
    }
}

/**
 * Reset password using a valid reset token (bound to passwordVersion with atomic CAS update)
 */
export async function resetPasswordWithTokenAction(token: string, newPassword: string) {
    try {
        if (!token) {
            return { success: false, error: "Chýba token na obnovu hesla" };
        }

        const newPasswordBounds = validateNewPasswordBounds(newPassword, 6);
        if (!newPasswordBounds.valid) {
            if (newPasswordBounds.reason === "too_short" || newPasswordBounds.reason === "empty") {
                return { success: false, error: "Nové heslo musí mať aspoň 6 znakov" };
            }
            return { success: false, error: newPasswordBounds.error };
        }

        const tokenData = await verifyPasswordResetToken(token);
        if (!tokenData) {
            return { success: false, error: "Odkaz na obnovu hesla je neplatný alebo vypršal. Požiadajte prosím o nový." };
        }

        const db = getCoreDb();
        const { data: user, error: dbError } = await db
            .from("booking_users")
            .select("id, name, email, role, password_hash, password_version")
            .eq("id", tokenData.userId)
            .single();

        if (dbError || !user) {
            return { success: false, error: "Používateľ nebol nájdený" };
        }

        if (user.id !== tokenData.userId || user.email.toLowerCase().trim() !== tokenData.email) {
            return { success: false, error: "Odkaz na obnovu hesla je neplatný alebo vypršal. Požiadajte prosím o nový." };
        }

        const versionStep = computeNextPasswordVersion((user as any).password_version);
        if (!versionStep) {
            console.error("Reset password error: missing or non-incrementable password_version");
            return { success: false, error: "Chyba pri ukladaní nového hesla" };
        }

        // Verify that the token's passwordVersion matches the user's current password_version
        if (versionStep.currentVersion !== tokenData.passwordVersion) {
            return { success: false, error: "Tento odkaz na obnovu hesla už bol v minulosti použitý. Požiadajte o nový." };
        }

        let newHash: string;
        try {
            newHash = await hashPassword(newPassword);
        } catch (hashErr) {
            if (hashErr instanceof CryptoInternalError) {
                logCryptoInternalFailure("resetPasswordWithTokenAction.hashPassword", hashErr);
                return { success: false, error: "Chyba pri ukladaní nového hesla" };
            }
            throw hashErr;
        }

        // Completing password reset via email link also proves ownership of the email address.
        // Uses atomic CAS (.eq("password_version", currentVersion)) and increments password_version.
        let { data: updatedRow, error: updateError } = await db
            .from("booking_users")
            .update({
                password_hash: newHash,
                password_version: versionStep.nextVersion,
                email_verified: true,
                email_verified_at: new Date().toISOString(),
            } as any)
            .eq("id", user.id)
            .eq("password_version", versionStep.currentVersion)
            .select("id, password_version")
            .maybeSingle();

        if (
            updateError &&
            !updateError.message?.includes("password_version") &&
            (updateError.message?.includes("email_verified") || (updateError as any).code === "PGRST204")
        ) {
            const fallbackUpdate = await db
                .from("booking_users")
                .update({
                    password_hash: newHash,
                    password_version: versionStep.nextVersion,
                } as any)
                .eq("id", user.id)
                .eq("password_version", versionStep.currentVersion)
                .select("id, password_version")
                .maybeSingle();
            updatedRow = fallbackUpdate.data;
            updateError = fallbackUpdate.error;
        }

        if (updateError) {
            console.error("Reset password DB error:", updateError.message || "db_error");
            return { success: false, error: "Chyba pri ukladaní nového hesla" };
        }

        if (!updatedRow) {
            return { success: false, error: "Tento odkaz na obnovu hesla už bol v minulosti použitý. Požiadajte o nový." };
        }

        clearFailedLogins(user.email.toLowerCase().trim());

        return { success: true, message: "Heslo bolo úspešne zmenené! Teraz sa môžete prihlásiť novým heslom." };
    } catch (error: any) {
        console.error("Reset password with token error:", error?.message || "unknown_error");
        return { success: false, error: "Nepodarilo sa obnoviť heslo" };
    }
}

/**
 * Verify email ownership using a signed email verification token sent during registration.
 * Strictly follows the 10-step verification + CAS protocol.
 */
export async function verifyEmailWithTokenAction(token: string) {
    try {
        if (!token || typeof token !== "string") {
            return { success: false, error: "Chýba overovací token." };
        }

        // 1. Overiť podpis, expiráciu, purpose === "email_verification" a platnosť passwordVersion v tokene
        const tokenData = await verifyEmailVerificationToken(token);
        if (!tokenData) {
            return {
                success: false,
                error: "Overovací odkaz je neplatný alebo jeho platnosť (24 hodín) vypršala. Prihláste sa a nechajte si zaslať nový overovací e-mail.",
            };
        }

        // 2. Načítať id, name, email, role, password_hash, password_version
        const db = getCoreDb();
        const { data: user, error: dbError } = await db
            .from("booking_users")
            .select("id, name, email, role, password_hash, password_version")
            .eq("id", tokenData.userId)
            .maybeSingle();

        if (dbError || !user) {
            return { success: false, error: "Používateľský účet nebol nájdený." };
        }

        // 3. Overiť user.id === tokenData.userId a kanonický email match
        if (user.id !== tokenData.userId || user.email.toLowerCase().trim() !== tokenData.email) {
            return { success: false, error: "Overovací odkaz nezodpovedá e-mailovej adrese účtu." };
        }

        // 4. Ak účet už nie je neoverený, vrátiť idempotentný úspech alreadyVerified: true bez DB mutácie
        if (!isUserHashUnverified(user.password_hash) && (user as any).email_verified !== false) {
            return {
                success: true,
                alreadyVerified: true,
                email: user.email,
                message: "Váš e-mail bol už v minulosti úspešne overený. Môžete sa prihlásiť.",
            };
        }

        // 5. Overiť, že user.password_version je platné číslo 1..2147483639 a rovná sa tokenData.passwordVersion
        const versionStep = computeNextPasswordVersion((user as any).password_version);
        if (!versionStep) {
            console.error("Verify email error: missing or non-incrementable password_version");
            return { success: false, error: "Chyba pri aktivácii účtu. Skúste to prosím znova." };
        }

        if (versionStep.currentVersion !== tokenData.passwordVersion) {
            return {
                success: false,
                error: "Tento overovací odkaz už nie je platný. Požiadajte o zaslanie nového.",
            };
        }

        // 6. Overiť, že user.password_hash má práve jeden UNVERIFIED: prefix a vnútorný credential je platný
        if (!isUserHashUnverified(user.password_hash)) {
            return {
                success: false,
                error: "Tento overovací odkaz už nie je platný. Požiadajte o zaslanie nového.",
            };
        }
        const rawInner = stripUnverifiedPrefix(user.password_hash);
        const parsedInner = parseInnerCredential(rawInner);
        if (parsedInner.kind === "invalid") {
            console.error("Verify email error: invalid inner credential inside UNVERIFIED wrapper");
            return {
                success: false,
                error: "Chyba pri aktivácii účtu. Kontaktujte prosím podporu.",
            };
        }

        // 7. Vypočítať nextVersion = currentVersion + 1 (už v versionStep.nextVersion)
        // 8. Vykonať atomický CAS update s .eq("id", user.id).eq("password_version", currentVersion)
        let { data: updatedRow, error: updateError } = await db
            .from("booking_users")
            .update({
                password_hash: rawInner,
                password_version: versionStep.nextVersion,
                email_verified: true,
                email_verified_at: new Date().toISOString(),
            } as any)
            .eq("id", user.id)
            .eq("password_version", versionStep.currentVersion)
            .select("id, password_version")
            .maybeSingle();

        if (
            updateError &&
            !updateError.message?.includes("password_version") &&
            (updateError.message?.includes("email_verified") || (updateError as any).code === "PGRST204")
        ) {
            const fallbackUpdate = await db
                .from("booking_users")
                .update({
                    password_hash: rawInner,
                    password_version: versionStep.nextVersion,
                } as any)
                .eq("id", user.id)
                .eq("password_version", versionStep.currentVersion)
                .select("id, password_version")
                .maybeSingle();
            updatedRow = fallbackUpdate.data;
            updateError = fallbackUpdate.error;
        }

        // 9. Rozlíšiť DB chybu (error !== null) od CAS konfliktu (data === null)
        if (updateError) {
            console.error("Verify email DB error:", updateError.message || "db_error");
            return { success: false, error: "Chyba pri aktivácii účtu. Skúste to prosím znova." };
        }

        if (!updatedRow) {
            return {
                success: false,
                error: "Tento overovací odkaz už nie je platný. Požiadajte o zaslanie nového.",
            };
        }

        // 10. Zapísať audit log až po potvrdenom CAS update
        await logActivity({
            action: "auth.email_verified",
            category: "auth",
            entityType: "user",
            entityId: user.id,
            entityName: user.name,
            description: `Úspešné overenie e-mailovej adresy používateľa "${user.name}" (${user.email})`,
            actor: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
            },
            metadata: {
                userId: user.id,
                email: user.email,
            },
            level: "info",
        });

        return {
            success: true,
            email: user.email,
            message: "Váš e-mail bol úspešne overený a účet je aktivovaný! Teraz sa môžete prihlásiť.",
        };
    } catch (error: any) {
        console.error("Verify email with token error:", error?.message || "unknown_error");
        return { success: false, error: "Nepodarilo sa overiť e-mailovú adresu." };
    }
}

/**
 * Resend verification email for an unverified account (rate-limited, safe against enumeration)
 */
export async function resendVerificationEmailAction(email: string, clientOrigin?: string) {
    try {
        if (!email) {
            return { success: false, error: "Zadajte vašu e-mailovú adresu." };
        }

        const cleanEmail = email.toLowerCase().trim();
        if (!isValidEmailFormat(cleanEmail)) {
            return { success: false, error: "Zadajte platnú e-mailovú adresu." };
        }

        const rateCheck = checkAndRecordEmailDispatch(`verify:${cleanEmail}`);
        if (!rateCheck.allowed) {
            const waitText = formatRemainingTime(rateCheck.retryAfterMs);
            return {
                success: false,
                error: `Nový overovací e-mail môžete vyžiadať až o ${waitText}. Skontrolujte prosím aj priečinok Spam.`,
            };
        }

        const db = getCoreDb();
        const { data: user, error: lookupError } = await db
            .from("booking_users")
            .select("id, name, email, password_hash, password_version")
            .eq("email", cleanEmail)
            .maybeSingle();

        if (lookupError) {
            console.error("Resend verification email lookup error:", lookupError.message || "db_error");
            return { success: false, error: "Nepodarilo sa odoslať overovací e-mail." };
        }

        if (!user) {
            return {
                success: false,
                error: `Účet s e-mailom "${cleanEmail}" u nás neexistuje. Môžete sa zaregistrovať.`,
            };
        }

        const isUnverified = isUserHashUnverified(user.password_hash) || (user as any).email_verified === false;
        if (!isUnverified) {
            return {
                success: false,
                alreadyVerified: true,
                error: "Váš účet je už aktivovaný. Môžete sa prihlásiť.",
            };
        }

        const versionStep = computeNextPasswordVersion((user as any).password_version);
        const parsedInner = parseInnerCredential(stripUnverifiedPrefix(user.password_hash));
        if (!versionStep || parsedInner.kind === "invalid") {
            console.error("Resend verification email blocked: invalid stored password_version or credential format");
            return { success: false, error: "Nepodarilo sa odoslať overovací e-mail." };
        }

        const sendResult = await sendEmailVerificationMessage({
            userId: user.id,
            name: user.name,
            email: user.email,
            passwordVersion: versionStep.currentVersion,
            clientOrigin,
        });

        if (!sendResult.sent) {
            return {
                success: false,
                error: `Nepodarilo sa odoslať overovací e-mail (${sendResult.errorReason || "chyba poštového servera"}). Skúste to znova neskôr.`,
            };
        }

        return {
            success: true,
            message: "Nový overovací odkaz sme úspešne odoslali na váš e-mail.",
        };
    } catch (error: any) {
        console.error("Resend verification email error:", error?.message || "unknown_error");
        return { success: false, error: "Nepodarilo sa odoslať overovací e-mail." };
    }
}
