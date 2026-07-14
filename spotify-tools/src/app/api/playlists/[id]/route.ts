import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getPlaylist, getPlaylistTracks } from "@/lib/spotify";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  const session = await getSession();
  
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Await params to handle Next.js 15 asynchronous route params safely
  const resolvedParams = await params;
  const playlistId = resolvedParams.id;

  try {
    const playlist = await getPlaylist(session.accessToken, playlistId);
    const tracks = await getPlaylistTracks(session.accessToken, playlistId);
    
    return NextResponse.json({ playlist, tracks });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch playlist details";
    console.error(`Error fetching playlist ${playlistId}:`, error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
