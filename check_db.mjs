import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config({ path: '.env.local' });

const supabase = createClient(
  process.env.CORE_SUPABASE_URL,
  process.env.CORE_SUPABASE_SERVICE_ROLE_KEY
);

const { data, error } = await supabase
  .from('booking_users')
  .select('*')
  .limit(5);

if (error) {
  console.error('❌ Error:', error.message);
  console.log('\n⚠️  Tabuľka booking_users pravdepodobne neexistuje!');
  console.log('\n📝 Musíš spustiť SQL migráciu v Supabase SQL Editore:');
  console.log('1. Otvor https://supabase.com');
  console.log('2. SQL Editor → New Query');
  console.log('3. Skopíruj obsah supabase_booking_users_migration.sql');
  console.log('4. Klikni Run');
} else {
  console.log('✅ Tabuľka booking_users existuje!');
  console.log('📊 Počet používateľov:', data.length);
  if (data.length > 0) {
    console.log('\n👤 Používatelia:');
    data.forEach(u => console.log('  -', u.name, '(' + u.email + ')'));
  }
}
