"use server";

export interface TelnyxCall {
    id: string;
    started_at: string;
    ended_at: string | null;
    duration_sec: number;
    from_number: string;
    to_number: string;
    telnyx_number: string; // reprezentuje virtuálne číslo linky (Telnyx/Twilio)
    billed_minutes: number;
    cost_usd: number;
    direction: "inbound" | "outbound";
    status: string;
}

export interface TelnyxSummary {
    totalCalls: number;
    totalMinutes: number;
    totalCost: number;
    hasRealApiKey: boolean;
}

export interface CallerSummary {
    callerNumber: string;
    callsCount: number;
    minutesCount: number;
    costUsd: number;
}

export interface NumberSummary {
    number: string;
    callsCount: number;
    minutesCount: number;
    costUsd: number;
    callers: CallerSummary[];
}

function formatPhoneNumber(num: string): string {
    if (!num) return "Neznáme";
    let cleaned = num.trim();
    if (cleaned.startsWith("00")) {
        cleaned = "+" + cleaned.substring(2);
    } else if (cleaned.match(/^\d/) && !cleaned.startsWith("0")) {
        cleaned = "+" + cleaned;
    }
    return cleaned;
}

// Pomocná funkcia pre načítanie hovorov z Twilio API
async function fetchTwilioCalls(accountSid: string, authToken: string, cutoffDate: Date): Promise<TelnyxCall[]> {
    // Twilio akceptuje formát StartTime>=YYYY-MM-DD
    const dateStr = cutoffDate.toISOString().split('T')[0];
    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Calls.json?StartTime>=${dateStr}&PageSize=1000`;
    
    const headers = new Headers();
    // Basic auth s AccountSid a AuthToken
    headers.set('Authorization', 'Basic ' + btoa(accountSid + ":" + authToken));
    headers.set('Accept', 'application/json');

    const res = await fetch(url, { headers });
    if (!res.ok) {
        throw new Error(`Twilio API responded with ${res.status}: ${res.statusText}`);
    }

    const data = await res.json();
    const twilioCalls = data.calls || [];

    return twilioCalls.map((c: any) => {
        const duration = parseInt(c.duration || "0");
        const billedMinutes = Math.ceil(duration / 60);
        // Twilio vracia cenu ako záporné číslo (napr. -0.0150), zoberieme absolútnu hodnotu
        const cost = Math.abs(parseFloat(c.price || "0"));

        const fromNum = formatPhoneNumber(c.from);
        const toNum = formatPhoneNumber(c.to);
        const direction = (c.direction || "").startsWith("inbound") ? "inbound" : "outbound";
        const virtualNum = direction === "inbound" ? toNum : fromNum;

        return {
            id: c.sid,
            started_at: c.start_time ? new Date(c.start_time).toISOString() : new Date().toISOString(),
            ended_at: c.end_time ? new Date(c.end_time).toISOString() : null,
            duration_sec: duration,
            from_number: fromNum,
            to_number: toNum,
            telnyx_number: virtualNum,
            billed_minutes: billedMinutes,
            cost_usd: cost,
            direction,
            status: c.status === "completed" ? "completed" : "failed"
        };
    });
}

export async function fetchCallsComparisonAction(
    periodDays: number = 30, 
    provider: 'telnyx' | 'my-twilio' | 'shared-twilio' = 'telnyx'
) {
    try {
        const now = new Date();
        const cutoffDate = new Date();
        cutoffDate.setDate(now.getDate() - periodDays);

        let callsList: TelnyxCall[] = [];
        let totalRawCost = 0;
        let hasRealApiKey = false;

        if (provider === "telnyx") {
            hasRealApiKey = !!process.env.TELNYX_API_KEY;
            const apiKey = process.env.TELNYX_API_KEY;

            if (hasRealApiKey && apiKey) {
                try {
                    const recordTypes = ["sip-trunking", "call-control"];
                    
                    for (const type of recordTypes) {
                        const url = `https://api.telnyx.com/v2/detail_records?filter[record_type]=${type}&page[size]=1000`;
                        const response = await fetch(url, {
                            headers: {
                                Authorization: `Bearer ${apiKey}`,
                                Accept: "application/json"
                            }
                        });

                        if (response.ok) {
                            const resJson = await response.json();
                            const records = resJson.data || [];
                            
                            records.forEach((record: any) => {
                                const callStart = new Date(record.started_at || record.created_at);
                                if (callStart < cutoffDate) return;

                                const duration = record.billed_sec || record.call_sec || 0;
                                const billedMinutes = Math.ceil(duration / 60);
                                const cost = parseFloat(record.cost || "0");

                                const fromNum = formatPhoneNumber(record.cli || record.caller_number || record.from || "");
                                const toNum = formatPhoneNumber(record.cld || record.dest_number || record.to || "");
                                const direction = (record.direction || "inbound").toLowerCase() === "outbound" ? "outbound" : "inbound";
                                const telnyxNum = direction === "inbound" ? toNum : fromNum;

                                totalRawCost += cost;

                                callsList.push({
                                    id: record.id || record.uuid || record.telnyx_session_id || Math.random().toString(),
                                    started_at: record.started_at || record.created_at,
                                    ended_at: record.finished_at || record.ended_at || null,
                                    duration_sec: duration,
                                    from_number: fromNum,
                                    to_number: toNum,
                                    telnyx_number: telnyxNum,
                                    billed_minutes: billedMinutes,
                                    cost_usd: cost,
                                    direction,
                                    status: record.hangup_cause === "NORMAL_CLEARING" || record.completed === 1 ? "completed" : "failed"
                                });
                            });
                        }
                    }
                } catch (err: any) {
                    console.error("Failed to fetch from Telnyx API:", err.message);
                }
            }

            // Demo fallback pre Telnyx
            if (callsList.length === 0) {
                const virtualLines = ["+421220512805", "+421220512806", "+421220512807"];
                const fromNumbers = ["+421905012054", "+421907123456", "+421911987654", "+421915999888", "+421902111222"];
                const numCalls = periodDays === 7 ? 15 : 45;

                for (let i = 0; i < numCalls; i++) {
                    const randomTime = new Date();
                    randomTime.setDate(now.getDate() - Math.floor(Math.random() * periodDays));
                    randomTime.setHours(8 + Math.floor(Math.random() * 14));
                    randomTime.setMinutes(Math.floor(Math.random() * 60));
                    
                    const duration = 20 + Math.floor(Math.random() * 280);
                    const billedMinutes = Math.ceil(duration / 60);
                    const cost = parseFloat((billedMinutes * 0.006).toFixed(4));
                    totalRawCost += cost;

                    const direction = Math.random() < 0.9 ? "inbound" : "outbound";
                    const telnyxNum = virtualLines[Math.floor(Math.random() * virtualLines.length)];
                    const otherNum = fromNumbers[Math.floor(Math.random() * fromNumbers.length)];

                    const fromNum = direction === "inbound" ? otherNum : telnyxNum;
                    const toNum = direction === "inbound" ? telnyxNum : otherNum;

                    callsList.push({
                        id: `telnyx-demo-uuid-${i}`,
                        started_at: randomTime.toISOString(),
                        ended_at: new Date(randomTime.getTime() + duration * 1000).toISOString(),
                        duration_sec: duration,
                        from_number: fromNum,
                        to_number: toNum,
                        telnyx_number: telnyxNum,
                        billed_minutes: billedMinutes,
                        cost_usd: cost,
                        direction,
                        status: "completed"
                    });
                }
            }
        } else {
            // Twilio integrácia (moje-twilio alebo spolocne-twilio)
            const isShared = provider === "shared-twilio";
            const sidKey = isShared ? "TWILIO_ACCOUNT_SID" : "MY_TWILIO_ACCOUNT_SID";
            const tokenKey = isShared ? "TWILIO_AUTH_TOKEN" : "MY_TWILIO_AUTH_TOKEN";

            const accountSid = process.env[sidKey];
            const authToken = process.env[tokenKey];
            hasRealApiKey = !!(accountSid && authToken);

            if (hasRealApiKey && accountSid && authToken) {
                try {
                    callsList = await fetchTwilioCalls(accountSid, authToken, cutoffDate);
                    totalRawCost = callsList.reduce((acc, c) => acc + c.cost_usd, 0);
                } catch (err: any) {
                    console.error(`Failed to fetch from Twilio API (${provider}):`, err.message);
                }
            }

            // Demo fallback pre Twilio
            if (callsList.length === 0) {
                // Rôzne čísla pre Moje a Spoločné Twilio pre vizuálne rozlíšenie
                const virtualLines = isShared 
                    ? ["+421233223301", "+421233223302"] 
                    : ["+421233056001", "+421233056002"];
                    
                const fromNumbers = ["+421905012054", "+421908222333", "+421915444555", "+421903777888"];
                const numCalls = periodDays === 7 ? 12 : 38;

                for (let i = 0; i < numCalls; i++) {
                    const randomTime = new Date();
                    randomTime.setDate(now.getDate() - Math.floor(Math.random() * periodDays));
                    randomTime.setHours(9 + Math.floor(Math.random() * 12));
                    randomTime.setMinutes(Math.floor(Math.random() * 60));
                    
                    const duration = 15 + Math.floor(Math.random() * 240);
                    const billedMinutes = Math.ceil(duration / 60);
                    const cost = parseFloat((billedMinutes * 0.012).toFixed(4));
                    totalRawCost += cost;

                    const direction = Math.random() < 0.8 ? "inbound" : "outbound";
                    const twilioNum = virtualLines[Math.floor(Math.random() * virtualLines.length)];
                    const otherNum = fromNumbers[Math.floor(Math.random() * fromNumbers.length)];

                    const fromNum = direction === "inbound" ? otherNum : twilioNum;
                    const toNum = direction === "inbound" ? twilioNum : otherNum;

                    callsList.push({
                        id: `twilio-${provider}-demo-${i}`,
                        started_at: randomTime.toISOString(),
                        ended_at: new Date(randomTime.getTime() + duration * 1000).toISOString(),
                        duration_sec: duration,
                        from_number: fromNum,
                        to_number: toNum,
                        telnyx_number: twilioNum,
                        billed_minutes: billedMinutes,
                        cost_usd: cost,
                        direction,
                        status: "completed"
                    });
                }
            }
        }

        // Zoradenie
        callsList.sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime());

        // Agregácia podľa čísla linky a volajúceho
        const numberSummaryMap = new Map<string, { 
            calls: number; 
            minutes: number; 
            cost: number;
            callerMap: Map<string, { calls: number; minutes: number; cost: number }>
        }>();

        callsList.forEach(c => {
            const num = c.telnyx_number;
            const otherParty = c.direction === "inbound" ? c.from_number : c.to_number;

            let existingLine = numberSummaryMap.get(num);
            if (!existingLine) {
                existingLine = { calls: 0, minutes: 0, cost: 0, callerMap: new Map() };
                numberSummaryMap.set(num, existingLine);
            }
            existingLine.calls += 1;
            existingLine.minutes += c.billed_minutes;
            existingLine.cost += c.cost_usd;

            let existingCaller = existingLine.callerMap.get(otherParty);
            if (!existingCaller) {
                existingCaller = { calls: 0, minutes: 0, cost: 0 };
                existingLine.callerMap.set(otherParty, existingCaller);
            }
            existingCaller.calls += 1;
            existingCaller.minutes += c.billed_minutes;
            existingCaller.cost += c.cost_usd;
        });

        const numberComparison: NumberSummary[] = [];
        numberSummaryMap.forEach((lineVal, num) => {
            const callersList: CallerSummary[] = [];
            lineVal.callerMap.forEach((callerVal, callerNum) => {
                callersList.push({
                    callerNumber: callerNum,
                    callsCount: callerVal.calls,
                    minutesCount: callerVal.minutes,
                    costUsd: Math.round(callerVal.cost * 1000) / 1000
                });
            });

            callersList.sort((a, b) => b.minutesCount - a.minutesCount);

            numberComparison.push({
                number: num,
                callsCount: lineVal.calls,
                minutesCount: lineVal.minutes,
                costUsd: Math.round(lineVal.cost * 100) / 100,
                callers: callersList
            });
        });

        numberComparison.sort((a, b) => b.minutesCount - a.minutesCount);

        const summary: TelnyxSummary = {
            totalCalls: callsList.length,
            totalMinutes: callsList.reduce((acc, c) => acc + c.billed_minutes, 0),
            totalCost: Math.round(totalRawCost * 100) / 100,
            hasRealApiKey
        };

        return {
            success: true,
            summary,
            numberComparison,
            calls: callsList
        };

    } catch (error: any) {
        console.error("fetchCallsComparisonAction error:", error);
        return { success: false, error: error.message };
    }
}
