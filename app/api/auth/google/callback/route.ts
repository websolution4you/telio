import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { getCoreDb } from '@/lib/server/supabase';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const tenantId = searchParams.get('state'); // State holds our tenantId
    const error = searchParams.get('error');

    if (error) {
        console.error('Google Auth Callback Error:', error);
        return NextResponse.json({ error }, { status: 400 });
    }

    if (!code || !tenantId) {
        return NextResponse.json({ error: 'Missing code or tenantId' }, { status: 400 });
    }

    try {
        const oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
            process.env.GOOGLE_REDIRECT_URI
        );

        const { tokens } = await oauth2Client.getToken(code);
        const db = getCoreDb();

        // Check if there is an existing connection
        const { data: existing, error: selectErr } = await db
            .from('calendar_connections')
            .select('id')
            .eq('tenant_id', tenantId)
            .eq('provider', 'google')
            .maybeSingle();

        if (selectErr) {
            console.error("Database query failed during connection lookup:", selectErr.message);
        }

        const expiry = tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : null;

        if (existing) {
            const updatePayload: any = {
                access_token: tokens.access_token || null,
                token_expiry: expiry,
                calendar_id: 'primary'
            };

            // Only update refresh token if Google returned a new one (prompt=consent forces it)
            if (tokens.refresh_token) {
                updatePayload.refresh_token = tokens.refresh_token;
            }

            const { error: updateErr } = await db
                .from('calendar_connections')
                .update(updatePayload)
                .eq('id', existing.id);

            if (updateErr) throw new Error(`DB Update error: ${updateErr.message}`);
            console.log(`Successfully updated existing GCal connection for tenant ${tenantId}`);
        } else {
            const { error: insertErr } = await db
                .from('calendar_connections')
                .insert({
                    tenant_id: tenantId,
                    provider: 'google',
                    access_token: tokens.access_token || null,
                    refresh_token: tokens.refresh_token || null,
                    token_expiry: expiry,
                    calendar_id: 'primary'
                });

            if (insertErr) throw new Error(`DB Insert error: ${insertErr.message}`);
            console.log(`Successfully created new GCal connection for tenant ${tenantId}`);
        }

        return new NextResponse(`
            <html>
                <head>
                    <title>Autorizácia úspešná</title>
                </head>
                <body style="font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; background-color: #0c0c14; color: #fff; text-align: center;">
                    <div style="border: 1px solid #00ffd1; padding: 40px; border-radius: 20px; background-color: rgba(0, 255, 170, 0.05); max-width: 400px; box-shadow: 0 0 20px rgba(0, 255, 209, 0.15);">
                        <h2 style="color: #00ffd1; margin-top: 0;">Google Kalendár Úspešne Prepojený!</h2>
                        <p>Váš kalendár bol úspešne autorizovaný a prepojený s Telio rezervačným systémom.</p>
                        <p style="color: #888; font-size: 0.9em; margin-bottom: 25px;">Môžete zatvoriť toto okno a vrátiť sa na stránku.</p>
                        <button onclick="window.close()" style="background-color: #00ffd1; color: #000; font-weight: bold; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer; transition: transform 0.2s; box-shadow: 0 0 15px rgba(0, 255, 209, 0.3);">Zatvoriť okno</button>
                    </div>
                </body>
            </html>
        `, {
            headers: { 'Content-Type': 'text/html; charset=utf-8' }
        });

    } catch (err: any) {
        console.error('Failed to exchange Google OAuth code for tokens:', err);
        return NextResponse.json({ error: err.message || 'Authentication failed' }, { status: 500 });
    }
}
