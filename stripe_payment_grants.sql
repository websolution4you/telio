-- Allow the trusted server-side Stripe Checkout action to finalize pending payments.
-- Run once in the same Supabase project as the wallet migrations.

begin;

revoke all on public.payments from anon, authenticated;
grant select, insert, update on public.payments to service_role;

commit;
