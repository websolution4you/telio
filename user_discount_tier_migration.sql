-- Migration: Add discount_tier_id column to booking_users table
-- Run this in Supabase SQL Editor

ALTER TABLE public.booking_users 
ADD COLUMN IF NOT EXISTS discount_tier_id TEXT DEFAULT 'tier-base';

-- Index for discount tier queries
CREATE INDEX IF NOT EXISTS idx_booking_users_discount_tier_id ON public.booking_users(discount_tier_id);
