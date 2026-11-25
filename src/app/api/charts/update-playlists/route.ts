import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { updateChartDate } from "@/lib/db";
import { CHART_PLAYLIST_MAP, TEMP_PLAYLIST_ID } from "@/lib/config";
import {
  addTrackToPlaylist,
  removePlaylistTracks,
  addTracksInBatches,
  getPlaylistTracks,
} from "@/lib/spotify";

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

  const { charts, spotifyNumberOne, keepTempTracks } = await request.json() as {
    charts: RequestChart[];
    spotifyNumberOne?: string;
    keepTempTracks?: boolean;
  };

  if (!charts || !Array.isArray(charts)) {
    return NextResponse.json({ error: "Invalid charts parameter" }, { status: 400 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
      };
      const log = (message: string) => send({ type: "log", message });

      try {
        log("Starting playlist update execution...");

        // 1. Clear out Temp playlist, or keep its existing tracks and append to them
        const tempTrackIds = new Set<string>();
        if (keepTempTracks) {
          log(`Keeping existing tracks in Temp playlist (${TEMP_PLAYLIST_ID})...`);
          const existing = await getPlaylistTracks(session.accessToken, TEMP_PLAYLIST_ID);
          existing.forEach((t) => tempTrackIds.add(t.id));
          log(`Temp playlist has ${tempTrackIds.size} existing tracks; new songs will be appended.`);
        } else {
          log(`Clearing out Temp playlist (${TEMP_PLAYLIST_ID})...`);
          await removePlaylistTracks(session.accessToken, TEMP_PLAYLIST_ID, 0);
          log("Temp playlist cleared.");
        }

        // Append tracks to Temp, skipping any already there (or added earlier in this run).
        const addToTemp = async (trackIds: string[]) => {
          const toAdd = trackIds.filter((id) => {
            if (tempTrackIds.has(id)) return false;
            tempTrackIds.add(id);
            return true;
          });
          const skipped = trackIds.length - toAdd.length;
          if (skipped > 0) {
            log(`    -> ${skipped} track(s) already in Temp; skipped.`);
          }
          await addTracksInBatches(
            session.accessToken,
            TEMP_PLAYLIST_ID,
            toAdd.map((id) => `spotify:track:${id}`)
          );
        };

        // 2. Process each chart
        for (const chart of charts) {
          const playlists = CHART_PLAYLIST_MAP[chart.id];
          if (!playlists) {
            log(`Warning: No playlist mapping configured for chart ${chart.id}. Skipping.`);
            continue;
          }

          log(`\nProcessing chart: ${chart.id} (${chart.date})`);

          for (const song of chart.songs) {
            if (!song.spotifyId) {
              log(`  Skipping "${song.title}" - no Spotify ID provided.`);
              continue;
            }

            // Add to Top Tens (or whatever main playlist it has)
            if (playlists.top_tens) {
              log(`  Checking "${song.title}" in top_tens playlist...`);
              // Note: position is 0-indexed, which corresponds to rank - 1
              const isNewInPlaylist = await addTrackToPlaylist(
                session.accessToken,
                song.spotifyId,
                playlists.top_tens,
                song.rank - 1
              );

              if (isNewInPlaylist) {
                log(`    -> New song in top_tens; adding to Temp playlist.`);
                await addToTemp([song.spotifyId]);
              }
            }

            // Add to Number Ones
            const isNewNumberOne = song.rank === 1 && song.lw !== "1";
            if (playlists.number_ones && isNewNumberOne) {
              log(`  New #1 song detected: "${song.title}" (Previous rank: ${song.lw})`);
              log(`    -> Adding to number_ones playlist...`);
              const isNewInNumberOnes = await addTrackToPlaylist(
                session.accessToken,
                song.spotifyId,
                playlists.number_ones
              );

              if (isNewInNumberOnes) {
                log(`    -> New in number_ones; adding to Temp playlist.`);
                await addToTemp([song.spotifyId]);
              }
            }
          }

          // Update chart date in DB
          await updateChartDate(chart.id, chart.date);
          log(`  Updated chart ${chart.id} date in database to ${chart.date}.`);

          // Clean up chart (remove tracks starting from index 100)
          if (playlists.top_tens) {
            log(`  Cleaning up top_tens playlist (removing index 100+)...`);
            const removedTrackIds = await removePlaylistTracks(session.accessToken, playlists.top_tens, 100);

            if (removedTrackIds.length > 0) {
              log(`    -> Removed ${removedTrackIds.length} tracks. Adding them to Temp playlist...`);
              await addToTemp(removedTrackIds);
            } else {
              log(`    -> No tracks to remove (playlist size <= 100).`);
            }
          }
        }

        // 3. Process Spotify Weekly USA #1 if provided
        if (spotifyNumberOne && spotifyNumberOne.trim() !== "") {
          const spotifyNo1Id = getTrackId(spotifyNumberOne);
          if (spotifyNo1Id && spotifyNo1Id.length === 22) {
            log(`\nProcessing Spotify USA Weekly #1 song (ID: ${spotifyNo1Id})...`);
            const spotifyPlaylists = CHART_PLAYLIST_MAP["spotify"];
            if (spotifyPlaylists && spotifyPlaylists.number_ones) {
              const isNew = await addTrackToPlaylist(
                session.accessToken,
                spotifyNo1Id,
                spotifyPlaylists.number_ones
              );
              if (isNew) {
                log("  -> New number one for Spotify USA chart; adding to Temp.");
                await addToTemp([spotifyNo1Id]);
              } else {
                log("  -> Song already present in Spotify number ones playlist.");
              }
            }
          } else {
            log(`\nWarning: Invalid Spotify USA Weekly #1 URL or ID: "${spotifyNumberOne}". Skipping.`);
          }
        }

        log("\nPlaylist update execution completed successfully!");

        send({ type: "done", success: true, message: "Playlists updated successfully." });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to update playlists";
        console.error("Error updating playlists:", error);
        send({ type: "error", error: message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}
