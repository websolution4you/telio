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

export async function loginAction(email: string, password: string) {
    try {
        if (!email || !password) {
            return { success: false, error: "Email a heslo sú povinné" };
        }

        const db = getCoreDb();

        // Find user by email
        const { data: user, error: dbError } = await db
            .from("booking_users")
            .select("id, name, email, password_hash, card_number, phone, role")
            .eq("email", email.toLowerCase().trim())
            .maybeSingle();

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
            role: user.role,
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
            return { success: false, error: "Všetky polia sú povinné" };
        }

        if (password.length < 6) {
            return { success: false, error: "Heslo musí mať aspoň 6 znakov" };
        }

        const db = getCoreDb();

        // Check if user already exists
        const { data: existing } = await db
            .from("booking_users")
            .select("id")
            .eq("email", email.toLowerCase().trim())
            .single();

        if (existing) {
            return { success: false, error: "Používateľ s týmto emailom už existuje" };
        }

        // Hash password
        const passwordHash = await hashPassword(password);

        // Create user
        const { data: user, error: dbError } = await db
            .from("booking_users")
            .insert({
                name: name.trim(),
                email: email.toLowerCase().trim(),
                password_hash: passwordHash,
                card_number: cardNumber?.trim() || null,
                phone: phone?.trim() || null,
            })
            .select("id, name, email, card_number, phone, role")
            .single();

        if (dbError || !user) {
            console.error("Registration DB error:", dbError);
            return { success: false, error: "Chyba pri registrácii" };
        }

        // Create session
        const bookingUser: BookingUser = {
            id: user.id,
            name: user.name,
            email: user.email,
            cardNumber: user.card_number,
            phone: user.phone,
            role: user.role,
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

        const { data: user, error: dbError } = await db
            .from("booking_users")
            .select("id, name, email, card_number, phone, role")
            .eq("id", session.userId)
            .single();

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
        };

        return { success: true, user: bookingUser };
    } catch (error: any) {
        console.error("Get current user error:", error);
        return { success: false, user: null };
    }
}
