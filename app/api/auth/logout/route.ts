import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const url = new URL("/newbookings", request.url);
  const response = NextResponse.redirect(url, { status: 303 });
  response.cookies.set("booking_session", "", {
    path: "/",
    maxAge: 0,
    expires: new Date(0),
    httpOnly: true,
  });
  return response;
}

export async function POST(request: Request) {
  return GET(request);
}
