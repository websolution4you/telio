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
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- Seed official Winter Season 2026/2027 if table is empty
insert into public.ntc_pricelists (
    id,
    tenant_id,
    name,
    valid_from,
    valid_to,
    is_active,
    non_member_surcharge_eur,
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
