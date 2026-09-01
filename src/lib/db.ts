import { Pool } from "pg";
import fs from "fs";
import path from "path";
import type { Database as SqliteDatabase } from "sqlite";

let sqliteDb: any = null;
let pgPool: Pool | null = null;

// Determine SQLite path: try sharing with python-playground, fallback to local/tmp
const getSqlitePath = () => {
  const sharedPath = "/workspaces/spotify/python-playground/music.db";
  if (fs.existsSync(sharedPath)) {
    return sharedPath;
  }
  const rootPath = path.join(process.cwd(), "music.db");
  if (process.env.NODE_ENV === "production") {
    // Vercel serverless functions have write access to /tmp
    return "/tmp/music.db";
  }
  return rootPath;
};

// Initialize Database connection
async function getDb() {
  const dbUrl = process.env.DATABASE_URL;

  if (dbUrl && (dbUrl.startsWith("postgres://") || dbUrl.startsWith("postgresql://"))) {
    if (!pgPool) {
      pgPool = new Pool({
        connectionString: dbUrl,
        ssl: {
          rejectUnauthorized: false // Required for many serverless Postgres hosts like Neon
        }
      });
      // Initialize tables
      const client = await pgPool.connect();
      try {
        await client.query(`
          CREATE TABLE IF NOT EXISTS songs (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            artists TEXT NOT NULL
          );
        `);
        await client.query(`
          CREATE TABLE IF NOT EXISTS charts (
            name TEXT PRIMARY KEY,
            date TEXT NOT NULL
          );
        `);
        await client.query(`
          CREATE TABLE IF NOT EXISTS chart_cache (
            chart_id TEXT PRIMARY KEY,
            data TEXT NOT NULL,
            fetched_at TEXT NOT NULL
          );
        `);
      } finally {
        client.release();
      }
    }
    return { type: "postgres" as const, client: pgPool };
  } else {
    if (!sqliteDb) {
      const sqlitePath = getSqlitePath();
      // Ensure directory exists if we are in /tmp or custom path
      const dir = path.dirname(sqlitePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      const sqlite3 = (await import("sqlite3")).default;
      const { open } = await import("sqlite");

      sqliteDb = await open({
        filename: sqlitePath,
        driver: sqlite3.Database,
      });

      // Initialize tables
      await sqliteDb.exec(`
        CREATE TABLE IF NOT EXISTS songs (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          artists TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS charts (
          name TEXT PRIMARY KEY,
          date TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS chart_cache (
          chart_id TEXT PRIMARY KEY,
          data TEXT NOT NULL,
          fetched_at TEXT NOT NULL
        );
      `);
    }
    return { type: "sqlite" as const, client: sqliteDb };
  }
}

export interface DbSong {
  id: string;
  title: string;
  artists: string;
}

export async function searchSong(title: string, artists: string): Promise<DbSong | null> {
  const db = await getDb();
  const searchTitle = title.trim();
  const searchArtists = artists.trim();

  if (db.type === "postgres") {
    const res = await db.client.query(
      "SELECT id, title, artists FROM songs WHERE LOWER(title) = LOWER($1) AND LOWER(artists) = LOWER($2) LIMIT 1",
      [searchTitle, searchArtists]
    );
    return res.rows[0] || null;
  } else {
    const row = await db.client.get(
      "SELECT id, title, artists FROM songs WHERE LOWER(title) = LOWER(?) AND LOWER(artists) = LOWER(?) LIMIT 1",
      [searchTitle, searchArtists]
    );
    return row || null;
  }
}

export async function addSong(id: string, title: string, artists: string): Promise<void> {
  const db = await getDb();
  const cleanId = id.trim();
  const cleanTitle = title.trim();
  const cleanArtists = artists.trim();

  if (db.type === "postgres") {
    await db.client.query(
      `INSERT INTO songs(id, title, artists) 
       VALUES($1, $2, $3) 
       ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, artists = EXCLUDED.artists`,
      [cleanId, cleanTitle, cleanArtists]
    );
  } else {
    await db.client.run(
      `INSERT INTO songs(id, title, artists) 
       VALUES(?, ?, ?) 
       ON CONFLICT (id) DO UPDATE SET title = excluded.title, artists = excluded.artists`,
      [cleanId, cleanTitle, cleanArtists]
    );
  }
}

export async function getChartDate(chartName: string): Promise<string | null> {
  const db = await getDb();
  if (db.type === "postgres") {
    const res = await db.client.query(
      "SELECT date FROM charts WHERE LOWER(name) = LOWER($1) LIMIT 1",
      [chartName]
    );
    return res.rows[0]?.date || null;
  } else {
    const row = await db.client.get(
      "SELECT date FROM charts WHERE LOWER(name) = LOWER(?) LIMIT 1",
      [chartName]
    );
    return row?.date || null;
  }
}

export interface CachedChart<T> {
  data: T;
  fetchedAt: string; // ISO timestamp of when the scrape succeeded
}

/** Store the most recent successful scrape of a chart, for use as a fallback. */
export async function saveCachedChart<T>(chartId: string, data: T): Promise<void> {
  const db = await getDb();
  const payload = JSON.stringify(data);
  const fetchedAt = new Date().toISOString();
  if (db.type === "postgres") {
    await db.client.query(
      `INSERT INTO chart_cache(chart_id, data, fetched_at)
       VALUES($1, $2, $3)
       ON CONFLICT(chart_id) DO UPDATE SET data = EXCLUDED.data, fetched_at = EXCLUDED.fetched_at`,
      [chartId, payload, fetchedAt]
    );
  } else {
    await db.client.run(
      `INSERT INTO chart_cache(chart_id, data, fetched_at)
       VALUES(?, ?, ?)
       ON CONFLICT(chart_id) DO UPDATE SET data = excluded.data, fetched_at = excluded.fetched_at`,
      [chartId, payload, fetchedAt]
    );
  }
}

/** Read the last successfully-scraped copy of a chart, if any. */
export async function getCachedChart<T>(chartId: string): Promise<CachedChart<T> | null> {
  const db = await getDb();
  let row: { data: string; fetched_at: string } | undefined;
  if (db.type === "postgres") {
    const res = await db.client.query(
      "SELECT data, fetched_at FROM chart_cache WHERE chart_id = $1 LIMIT 1",
      [chartId]
    );
    row = res.rows[0];
  } else {
    row = await db.client.get(
      "SELECT data, fetched_at FROM chart_cache WHERE chart_id = ? LIMIT 1",
      [chartId]
    );
  }
  if (!row) return null;
  try {
    return { data: JSON.parse(row.data) as T, fetchedAt: row.fetched_at };
  } catch {
    return null;
  }
}

export async function updateChartDate(chartName: string, date: string): Promise<void> {
  const db = await getDb();
  if (db.type === "postgres") {
    await db.client.query(
      `INSERT INTO charts(name, date) 
       VALUES($1, $2) 
       ON CONFLICT(name) DO UPDATE SET date = EXCLUDED.date`,
      [chartName, date]
    );
  } else {
    await db.client.run(
      `INSERT INTO charts(name, date) 
       VALUES(?, ?) 
       ON CONFLICT(name) DO UPDATE SET date = excluded.date`,
      [chartName, date]
    );
  }
}
