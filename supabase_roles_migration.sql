-- 1. Pridanie stĺpca 'role' do tabuľky booking_users s predvolenou hodnotou 'user'
ALTER TABLE booking_users ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'user';

-- 1b. Pridanie stĺpca 'phone' do tabuľky booking_users
ALTER TABLE booking_users ADD COLUMN IF NOT EXISTS phone VARCHAR(50);

-- 2. Nastavenie existujúceho admina na rolu 'admin' a dummy telefónneho čísla
UPDATE booking_users SET role = 'admin', card_number = '0000', phone = '+421900000000' WHERE email = 'admin@ntc.sk';

-- 3. Pridanie nových testovacích bežných používateľov
-- Heslo pre oboch je 'password123' -> hash SHA-256 je: ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f
INSERT INTO booking_users (name, email, password_hash, role, card_number, phone)
VALUES 
    ('Jozef Test', 'jozef@ntc.sk', 'ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f', 'user', '1234', '+421903111222'),
    ('Mária Ukážka', 'maria@ntc.sk', 'ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f', 'user', '5678', '+421904333444')
ON CONFLICT (email) DO NOTHING;

-- 4. Pridanie stĺpca 'user_id' do tabuľky bookings pre evidenciu vlastníka rezervácie
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES booking_users(id);

-- (Voliteľné) Vytvorenie indexu na rýchlejšie vyhľadávanie rezervácií podľa používateľa
CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON bookings(user_id);
