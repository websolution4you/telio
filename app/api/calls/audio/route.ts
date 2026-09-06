import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/bookingAuth";

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "admin") {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get("conversation_id");

    if (!conversationId) {
      return new NextResponse("Missing conversation_id parameter", { status: 400 });
    }

    const apiKey = 
      process.env.ELEVENLABS_NTC_API_KEY || 
      process.env.ELEVENLABS_API_KEY || 
      process.env.ELEVEN_LABS_API_KEY;
    if (!apiKey) {
      return new NextResponse("ElevenLabs API key is not configured", { status: 500 });
    }

    const elevenLabsUrl = `https://api.elevenlabs.io/v1/convai/conversations/${conversationId}/audio`;
    const audioResponse = await fetch(elevenLabsUrl, {
      headers: {
        "xi-api-key": apiKey,
        "Accept": "audio/mpeg",
      },
    });

    if (!audioResponse.ok) {
      const errorText = await audioResponse.text().catch(() => "");
      return new NextResponse(`Audio not found or unavailable: ${errorText}`, {
        status: audioResponse.status,
      });
    }

    const headers = new Headers();
    headers.set("Content-Type", "audio/mpeg");
    headers.set("Cache-Control", "private, max-age=3600");
    headers.set("Accept-Ranges", "bytes");

    const contentLength = audioResponse.headers.get("content-length");
    if (contentLength) {
      headers.set("Content-Length", contentLength);
    }

    return new NextResponse(audioResponse.body, {
      status: 200,
      headers,
    });
  } catch (error: any) {
    console.error("Call audio streaming error:", error);
    return new NextResponse("Failed to stream audio recording", { status: 500 });
  }
}
