"use server";

import { getCoreDb } from "@/lib/server/supabase";
import {
    hashPassword,
    verifyPassword,
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
    isUserHashUnverified,
    stripUnverifiedPrefix,
    markHashUnverified,
} from "@/lib/auth/bookingAuth";
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

async function sendEmailVerificationMessage(params: {
    userId: string;
    name: string;
    email: string;
    passwordHash: string;
    clientOrigin?: string;
}): Promise<{ sent: boolean; verifyUrl: string }> {
    const token = await createEmailVerificationToken(params.userId, params.email, params.passwordHash);
    const baseUrl = getSafeAppBaseUrl(params.clientOrigin);
    const verifyUrl = `${baseUrl}/newbookings?verify_email_token=${encodeURIComponent(token)}`;
    const safeName = escapeHtml(params.name);

    console.log("==========================================");
    console.log(`[EMAIL VERIFICATION] For: ${params.email}`);
    console.log(`[VERIFY URL]: ${verifyUrl}`);
    console.log("==========================================");

    const resend = getResendClient();
    if (!resend) {
        console.warn("[EMAIL VERIFICATION] RESEND_API_KEY is not configured in environment variables!");
        return { sent: false, verifyUrl };
    }

    try {
        const fromEmail = process.env.RESEND_FROM || "NTC Rezervácie <rezervacie@telio.sk>";
        const { data: resData, error: sendError } = await resend.emails.send({
            from: fromEmail,
            to: params.email,
            subject: "Overenie e-mailovej adresy - NTC Rezervácie",
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
            console.error("[EMAIL VERIFICATION] Resend send error:", sendError);
            return { sent: false, verifyUrl };
        }
        console.log("[EMAIL VERIFICATION] Resend email dispatched successfully, id:", resData?.id);
        return { sent: true, verifyUrl };
    } catch (emailErr) {
        console.error("[EMAIL VERIFICATION] Exception while calling Resend:", emailErr);
        return { sent: false, verifyUrl };
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

        // 1. Check client cookie lock (persists across serverless container restarts)
        let cookieLockUntil: number | null = null;
        try {
            const cookieStore = await cookies();
            const lockVal = cookieStore.get("telio_login_lock")?.value;
            if (lockVal) {
                const parsed = parseInt(lockVal, 10);
                if (!isNaN(parsed) && parsed > Date.now()) {
                    cookieLockUntil = parsed;
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

        // Find user by email (safely handle has_multisport and discount_tier_id columns)
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
            console.error("Login DB Error:", dbError);
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
                    cookieStore.set("telio_login_lock", String(Date.now() + LOGIN_LOCKOUT_MS), {
                        httpOnly: true,
                        secure: process.env.NODE_ENV === "production",
                        sameSite: "lax",
                        maxAge: Math.floor(LOGIN_LOCKOUT_MS / 1000),
                        path: "/",
                    });
                } catch {}
                return {
                    success: false,
                    error: `Bolo zadaných 5 nesprávnych pokusov. Účet bol z bezpečnostných dôvodov zablokovaný na ${fail.lockoutTimeText}.`,
                };
            }
            return {
                success: false,
                error: `Nesprávny email alebo heslo. Zostávajúce pokusy pred zablokovaním: ${fail.remainingAttempts}.`,
            };
        }

        // Verify password against raw hash (even if account is still unverified, we verify password first to prevent user enumeration)
        const rawStoredHash = stripUnverifiedPrefix(user.password_hash);
        const isValid = await verifyPassword(password, rawStoredHash);

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
                    cookieStore.set("telio_login_lock", String(Date.now() + LOGIN_LOCKOUT_MS), {
                        httpOnly: true,
                        secure: process.env.NODE_ENV === "production",
                        sameSite: "lax",
                        maxAge: Math.floor(LOGIN_LOCKOUT_MS / 1000),
                        path: "/",
                    });
                } catch {}
                return {
                    success: false,
                    error: `Bolo zadaných 5 nesprávnych hesiel. Účet bol z bezpečnostných dôvodov zablokovaný na ${fail.lockoutTimeText}.`,
                };
            }
            return {
                success: false,
                error: `Nesprávny email alebo heslo. Zostávajúce pokusy pred zablokovaním: ${fail.remainingAttempts}.`,
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

        // Successful login: Clear failed login attempts and cookie
        clearFailedLogins(normalizedEmail);
        try {
            const cookieStore = await cookies();
            cookieStore.delete("telio_login_lock");
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
        console.error("Login error:", error);
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

        if (password.length < 8) {
            return { success: false, error: "Heslo musí mať aspoň 8 znakov" };
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
        const { data: existingEmail } = await db
            .from("booking_users")
            .select("id, name, email, password_hash")
            .eq("email", cleanEmail)
            .maybeSingle();

        if (existingEmail) {
            // If the existing account is still unverified, offer a clear message and resend verification if within rate limit
            if (isUserHashUnverified(existingEmail.password_hash)) {
                const rateCheck = checkAndRecordEmailDispatch(`verify:${cleanEmail}`);
                if (rateCheck.allowed) {
                    await sendEmailVerificationMessage({
                        userId: existingEmail.id,
                        name: existingEmail.name || cleanName,
                        email: existingEmail.email,
                        passwordHash: existingEmail.password_hash,
                        clientOrigin,
                    });
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

        // Check if user already exists by phone
        if (cleanPhone) {
            const { data: existingPhone } = await db
                .from("booking_users")
                .select("id")
                .eq("phone", cleanPhone)
                .maybeSingle();
                
            if (existingPhone) {
                return { success: false, error: "Používateľ s týmto telefónnym číslom už existuje" };
            }
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

        // Hash password and mark as UNVERIFIED until the user clicks the email verification link
        const rawPasswordHash = await hashPassword(password);
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

        // Create user in unverified state (supports optional email_verified column with automatic fallback)
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
            .select("id, name, email, card_number, phone, role")
            .single();

        if (dbError && (dbError.message?.includes("email_verified") || (dbError as any).code === "PGRST204")) {
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
                .select("id, name, email, card_number, phone, role")
                .single();
            user = fallbackInsert.data;
            dbError = fallbackInsert.error;
        }

        if (dbError || !user) {
            console.error("Registration DB error:", dbError);
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
        await sendEmailVerificationMessage({
            userId: user.id,
            name: user.name,
            email: user.email,
            passwordHash: rawPasswordHash,
            clientOrigin,
        });

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
            },
            level: "info",
        });

        return {
            success: true,
            requiresEmailVerification: true,
            email: user.email,
            message: `Registrácia prebehla úspešne! Na adresu ${user.email} sme odoslali overovací odkaz. Pre dokončenie registrácie a prihlásenie kliknite na odkaz v e-maile.`,
        };
    } catch (error: any) {
        console.error("Registration error:", error);
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
        console.error("Logout error:", error);
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
        console.error("Get current user error:", error);
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

        // Check if new phone is already used by someone else
        if (cleanPhone) {
            const { data: existingPhone } = await db
                .from("booking_users")
                .select("id")
                .eq("phone", cleanPhone)
                .neq("id", session.userId)
                .maybeSingle();

            if (existingPhone) {
                return { success: false, error: "Toto telefónne číslo je už priradené k inému účtu" };
            }
        }

        // Update booking_users table
        const { error: updateError } = await db
            .from("booking_users")
            .update({
                name: cleanName,
                phone: cleanPhone,
            })
            .eq("id", session.userId);

        if (updateError) {
            console.error("Update profile DB error:", updateError);
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
        console.error("Update profile error:", error);
        return { success: false, error: "Nepodarilo sa aktualizovať profil" };
    }
}

/**
 * Change password for current logged-in user
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

        if (newPassword.length < 6) {
            return { success: false, error: "Nové heslo musí mať aspoň 6 znakov" };
        }

        const db = getCoreDb();

        const { data: user, error: dbError } = await db
            .from("booking_users")
            .select("id, password_hash")
            .eq("id", session.userId)
            .single();

        if (dbError || !user) {
            return { success: false, error: "Používateľ nebol nájdený" };
        }

        const isValid = await verifyPassword(currentPassword, user.password_hash);
        if (!isValid) {
            return { success: false, error: "Aktuálne heslo nie je správne" };
        }

        const newHash = await hashPassword(newPassword);

        const { error: updateError } = await db
            .from("booking_users")
            .update({ password_hash: newHash })
            .eq("id", session.userId);

        if (updateError) {
            console.error("Change password DB error:", updateError);
            return { success: false, error: "Chyba pri ukladaní nového hesla" };
        }

        return { success: true, message: "Heslo bolo úspešne zmenené" };
    } catch (error: any) {
        console.error("Change password error:", error);
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

        const { data: user } = await db
            .from("booking_users")
            .select("id, name, email, password_hash")
            .eq("email", cleanEmail)
            .maybeSingle();

        let resetUrl: string | undefined = undefined;

        if (user) {
            const token = await createPasswordResetToken(user.id, user.email, user.password_hash);
            const baseUrl = getSafeAppBaseUrl(clientOrigin);
            resetUrl = `${baseUrl}/newbookings?reset_token=${encodeURIComponent(token)}`;
            const safeName = escapeHtml(user.name);

            console.log("==========================================");
            console.log(`[PASSWORD RESET] For: ${user.email}`);
            console.log(`[RESET URL]: ${resetUrl}`);
            console.log("==========================================");

            const resend = getResendClient();
            if (resend) {
                try {
                    const fromEmail = process.env.RESEND_FROM || "NTC Rezervácie <rezervacie@telio.sk>";
                    const { data: resData, error: sendError } = await resend.emails.send({
                        from: fromEmail,
                        to: user.email,
                        subject: "Obnova hesla - NTC Rezervácie",
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
                        console.error("[PASSWORD RESET] Resend send error:", sendError);
                    } else {
                        console.log("[PASSWORD RESET] Resend email dispatched successfully, id:", resData?.id);
                    }
                } catch (emailErr) {
                    console.error("[PASSWORD RESET] Exception while calling Resend:", emailErr);
                }
            } else {
                console.warn("[PASSWORD RESET] RESEND_API_KEY is not configured in environment variables!");
            }
        }

        return {
            success: true,
            message: "Ak účet s týmto emailom existuje, inštrukcie na obnovu hesla sme vám odoslali na email.",
        };
    } catch (error: any) {
        console.error("Request password reset error:", error);
        return { success: false, error: "Požiadavku sa nepodarilo spracovať" };
    }
}

/**
 * Reset password using a valid reset token
 */
export async function resetPasswordWithTokenAction(token: string, newPassword: string) {
    try {
        if (!token) {
            return { success: false, error: "Chýba token na obnovu hesla" };
        }

        if (!newPassword || newPassword.length < 6) {
            return { success: false, error: "Nové heslo musí mať aspoň 6 znakov" };
        }

        const tokenData = await verifyPasswordResetToken(token);
        if (!tokenData) {
            return { success: false, error: "Odkaz na obnovu hesla je neplatný alebo vypršal. Požiadajte prosím o nový." };
        }

        const db = getCoreDb();
        const { data: user, error: dbError } = await db
            .from("booking_users")
            .select("id, name, email, role, password_hash")
            .eq("id", tokenData.userId)
            .single();

        if (dbError || !user) {
            return { success: false, error: "Používateľ nebol nájdený" };
        }

        // Verify that the token's hash fragment matches the user's current raw password hash
        const rawStoredHash = stripUnverifiedPrefix(user.password_hash);
        if (rawStoredHash.slice(0, 16) !== tokenData.passHashFragment) {
            return { success: false, error: "Tento odkaz na obnovu hesla už bol v minulosti použitý. Požiadajte o nový." };
        }

        const newHash = await hashPassword(newPassword);

        // Completing password reset via email link also proves ownership of the email address
        let { error: updateError } = await db
            .from("booking_users")
            .update({
                password_hash: newHash,
                email_verified: true,
                email_verified_at: new Date().toISOString(),
            } as any)
            .eq("id", user.id);

        if (updateError && (updateError.message?.includes("email_verified") || (updateError as any).code === "PGRST204")) {
            const fallbackUpdate = await db
                .from("booking_users")
                .update({ password_hash: newHash })
                .eq("id", user.id);
            updateError = fallbackUpdate.error;
        }

        if (updateError) {
            console.error("Reset password DB error:", updateError);
            return { success: false, error: "Chyba pri ukladaní nového hesla" };
        }

        clearFailedLogins(user.email.toLowerCase().trim());

        return { success: true, message: "Heslo bolo úspešne zmenené! Teraz sa môžete prihlásiť novým heslom." };
    } catch (error: any) {
        console.error("Reset password with token error:", error);
        return { success: false, error: "Nepodarilo sa obnoviť heslo" };
    }
}

/**
 * Verify email ownership using a signed email verification token sent during registration
 */
export async function verifyEmailWithTokenAction(token: string) {
    try {
        if (!token || typeof token !== "string") {
            return { success: false, error: "Chýba overovací token." };
        }

        const tokenData = await verifyEmailVerificationToken(token);
        if (!tokenData) {
            return {
                success: false,
                error: "Overovací odkaz je neplatný alebo jeho platnosť (24 hodín) vypršala. Prihláste sa a nechajte si zaslať nový overovací e-mail.",
            };
        }

        const db = getCoreDb();
        const { data: user, error: dbError } = await db
            .from("booking_users")
            .select("id, name, email, role, password_hash")
            .eq("id", tokenData.userId)
            .maybeSingle();

        if (dbError || !user) {
            return { success: false, error: "Používateľský účet nebol nájdený." };
        }

        if (user.email.toLowerCase().trim() !== tokenData.email) {
            return { success: false, error: "Overovací odkaz nezodpovedá e-mailovej adrese účtu." };
        }

        // If account is already verified, return a friendly idempotent success message
        if (!isUserHashUnverified(user.password_hash) && (user as any).email_verified !== false) {
            return {
                success: true,
                alreadyVerified: true,
                email: user.email,
                message: "Váš e-mail bol už v minulosti úspešne overený. Môžete sa prihlásiť.",
            };
        }

        const rawHash = stripUnverifiedPrefix(user.password_hash);
        if (rawHash.slice(0, 16) !== tokenData.passHashFragment) {
            return {
                success: false,
                error: "Tento overovací odkaz už nie je platný. Požiadajte o zaslanie nového.",
            };
        }

        let { error: updateError } = await db
            .from("booking_users")
            .update({
                password_hash: rawHash,
                email_verified: true,
                email_verified_at: new Date().toISOString(),
            } as any)
            .eq("id", user.id);

        if (updateError && (updateError.message?.includes("email_verified") || (updateError as any).code === "PGRST204")) {
            const fallbackUpdate = await db
                .from("booking_users")
                .update({ password_hash: rawHash })
                .eq("id", user.id);
            updateError = fallbackUpdate.error;
        }

        if (updateError) {
            console.error("Verify email DB error:", updateError);
            return { success: false, error: "Chyba pri aktivácii účtu. Skúste to prosím znova." };
        }

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
        console.error("Verify email with token error:", error);
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
        const { data: user } = await db
            .from("booking_users")
            .select("id, name, email, password_hash")
            .eq("email", cleanEmail)
            .maybeSingle();

        if (user && (isUserHashUnverified(user.password_hash) || (user as any).email_verified === false)) {
            await sendEmailVerificationMessage({
                userId: user.id,
                name: user.name,
                email: user.email,
                passwordHash: user.password_hash,
                clientOrigin,
            });
        }

        return {
            success: true,
            message: "Ak účet čaká na aktiváciu, nový overovací odkaz sme odoslali na váš e-mail.",
        };
    } catch (error: any) {
        console.error("Resend verification email error:", error);
        return { success: false, error: "Nepodarilo sa odoslať overovací e-mail." };
    }
}

