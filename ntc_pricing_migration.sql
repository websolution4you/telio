-- ============================================================================
-- NTC Wallet Refund for Both User & Admin Cancellations
-- ============================================================================

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
    v_charge_amount NUMERIC(10, 2) := 0.00;
    v_current_balance NUMERIC(10, 2) := 0.00;
    v_new_balance NUMERIC(10, 2) := 0.00;
    v_booking_user_id UUID;
    v_booking_price NUMERIC(10, 2);
    v_tenant_id UUID := '595cbb6c-1019-41ae-b1c2-a60c13c8dcdf'::uuid;
BEGIN
    -- 1. Check if booking was already refunded
    IF EXISTS (
        SELECT 1 FROM public.wallet_transactions wt
        WHERE wt.booking_id = p_booking_id AND wt.type = 'refund'
    ) THEN
        SELECT w.balance_eur INTO v_current_balance
        FROM public.wallet_transactions t
        JOIN public.wallets w ON w.id = t.wallet_id
        WHERE t.booking_id = p_booking_id AND t.type = 'refund'
        LIMIT 1;

        RETURN QUERY SELECT 0.00, COALESCE(v_current_balance, 0.00), false;
        RETURN;
    END IF;

    -- 2. Get booking details
    SELECT b.user_id, b.tenant_id, COALESCE(b.price_eur, 0.00)
    INTO v_booking_user_id, v_tenant_id, v_booking_price
    FROM public.bookings b
    WHERE b.id = p_booking_id;

    -- 3. Find original charge transaction if one exists
    SELECT t.id, t.wallet_id, ABS(t.amount_eur)
    INTO v_tx_id, v_wallet_id, v_charge_amount
    FROM public.wallet_transactions t
    WHERE t.booking_id = p_booking_id AND t.type = 'booking_charge'
    LIMIT 1;

    -- If no transaction record was found, fall back to booking.price_eur if user exists
    IF v_tx_id IS NULL THEN
        IF v_booking_user_id IS NOT NULL AND v_booking_price > 0 THEN
            v_charge_amount := v_booking_price;
        ELSE
            -- No user to refund or 0 price, just cancel booking
            UPDATE public.bookings b SET status = 'cancelled' WHERE b.id = p_booking_id;
            RETURN QUERY SELECT 0.00, 0.00, false;
            RETURN;
        END IF;
    END IF;

    -- 4. Find or lock user wallet
    IF v_wallet_id IS NULL AND v_booking_user_id IS NOT NULL THEN
        SELECT w.id, w.balance_eur INTO v_wallet_id, v_current_balance
        FROM public.wallets w
        WHERE w.user_id = v_booking_user_id
        FOR UPDATE;

        IF v_wallet_id IS NULL THEN
            INSERT INTO public.wallets (tenant_id, user_id, balance_eur)
            VALUES (v_tenant_id, v_booking_user_id, 0.00)
            RETURNING wallets.id, wallets.balance_eur INTO v_wallet_id, v_current_balance;
        END IF;
    ELSE
        SELECT w.balance_eur INTO v_current_balance
        FROM public.wallets w
        WHERE w.id = v_wallet_id
        FOR UPDATE;
    END IF;

    -- 5. Calculate new balance & refund
    v_new_balance := COALESCE(v_current_balance, 0.00) + v_charge_amount;

    UPDATE public.wallets w
    SET balance_eur = v_new_balance, updated_at = now()
    WHERE w.id = v_wallet_id;

    UPDATE public.bookings b
    SET status = 'cancelled'
    WHERE b.id = p_booking_id;

    -- 6. Insert refund transaction record
    INSERT INTO public.wallet_transactions (
        wallet_id,
        tenant_id,
        user_id,
        booking_id,
        type,
        amount_eur,
        idempotency_key,
        metadata
    )
    VALUES (
        v_wallet_id,
        v_tenant_id,
        v_booking_user_id,
        p_booking_id,
        'refund',
        v_charge_amount,
        'refund_' || p_booking_id::text,
        jsonb_build_object(
            'refund_for_charge_id', v_tx_id,
            'refund_amount', v_charge_amount,
            'balance_after_eur', v_new_balance
        )
    );

    RETURN QUERY SELECT v_charge_amount, v_new_balance, true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.wallet_refund_ntc_booking(UUID) TO service_role;
