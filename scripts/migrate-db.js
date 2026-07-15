const sqlite3 = require("sqlite3");
const { open } = require("sqlite");
const { Client } = require("pg");
const fs = require("fs");
const path = require("path");

// Load .env.local manually if DATABASE_URL is not in process.env
if (!process.env.DATABASE_URL) {
  const envLocalPath = path.join(process.cwd(), ".env.local");
  if (fs.existsSync(envLocalPath)) {
    const envContent = fs.readFileSync(envLocalPath, "utf8");
    envContent.split("\n").forEach((line) => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith("#")) {
        const firstEqual = trimmed.indexOf("=");
        if (firstEqual !== -1) {
          const key = trimmed.substring(0, firstEqual).trim();
          const val = trimmed.substring(firstEqual + 1).trim();
          process.env[key] = val;
        }
      }
    });
  }
}

async function migrate() {
  const sqlitePath = path.join(process.cwd(), "music.db");
  const dbUrl = process.env.DATABASE_URL;

  if (!fs.existsSync(sqlitePath)) {
    console.error(`Error: SQLite database not found at ${sqlitePath}`);
    console.log("Please place your 'music.db' file in the root of the project to migrate it.");
    process.exit(1);
  }

  if (!dbUrl || (!dbUrl.startsWith("postgres://") && !dbUrl.startsWith("postgresql://"))) {
    console.error("Error: DATABASE_URL environment variable is not set to a valid PostgreSQL connection string.");
    process.exit(1);
  }

  console.log(`Connecting to SQLite database at ${sqlitePath}...`);
  const sqliteDb = await open({
    filename: sqlitePath,
    driver: sqlite3.Database,
  });

  console.log("Connecting to PostgreSQL database...");
  const pgClient = new Client({
    connectionString: dbUrl,
    ssl: {
      rejectUnauthorized: false
    }
  });
  await pgClient.connect();

  try {
    // 1. Ensure target tables exist in Postgres
    console.log("Ensuring target tables exist in PostgreSQL...");
    await pgClient.query(`
      CREATE TABLE IF NOT EXISTS songs (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        artists TEXT NOT NULL
      );
    `);
    await pgClient.query(`
      CREATE TABLE IF NOT EXISTS charts (
        name TEXT PRIMARY KEY,
        date TEXT NOT NULL
      );
    `);

    // 2. Migrate songs
    console.log("Reading songs from SQLite...");
    const songs = await sqliteDb.all("SELECT id, title, artists FROM songs");
    console.log(`Found ${songs.length} songs to migrate.`);

    let songCount = 0;
    for (const song of songs) {
      await pgClient.query(
        `INSERT INTO songs(id, title, artists) 
         VALUES($1, $2, $3) 
         ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, artists = EXCLUDED.artists`,
        [song.id, song.title, song.artists]
      );
      songCount++;
    }
    console.log(`Successfully migrated ${songCount} songs.`);

    // 3. Migrate charts
    console.log("Reading charts from SQLite...");
    const charts = await sqliteDb.all("SELECT name, date FROM charts");
    console.log(`Found ${charts.length} charts to migrate.`);

    let chartCount = 0;
    for (const chart of charts) {
      await pgClient.query(
        `INSERT INTO charts(name, date) 
         VALUES($1, $2) 
         ON CONFLICT(name) DO UPDATE SET date = EXCLUDED.date`,
        [chart.name, chart.date]
      );
      chartCount++;
    }
    console.log(`Successfully migrated ${chartCount} charts.`);
    
    console.log("Migration completed successfully!");

  } catch (error) {
    console.error("Migration failed:", error);
  } finally {
    await sqliteDb.close();
    await pgClient.end();
  }
}

migrate();
