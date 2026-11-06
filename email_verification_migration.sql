-- =============================================================================
-- NTC Booking System: Mandatory Email Verification Schema Migration
-- =============================================================================
-- Safe to run multiple times (idempotent).
-- Existing users and admin-created users default to email_verified = true
-- so no active accounts are locked out. Newly self-registered users are
-- created with email_verified = false (and UNVERIFIED: password hash prefix)
-- until they click the signed verification link sent to their email.
-- =============================================================================

BEGIN;

ALTER TABLE public.booking_users
  ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ;

-- Backfill any existing rows where password_hash is already verified
UPDATE public.booking_users
SET email_verified = CASE
  WHEN password_hash LIKE 'UNVERIFIED:%' THEN FALSE
  ELSE TRUE
END
WHERE email_verified IS DISTINCT FROM (password_hash NOT LIKE 'UNVERIFIED:%');

COMMIT;

