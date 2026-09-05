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
} from "@/lib/auth/bookingAuth";
import { redirect } from "next/navigation";

const TENANT_ID = "595cbb6c-1019-41ae-b1c2-a60c13c8dcdf";

export function normalizePhone(rawPhone?: string): string | null {
    if (!rawPhone) return null;
    const clean = rawPhone.trim().replace(/\s+/g, "");
    if (!clean) return null;
    if (clean.startsWith("09") && clean.length === 10) {
        return "+421" + clean.slice(1);
    }
    return clean;
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

        // Create user
        const { data: user, error: dbError } = await db
            .from("booking_users")
            .insert({
                name: name.trim(),
                email: cleanEmail,
                password_hash: passwordHash,
                card_number: cleanCard,
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
