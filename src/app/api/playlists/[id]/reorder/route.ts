import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getPlaylistTracks, reorderPlaylistTracks } from "@/lib/spotify";
import { smartOrderTracks } from "@/lib/smartOrder";

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
    const body = await request.json().catch(() => ({}));
    let urisToApply: string[] = body.trackUris || [];

    // If sortType is "artist_separation", compute smart order on server if URIs not explicitly provided
    if (body.sortType === "artist_separation" && urisToApply.length === 0) {
      const currentTracks = await getPlaylistTracks(session.accessToken, playlistId);
      const sortedTracks = smartOrderTracks(currentTracks);
      urisToApply = sortedTracks.map((t) => t.uri);
    }

    if (!urisToApply || urisToApply.length === 0) {
      return NextResponse.json(
        { error: "No track URIs provided for reordering." },
        { status: 400 }
      );
    }

    const reorderedCount = await reorderPlaylistTracks(
      session.accessToken,
      playlistId,
      urisToApply
    );

    return NextResponse.json({
      success: true,
      reorderedCount,
      message: `Successfully reordered ${reorderedCount} track(s) with artist separation.`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to reorder playlist";
    console.error(`Error reordering playlist ${playlistId}:`, error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
