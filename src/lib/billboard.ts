import * as cheerio from "cheerio";

export interface ChartSong {
  rank: number;
  lw: string; // last week's rank
  title: string;
  artist: string;
}

export interface ChartData {
  id: string;
  name: string;
  date: string; // ISO date string (YYYY-MM-DD)
  songs: ChartSong[];
}

export async function fetchChart(chartId: string, maxSongs?: number): Promise<ChartData | null> {
  const url = `https://www.billboard.com/charts/${chartId}/`;

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
        "Cache-Control": "no-cache",
        "Pragma": "no-cache",
      },
    });

    if (!response.ok) {
      console.error(`Failed to fetch Billboard chart ${chartId}: ${response.status} ${response.statusText}`);
      return null;
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // 1. Get chart name cleanly
    let chartName = "";
    const h1Heading = $("h1#section-heading, h1.c-heading").first();
    if (h1Heading.length) {
      chartName = h1Heading.text().trim();
    } else {
      chartName = $("h1").first().text().trim() || chartId;
    }

    // 2. Find date element containing "Week of"
    let dateStr = "";
    $("span, h2, p").each((_, el) => {
      const text = $(el).text().trim();
      if (text.startsWith("Week of ") && text.length < 50) {
        dateStr = text;
        return false; // break loop
      }
    });

    // Parse date
    let dateIso = new Date().toISOString().split("T")[0]; // default fallback
    if (dateStr) {
      const cleanDateStr = dateStr.replace("Week of ", "").trim();
      const parsedDate = new Date(cleanDateStr);
      if (!isNaN(parsedDate.getTime())) {
        dateIso = parsedDate.toISOString().split("T")[0];
      }
    }

    const songs: ChartSong[] = [];
    const rows = $(".o-chart-results-list-row");
    
    // Determine limit
    const limit = maxSongs && maxSongs > 0 ? Math.min(rows.length, maxSongs) : rows.length;

    for (let i = 0; i < limit; i++) {
      const row = rows.eq(i);
      const container = row.find(".a-chart-result-item-container");
      if (!container.length) continue;

      const songInfo = container.find("li").first();
      if (!songInfo.length) continue;

      const titleNode = songInfo.find("h3");
      // The artist name is typically in the first span inside the songInfo element
      const artistNode = songInfo.find("span").first();

      const title = titleNode.text().trim();
      const artist = artistNode.text().trim();

      if (!title || !artist) continue;

      // Extract last week's rank
      const stats = container.find("ul > div");
      let lw = "-";
      if (stats.length) {
        const lwNode = stats.find("div").first();
        if (lwNode.length) {
          const lwLi = lwNode.find("li").first();
          if (lwLi.length) {
            lw = lwLi.text().trim();
          }
        }
      }

      songs.push({
        rank: i + 1,
        lw,
        title,
        artist,
      });
    }

    return {
      id: chartId,
      name: chartName || chartId,
      date: dateIso,
      songs,
    };
  } catch (error) {
    console.error(`Error scraping Billboard chart ${chartId}:`, error);
    return null;
  }
}
