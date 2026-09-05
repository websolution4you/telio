-- Migration: Add has_multisport column to booking_users table
-- Run this in Supabase SQL Editor

ALTER TABLE booking_users ADD COLUMN IF NOT EXISTS has_multisport BOOLEAN DEFAULT FALSE;

-- Optional index for faster queries
CREATE INDEX IF NOT EXISTS idx_booking_users_has_multisport ON booking_users(has_multisport);
