import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/bookingAuth";
import { runDailyAzureLogsBackup } from "@/lib/server/azureBlobBackup";

export const maxDuration = 60; // Max duration for Vercel Serverless Function

/**
 * Overí oprávnenie:
 * 1. Automatický Vercel Cron cez hlavičku: Authorization: Bearer <CRON_SECRET>
 * 2. Prihlásený administrátor (umožňuje manuálny test priamo z prehliadača)
 */
async function authorizeRequest(request: Request): Promise<boolean> {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");

  if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
    return true;
  }

  try {
    const session = await getSession();
    if (session && session.role === "admin") {
      return true;
    }
  } catch {
    // ignorovať chybu session
  }

  return false;
}

export async function GET(request: Request) {
  const isAuthorized = await authorizeRequest(request);
  if (!isAuthorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const targetDate = searchParams.get("date") || undefined;

  const result = await runDailyAzureLogsBackup(targetDate);

  if (!result.success) {
    return NextResponse.json(
      {
        message: "Backup completed with errors",
        result,
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    message: "Daily backup to Azure Blob Storage successful",
    result,
  });
}

export async function POST(request: Request) {
  return GET(request);
}
