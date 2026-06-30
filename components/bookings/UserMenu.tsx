"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, User } from "lucide-react";
import { logoutAction } from "@/app/actions/auth";
import type { BookingUser } from "@/lib/auth/bookingAuth";

type UserMenuProps = {
    user: BookingUser;
};

export default function UserMenu({ user }: UserMenuProps) {
    const router = useRouter();
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleLogout = async () => {
        setLoading(true);
        try {
            await logoutAction();
            router.push("/bookings/login");
            router.refresh();
        } catch (error) {
            console.error("Logout failed:", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200"
                style={{
                    background: "rgba(0,255,209,0.1)",
                    border: "1px solid rgba(0,255,209,0.3)",
                    color: "var(--cyan)",
                }}
            >
                <User className="h-4 w-4" />
                <span className="text-sm font-medium">{user.name}</span>
            </button>

            {isOpen && (
                <>
                    <div
                        className="fixed inset-0 z-40"
                        onClick={() => setIsOpen(false)}
                    />
                    <div
                        className="absolute right-0 mt-2 w-64 rounded-lg shadow-xl z-50"
                        style={{
                            background: "rgba(0,0,0,0.95)",
                            border: "1px solid rgba(0,255,209,0.2)",
                        }}
                    >
                        <div className="p-4 border-b border-white/10">
                            <p className="text-sm font-medium text-white">{user.name}</p>
                            <p className="text-xs text-gray-400 mt-1">{user.email}</p>
                            {user.cardNumber && (
                                <p className="text-xs text-gray-500 mt-1">
                                    Karta: {user.cardNumber}
                                </p>
                            )}
                        </div>

                        <div className="p-2">
                            <button
                                onClick={handleLogout}
                                disabled={loading}
                                className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                            >
                                <LogOut className="h-4 w-4" />
                                {loading ? "Odhlasovanie..." : "Odhlásiť sa"}
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
