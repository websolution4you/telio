-- ============================================================================
-- Support MultiSport cards in wallet_create_ntc_booking (1x = -50%, 2x = -100%)
-- ============================================================================

begin;

create or replace function public.wallet_create_ntc_booking(
    p_user_id uuid,
    p_court_id text,
    p_sport text,
    p_customer_name text,
    p_customer_phone text,
    p_start_at timestamptz,
    p_end_at timestamptz,
    p_notes text,
    p_idempotency_key text
)
returns table (
    booking_id uuid,
    charged_eur numeric,
    balance_eur numeric,
    created boolean
) as $$
declare
    v_wallet_id uuid;
    v_current_balance numeric(10, 2);
    v_has_card boolean := false;
    v_card_num text;
    v_role text;
    v_policy public.role_booking_policies%rowtype;
    v_duration_minutes integer;
    v_base_price numeric(10, 2);
    v_role_discount numeric(10, 2);
    v_price numeric(10, 2);
    v_multisport_count integer := 0;
    v_new_balance numeric(10, 2);
    v_new_booking_id uuid;
    v_existing_tx record;
    v_tenant_id uuid := '595cbb6c-1019-41ae-b1c2-a60c13c8dcdf'::uuid;
    v_conflict_count integer;
begin
    select t.booking_id, abs(t.amount_eur) as amount_eur, w.balance_eur
    into v_existing_tx
    from public.wallet_transactions t
    join public.wallets w on w.id = t.wallet_id
    where t.idempotency_key = p_idempotency_key
    limit 1;

    if found then
        return query select v_existing_tx.booking_id, v_existing_tx.amount_eur, v_existing_tx.balance_eur, false;
        return;
    end if;

    if p_end_at <= p_start_at then
        raise exception 'Invalid booking time range.';
    end if;

    select u.card_number, u.role
    into v_card_num, v_role
    from public.booking_users u
    where u.id = p_user_id;

    if v_role is null then
        raise exception 'Booking user was not found.';
    end if;

    select p.* into v_policy
    from public.role_booking_policies p
    where p.role = v_role;

    if v_policy.role is null then
        raise exception 'Role booking policy was not found.';
    end if;
    if not v_policy.is_active then
        raise exception 'Role booking policy is inactive.';
    end if;

    v_duration_minutes := round(extract(epoch from (p_end_at - p_start_at)) / 60.0);
    if v_duration_minutes > v_policy.max_booking_duration_minutes
       or not (
           v_duration_minutes in (30, 60, 90, 120)
           or (v_duration_minutes >= 180 and mod(v_duration_minutes, 60) = 0)
       ) then
        raise exception 'Booking duration is not allowed for this role.';
    end if;

    if p_start_at < now() then
        raise exception 'Booking cannot start in the past.';
    end if;
    if (p_start_at at time zone 'Europe/Bratislava')::date
       > (now() at time zone 'Europe/Bratislava')::date + v_policy.booking_horizon_days then
        raise exception 'Booking horizon exceeded for this role.';
    end if;

    v_has_card := v_card_num is not null and trim(v_card_num) <> '';
    v_base_price := public.calculate_ntc_booking_price(p_sport, p_start_at, p_end_at, v_has_card);
    v_role_discount := v_policy.discount_eur_per_hour * v_duration_minutes / 60.0;
    v_price := greatest(0.00, v_base_price - v_role_discount);

    -- MultiSport card discounts
    begin
        v_multisport_count := coalesce((p_notes::jsonb->>'multisportCardsCount')::integer, 0);
    exception when others then
        v_multisport_count := 0;
    end;

    if v_multisport_count = 1 then
        v_price := round(v_price * 0.5, 2);
    elsif v_multisport_count >= 2 then
        v_price := 0.00;
    end if;

    select w.id, w.balance_eur
    into v_wallet_id, v_current_balance
    from public.wallets w
    where w.user_id = p_user_id
    for update;

    if v_wallet_id is null then
        insert into public.wallets (tenant_id, user_id, balance_eur)
        values (v_tenant_id, p_user_id, 0.00)
        returning wallets.id, wallets.balance_eur into v_wallet_id, v_current_balance;
    end if;

    if v_current_balance < v_price then
        raise exception 'Insufficient wallet balance. Required: %, Available: %', v_price, v_current_balance;
    end if;

    select count(*) into v_conflict_count
    from public.bookings b
    where b.tenant_id = v_tenant_id
      and b.court_id = p_court_id
      and b.status not in ('cancelled', 'rejected')
      and b.start_at < p_end_at
      and b.end_at > p_start_at;

    if v_conflict_count > 0 then
        raise exception 'Court % is no longer available in the selected time range.', p_court_id;
    end if;

    v_new_balance := v_current_balance - v_price;
    update public.wallets w
    set balance_eur = v_new_balance, updated_at = now()
    where w.id = v_wallet_id;

    insert into public.bookings (
        tenant_id, court_id, sport, customer_name, customer_phone,
        start_at, end_at, status, notes, user_id, price_eur
    ) values (
        v_tenant_id, p_court_id, p_sport, p_customer_name,
        nullif(p_customer_phone, ''), p_start_at, p_end_at,
        'confirmed', p_notes, p_user_id, v_price
    ) returning bookings.id into v_new_booking_id;

    insert into public.wallet_transactions (
        wallet_id, tenant_id, user_id, booking_id, type,
        amount_eur, idempotency_key, metadata
    ) values (
        v_wallet_id, v_tenant_id, p_user_id, v_new_booking_id,
        'booking_charge', -v_price, p_idempotency_key,
        jsonb_build_object(
            'court_id', p_court_id,
            'sport', p_sport,
            'start_at', p_start_at,
            'end_at', p_end_at,
            'has_card', v_has_card,
            'base_price_eur', v_base_price,
            'role', v_role,
            'role_discount_eur_per_hour', v_policy.discount_eur_per_hour,
            'role_discount_eur', v_role_discount,
            'multisport_cards_count', v_multisport_count,
            'price_eur', v_price,
            'balance_after_eur', v_new_balance
        )
    );

    return query select v_new_booking_id, v_price, v_new_balance, true;
end;
$$ language plpgsql security definer;

grant execute on function public.wallet_create_ntc_booking(
    uuid, text, text, text, text, timestamptz, timestamptz, text, text
) to service_role;

commit;
