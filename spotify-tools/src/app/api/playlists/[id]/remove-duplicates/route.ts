import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getPlaylistTracks, findDuplicateTracks, removeDuplicatesFromPlaylist } from "@/lib/spotify";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  const session = await getSession();
  
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const resolvedParams = await params;
  const playlistId = resolvedParams.id;

  try {
    // 1. Fetch current tracks
    const tracks = await getPlaylistTracks(session.accessToken, playlistId);
    
    // 2. Identify duplicates
    const { tracksToRemove, duplicatesInfo } = findDuplicateTracks(tracks);

    if (tracksToRemove.length === 0) {
      return NextResponse.json({
        success: true,
        removedCount: 0,
        message: "No duplicates found. Playlist is already clean!"
      });
    }

    // 3. Remove them from playlist
    const removedCount = await removeDuplicatesFromPlaylist(
      session.accessToken,
      playlistId,
      tracksToRemove,
      tracks
    );

    return NextResponse.json({
      success: true,
      removedCount,
      removedTracks: duplicatesInfo.map(t => ({
        title: t.title,
        artists: t.artists,
        position: t.position
      })),
      message: `Successfully removed ${removedCount} duplicate track(s).`
    });

  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to remove duplicates";
    console.error(`Error removing duplicates from playlist ${playlistId}:`, error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
