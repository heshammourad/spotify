import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";

export async function GET() {
  const session = await getSession();
  
  if (!session) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  // Return only user profile, not token data for security
  return NextResponse.json({
    authenticated: true,
    user: session.user,
    expiresAt: session.expiresAt
  });
}
