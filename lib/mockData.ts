// Mock data for the dashboard MVP
// Types mirror the real Supabase table: public.pizza_orders

// ── Types matching Supabase schema ──────────────────────────

export type OrderStatus = "NEW" | "CONFIRMED" | "DONE" | "CANCELLED";

export interface PizzaOrder {
    id: string;                          // uuid
    tenant_id: string;                   // uuid → tenants.id
    call_id: string | null;             // uuid → calls.id (null = manual)
    customer_phone: string | null;
    customer_name: string | null;
    pizza_type: string;
    total_price: string | null;         // varchar in DB e.g. "24.50"
    delivery_address: string;
    status: OrderStatus;
    notes: string | null;
    created_at: string;                 // ISO timestamp

    // NEW columns – run the ALTER TABLE migration before these are live
    phone_confidence: number | null;    // 0.0–1.0, null = not evaluated
    address_confidence: number | null;  // 0.0–1.0, null = not evaluated
    phone_raw: string | null;           // what customer actually said
    address_raw: string | null;         // what customer actually said
    upsell_offered: boolean | null;
    upsell_item: string | null;         // e.g. "Tiramisu"
    upsell_accepted: boolean | null;
    transcript: string | null;          // full call transcript
}

// Threshold below which we flag as unclear
export const CONFIDENCE_THRESHOLD = 0.7;

export function isUnclear(order: PizzaOrder): boolean {
    const pc = order.phone_confidence;
    const ac = order.address_confidence;
    if (pc !== null && pc !== undefined && pc < CONFIDENCE_THRESHOLD) return true;
    if (ac !== null && ac !== undefined && ac < CONFIDENCE_THRESHOLD) return true;
    return false;
}

// ── Dashboard-specific types ──────────────────────────────────

export type AttentionType = "missing_address" | "unclear_item" | "low_confidence";

export interface AttentionItem {
    id: number;
    type: AttentionType;
    orderId?: string;
    callTime?: string;
    total?: string;
    title: string;
    description: string;
}

export interface KpiData {
    ordersToday: number;
    revenueToday: number;
    avgOrder: number;
    openOrders: number;
    problems: number;
    upsellOffered: number;
    upsellAccepted: number;
    upsellRevenue: number;
}

// ── Helpers ──────────────────────────────────────────────────

/** Derive source label from call_id presence */
export function orderSource(order: PizzaOrder): "AI" | "MANUAL" {
    return order.call_id ? "AI" : "MANUAL";
}

/** Parse total_price string to number */
export function parseTotalPrice(tp: string | null): number {
    if (!tp) return 0;
    return parseFloat(tp.replace(/[^0-9.,]/g, "").replace(",", ".")) || 0;
}

/** Format number to Slovak locale: 2 decimal places, comma separator */
export function formatPrice(value: number): string {
    return value.toLocaleString("sk-SK", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }) + " €";
}

/** Format created_at ISO to HH:MM */
export function formatTime(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleTimeString("sk-SK", { hour: "2-digit", minute: "2-digit" });
}

/** Returns true if order was created within the last 30 minutes */
export function isRecent(order: PizzaOrder): boolean {
    const created = new Date(order.created_at).getTime();
    const now = Date.now();
    return now - created < 30 * 60 * 1000;
}

// ── Mock tenant ───────────────────────────────────────────────

const TENANT_ID = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";
const today = "2026-03-06";

// ── Mock Orders ───────────────────────────────────────────────

export const mockOrders: PizzaOrder[] = [
    {
        id: "f47ac10b-58cc-4372-a567-0e02b2c3d479",
        tenant_id: TENANT_ID,
        call_id: "c1a2b3c4-d5e6-f7a8-b9c0-d1e2f3a4b5c6",
        customer_phone: "+421 903 111 222",
        customer_name: "Jano Novák",
        pizza_type: "Margherita, Coca Cola 0.5l",
        total_price: "24.00",
        delivery_address: "Hlavná 15, Košice",
        status: "NEW",
        notes: null,
        created_at: `${today}T18:02:00+01:00`,
        phone_confidence: 0.95,
        address_confidence: 0.45, // unclear!
        phone_raw: "+421 903 111 222",
        address_raw: "Františkánska... niečo",
        upsell_offered: true,
        upsell_item: "Tiramisu",
        upsell_accepted: false,
        transcript: "Dobrý deň, chcel by som si objednať Margheritu a Coca Colu pol litra. Adresa je Františkánska... vlastne nie, Hlavná pätnásť v Košiciach. Ďakujem.",
    },
    {
        id: "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
        tenant_id: TENANT_ID,
        call_id: "d2b3c4d5-e6f7-a8b9-c0d1-e2f3a4b5c6d7",
        customer_phone: "+421 911 333 444",
        customer_name: "Peter Kováč",
        pizza_type: "Quattro Formaggi, Prosciutto, Minerálka 2x",
        total_price: "42.00",
        delivery_address: "Štúrova 8, Košice",
        status: "CONFIRMED",
        notes: null,
        created_at: `${today}T17:49:00+01:00`,
        phone_confidence: 0.98,
        address_confidence: 0.92,
        phone_raw: "+421 911 333 444",
        address_raw: "Štúrova osem Košice",
        upsell_offered: true,
        upsell_item: "Kofola 1l",
        upsell_accepted: true,
        transcript: "Haló, chcel by som štyri syry a prosciutto a dve minerálky. Adresa Štúrova 8 Košice. Kofolu si tiež dám.",
    },
    {
        id: "550e8400-e29b-41d4-a716-446655440000",
        tenant_id: TENANT_ID,
        call_id: null,
        customer_phone: "+421 908 555 666",
        customer_name: "Marek Horváth",
        pizza_type: "Šunková, Kofola 0.33l",
        total_price: "18.00",
        delivery_address: "Mlynská 3, Košice",
        status: "DONE",
        notes: null,
        created_at: `${today}T17:30:00+01:00`,
        phone_confidence: null,
        address_confidence: null,
        phone_raw: null,
        address_raw: null,
        upsell_offered: false,
        upsell_item: null,
        upsell_accepted: false,
        transcript: null,
    },
    {
        id: "6ba7b811-9dad-11d1-80b4-00c04fd430c8",
        tenant_id: TENANT_ID,
        call_id: "e3c4d5e6-f7a8-b9c0-d1e2-f3a4b5c6d7e8",
        customer_phone: "+421 917 777 888",
        customer_name: null,
        pizza_type: "Diavola, Tiramisu",
        total_price: "29.00",
        delivery_address: "Komenského 22, Košice",
        status: "CANCELLED",
        notes: "Zákazník zrušil — dlhé čakanie",
        created_at: `${today}T17:05:00+01:00`,
        phone_confidence: 0.55, // unclear!
        address_confidence: 0.88,
        phone_raw: "nula deväť jedna sedem...",
        address_raw: "Komenského dvadsaťdva",
        upsell_offered: false,
        upsell_item: null,
        upsell_accepted: false,
        transcript: "Dobrý deň, chcem diavolu a tiramisu. Adresa Komenského 22. Číslo... nula deväť jedna sedem...",
    },
    {
        id: "6ba7b812-9dad-11d1-80b4-00c04fd430c8",
        tenant_id: TENANT_ID,
        call_id: "f4d5e6f7-a8b9-c0d1-e2f3-a4b5c6d7e8f9",
        customer_phone: "+421 905 999 000",
        customer_name: "Anna Szabóová",
        pizza_type: "Capricciosa, Calzone, Sprite 0.5l",
        total_price: "35.00",
        delivery_address: "Letná 7, Košice",
        status: "DONE",
        notes: null,
        created_at: `${today}T16:48:00+01:00`,
        phone_confidence: 0.99,
        address_confidence: 0.97,
        phone_raw: "+421 905 999 000",
        address_raw: "Letná sedem Košice",
        upsell_offered: true,
        upsell_item: "Tiramisu",
        upsell_accepted: false,
        transcript: "Dobrý deň, capricciosa, calzone a sprite pol litra. Letná 7, Košice. Tiramisu nie ďakujem.",
    },
    {
        id: "6ba7b813-9dad-11d1-80b4-00c04fd430c8",
        tenant_id: TENANT_ID,
        call_id: null,
        customer_phone: "+421 902 111 333",
        customer_name: "Eva Molnárová",
        pizza_type: "Margherita",
        total_price: "15.00",
        delivery_address: "Garbiarska 12, Košice",
        status: "DONE",
        notes: null,
        created_at: `${today}T16:22:00+01:00`,
        phone_confidence: null,
        address_confidence: null,
        phone_raw: null,
        address_raw: null,
        upsell_offered: false,
        upsell_item: null,
        upsell_accepted: false,
        transcript: null,
    },
    {
        id: "6ba7b814-9dad-11d1-80b4-00c04fd430c8",
        tenant_id: TENANT_ID,
        call_id: "a5e6f7a8-b9c0-d1e2-f3a4-b5c6d7e8f9a0",
        customer_phone: "+421 918 222 444",
        customer_name: "Tomáš Baláž",
        pizza_type: "Quattro Stagioni, Hawaiana, Tiramisu, Kofola 1l",
        total_price: "52.00",
        delivery_address: "Alžbetina 19, Košice",
        status: "DONE",
        notes: null,
        created_at: `${today}T16:01:00+01:00`,
        phone_confidence: 0.97,
        address_confidence: 0.94,
        phone_raw: "+421 918 222 444",
        address_raw: "Alžbetina devätnásť",
        upsell_offered: true,
        upsell_item: "Garlic bread",
        upsell_accepted: true,
        transcript: "Štyri ročné obdobia, hawaii, tiramisu a kofolu jeden liter. Áno, dám si aj cesnak bread. Alžbetina 19.",
    },
];

// ── KPI computation ───────────────────────────────────────────

export function computeKpis(orders: PizzaOrder[]): KpiData {
    const totals = orders.map((o) => parseTotalPrice(o.total_price));
    const revenue = totals.reduce((a, b) => a + b, 0);
    const openOrders = orders.filter(
        (o) => o.status === "NEW" || o.status === "CONFIRMED"
    ).length;
    const problems = orders.filter(isUnclear).length;

    const upsellOffered = orders.filter((o) => o.upsell_offered).length;
    const upsellAccepted = orders.filter((o) => o.upsell_accepted).length;
    const upsellRevenue = upsellAccepted * 1.50; // Simple estimate: 1.50€ per upsell

    return {
        ordersToday: orders.length,
        revenueToday: revenue,
        avgOrder: orders.length > 0 ? revenue / orders.length : 0,
        openOrders,
        problems,
        upsellOffered,
        upsellAccepted,
        upsellRevenue,
    };
}

export const mockKpis: KpiData = computeKpis(mockOrders);

// ── Mock Attention Items ──────────────────────────────────────

export const mockAttentionItems: AttentionItem[] = [
    {
        id: 1,
        type: "missing_address",
        callTime: "18:02",
        title: "Zákazník povedal len \"Františkánska...\"",
        description: "Adresa nejasná, odporúčame spätný hovor.",
    },
    {
        id: 2,
        type: "unclear_item",
        orderId: "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
        total: "42",
        title: "\"4 syry\" vs \"quattro formaggi\"",
        description: "Skontroluj mapovanie na menu.",
    },
    {
        id: 3,
        type: "low_confidence",
        callTime: "17:05",
        title: "Telefónne číslo – nízka istota (55 %)",
        description: "AI si nebol istý rozpoznaním čísla.",
    },
];
