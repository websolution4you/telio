"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import BookingCalendar from "./BookingCalendar";
import LoginForm from "./LoginForm";
import RegisterForm from "./RegisterForm";
import { getCurrentUserAction } from "@/app/actions/auth";
import type { BookingUser } from "@/lib/auth/bookingAuth";
import type { Court, Booking } from "@/lib/bookings/mockBookings";

type BookingAuthWrapperProps = {
    user: BookingUser | null;
    courts: Court[];
    bookings: Booking[];
};

export default function BookingAuthWrapper({ user: initialUser, courts, bookings }: BookingAuthWrapperProps) {
    const router = useRouter();
    const [showRegister, setShowRegister] = useState(false);
    const [user, setUser] = useState<BookingUser | null>(initialUser);
    const [authChecked, setAuthChecked] = useState(!!initialUser);

    useEffect(() => {
        if (initialUser) {
            setUser(initialUser);
            setAuthChecked(true);
        } else {
            getCurrentUserAction().then(res => {
                if (res.success && res.user) {
                    setUser(res.user);
                }
                setAuthChecked(true);
            });
        }
    }, [initialUser]);

    const handleSuccess = () => {
        router.refresh();
    };

    // If user is logged in, show calendar without redundant user menu
    if (user) {
        return (
            <div className="relative w-full">
                <BookingCalendar courts={courts} bookings={bookings} currentUser={user} />
            </div>
        );
    }

    // Not logged in - show calendar publicly + mobile login form
    return (
        <div className="relative w-full">
            {/* Mobile login form (hidden on desktop where navbar has it) */}
            {authChecked && !user && (
                <div className="md:hidden relative z-10 w-full max-w-sm mx-auto px-6 mb-8">
                    <div
                        className="rounded-xl border p-5"
                        style={{
                            borderColor: "rgba(0,255,209,0.2)",
                            background: "rgba(0,0,0,0.6)",
                            backdropFilter: "blur(10px)",
                        }}
                    >
                        {showRegister ? (
                            <RegisterForm
                                onSuccess={handleSuccess}
                                onSwitchToLogin={() => setShowRegister(false)}
                            />
                        ) : (
                            <LoginForm
                                onSuccess={handleSuccess}
                                onSwitchToRegister={() => setShowRegister(true)}
                            />
                        )}
                    </div>
                </div>
            )}

            <BookingCalendar courts={courts} bookings={bookings} currentUser={user} />
        </div>
    );
}
