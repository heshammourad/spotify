import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { updateChartDate } from "@/lib/db";
import { CHART_PLAYLIST_MAP, TEMP_PLAYLIST_ID } from "@/lib/config";
import { addTrackToPlaylist, removePlaylistTracks, addTracksInBatches } from "@/lib/spotify";

interface RequestSong {
  rank: number;
  lw: string;
  title: string;
  artist: string;
  spotifyId: string;
}

interface RequestChart {
  id: string;
  date: string;
  songs: RequestSong[];
}

// Extract track ID from a Spotify URL or return clean ID
function getTrackId(input: string): string {
  const match = input.match(/track\/([a-zA-Z0-9]{22})/);
  return match ? match[1] : input.trim();
}

export async function POST(request: Request) {
  const session = await getSession();
  
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { charts, spotifyNumberOne } = await request.json() as {
      charts: RequestChart[];
      spotifyNumberOne?: string;
    };

    if (!charts || !Array.isArray(charts)) {
      return NextResponse.json({ error: "Invalid charts parameter" }, { status: 400 });
    }

    const log: string[] = [];
    log.push("Starting playlist update execution...");

    // 1. Clear out Temp playlist
    log.push(`Clearing out Temp playlist (${TEMP_PLAYLIST_ID})...`);
    await removePlaylistTracks(session.accessToken, TEMP_PLAYLIST_ID, 0);
    log.push("Temp playlist cleared.");

    // 2. Process each chart
    for (const chart of charts) {
      const playlists = CHART_PLAYLIST_MAP[chart.id];
      if (!playlists) {
        log.push(`Warning: No playlist mapping configured for chart ${chart.id}. Skipping.`);
        continue;
      }

      log.push(`\nProcessing chart: ${chart.id} (${chart.date})`);

      for (const song of chart.songs) {
        if (!song.spotifyId) {
          log.push(`  Skipping "${song.title}" - no Spotify ID provided.`);
          continue;
        }

        // Add to Top Tens (or whatever main playlist it has)
        if (playlists.top_tens) {
          log.push(`  Checking "${song.title}" in top_tens playlist...`);
          // Note: position is 0-indexed, which corresponds to rank - 1
          const isNewInPlaylist = await addTrackToPlaylist(
            session.accessToken,
            song.spotifyId,
            playlists.top_tens,
            song.rank - 1
          );

          if (isNewInPlaylist) {
            log.push(`    -> New song in top_tens; adding to Temp playlist.`);
            await addTrackToPlaylist(session.accessToken, song.spotifyId, TEMP_PLAYLIST_ID);
          }
        }

        // Add to Number Ones
        const isNewNumberOne = song.rank === 1 && song.lw !== "1";
        if (playlists.number_ones && isNewNumberOne) {
          log.push(`  New #1 song detected: "${song.title}" (Previous rank: ${song.lw})`);
          log.push(`    -> Adding to number_ones playlist...`);
          const isNewInNumberOnes = await addTrackToPlaylist(
            session.accessToken,
            song.spotifyId,
            playlists.number_ones
          );

          if (isNewInNumberOnes) {
            log.push(`    -> New in number_ones; adding to Temp playlist.`);
            await addTrackToPlaylist(session.accessToken, song.spotifyId, TEMP_PLAYLIST_ID);
          }
        }
      }

      // Update chart date in DB
      await updateChartDate(chart.id, chart.date);
      log.push(`  Updated chart ${chart.id} date in database to ${chart.date}.`);

      // Clean up chart (remove tracks starting from index 100)
      if (playlists.top_tens) {
        log.push(`  Cleaning up top_tens playlist (removing index 100+)...`);
        const removedTrackIds = await removePlaylistTracks(session.accessToken, playlists.top_tens, 100);
        
        if (removedTrackIds.length > 0) {
          log.push(`    -> Removed ${removedTrackIds.length} tracks. Adding them to Temp playlist...`);
          const trackUris = removedTrackIds.map((id) => `spotify:track:${id}`);
          await addTracksInBatches(session.accessToken, TEMP_PLAYLIST_ID, trackUris);
        } else {
          log.push(`    -> No tracks to remove (playlist size <= 100).`);
        }
      }
    }

    // 3. Process Spotify Weekly USA #1 if provided
    if (spotifyNumberOne && spotifyNumberOne.trim() !== "") {
      const spotifyNo1Id = getTrackId(spotifyNumberOne);
      if (spotifyNo1Id && spotifyNo1Id.length === 22) {
        log.push(`\nProcessing Spotify USA Weekly #1 song (ID: ${spotifyNo1Id})...`);
        const spotifyPlaylists = CHART_PLAYLIST_MAP["spotify"];
        if (spotifyPlaylists && spotifyPlaylists.number_ones) {
          const isNew = await addTrackToPlaylist(
            session.accessToken,
            spotifyNo1Id,
            spotifyPlaylists.number_ones
          );
          if (isNew) {
            log.push("  -> New number one for Spotify USA chart; adding to Temp.");
            await addTrackToPlaylist(session.accessToken, spotifyNo1Id, TEMP_PLAYLIST_ID);
          } else {
            log.push("  -> Song already present in Spotify number ones playlist.");
          }
        }
      } else {
        log.push(`\nWarning: Invalid Spotify USA Weekly #1 URL or ID: "${spotifyNumberOne}". Skipping.`);
      }
    }

    log.push("\nPlaylist update execution completed successfully!");
    
    return NextResponse.json({
      success: true,
      log,
      message: "Playlists updated successfully."
    });

  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update playlists";
    console.error("Error updating playlists:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
