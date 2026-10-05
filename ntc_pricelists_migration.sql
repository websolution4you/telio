-- Migration: Create ntc_pricelists table for seasonal pricing management
-- Run this script in the Supabase SQL Editor if you want persistent database storage for pricelists

begin;

create table if not exists public.ntc_pricelists (
    id text primary key,
    tenant_id text not null default '595cbb6c-1019-41ae-b1c2-a60c13c8dcdf',
    name text not null,
    valid_from date not null,
    valid_to date not null,
    is_active boolean not null default false,
    non_member_surcharge_eur numeric(10, 2) not null default 2.00,
    intervals jsonb not null default '[]'::jsonb,
    discount_tiers jsonb not null default '[]'::jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- Ensure discount_tiers column exists if table already created
alter table public.ntc_pricelists add column if not exists discount_tiers jsonb not null default '[]'::jsonb;

-- Seed official Winter Season 2026/2027 if table is empty
insert into public.ntc_pricelists (
    id,
    tenant_id,
    name,
    valid_from,
    valid_to,
    is_active,
    non_member_surcharge_eur,
    discount_tiers,
    intervals
)
values (
    'ntc-winter-2026-2027',
    '595cbb6c-1019-41ae-b1c2-a60c13c8dcdf',
    'Cenník Zimná sezóna 2026/2027',
    '2026-10-01',
    '2027-04-30',
    true,
    2.00,
    '[
        {"id": "tier-base", "name": "Základná cena", "isPercentual": true, "percentageOfBase": 100, "discountPercent": 0, "isDefault": true, "price60": 10, "price120": 0},
        {"id": "tier-10", "name": "10 % zľava", "isPercentual": true, "percentageOfBase": 90, "discountPercent": 10, "price60": 9, "price120": 0},
        {"id": "tier-20", "name": "20 % zľava", "isPercentual": true, "percentageOfBase": 80, "discountPercent": 20, "price60": 8, "price120": 0},
        {"id": "tier-50", "name": "50 % zľava", "isPercentual": true, "percentageOfBase": 50, "discountPercent": 50, "price60": 5, "price120": 0},
        {"id": "tier-regular", "name": "Bežná cena", "isPercentual": true, "percentageOfBase": 100, "discountPercent": 0, "price60": 10, "price120": 0},
        {"id": "tier-cash", "name": "Hotovosť", "isPercentual": true, "percentageOfBase": 100, "discountPercent": 0, "price60": 10, "price120": 0}
    ]'::jsonb,
    '[
        {
            "id": "weekday-morning",
            "name": "Pondelok – Piatok (Mimo špičky)",
            "days": [1, 2, 3, 4, 5],
            "startHour": 7,
            "endHour": 16,
            "squashStartHour": 9,
            "squashEndHour": 16,
            "prices": {
                "badminton": 14,
                "tennis": 29,
                "tennis-clay": 20,
                "squash": 11
            }
        },
        {
            "id": "weekday-peak",
            "name": "Pondelok – Piatok (Špička)",
            "days": [1, 2, 3, 4, 5],
            "startHour": 16,
            "endHour": 22,
            "squashStartHour": 16,
            "squashEndHour": 21,
            "prices": {
                "badminton": 20,
                "tennis": 39,
                "tennis-clay": 25,
                "squash": 15
            }
        },
        {
            "id": "weekend-all-day",
            "name": "Sobota – Nedeľa (Celý deň)",
            "days": [6, 0],
            "startHour": 7,
            "endHour": 21,
            "squashStartHour": 9,
            "squashEndHour": 21,
            "prices": {
                "badminton": 14,
                "tennis": 28,
                "tennis-clay": 20,
                "squash": 11
            }
        }
    ]'::jsonb
)
on conflict (id) do nothing;

commit;
