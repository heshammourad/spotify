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

const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:122.0) Gecko/20100101 Firefox/122.0",
];

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Billboard is bot-protected (Cloudflare) and rate-limits/blocks bursts from
 * datacenter IPs, so a single request often fails intermittently. Retry a few
 * times with exponential backoff + jitter, rotating the User-Agent each attempt.
 */
async function fetchChartHtml(chartId: string, attempts = 3): Promise<string | null> {
  const url = `https://www.billboard.com/charts/${chartId}/`;
  const uaOffset = Math.floor(Math.random() * USER_AGENTS.length);

  for (let attempt = 0; attempt < attempts; attempt++) {
    if (attempt > 0) {
      const backoff = 500 * 2 ** (attempt - 1) + Math.floor(Math.random() * 400);
      await sleep(backoff);
    }

    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent": USER_AGENTS[(uaOffset + attempt) % USER_AGENTS.length],
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
          "Cache-Control": "no-cache",
          "Pragma": "no-cache",
        },
      });

      if (response.ok) {
        const html = await response.text();
        // A 200 from Cloudflare's bot challenge / "Access Denied" page won't
        // contain the chart markup — treat that as a failed attempt and retry.
        if (html.includes("o-chart-results-list-row")) {
          return html;
        }
        console.error(
          `Billboard chart ${chartId} returned 200 without chart markup (attempt ${attempt + 1}/${attempts}); likely a bot challenge`,
        );
      } else {
        console.error(
          `Failed to fetch Billboard chart ${chartId} (attempt ${attempt + 1}/${attempts}): ${response.status} ${response.statusText}`,
        );
      }
    } catch (error) {
      console.error(
        `Error fetching Billboard chart ${chartId} (attempt ${attempt + 1}/${attempts}):`,
        error,
      );
    }
  }

  return null;
}

export async function fetchChart(chartId: string, maxSongs?: number): Promise<ChartData | null> {
  try {
    const html = await fetchChartHtml(chartId);
    if (html === null) {
      return null;
    }
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

      // Extract last week's rank. The stat columns (LW, PEAK, WKS) follow the
      // title/artist <li> in document order; LW is the first one whose text is
      // a rank or "-". Don't depend on the exact wrapper elements between them —
      // Billboard reshuffles those, which previously left every LW as "-".
      let lw = "-";
      const rowItems = row.find("li").toArray();
      const statItems = rowItems
        .slice(rowItems.indexOf(songInfo.get(0)!) + 1)
        .filter((el) => $(el).closest(songInfo).length === 0);
      $(statItems).each((_, el) => {
        const text = $(el).text().trim();
        if (/^(\d+|-)$/.test(text)) {
          lw = text;
          return false; // break loop
        }
      });
      if (i === 0 && statItems.length === 0) {
        console.error(`Billboard chart ${chartId}: no stat columns found next to title; LW will be "-"`);
      }

      songs.push({
        rank: i + 1,
        lw,
        title,
        artist,
      });
    }

    if (songs.length === 0) {
      // Markup was present but no rows parsed — a Billboard structure change or
      // a partial page. Treat as a failure so the cached copy is used instead.
      console.error(`Scraped Billboard chart ${chartId} but parsed 0 songs`);
      return null;
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
