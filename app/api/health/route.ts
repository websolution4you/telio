import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  // If query parameter ?test_error=1 is provided, throw a test error to verify exception tracking in App Insights
  if (searchParams.get("test_error") === "1") {
    throw new Error("Telio Application Insights Test Error");
  }

  return NextResponse.json({
    status: "ok",
    service: "telio",
    timestamp: new Date().toISOString(),
  });
}
