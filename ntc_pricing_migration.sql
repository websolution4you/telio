-- ============================================================================
-- NTC Dynamic Pricing & Wallet Functions (Include all NOT NULL columns)
-- ============================================================================

-- 1. Aktualizácia funkcie wallet_create_ntc_booking
DROP FUNCTION IF EXISTS public.wallet_create_ntc_booking(UUID, TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.wallet_create_ntc_booking(
    p_user_id UUID,
    p_court_id TEXT,
    p_sport TEXT,
    p_customer_name TEXT,
    p_customer_phone TEXT,
    p_start_at TIMESTAMPTZ,
    p_end_at TIMESTAMPTZ,
    p_notes TEXT,
    p_idempotency_key TEXT
)
RETURNS TABLE (
    booking_id UUID,
    charged_eur NUMERIC,
    balance_eur NUMERIC,
    created BOOLEAN
) AS $$
DECLARE
    v_wallet_id UUID;
    v_current_balance NUMERIC(10, 2);
    v_has_card BOOLEAN := false;
    v_card_num TEXT;
    v_price NUMERIC(6, 2);
    v_new_balance NUMERIC(10, 2);
    v_new_booking_id UUID;
    v_existing_tx RECORD;
    v_tenant_id UUID := '595cbb6c-1019-41ae-b1c2-a60c13c8dcdf'::uuid;
    v_conflict_count INT;
BEGIN
    -- Idempotency check
    SELECT t.booking_id, t.amount_eur, w.balance_eur, false AS created
    INTO v_existing_tx
    FROM public.wallet_transactions t
    JOIN public.wallets w ON w.id = t.wallet_id
    WHERE (t.metadata->>'idempotency_key' = p_idempotency_key)
    LIMIT 1;

    IF FOUND THEN
        RETURN QUERY SELECT v_existing_tx.booking_id, v_existing_tx.amount_eur, v_existing_tx.balance_eur, false;
        RETURN;
    END IF;

    -- Membership card check
    SELECT u.card_number INTO v_card_num
    FROM public.booking_users u
    WHERE u.id = p_user_id;

    IF v_card_num IS NOT NULL AND TRIM(v_card_num) <> '' THEN
        v_has_card := true;
    END IF;

    -- Calculate dynamic price
    v_price := public.calculate_ntc_booking_price(p_sport, p_start_at, p_end_at, v_has_card);

    -- Lock and check wallet balance
    SELECT w.id, w.balance_eur INTO v_wallet_id, v_current_balance
    FROM public.wallets w
    WHERE w.user_id = p_user_id
    FOR UPDATE;

    IF v_wallet_id IS NULL THEN
        INSERT INTO public.wallets (tenant_id, user_id, balance_eur)
        VALUES (v_tenant_id, p_user_id, 0.00)
        RETURNING wallets.id, wallets.balance_eur INTO v_wallet_id, v_current_balance;
    END IF;

    IF v_current_balance < v_price THEN
        RAISE EXCEPTION 'Insufficient wallet balance. Required: %, Available: %', v_price, v_current_balance;
    END IF;

    -- Check court availability
    SELECT COUNT(*) INTO v_conflict_count
    FROM public.bookings b
    WHERE b.court_id = p_court_id
      AND b.status NOT IN ('cancelled', 'rejected')
      AND b.start_at < p_end_at
      AND end_at > p_start_at;

    IF v_conflict_count > 0 THEN
        RAISE EXCEPTION 'Court % is no longer available in the selected time range.', p_court_id;
    END IF;

    -- Deduct balance
    v_new_balance := v_current_balance - v_price;
    UPDATE public.wallets w
    SET balance_eur = v_new_balance, updated_at = now()
    WHERE w.id = v_wallet_id;

    -- Create booking
    INSERT INTO public.bookings (
        tenant_id,
        court_id,
        sport,
        customer_name,
        customer_phone,
        start_at,
        end_at,
        status,
        notes,
        user_id,
        price_eur
    )
    VALUES (
        v_tenant_id,
        p_court_id,
        p_sport,
        p_customer_name,
        NULLIF(p_customer_phone, ''),
        p_start_at,
        p_end_at,
        'confirmed',
        p_notes,
        p_user_id,
        v_price
    )
    RETURNING bookings.id INTO v_new_booking_id;

    -- Record transaction (with wallet_id, tenant_id, user_id)
    INSERT INTO public.wallet_transactions (
        wallet_id,
        tenant_id,
        user_id,
        booking_id,
        type,
        amount_eur,
        metadata
    )
    VALUES (
        v_wallet_id,
        v_tenant_id,
        p_user_id,
        v_new_booking_id,
        'booking_charge',
        v_price,
        jsonb_build_object(
            'court_id', p_court_id,
            'sport', p_sport,
            'start_at', p_start_at,
            'end_at', p_end_at,
            'has_card', v_has_card,
            'price_eur', v_price,
            'balance_after_eur', v_new_balance,
            'idempotency_key', p_idempotency_key
        )
    );

    RETURN QUERY SELECT v_new_booking_id, v_price, v_new_balance, true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Aktualizácia funkcie wallet_refund_ntc_booking
DROP FUNCTION IF EXISTS public.wallet_refund_ntc_booking(UUID);

CREATE OR REPLACE FUNCTION public.wallet_refund_ntc_booking(
    p_booking_id UUID
)
RETURNS TABLE (
    refunded_eur NUMERIC,
    balance_eur NUMERIC,
    refunded BOOLEAN
) AS $$
DECLARE
    v_tx_id UUID;
    v_wallet_id UUID;
    v_charge_amount NUMERIC(10, 2);
    v_current_balance NUMERIC(10, 2);
    v_new_balance NUMERIC(10, 2);
    v_booking_user_id UUID;
    v_tenant_id UUID := '595cbb6c-1019-41ae-b1c2-a60c13c8dcdf'::uuid;
BEGIN
    -- Check if booking was already refunded
    IF EXISTS (
        SELECT 1 FROM public.wallet_transactions wt
        WHERE wt.booking_id = p_booking_id AND wt.type = 'booking_refund'
    ) THEN
        SELECT w.balance_eur INTO v_current_balance
        FROM public.wallet_transactions t
        JOIN public.wallets w ON w.id = t.wallet_id
        WHERE t.booking_id = p_booking_id AND t.type = 'booking_refund'
        LIMIT 1;

        RETURN QUERY SELECT 0.00, COALESCE(v_current_balance, 0.00), false;
        RETURN;
    END IF;

    -- Find original charge
    SELECT t.id, t.wallet_id, t.amount_eur
    INTO v_tx_id, v_wallet_id, v_charge_amount
    FROM public.wallet_transactions t
    WHERE t.booking_id = p_booking_id AND t.type = 'booking_charge'
    LIMIT 1;

    IF v_tx_id IS NULL THEN
        UPDATE public.bookings b SET status = 'cancelled' WHERE b.id = p_booking_id;
        RETURN QUERY SELECT 0.00, 0.00, false;
        RETURN;
    END IF;

    -- Get user_id from booking
    SELECT b.user_id, b.tenant_id INTO v_booking_user_id, v_tenant_id
    FROM public.bookings b
    WHERE b.id = p_booking_id;

    -- Lock and refund wallet
    SELECT w.balance_eur INTO v_current_balance
    FROM public.wallets w
    WHERE w.id = v_wallet_id
    FOR UPDATE;

    v_new_balance := v_current_balance + v_charge_amount;

    UPDATE public.wallets w
    SET balance_eur = v_new_balance, updated_at = now()
    WHERE w.id = v_wallet_id;

    UPDATE public.bookings b
    SET status = 'cancelled'
    WHERE b.id = p_booking_id;

    INSERT INTO public.wallet_transactions (
        wallet_id,
        tenant_id,
        user_id,
        booking_id,
        type,
        amount_eur,
        metadata
    )
    VALUES (
        v_wallet_id,
        v_tenant_id,
        v_booking_user_id,
        p_booking_id,
        'booking_refund',
        v_charge_amount,
        jsonb_build_object('refund_for_charge_id', v_tx_id, 'refund_amount', v_charge_amount, 'balance_after_eur', v_new_balance)
    );

    RETURN QUERY SELECT v_charge_amount, v_new_balance, true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Pridelenie práv
GRANT EXECUTE ON FUNCTION public.wallet_create_ntc_booking(UUID, TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.wallet_refund_ntc_booking(UUID) TO service_role;
