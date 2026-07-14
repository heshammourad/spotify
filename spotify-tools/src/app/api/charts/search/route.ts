import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { searchSpotifyTrack } from "@/lib/spotify";

export async function GET(request: Request) {
  const session = await getSession();
  
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q");

  if (!query) {
    return NextResponse.json({ error: "Query parameter 'q' is required" }, { status: 400 });
  }

  try {
    const results = await searchSpotifyTrack(session.accessToken, query);
    return NextResponse.json({ results });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to search Spotify";
    console.error(`Error searching Spotify for "${query}":`, error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
