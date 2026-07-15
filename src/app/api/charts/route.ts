import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { fetchChart } from "@/lib/billboard";
import { getChartDate, searchSong } from "@/lib/db";
import { BILLBOARD_CHARTS } from "@/lib/config";

export async function GET() {
  const session = await getSession();
  
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    console.log("Fetching Billboard charts and database mapping status...");
    
    // Fetch all charts in parallel
    const chartPromises = BILLBOARD_CHARTS.map(async (chartConf) => {
      const scraped = await fetchChart(chartConf.id, chartConf.maxSongs);
      const dbDate = await getChartDate(chartConf.id);
      
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
        songs: songsWithMapping
      };
    });

    const charts = await Promise.all(chartPromises);
    return NextResponse.json({ charts });

  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to process charts";
    console.error("Error fetching charts data:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
