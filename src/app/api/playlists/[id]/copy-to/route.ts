import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { copyTracksToPlaylist } from "@/lib/spotify";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  const session = await getSession();
  
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const resolvedParams = await params;
  const sourcePlaylistId = resolvedParams.id;

  try {
    const { targetPlaylistId, allowDuplicates } = await request.json();

    if (!targetPlaylistId) {
      return NextResponse.json({ error: "Missing targetPlaylistId parameter" }, { status: 400 });
    }

    if (sourcePlaylistId === targetPlaylistId) {
      return NextResponse.json({ error: "Source and target playlists cannot be the same" }, { status: 400 });
    }

    // Call our robust copy utility
    const result = await copyTracksToPlaylist(
      session.accessToken,
      [sourcePlaylistId],
      targetPlaylistId,
      Boolean(allowDuplicates)
    );

    return NextResponse.json({
      success: true,
      copiedCount: result.totalCopied,
      details: result.details,
      message: `Successfully copied ${result.totalCopied} track(s) to target playlist.`
    });

  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to copy tracks";
    console.error(`Error copying tracks from playlist ${sourcePlaylistId}:`, error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
