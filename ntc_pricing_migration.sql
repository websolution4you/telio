-- ============================================================================
-- NTC Dynamic Pricing & Wallet Functions (Fix refund type: 'refund')
-- ============================================================================

-- 1. Aktualizácia funkcie wallet_refund_ntc_booking
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

    -- Find original charge (and take absolute value)
    SELECT t.id, t.wallet_id, ABS(t.amount_eur)
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
        jsonb_build_object('refund_for_charge_id', v_tx_id, 'refund_amount', v_charge_amount, 'balance_after_eur', v_new_balance)
    );

    RETURN QUERY SELECT v_charge_amount, v_new_balance, true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.wallet_refund_ntc_booking(UUID) TO service_role;
