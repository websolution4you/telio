-- Read-only wallet balance function for trusted server-side callers.
-- Run once in the Supabase SQL Editor.

begin;

create or replace function public.wallet_get_balance(
    p_tenant_id uuid,
    p_user_id uuid
)
returns table (
    balance_eur numeric(12, 2),
    wallet_exists boolean
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
    select
        coalesce(w.balance_eur, 0.00)::numeric(12, 2) as balance_eur,
        (w.id is not null) as wallet_exists
    from (select 1) as seed
    left join public.wallets as w
      on w.tenant_id = p_tenant_id
     and w.user_id = p_user_id;
$$;

revoke execute on function public.wallet_get_balance(uuid, uuid) from public;

do $$
begin
    if exists (select 1 from pg_roles where rolname = 'anon') then
        revoke execute on function public.wallet_get_balance(uuid, uuid) from anon;
    end if;
    if exists (select 1 from pg_roles where rolname = 'authenticated') then
        revoke execute on function public.wallet_get_balance(uuid, uuid) from authenticated;
    end if;
    if exists (select 1 from pg_roles where rolname = 'service_role') then
        grant execute on function public.wallet_get_balance(uuid, uuid) to service_role;
    end if;
end;
$$;

commit;
