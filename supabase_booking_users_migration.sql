-- Migration: Create booking_users table for NTC Bookings authentication
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS booking_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    card_number VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_booking_users_email ON booking_users(email);

-- Disable RLS for custom JWT authentication
-- (We're using our own JWT system, not Supabase Auth)
ALTER TABLE booking_users DISABLE ROW LEVEL SECURITY;

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_booking_users_updated_at
BEFORE UPDATE ON booking_users
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Insert sample admin user (password: "admin123")
-- Password hash generated with SHA-256
INSERT INTO booking_users (name, email, password_hash, card_number)
VALUES (
    'Admin User',
    'admin@ntc.sk',
    '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9',
    'CARD001'
) ON CONFLICT (email) DO NOTHING;
