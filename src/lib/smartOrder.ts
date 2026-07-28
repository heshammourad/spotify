import { SpotifyTrack } from "@/app/playlists/types";

/**
 * Extract the primary artist name from a SpotifyTrack or item with track/artists property.
 */
function getPrimaryArtist(track: SpotifyTrack | any): string {
  if (!track) return "Unknown Artist";
  if (Array.isArray(track.artists) && track.artists.length > 0) {
    const first = track.artists[0];
    if (typeof first === "string") return first;
    if (typeof first === "object" && first?.name) return first.name;
  }
  return "Unknown Artist";
}

/**
 * Compute artist separation order for tracks following the SortYourMusic algorithm:
 * https://github.com/plamere/SortYourMusic/blob/master/web2/js/utils/smart-order.js
 *
 * This tries to equally distribute artists throughout the playlist by picking at each step
 * the track whose primary artist's cumulative proportion in the output list is closest
 * to their overall desired proportion in the full playlist.
 *
 * @param tracks - Array of SpotifyTrack items to sort
 * @returns A new array of SpotifyTrack items ordered by artist separation
 */
export function smartOrderTracks(tracks: SpotifyTrack[]): SpotifyTrack[] {
  const length = tracks.length;
  if (length === 0) return [];

  // Count how many tracks each artist has
  const artistCounts: Record<string, number> = {};
  for (const track of tracks) {
    const artist = getPrimaryArtist(track);
    artistCounts[artist] = (artistCounts[artist] || 0) + 1;
  }

  const artistCountsSoFar: Record<string, number> = {};
  const out: SpotifyTrack[] = [];
  const remaining = tracks.slice();

  while (remaining.length > 0) {
    let bestDelta = Infinity;
    let bestIndex = 0;

    for (let i = 0; i < remaining.length; i++) {
      const track = remaining[i];
      const artist = getPrimaryArtist(track);
      const desiredPct = artistCounts[artist] / length;
      const nextPct = ((artistCountsSoFar[artist] || 0) + 1) / (out.length + 1);
      const delta = Math.abs(nextPct - desiredPct);

      if (delta < bestDelta) {
        bestDelta = delta;
        bestIndex = i;
      }
    }

    const bestItem = remaining.splice(bestIndex, 1)[0];
    out.push(bestItem);

    const artist = getPrimaryArtist(bestItem);
    artistCountsSoFar[artist] = (artistCountsSoFar[artist] || 0) + 1;
  }

  return out;
}

/**
 * Generic version of smartOrder that works on items with item.track or item directly,
 * matching the signature of SortYourMusic smartOrder.
 */
export function smartOrder(items: any[]): void {
  const length = items.length;
  if (length === 0) return;

  const artistCounts: Record<string, number> = {};
  for (const item of items) {
    const track = item.track || item;
    const artist = getPrimaryArtist(track);
    artistCounts[artist] = (artistCounts[artist] || 0) + 1;
  }

  const artistCountsSoFar: Record<string, number> = {};
  const out: any[] = [];
  const remaining = items.slice();

  while (remaining.length > 0) {
    let bestDelta = Infinity;
    let bestIndex = 0;

    for (let i = 0; i < remaining.length; i++) {
      const item = remaining[i];
      const track = item.track || item;
      const artist = getPrimaryArtist(track);
      const desiredPct = artistCounts[artist] / length;
      const nextPct = ((artistCountsSoFar[artist] || 0) + 1) / (out.length + 1);
      const delta = Math.abs(nextPct - desiredPct);

      if (delta < bestDelta) {
        bestDelta = delta;
        bestIndex = i;
      }
    }

    const bestItem = remaining.splice(bestIndex, 1)[0];
    if (bestItem.track) {
      bestItem.track.smart = out.length;
    } else {
      bestItem.smart = out.length;
    }
    out.push(bestItem);

    const track = bestItem.track || bestItem;
    const artist = getPrimaryArtist(track);
    artistCountsSoFar[artist] = (artistCountsSoFar[artist] || 0) + 1;
  }
}
