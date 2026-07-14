import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getPlaylists } from "@/lib/spotify";

export async function GET() {
  const session = await getSession();
  
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const playlists = await getPlaylists(session.accessToken);
    return NextResponse.json({ playlists, userId: session.user.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch playlists";
    console.error("Error fetching playlists:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
