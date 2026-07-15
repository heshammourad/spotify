export interface SpotifyTrack {
  id: string;
  title: string;
  artists: string[];
  uri: string;
  added_at: string;
  position: number;
}

export interface SpotifyPlaylist {
  id: string;
  name: string;
  description: string;
  images: { url: string }[];
  tracks: { total: number };
  owner: { id: string; display_name: string };
  public: boolean;
  collaborative: boolean;
}

// Fetch helper with authorization header
async function spotifyFetch(url: string, accessToken: string, options: RequestInit = {}) {
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
    ...options.headers,
  };

  const response = await fetch(url, {
    cache: "no-store",
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "");
    throw new Error(`Spotify API error (${response.status}): ${response.statusText}. Details: ${errorBody}`);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

// Fetch all playlists for the current user (paginated)
export async function getPlaylists(accessToken: string): Promise<SpotifyPlaylist[]> {
  let playlists: SpotifyPlaylist[] = [];
  let url = "https://api.spotify.com/v1/me/playlists?limit=50";

  while (url) {
    const data = await spotifyFetch(url, accessToken);
    playlists = playlists.concat(data.items);
    url = data.next;
  }

  return playlists;
}

// Fetch playlist details
export async function getPlaylist(accessToken: string, playlistId: string): Promise<SpotifyPlaylist> {
  return spotifyFetch(`https://api.spotify.com/v1/playlists/${playlistId}`, accessToken);
}

// Fetch all tracks in a playlist (paginated)
export async function getPlaylistTracks(accessToken: string, playlistId: string): Promise<SpotifyTrack[]> {
  const tracks: SpotifyTrack[] = [];
  let offset = 0;
  const limit = 100;

  try {
    while (true) {
      const url = `https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=${limit}&offset=${offset}`;
      const data = await spotifyFetch(url, accessToken);
      
      if (!data || !data.items || data.items.length === 0) {
        break;
      }

      for (let i = 0; i < data.items.length; i++) {
        const item = data.items[i];
        const track = item.track;
        if (track) {
          tracks.push({
            id: track.id,
            title: track.name,
            artists: track.artists.map((artist: { name: string }) => artist.name),
            uri: track.uri,
            added_at: item.added_at,
            position: offset + i,
          });
        }
      }

      offset += limit;
      if (data.items.length < limit) {
        break;
      }
    }
  } catch (error) {
    console.error(`Error fetching tracks for playlist ID ${playlistId}:`, error);
    // Return empty list on failure, mirroring python client.py behaviour
    return [];
  }

  return tracks;
}

// Helper to find duplicate tracks
export function findDuplicateTracks(tracks: SpotifyTrack[]) {
  const seenFingerprints = new Map<string, SpotifyTrack>();
  const tracksToRemove: { uri: string; positions: number[] }[] = [];
  const duplicatesInfo: SpotifyTrack[] = [];

  for (const track of tracks) {
    const normalizedTitle = track.title.toLowerCase().trim();
    const normalizedArtists = track.artists
      .map((a) => a.toLowerCase().trim())
      .sort()
      .join("|");

    const fingerprint = `${normalizedTitle}::${normalizedArtists}`;

    if (seenFingerprints.has(fingerprint)) {
      // It's a duplicate. Group by URI to prepare for removal
      const existingRemoval = tracksToRemove.find((item) => item.uri === track.uri);
      if (existingRemoval) {
        existingRemoval.positions.push(track.position);
      } else {
        tracksToRemove.push({
          uri: track.uri,
          positions: [track.position],
        });
      }
      duplicatesInfo.push(track);
    } else {
      seenFingerprints.set(fingerprint, track);
    }
  }

  return {
    tracksToRemove,
    duplicatesInfo,
  };
}

// Remove duplicates from a playlist
export async function removeDuplicatesFromPlaylist(
  accessToken: string,
  playlistId: string,
  tracksToRemove: { uri: string; positions: number[] }[],
  originalTracks: SpotifyTrack[]
): Promise<number> {
  if (tracksToRemove.length === 0) return 0;

  // 1. Collect all unique URIs that we are deleting
  const removedUris = new Set(tracksToRemove.map((item) => item.uri));

  // 2. Call Spotify DELETE API to remove these URIs in batches of up to 100
  const removedUrisArray = Array.from(removedUris);
  const batchSize = 100;
  for (let i = 0; i < removedUrisArray.length; i += batchSize) {
    const batch = removedUrisArray.slice(i, i + batchSize).map((uri) => ({ uri }));
    
    await spotifyFetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, accessToken, {
      method: "DELETE",
      body: JSON.stringify({
        tracks: batch,
      }),
    });
  }

  // 3. Construct the desired final tracks array in memory (filtering duplicates)
  const seenFingerprints = new Set<string>();
  const finalTracks: SpotifyTrack[] = [];
  for (const track of originalTracks) {
    const normalizedTitle = track.title.toLowerCase().trim();
    const normalizedArtists = track.artists
      .map((a) => a.toLowerCase().trim())
      .sort()
      .join("|");
    const fingerprint = `${normalizedTitle}::${normalizedArtists}`;

    if (!seenFingerprints.has(fingerprint)) {
      seenFingerprints.add(fingerprint);
      finalTracks.push(track);
    }
  }

  // 4. Iterate through the desired final tracks list and insert any tracks whose URIs were deleted
  // at their target index. Keep our local representation in sync so we always insert at the correct index.
  const currentPlaylist = originalTracks.filter((t) => !removedUris.has(t.uri));

  for (let i = 0; i < finalTracks.length; i++) {
    const track = finalTracks[i];
    if (removedUris.has(track.uri)) {
      // The track was deleted from the playlist, so we must add it back at index `i`
      await spotifyFetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, accessToken, {
        method: "POST",
        body: JSON.stringify({
          uris: [track.uri],
          position: i,
        }),
      });
      // Update our local representation to keep subsequent indices in sync
      currentPlaylist.splice(i, 0, track);
    }
  }

  const totalRemoved = tracksToRemove.reduce((sum, item) => sum + item.positions.length, 0);
  return totalRemoved;
}

// Add tracks in batches of 100 (Spotify API limit)
export async function addTracksInBatches(
  accessToken: string,
  playlistId: string,
  trackUris: string[]
): Promise<number> {
  if (trackUris.length === 0) return 0;

  let addedCount = 0;
  const batchSize = 100;

  for (let i = 0; i < trackUris.length; i += batchSize) {
    const batch = trackUris.slice(i, i + batchSize);
    await spotifyFetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, accessToken, {
      method: "POST",
      body: JSON.stringify({
        uris: batch,
      }),
    });
    addedCount += batch.length;
  }

  return addedCount;
}

// Add/Position a track in a playlist (exact implementation of add_track_to_playlist from client.py)
export async function addTrackToPlaylist(
  accessToken: string,
  trackId: string,
  playlistId: string,
  position?: number
): Promise<boolean> {
  const trackUri = `spotify:track:${trackId}`;
  
  // 1. Fetch current tracks in target playlist
  const currentTracks = await getPlaylistTracks(accessToken, playlistId);
  const trackIds = currentTracks.map((t) => t.id);
  const trackIndex = trackIds.indexOf(trackId);

  if (position !== undefined) {
    // Track is already present in the playlist at the requested position
    if (position === trackIndex) {
      console.log(`Track already present at position ${position}`);
      return false;
    }

    // Track is not present in the playlist
    if (trackIndex === -1) {
      console.log(`Track not present; adding to playlist at position ${position}`);
      await spotifyFetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, accessToken, {
        method: "POST",
        body: JSON.stringify({
          uris: [trackUri],
          position: position,
        }),
      });
      return true;
    }

    // Track is present but at a different position
    console.log(`Track present, but not at position ${position}; moving to correct position`);
    // reorder items in playlist
    // range_start is the index of the first item to be reordered
    // insert_before is the position where the items should be inserted
    await spotifyFetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, accessToken, {
      method: "PUT",
      body: JSON.stringify({
        range_start: trackIndex,
        insert_before: position,
        range_length: 1,
      }),
    });
    return false;
  }

  // Position is not provided, add to the end of playlist
  if (trackIndex > -1) {
    console.log("Track already present");
    return false;
  }

  console.log("Track not present; adding to end of playlist.");
  await spotifyFetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, accessToken, {
    method: "POST",
    body: JSON.stringify({
      uris: [trackUri],
    }),
  });
  return true;
}

// Remove tracks starting from a certain index (implementation of remove_playlist_tracks from client.py)
export async function removePlaylistTracks(
  accessToken: string,
  playlistId: string,
  startIndex: number = 0
): Promise<string[]> {
  const currentTracks = await getPlaylistTracks(accessToken, playlistId);
  const tracksToProcess = currentTracks.slice(startIndex);
  
  if (tracksToProcess.length === 0) {
    console.log("No tracks to delete");
    return [];
  }

  const trackIds = tracksToProcess.map((t) => t.id);
  const trackUris = tracksToProcess.map((t) => t.uri);

  // Spotify delete accepts format: { tracks: [{ uri: string }] }
  // Since we want to remove all occurrences of these items, we can batch it 100 at a time.
  const batchSize = 100;
  for (let i = 0; i < trackUris.length; i += batchSize) {
    const batchUris = trackUris.slice(i, i + batchSize);
    const bodyTracks = batchUris.map((uri) => ({ uri }));
    
    await spotifyFetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, accessToken, {
      method: "DELETE",
      body: JSON.stringify({
        tracks: bodyTracks,
      }),
    });
  }

  return trackIds;
}

// Copy tracks to target playlist (implementation of copy_tracks_to_playlist from client.py)
// Note: This method now resolves the issue of Spotify-authored/curated playlists!
// Because we use the token's read permissions to fetch tracks and write permissions to add tracks,
// we can fetch from ANY public playlist and copy to any user-owned playlist.
export async function copyTracksToPlaylist(
  accessToken: string,
  sourcePlaylistIds: string[],
  targetPlaylistId: string
): Promise<{ totalCopied: number; details: string[] }> {
  const logDetails: string[] = [];
  logDetails.push(`Starting copy operation to target playlist: ${targetPlaylistId}`);

  // 1. Fetch tracks from the target playlist ONCE
  logDetails.push("Fetching existing tracks from the target playlist...");
  const targetTracks = await getPlaylistTracks(accessToken, targetPlaylistId);
  const existingTargetTrackUris = new Set(targetTracks.map((t) => t.uri));

  let totalAddedCount = 0;

  // 2. Iterate through each source playlist
  for (const sourceId of sourcePlaylistIds) {
    let sourcePlaylistName = `ID: ${sourceId}`;
    let sourceTracks: SpotifyTrack[] = [];

    try {
      // Attempt to get the playlist name. If it is Spotify-curated, this will succeed
      // as long as it's public. If it fails, we catch the error but still try to fetch the tracks.
      const sourceInfo = await getPlaylist(accessToken, sourceId).catch(() => null);
      if (sourceInfo) {
        sourcePlaylistName = sourceInfo.name;
      }
      logDetails.push(`Processing source playlist: '${sourcePlaylistName}' (${sourceId})`);
    } catch {
      logDetails.push(`Warning: Could not fetch info for source playlist ID: ${sourceId}. Trying to fetch tracks directly.`);
    }

    try {
      sourceTracks = await getPlaylistTracks(accessToken, sourceId);
    } catch {
      logDetails.push(`Error fetching tracks for source playlist ID ${sourceId}. Skipping.`);
      continue;
    }

    if (sourceTracks.length === 0) {
      logDetails.push(`  Source playlist '${sourcePlaylistName}' is empty or could not fetch tracks.`);
      continue;
    }

    // Extract URIs
    const currentSourceUris = sourceTracks.map((t) => t.uri);
    
    // Filter out duplicates (already in target)
    const tracksToAddUris = currentSourceUris.filter((uri) => !existingTargetTrackUris.has(uri));

    // Remove duplicates within the source playlist itself to avoid inserting the same track twice
    const uniqueTracksToAddUris = Array.from(new Set(tracksToAddUris));

    if (uniqueTracksToAddUris.length === 0) {
      logDetails.push(`  All tracks from '${sourcePlaylistName}' already exist in the target. No new tracks to copy.`);
      continue;
    }

    logDetails.push(`  Identified ${uniqueTracksToAddUris.length} new track(s) from '${sourcePlaylistName}' to add.`);

    // Batch add to target playlist
    const addedCount = await addTracksInBatches(accessToken, targetPlaylistId, uniqueTracksToAddUris);
    totalAddedCount += addedCount;
    logDetails.push(`  Successfully copied ${addedCount} track(s) from '${sourcePlaylistName}'.`);

    // Update existing target URIs to avoid duplicates in subsequent sources
    uniqueTracksToAddUris.forEach((uri) => existingTargetTrackUris.add(uri));
  }

  logDetails.push(`Copy operation completed. Total ${totalAddedCount} new tracks added.`);
  
  return {
    totalCopied: totalAddedCount,
    details: logDetails,
  };
}

// Search Spotify for a track
export async function searchSpotifyTrack(
  accessToken: string,
  query: string,
  limit = 5
): Promise<{ id: string; title: string; artists: string[]; image?: string; uri: string }[]> {
  const url = `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=${limit}`;
  const data = await spotifyFetch(url, accessToken);

  if (!data || !data.tracks || !data.tracks.items) {
    return [];
  }

  return data.tracks.items.map((item: {
    id: string;
    name: string;
    artists: { name: string }[];
    album: { images?: { url: string }[] };
    uri: string;
  }) => ({
    id: item.id,
    title: item.name,
    artists: item.artists.map((a) => a.name),
    image: item.album.images?.[0]?.url || item.album.images?.[1]?.url || item.album.images?.[2]?.url,
    uri: item.uri,
  }));
}
