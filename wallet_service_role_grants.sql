-- Grant wallet RPC execution only to trusted Supabase service-role callers.
-- Run once in the same Supabase project that contains the wallet tables.

begin;

revoke execute on function public.wallet_get_balance(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.wallet_create_ntc_booking(uuid, text, text, text, text, timestamptz, timestamptz, text, text) from public, anon, authenticated;
revoke execute on function public.wallet_refund_ntc_booking(uuid) from public, anon, authenticated;
revoke execute on function public.wallet_manual_adjustment(uuid, uuid, numeric, text, text, jsonb) from public, anon, authenticated;

grant execute on function public.wallet_get_balance(uuid, uuid) to service_role;
grant execute on function public.wallet_create_ntc_booking(uuid, text, text, text, text, timestamptz, timestamptz, text, text) to service_role;
grant execute on function public.wallet_refund_ntc_booking(uuid) to service_role;
grant execute on function public.wallet_manual_adjustment(uuid, uuid, numeric, text, text, jsonb) to service_role;

commit;
