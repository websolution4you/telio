-- Booking policies by user role.
-- Safe to run repeatedly in the Supabase SQL Editor.

begin;

-- Keep the existing text role column and normalize all existing values first.
alter table public.booking_users
    add column if not exists role varchar(50);

update public.booking_users
set role = case lower(trim(coalesce(role, 'user')))
    when 'admin' then 'admin'
    when 'trainer' then 'trainer'
    when 'trener' then 'trainer'
    else 'user'
end;

alter table public.booking_users
    alter column role set default 'user',
    alter column role set not null;

create table if not exists public.role_booking_policies (
    role varchar(50) primary key,
    max_booking_duration_minutes integer not null,
    booking_horizon_days integer not null,
    discount_percent numeric(5, 2) not null default 0,
    cancellation_deadline_hours integer not null default 24,
    is_active boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    constraint role_booking_policies_role_check
        check (role in ('admin', 'user', 'trainer')),
    constraint role_booking_policies_duration_check
        check (max_booking_duration_minutes > 0),
    constraint role_booking_policies_horizon_check
        check (booking_horizon_days >= 0),
    constraint role_booking_policies_discount_check
        check (discount_percent between 0 and 100),
    constraint role_booking_policies_cancellation_check
        check (cancellation_deadline_hours >= 0)
);

-- Initial policy values. Change these values later with UPDATE if needed.
insert into public.role_booking_policies (
    role,
    max_booking_duration_minutes,
    booking_horizon_days,
    discount_percent,
    cancellation_deadline_hours
)
values
    ('user', 120, 14, 0, 24),
    ('trainer', 240, 30, 20, 24),
    ('admin', 720, 365, 0, 0)
on conflict (role) do nothing;

-- Replace older versions of these constraints safely.
alter table public.booking_users
    drop constraint if exists booking_users_role_check;

alter table public.booking_users
    drop constraint if exists booking_users_role_fkey;

alter table public.booking_users
    add constraint booking_users_role_check
        check (role in ('admin', 'user', 'trainer'));

alter table public.booking_users
    add constraint booking_users_role_fkey
        foreign key (role)
        references public.role_booking_policies(role)
        on update cascade
        on delete restrict;

create index if not exists idx_booking_users_role
    on public.booking_users(role);

-- Reuse the project's existing updated_at trigger function when available.
do $$
begin
    if to_regprocedure('public.update_updated_at_column()') is not null
       and not exists (
           select 1
           from pg_trigger
           where tgname = 'update_role_booking_policies_updated_at'
             and tgrelid = 'public.role_booking_policies'::regclass
             and not tgisinternal
       ) then
        create trigger update_role_booking_policies_updated_at
        before update on public.role_booking_policies
        for each row
        execute function public.update_updated_at_column();
    end if;
end
$$;

commit;

-- Verification queries:
select role, max_booking_duration_minutes, booking_horizon_days,
       discount_percent, cancellation_deadline_hours, is_active
from public.role_booking_policies
order by role;

select role, count(*) as users_count
from public.booking_users
group by role
order by role;
