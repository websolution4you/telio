-- Migration: Reorder reservation categories and rename 'Tréningy' to 'NTC Tím'
-- 1. Rezervácia Admin (sort_order = 1)
-- 2. NTC Tím (formerly 'Tréningy', sort_order = 2)
-- 3. Údržba kurtov (sort_order = 3)
-- Run this in your Supabase SQL Editor

begin;

update public.ntc_reservation_categories
set sort_order = 1,
    updated_at = now()
where id = 'admin_reservation';

update public.ntc_reservation_categories
set name = 'NTC Tím',
    sort_order = 2,
    updated_at = now()
where id = 'training';

update public.ntc_reservation_categories
set sort_order = 3,
    updated_at = now()
where id = 'maintenance';

commit;

