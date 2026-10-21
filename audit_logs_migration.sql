-- ==============================================================================
-- Migrácia pre Audit a Activity Logy (audit_logs)
-- ==============================================================================

-- 1. Vytvorenie tabuľky audit_logs
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL DEFAULT '595cbb6c-1019-41ae-b1c2-a60c13c8dcdf',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    -- Kto akciu vykonal
    actor_id UUID NULL,
    actor_name TEXT NULL,
    actor_email TEXT NULL,
    actor_role TEXT NULL,
    
    -- Klasifikácia akcie
    action TEXT NOT NULL,                -- napr. 'booking.create', 'booking.delete', 'user.update', 'pricelist.save'
    category TEXT NOT NULL,              -- 'bookings', 'users', 'settings', 'pricing', 'auth'
    entity_type TEXT NOT NULL,           -- 'booking', 'booking_series', 'user', 'pricelist', 'role_policy'
    entity_id TEXT NULL,                 -- ID dotknutého záznamu
    entity_name TEXT NULL,               -- Čitateľný názov / popis entity
    
    -- Popis a detaily
    description TEXT NOT NULL,           -- Ľudsky čitateľný súhrn akcie
    changes JSONB NULL,                  -- Diff zmien: { "before": {...}, "after": {...} }
    metadata JSONB NULL,                 -- Dodatočné kontextové informácie (zdroj, IP, refund, séria...)
    level TEXT NOT NULL DEFAULT 'info'   -- 'info', 'warning', 'critical'
);

-- 2. Vytvorenie optimalizačných indexov pre rýchle dotazy a filtrovanie
CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_created 
    ON public.audit_logs (tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_category 
    ON public.audit_logs (tenant_id, category, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_actor 
    ON public.audit_logs (actor_id);

CREATE INDEX IF NOT EXISTS idx_audit_logs_entity 
    ON public.audit_logs (entity_type, entity_id);

CREATE INDEX IF NOT EXISTS idx_audit_logs_action 
    ON public.audit_logs (action);

-- 3. Row Level Security (RLS)
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Service role má plný prístup (server actions používajú service role)
DROP POLICY IF EXISTS "Service role full access on audit_logs" ON public.audit_logs;
CREATE POLICY "Service role full access on audit_logs" 
    ON public.audit_logs 
    FOR ALL 
    TO service_role 
    USING (true) 
    WITH CHECK (true);

-- 4. Pomocná funkcia pre voliteľné premazávanie starých logov (retencia, napr. 365 dní)
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs(days_to_keep INT DEFAULT 365)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    deleted_count INT;
BEGIN
    DELETE FROM public.audit_logs
    WHERE created_at < NOW() - (days_to_keep || ' days')::INTERVAL;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$;
