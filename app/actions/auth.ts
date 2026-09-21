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
} from "@/lib/auth/bookingAuth";
import { Resend } from "resend";
import { redirect } from "next/navigation";

const TENANT_ID = "595cbb6c-1019-41ae-b1c2-a60c13c8dcdf";

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

        const db = getCoreDb();

        // Find user by email (safely handle has_multisport column)
        let { data: user, error: dbError } = await db
            .from("booking_users")
            .select("id, name, email, password_hash, card_number, phone, role, has_multisport")
            .eq("email", email.toLowerCase().trim())
            .maybeSingle();

        if (dbError && dbError.message?.includes("has_multisport")) {
            const fallback = await db
                .from("booking_users")
                .select("id, name, email, password_hash, card_number, phone, role")
                .eq("email", email.toLowerCase().trim())
                .maybeSingle();
            user = fallback.data ? { ...fallback.data, has_multisport: false } : null;
            dbError = fallback.error;
        }

        if (dbError) {
            console.error("Login DB Error:", dbError);
        }
        if (dbError || !user) {
            return { success: false, error: "Nesprávny email alebo heslo" };
        }

        // Verify password
        const isValid = await verifyPassword(password, user.password_hash);

        if (!isValid) {
            return { success: false, error: "Nesprávny email alebo heslo" };
        }

        // Create session
        const bookingUser: BookingUser = {
            id: user.id,
            name: user.name,
            email: user.email,
            cardNumber: user.card_number,
            phone: user.phone,
            role: user.role,
            hasMultisport: Boolean((user as any).has_multisport),
        };

        const token = await createSession(bookingUser);
        await setSessionCookie(token);

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
    phone?: string
) {
    try {
        if (!name || !email || !password) {
            return { success: false, error: "Meno, email a heslo sú povinné" };
        }

        if (password.length < 6) {
            return { success: false, error: "Heslo musí mať aspoň 6 znakov" };
        }

        const cleanEmail = email.toLowerCase().trim();
        const cleanPhone = normalizePhone(phone);
        const cleanCard = cardNumber?.trim() || null;

        const db = getCoreDb();

        // Check if user already exists by email
        const { data: existingEmail } = await db
            .from("booking_users")
            .select("id")
            .eq("email", cleanEmail)
            .maybeSingle();

        if (existingEmail) {
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

        // Hash password
        const passwordHash = await hashPassword(password);

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

        // Create user
        const { data: user, error: dbError } = await db
            .from("booking_users")
            .insert({
                name: name.trim(),
                email: cleanEmail,
                password_hash: passwordHash,
                card_number: finalCardNumber,
                phone: cleanPhone,
                role: "user",
            })
            .select("id, name, email, card_number, phone, role")
            .single();

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

        // Create session
        const bookingUser: BookingUser = {
            id: user.id,
            name: user.name,
            email: user.email,
            cardNumber: user.card_number,
            phone: user.phone,
            role: user.role,
            hasMultisport: false,
        };

        const token = await createSession(bookingUser);
        await setSessionCookie(token);

        return { success: true, user: bookingUser };
    } catch (error: any) {
        console.error("Registration error:", error);
        return { success: false, error: "Chyba pri registrácii" };
    }
}

export async function logoutAction() {
    try {
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
            .select("id, name, email, card_number, phone, role, has_multisport")
            .eq("id", session.userId)
            .single();

        if (dbError && dbError.message?.includes("has_multisport")) {
            const fallback = await db
                .from("booking_users")
                .select("id, name, email, card_number, phone, role")
                .eq("id", session.userId)
                .single();
            user = fallback.data ? { ...fallback.data, has_multisport: false } : null;
            dbError = fallback.error;
        }

        if (dbError || !user) {
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
            .select("id, name, email, card_number, phone, role, has_multisport")
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
        const db = getCoreDb();

        const { data: user } = await db
            .from("booking_users")
            .select("id, name, email, password_hash")
            .eq("email", cleanEmail)
            .maybeSingle();

        let resetUrl: string | undefined = undefined;

        if (user) {
            const token = await createPasswordResetToken(user.id, user.email, user.password_hash);
            const baseUrl = clientOrigin || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
            resetUrl = `${baseUrl}/newbookings?reset_token=${encodeURIComponent(token)}`;

            console.log("==========================================");
            console.log(`[PASSWORD RESET] For: ${user.email}`);
            console.log(`[RESET URL]: ${resetUrl}`);
            console.log("==========================================");

            const resend = getResendClient();
            if (resend) {
                try {
                    const fromEmail = process.env.RESEND_FROM || "onboarding@resend.dev";
                    await resend.emails.send({
                        from: fromEmail,
                        to: user.email,
                        subject: "Obnova hesla - NTC Rezervácie",
                        html: `
                            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 580px; margin: 0 auto; padding: 32px 24px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px;">
                                <div style="margin-bottom: 24px;">
                                    <span style="font-size: 18px; font-weight: 800; color: #0f172a; letter-spacing: -0.5px;">NTC Rezervačný systém</span>
                                </div>
                                <h2 style="font-size: 20px; font-weight: 700; color: #0f172a; margin-top: 0; margin-bottom: 16px;">Žiadosť o obnovu hesla</h2>
                                <p style="color: #475569; font-size: 15px; line-height: 1.6; margin-bottom: 12px;">Dobrý deň <strong>${user.name}</strong>,</p>
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
                } catch (emailErr) {
                    console.warn("Resend email delivery notice:", emailErr);
                }
            }
        }

        return {
            success: true,
            message: "Ak účet s týmto emailom existuje, inštrukcie na obnovu hesla sme vám odoslali na email.",
            debugResetUrl: resetUrl,
            debugNote: !user ? `(Upozornenie: Používateľ '${cleanEmail}' v systéme neexistuje. Pre testovanie použite email existujúceho používateľa alebo sa najprv zaregistrujte)` : undefined,
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
            .select("id, password_hash")
            .eq("id", tokenData.userId)
            .single();

        if (dbError || !user) {
            return { success: false, error: "Používateľ nebol nájdený" };
        }

        // Verify that the token's hash fragment matches the user's current password hash
        if (user.password_hash.slice(0, 16) !== tokenData.passHashFragment) {
            return { success: false, error: "Tento odkaz na obnovu hesla už bol v minulosti použitý. Požiadajte o nový." };
        }

        const newHash = await hashPassword(newPassword);

        const { error: updateError } = await db
            .from("booking_users")
            .update({ password_hash: newHash })
            .eq("id", user.id);

        if (updateError) {
            console.error("Reset password DB error:", updateError);
            return { success: false, error: "Chyba pri ukladaní nového hesla" };
        }

        return { success: true, message: "Heslo bolo úspešne zmenené! Teraz sa môžete prihlásiť novým heslom." };
    } catch (error: any) {
        console.error("Reset password with token error:", error);
        return { success: false, error: "Nepodarilo sa obnoviť heslo" };
    }
}

