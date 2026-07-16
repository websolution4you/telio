-- 1. Vytvorenie tabuľky pre estetické rezervácie
create table if not exists bookings_esthetic (
    id uuid default gen_random_uuid() primary key,
    tenant_id uuid default '595cbb6c-1019-41ae-b1c2-a60c13c8dcdf' not null,
    customer_name text not null,
    customer_phone text,
    start_at timestamptz not null,
    end_at timestamptz not null,
    doctor_id text not null, -- 'vrbova' alebo 'stefankova'
    procedure_id text, -- napr. 'botox', 'hyaluronic', atd.
    status text default 'confirmed' not null, -- 'confirmed', 'blocked'
    source text default 'voice-assistant' not null, -- 'voice-assistant', 'web', 'admin'
    created_at timestamptz default now() not null
);

-- 2. Zapnutie Row Level Security (RLS) pre bezpečnosť
alter table bookings_esthetic enable row level security;

-- 3. Vytvorenie politiky pre čítanie (všetci môžu čítať obsadené termíny v kalendári)
create policy "Allow public read access" on bookings_esthetic
    for select using (true);

-- 4. Vytvorenie politiky pre zápis (asistent a frontend môžu zapisovať nové termíny)
create policy "Allow public insert access" on bookings_esthetic
    for insert with check (true);
