import { getSession } from "@/lib/session";
import Link from "next/link";
import { Music, RefreshCw, Layers, CheckCircle2, ChevronRight, Disc } from "lucide-react";
import { BASE_PATH } from "@/lib/config";

export default async function HomePage() {
  const session = await getSession();

  if (!session) {
    return (
      <div className="animated-fade-in" style={{
        maxWidth: 700, margin: "60px auto", textAlign: "center", display: "flex",
        flexDirection: "column", alignItems: "center", gap: "32px"
      }} id="landing-container">
        
        <div style={{
          width: 80, height: 80, borderRadius: "50%",
          background: "rgba(29, 185, 84, 0.1)", display: "flex",
          alignItems: "center", justifyContent: "center",
          boxShadow: "var(--shadow-glow)"
        }}>
          <Disc size={48} style={{ color: "var(--spotify-green)", animation: "spin 12s linear infinite" }} />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <h1 style={{ fontSize: "3rem", fontWeight: 800, lineHeight: 1.1 }}>
            Sync, Clean &amp; Automate Your <span style={{ color: "var(--spotify-green)" }}>Spotify</span>
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "1.1rem", maxWidth: 500, margin: "0 auto" }}>
            The ultimate companion dashboard to manage your music playlists. Sync Billboard charts, deduplicate tracks, and clone curated playlists instantly.
          </p>
        </div>

        <a href={`${BASE_PATH}/api/auth/login`} className="btn btn-primary" id="login-button" style={{ padding: "16px 36px", fontSize: "1.05rem" }}>
          Connect with Spotify
        </a>

        <div className="grid grid-cols-3" style={{ width: "100%", marginTop: "40px", gap: "20px" }}>
          <div className="glass-panel" style={{ padding: "20px", textAlign: "left", display: "flex", flexDirection: "column", gap: "12px" }}>
            <div style={{ color: "var(--spotify-green)" }}><RefreshCw size={24} /></div>
            <h3 style={{ fontSize: "1.1rem" }}>Chart Updater</h3>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", lineHeight: 1.4 }}>
              Scrape Billboard Weekly Charts, match songs against your cache, search missing tracks, and update playlists automatically.
            </p>
          </div>
          
          <div className="glass-panel" style={{ padding: "20px", textAlign: "left", display: "flex", flexDirection: "column", gap: "12px" }}>
            <div style={{ color: "var(--spotify-green)" }}><Layers size={24} /></div>
            <h3 style={{ fontSize: "1.1rem" }}>Deduplicator</h3>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", lineHeight: 1.4 }}>
              Scan your playlists for identical tracks (by normalized title &amp; artists) and remove them safely while preserving order.
            </p>
          </div>
          
          <div className="glass-panel" style={{ padding: "20px", textAlign: "left", display: "flex", flexDirection: "column", gap: "12px" }}>
            <div style={{ color: "var(--spotify-green)" }}><Music size={24} /></div>
            <h3 style={{ fontSize: "1.1rem" }}>Track Copier</h3>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", lineHeight: 1.4 }}>
              Extract tracks from any playlist, including Spotify-owned lists, and append them into your backups without duplicates.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="animated-fade-in" style={{ display: "flex", flexDirection: "column", gap: "32px" }} id="dashboard-container">
      
      <div className="glass-panel" style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "32px", background: "radial-gradient(circle at top right, rgba(29, 185, 84, 0.08) 0%, rgba(23, 23, 33, 0.4) 100%)"
      }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <h1 style={{ fontSize: "2.25rem", fontWeight: 800 }}>Welcome back, {session.user.name}!</h1>
          <p style={{ color: "var(--text-secondary)" }}>
            Select a tool below to manage your playlists and run automations.
          </p>
        </div>
        <div className="badge badge-success" style={{ padding: "6px 12px", display: "flex", alignItems: "center", gap: "6px" }}>
          <CheckCircle2 size={14} />
          <span>Authenticated with Spotify</span>
        </div>
      </div>

      <div className="grid grid-cols-2" style={{ gap: "24px" }}>
        
        <div className="card" style={{ padding: "32px", display: "flex", flexDirection: "column", justifyContent: "space-between", minHeight: 240 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <div style={{
              width: 48, height: 48, borderRadius: "50%", background: "rgba(29, 185, 84, 0.1)",
              display: "flex", alignItems: "center", justifyContent: "center", color: "var(--spotify-green)"
            }}>
              <RefreshCw size={24} />
            </div>
            <h2 style={{ fontSize: "1.5rem", fontWeight: 700 }}>Weekly Charts Sync</h2>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem", lineHeight: 1.5 }}>
              Scrape the latest Billboard weekly charts (Hot 100, Adult Pop, Country, etc.) and update your number ones, top tens, and temp playlists. Resolves missing mappings interactively.
            </p>
          </div>
          <Link href="/update-charts" className="btn btn-primary" id="go-charts-btn" style={{ alignSelf: "flex-start", marginTop: "24px" }}>
            Open Chart Sync <ChevronRight size={16} />
          </Link>
        </div>

        <div className="card" style={{ padding: "32px", display: "flex", flexDirection: "column", justifyContent: "space-between", minHeight: 240 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <div style={{
              width: 48, height: 48, borderRadius: "50%", background: "rgba(13, 132, 250, 0.1)",
              display: "flex", alignItems: "center", justifyContent: "center", color: "var(--info)"
            }}>
              <Music size={24} />
            </div>
            <h2 style={{ fontSize: "1.5rem", fontWeight: 700 }}>Playlists &amp; Deduplication</h2>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem", lineHeight: 1.5 }}>
              Browse your playlists side-by-side. Open any playlist to view its track listing. Remove duplicate songs by title/artists, and copy track selections to backup playlists seamlessly.
            </p>
          </div>
          <Link href="/playlists" className="btn btn-secondary" id="go-playlists-btn" style={{ alignSelf: "flex-start", marginTop: "24px" }}>
            Open Playlists <ChevronRight size={16} />
          </Link>
        </div>

      </div>

      <div className="glass-panel" style={{ padding: "20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{ color: "var(--text-secondary)" }}>
            <CheckCircle2 size={20} />
          </div>
          <div style={{ fontSize: "0.9rem" }}>
            <span style={{ fontWeight: 600 }}>Database Connection Cache:</span> Local SQLite mapping shared with <code>python-playground</code> is active.
          </div>
        </div>
        <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
          Connected
        </div>
      </div>

    </div>
  );
}
