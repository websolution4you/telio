"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import BookingCalendar from "./BookingCalendar";
import LoginForm from "./LoginForm";
import RegisterForm from "./RegisterForm";
import UserMenu from "./UserMenu";
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

    const handleSuccess = () => {
        router.refresh();
    };

    return (
        <div className="relative w-full">
            <div className="flex justify-center mb-8">
                {user ? (
                    <UserMenu user={user} />
                ) : (
                    <div className="flex gap-4">
                        <button 
                            onClick={() => setShowRegister(false)}
                            className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
                        >
                            Prihlásiť sa
                        </button>
                        <span className="text-gray-500">|</span>
                        <button 
                            onClick={() => setShowRegister(true)}
                            className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
                        >
                            Registrovať
                        </button>
                    </div>
                )}
            </div>

            {(!user && (showRegister || !showRegister)) ? (
                /* Ak by sme chceli formulár zobraziť nad kalendárom, dali by sme ho sem, 
                   ale keďže chceme kalendár ako predtým, môžeme ho tu len zobraziť 
                   a prihlasovanie nechať na neskôr / iný flow. Pre teraz necháme kalendár zobrazený vždy. */
                null
            ) : null}

            <BookingCalendar courts={courts} bookings={bookings} />
        </div>
    );
}
