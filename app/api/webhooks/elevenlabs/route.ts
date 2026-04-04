import { NextResponse } from "next/server";
import { getTaxiDb } from "@/lib/server/supabase"; // Correct server client
import { getProjectContext } from "@/lib/server/projectContext";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { conversation_id, analysis, metadata } = body;

        // analysis.summary is usually where ElevenLabs puts the summary
        const summary = analysis?.summary;
        // metadata might contain custom IDs passed from the backend
        const callSid = metadata?.custom_variables?.call_sid || metadata?.call_sid;

        if (!summary) {
            return NextResponse.json({ error: "No summary in payload" }, { status: 400 });
        }

        // Use a generic tenant ID for Taxi context or resolve via metadata
        const tenantId = "taxi-1"; // Fallback to common taxi tenant
        const { db, tables } = await getProjectContext(tenantId, "taxi");

        console.log(`[ElevenLabs Webhook] Received summary for conv: ${conversation_id}, callSid: ${callSid}`);

        // 1. Try to find by conversation_id if stored in DB
        let { error } = await db
            .from(tables.calls)
            .update({ summary: summary })
            .or(`id.eq.${conversation_id},conversation_id.eq.${conversation_id}`);

        // 2. Fallback: If not found and we have callSid, try by call_sid
        if (callSid) {
            await db
                .from(tables.calls)
                .update({ summary: summary })
                .eq("id", callSid);
        }

        return NextResponse.json({ success: true });
    } catch (err: any) {
        console.error("[ElevenLabs Webhook] Error:", err.message);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
