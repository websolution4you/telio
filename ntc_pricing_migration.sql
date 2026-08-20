-- ============================================================================
-- NTC Dynamic Pricing & Wallet Deduction Migration
-- ============================================================================

-- 1. Create NTC pricing rules table
CREATE TABLE IF NOT EXISTS public.ntc_pricing_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sport TEXT NOT NULL, -- 'badminton', 'tennis' (indoor hala), 'tennis-clay' (antuka), 'squash'
    day_type TEXT NOT NULL, -- 'weekday' (Mon-Fri), 'weekend' (Sat-Sun)
    start_hour INT NOT NULL, -- inclusive (e.g. 7, 9, 16)
    end_hour INT NOT NULL,   -- exclusive (e.g. 16, 21, 22)
    hourly_rate_member NUMERIC(6, 2) NOT NULL,
    hourly_rate_standard NUMERIC(6, 2) NOT NULL, -- Non-member (+2 €)
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Clear existing rules if any to ensure fresh clean rules
TRUNCATE TABLE public.ntc_pricing_rules;

-- Populate with official NTC price list
INSERT INTO public.ntc_pricing_rules (sport, day_type, start_hour, end_hour, hourly_rate_member, hourly_rate_standard)
VALUES
    -- BEDMINTON
    ('badminton', 'weekday', 7, 16, 13.00, 15.00),
    ('badminton', 'weekday', 16, 22, 19.00, 21.00),
    ('badminton', 'weekend', 7, 21, 13.00, 15.00),

    -- TENIS - ANTUKA
    ('tennis-clay', 'weekday', 7, 16, 13.00, 15.00),
    ('tennis-clay', 'weekday', 16, 22, 15.00, 17.00),
    ('tennis-clay', 'weekend', 7, 21, 13.00, 15.00),

    -- TENIS - HALA (INDOOR)
    ('tennis', 'weekday', 7, 16, 17.00, 19.00),
    ('tennis', 'weekday', 16, 22, 19.00, 21.00),
    ('tennis', 'weekend', 7, 21, 17.00, 19.00),

    -- SQUASH
    ('squash', 'weekday', 9, 16, 11.00, 13.00),
    ('squash', 'weekday', 16, 21, 15.00, 17.00),
    ('squash', 'weekend', 9, 21, 11.00, 13.00);

-- Enable RLS and grant read access
ALTER TABLE public.ntc_pricing_rules ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Public read access for ntc_pricing_rules" ON public.ntc_pricing_rules;
    CREATE POLICY "Public read access for ntc_pricing_rules" ON public.ntc_pricing_rules
        FOR SELECT TO authenticated, anon USING (true);
END $$;

-- 2. Add price_eur column to bookings table if not present
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'bookings' AND column_name = 'price_eur'
    ) THEN
        ALTER TABLE public.bookings ADD COLUMN price_eur NUMERIC(6, 2);
    END IF;
END $$;

-- 3. SQL Function to calculate exact price for a given sport, time range, and card status
CREATE OR REPLACE FUNCTION public.calculate_ntc_booking_price(
    p_sport TEXT,
    p_start_at TIMESTAMPTZ,
    p_end_at TIMESTAMPTZ,
    p_has_card BOOLEAN DEFAULT false
)
RETURNS NUMERIC AS $$
DECLARE
    v_total_price NUMERIC := 0.00;
    v_current_slice_start TIMESTAMPTZ;
    v_current_slice_end TIMESTAMPTZ;
    v_slice_minutes INT := 15; -- 15-minute calculation granularity for 100% precision
    v_slice_hours NUMERIC;
    v_hour_local INT;
    v_dow_local INT; -- 0 is Sunday, 1-5 is Mon-Fri, 6 is Saturday
    v_day_type TEXT;
    v_rate NUMERIC;
    v_normalized_sport TEXT;
BEGIN
    IF p_end_at <= p_start_at THEN
        RETURN 0.00;
    END IF;

    -- Normalize sport (handles court IDs like badminton-1 -> badminton)
    v_normalized_sport := LOWER(p_sport);
    IF v_normalized_sport LIKE 'badminton%' THEN
        v_normalized_sport := 'badminton';
    ELSIF v_normalized_sport LIKE 'tennis-clay%' OR v_normalized_sport LIKE 'clay%' THEN
        v_normalized_sport := 'tennis-clay';
    ELSIF v_normalized_sport LIKE 'tennis%' THEN
        v_normalized_sport := 'tennis';
    ELSIF v_normalized_sport LIKE 'squash%' THEN
        v_normalized_sport := 'squash';
    END IF;

    v_current_slice_start := p_start_at;
    
    WHILE v_current_slice_start < p_end_at LOOP
        v_current_slice_end := LEAST(v_current_slice_start + (v_slice_minutes || ' minutes')::INTERVAL, p_end_at);
        v_slice_hours := EXTRACT(EPOCH FROM (v_current_slice_end - v_current_slice_start)) / 3600.0;
        
        -- Bratislava timezone calculations
        v_hour_local := EXTRACT(HOUR FROM (v_current_slice_start AT TIME ZONE 'Europe/Bratislava'));
        v_dow_local  := EXTRACT(DOW FROM (v_current_slice_start AT TIME ZONE 'Europe/Bratislava'));

        IF v_dow_local IN (0, 6) THEN
            v_day_type := 'weekend';
        ELSE
            v_day_type := 'weekday';
        END IF;

        -- Find rate for this slice
        IF p_has_card THEN
            SELECT hourly_rate_member INTO v_rate
            FROM public.ntc_pricing_rules
            WHERE sport = v_normalized_sport
              AND day_type = v_day_type
              AND start_hour <= v_hour_local
              AND end_hour > v_hour_local
            LIMIT 1;
        ELSE
            SELECT hourly_rate_standard INTO v_rate
            FROM public.ntc_pricing_rules
            WHERE sport = v_normalized_sport
              AND day_type = v_day_type
              AND start_hour <= v_hour_local
              AND end_hour > v_hour_local
            LIMIT 1;
        END IF;

        -- Fallback default if out of standard bounds
        IF v_rate IS NULL THEN
            IF p_has_card THEN
                v_rate := 13.00;
            ELSE
                v_rate := 15.00;
            END IF;
        END IF;

        v_total_price := v_total_price + (v_rate * v_slice_hours);
        v_current_slice_start := v_current_slice_end;
    END LOOP;

    RETURN ROUND(v_total_price, 2);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 4. Update wallet_create_ntc_booking to use dynamic NTC pricing
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
    v_tenant_id TEXT := '595cbb6c-1019-41ae-b1c2-a60c13c8dcdf';
    v_conflict_count INT;
BEGIN
    -- Check idempotency
    SELECT t.booking_id, t.amount_eur, w.balance_eur, false AS created
    INTO v_existing_tx
    FROM public.wallet_transactions t
    JOIN public.wallets w ON w.id = t.wallet_id
    WHERE t.idempotency_key = p_idempotency_key
    LIMIT 1;

    IF FOUND THEN
        RETURN QUERY SELECT v_existing_tx.booking_id, v_existing_tx.amount_eur, v_existing_tx.balance_eur, false;
        RETURN;
    END IF;

    -- Check if user has membership card
    SELECT card_number INTO v_card_num
    FROM public.booking_users
    WHERE id = p_user_id;

    IF v_card_num IS NOT NULL AND TRIM(v_card_num) <> '' THEN
        v_has_card := true;
    END IF;

    -- Calculate exact dynamic price
    v_price := public.calculate_ntc_booking_price(p_sport, p_start_at, p_end_at, v_has_card);

    -- Lock and check wallet balance
    SELECT id, balance_eur INTO v_wallet_id, v_current_balance
    FROM public.wallets
    WHERE user_id = p_user_id
    FOR UPDATE;

    IF v_wallet_id IS NULL THEN
        INSERT INTO public.wallets (user_id, balance_eur)
        VALUES (p_user_id, 0.00)
        RETURNING id, balance_eur INTO v_wallet_id, v_current_balance;
    END IF;

    IF v_current_balance < v_price THEN
        RAISE EXCEPTION 'Insufficient wallet balance. Required: %, Available: %', v_price, v_current_balance;
    END IF;

    -- Check court availability
    SELECT COUNT(*) INTO v_conflict_count
    FROM public.bookings
    WHERE court_id = p_court_id
      AND status NOT IN ('cancelled', 'rejected')
      AND start_at < p_end_at
      AND end_at > p_start_at;

    IF v_conflict_count > 0 THEN
        RAISE EXCEPTION 'Court % is no longer available in the selected time range.', p_court_id;
    END IF;

    -- Deduct balance
    v_new_balance := v_current_balance - v_price;
    UPDATE public.wallets
    SET balance_eur = v_new_balance, updated_at = now()
    WHERE id = v_wallet_id;

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
    RETURNING id INTO v_new_booking_id;

    -- Record transaction
    INSERT INTO public.wallet_transactions (
        wallet_id,
        booking_id,
        type,
        amount_eur,
        balance_after_eur,
        idempotency_key,
        metadata
    )
    VALUES (
        v_wallet_id,
        v_new_booking_id,
        'booking_charge',
        v_price,
        v_new_balance,
        p_idempotency_key,
        jsonb_build_object(
            'court_id', p_court_id,
            'sport', p_sport,
            'start_at', p_start_at,
            'end_at', p_end_at,
            'has_card', v_has_card,
            'price_eur', v_price
        )
    );

    RETURN QUERY SELECT v_new_booking_id, v_price, v_new_balance, true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Update wallet_refund_ntc_booking to refund exact charged amount
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
BEGIN
    -- Check if booking was already refunded
    IF EXISTS (
        SELECT 1 FROM public.wallet_transactions
        WHERE booking_id = p_booking_id AND type = 'booking_refund'
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
    SELECT id, wallet_id, amount_eur
    INTO v_tx_id, v_wallet_id, v_charge_amount
    FROM public.wallet_transactions
    WHERE booking_id = p_booking_id AND type = 'booking_charge'
    LIMIT 1;

    IF v_tx_id IS NULL THEN
        -- No charge found, just cancel booking
        UPDATE public.bookings SET status = 'cancelled' WHERE id = p_booking_id;
        RETURN QUERY SELECT 0.00, 0.00, false;
        RETURN;
    END IF;

    -- Lock and refund wallet
    SELECT balance_eur INTO v_current_balance
    FROM public.wallets
    WHERE id = v_wallet_id
    FOR UPDATE;

    v_new_balance := v_current_balance + v_charge_amount;

    UPDATE public.wallets
    SET balance_eur = v_new_balance, updated_at = now()
    WHERE id = v_wallet_id;

    -- Mark booking as cancelled
    UPDATE public.bookings
    SET status = 'cancelled'
    WHERE id = p_booking_id;

    -- Record refund transaction
    INSERT INTO public.wallet_transactions (
        wallet_id,
        booking_id,
        type,
        amount_eur,
        balance_after_eur,
        metadata
    )
    VALUES (
        v_wallet_id,
        p_booking_id,
        'booking_refund',
        v_charge_amount,
        v_new_balance,
        jsonb_build_object('refund_for_charge_id', v_tx_id, 'refund_amount', v_charge_amount)
    );

    RETURN QUERY SELECT v_charge_amount, v_new_balance, true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT SELECT ON public.ntc_pricing_rules TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.calculate_ntc_booking_price(TEXT, TIMESTAMPTZ, TIMESTAMPTZ, BOOLEAN) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.wallet_create_ntc_booking(UUID, TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.wallet_refund_ntc_booking(UUID) TO service_role;
