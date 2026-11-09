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
    cardNumber?: string;
    phone?: string;
    role: BookingRole;
    hasMultisport?: boolean;
    discountTierId?: string;
    exp: number;
}
