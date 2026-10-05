-- Migration: Add ntc_team to role_booking_policies and allow recurring bookings
-- Run this script in the Supabase SQL Editor

begin;

-- Remove restrictive check constraints if they exist
alter table public.role_booking_policies
    drop constraint if exists role_booking_policies_role_check;

alter table public.booking_users
    drop constraint if exists booking_users_role_check;

-- Add can_make_recurring column to role_booking_policies
alter table public.role_booking_policies
    add column if not exists can_make_recurring boolean not null default false;

-- Enable can_make_recurring for admin by default
update public.role_booking_policies
set can_make_recurring = true
where role = 'admin';

-- Insert or update ntc_team policy
insert into public.role_booking_policies (
    role,
    max_booking_duration_minutes,
    booking_horizon_days,
    discount_eur_per_hour,
    cancellation_deadline_hours,
    is_active,
    can_make_recurring
)
values
    ('ntc_team', 480, 180, 0, 0, true, true)
on conflict (role) do update set
    can_make_recurring = excluded.can_make_recurring;

commit;
