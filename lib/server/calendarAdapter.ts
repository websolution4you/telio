import { google } from 'googleapis';
import { getCoreDb } from './supabase';

const getOauth2Client = () => {
    return new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI
    );
};

export interface BookingDetails {
    tenantId: string;
    summary: string;
    description: string;
    start: Date;
    end: Date;
    colorId?: string;
}

export async function getCalendarClient(tenantId: string) {
    const db = getCoreDb();
    
    // Get connection info from DB
    const { data: connection, error } = await db
        .from('calendar_connections')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('provider', 'google')
        .maybeSingle();

    if (error || !connection || !connection.access_token) {
        console.warn(`No Google Calendar connection found for tenant ${tenantId}`);
        return null;
    }

    const oauth2Client = getOauth2Client();
    
    oauth2Client.setCredentials({
        access_token: connection.access_token,
        refresh_token: connection.refresh_token,
        expiry_date: connection.token_expiry ? new Date(connection.token_expiry).getTime() : undefined
    });

    // Handle token refresh automatically
    oauth2Client.on('tokens', async (tokens) => {
        if (tokens.access_token) {
            const expiry = tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : new Date(Date.now() + 3600 * 1000).toISOString();
            
            const { error: updateErr } = await db
                .from('calendar_connections')
                .update({
                    access_token: tokens.access_token,
                    token_expiry: expiry
                })
                .eq('id', connection.id);

            if (updateErr) {
                console.error(`Failed to update refreshed tokens in database:`, updateErr.message);
            } else {
                console.log(`Refreshed and saved Google Access Token for tenant ${tenantId}`);
            }
        }
    });

    return google.calendar({ version: 'v3', auth: oauth2Client });
}

export async function createCalendarEvent(details: BookingDetails): Promise<string | null> {
    try {
        const calendar = await getCalendarClient(details.tenantId);
        if (!calendar) return null;

        const event = await calendar.events.insert({
            calendarId: 'primary',
            requestBody: {
                summary: details.summary,
                description: details.description,
                start: { dateTime: details.start.toISOString() },
                end: { dateTime: details.end.toISOString() },
                colorId: details.colorId || '1', // Default to 1 (blue)
            },
        });

        console.log(`Google Calendar event created: ${event.data.id}`);
        return event.data.id || null;
    } catch (err: any) {
        console.error('Failed to create Google Calendar event:', err.message || err);
        return null;
    }
}

export async function deleteCalendarEvent(tenantId: string, eventId: string): Promise<boolean> {
    try {
        const calendar = await getCalendarClient(tenantId);
        if (!calendar) return false;

        await calendar.events.delete({
            calendarId: 'primary',
            eventId: eventId,
        });

        console.log(`Google Calendar event deleted: ${eventId}`);
        return true;
    } catch (err: any) {
        console.error(`Failed to delete Google Calendar event ${eventId}:`, err.message || err);
        return false;
    }
}

export async function listCalendarEvents(tenantId: string, start: Date, end: Date) {
    try {
        const calendar = await getCalendarClient(tenantId);
        if (!calendar) return [];

        const response = await calendar.events.list({
            calendarId: 'primary',
            timeMin: start.toISOString(),
            timeMax: end.toISOString(),
            singleEvents: true,
            orderBy: 'startTime',
        });

        return response.data.items || [];
    } catch (err: any) {
        console.error('Failed to list calendar events:', err.message || err);
        return [];
    }
}
