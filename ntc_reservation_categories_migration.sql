-- Migration: Create ntc_reservation_categories table for custom admin reservation categories and colors
-- Run this in your Supabase SQL Editor

begin;

create table if not exists public.ntc_reservation_categories (
    id text primary key,
    tenant_id text not null default '595cbb6c-1019-41ae-b1c2-a60c13c8dcdf',
    name text not null,
    color text not null,
    border text not null,
    is_system boolean not null default false,
    has_player_field boolean not null default true,
    sort_order integer not null default 0,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- Seed initial default categories if not already present
insert into public.ntc_reservation_categories (
    id,
    tenant_id,
    name,
    color,
    border,
    is_system,
    has_player_field,
    sort_order
)
values
    ('maintenance', '595cbb6c-1019-41ae-b1c2-a60c13c8dcdf', 'Údržba kurtov', '#FFC9C9', '#F29E9E', true, false, 1),
    ('admin_reservation', '595cbb6c-1019-41ae-b1c2-a60c13c8dcdf', 'Rezervácia Admin', '#FFFF33', '#E6E600', true, true, 2),
    ('training', '595cbb6c-1019-41ae-b1c2-a60c13c8dcdf', 'Tréningy', '#F4CDE4', '#EAAECF', true, true, 3)
on conflict (id) do nothing;

commit;
