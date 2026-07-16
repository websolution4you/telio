const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf-8');
const url = env.split('\n').find(l => l.startsWith('NEXT_PUBLIC_SUPABASE_URL')).split('=')[1].trim().replace(/['"]/g, '');
const key = env.split('\n').find(l => l.startsWith('CORE_SUPABASE_SERVICE_ROLE_KEY')).split('=')[1].trim().replace(/['"]/g, '');
const userId = '331bf7b0-914f-4a09-856c-d4d8b68af02d';

async function run() {
    console.log('Checking bookings for user:', userId);
    
    // Check bookings
    const res = await fetch(url + '/rest/v1/bookings?user_id=eq.' + userId, {
        headers: { 'apikey': key, 'Authorization': 'Bearer ' + key }
    });
    
    if (!res.ok) {
        console.error('Error fetching:', await res.text());
        return;
    }
    const bookings = await res.json();
    console.log('Found ' + bookings.length + ' bookings.');
    
    if (bookings.length > 0) {
        console.log('Deleting them...');
        const delRes = await fetch(url + '/rest/v1/bookings?user_id=eq.' + userId, {
            method: 'DELETE',
            headers: { 'apikey': key, 'Authorization': 'Bearer ' + key }
        });
        if (!delRes.ok) console.error('Failed to delete:', await delRes.text());
        else console.log('Successfully deleted the leftover bookings!');
    }

    console.log('Attempting to delete user from booking_users...');
    const userDelRes = await fetch(url + '/rest/v1/booking_users?id=eq.' + userId, {
        method: 'DELETE',
        headers: { 'apikey': key, 'Authorization': 'Bearer ' + key }
    });
    if (!userDelRes.ok) console.error('Failed to delete user:', await userDelRes.text());
    else console.log('Successfully deleted the user!');
}
run();
