import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { fetchChart, type ChartData } from "@/lib/billboard";
import { getChartDate, getCachedChart, saveCachedChart, searchSong } from "@/lib/db";
import { BILLBOARD_CHARTS } from "@/lib/config";

/**
 * Run async tasks with a cap on how many are in flight at once. Billboard blocks
 * bursts of parallel requests from datacenter IPs, so we keep concurrency low.
 */
async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;

  async function worker() {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await fn(items[index], index);
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

export async function GET() {
  const session = await getSession();
  
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    console.log("Fetching Billboard charts and database mapping status...");
    
    // Fetch charts with limited concurrency (Billboard rate-limits bursts)
    const charts = await mapWithConcurrency(BILLBOARD_CHARTS, 3, async (chartConf) => {
      const dbDate = await getChartDate(chartConf.id);

      let scraped = await fetchChart(chartConf.id, chartConf.maxSongs);
      let stale: string | null = null;

      if (scraped) {
        // Remember this good copy so a future scrape failure can fall back to it
        await saveCachedChart(chartConf.id, scraped);
      } else {
        // Scrape failed (Billboard block / network). Serve the last good copy.
        const cached = await getCachedChart<ChartData>(chartConf.id);
        if (cached) {
          scraped = cached.data;
          stale = cached.fetchedAt;
        }
      }

      if (!scraped) {
        return {
          id: chartConf.id,
          name: chartConf.name,
          error: "Failed to scrape chart",
          isUpToDate: false,
          songs: []
        };
      }

      // Check date difference
      let isUpToDate = false;
      if (dbDate) {
        const scrapedDate = new Date(scraped.date);
        const savedDate = new Date(dbDate);
        isUpToDate = scrapedDate.getTime() <= savedDate.getTime();
      }

      // Map songs with database
      const songsWithMapping = await Promise.all(
        scraped.songs.map(async (song) => {
          const dbSong = await searchSong(song.title, song.artist);
          return {
            ...song,
            spotifyId: dbSong ? dbSong.id : null,
            isMapped: !!dbSong
          };
        })
      );

      return {
        id: scraped.id,
        name: chartConf.name,
        date: scraped.date,
        dbDate: dbDate || "Never updated",
        isUpToDate,
        stale,
        songs: songsWithMapping
      };
    });

    return NextResponse.json({ charts });

  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to process charts";
    console.error("Error fetching charts data:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
