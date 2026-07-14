"use client";

import { Globe, AlertTriangle, ArrowRight, Loader2 } from "lucide-react";

interface SyncActionPanelProps {
  spotifyNumberOne: string;
  onSpotifyNumberOneChange: (val: string) => void;
  unresolvedSongsCount: number;
  updatingPlaylists: boolean;
  updateLogs: string[];
  updateCompleted: boolean;
  onExecuteUpdate: () => Promise<void>;
}

export function SyncActionPanel({
  spotifyNumberOne,
  onSpotifyNumberOneChange,
  unresolvedSongsCount,
  updatingPlaylists,
  updateLogs,
  updateCompleted,
  onExecuteUpdate,
}: SyncActionPanelProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px", marginTop: "12px" }}>
      {/* Spotify USA Weekly #1 Card */}
      <div className="glass-panel" style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              background: "rgba(29, 185, 84, 0.1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--spotify-green)",
            }}
          >
            <Globe size={16} />
          </div>
          <h2 style={{ fontSize: "1.25rem", fontWeight: 700 }}>Spotify USA Weekly Top Songs #1</h2>
        </div>

        <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", lineHeight: 1.4 }}>
          The Spotify Weekly Top Songs USA chart (
          <a
            href="https://charts.spotify.com/charts/view/regional-us-weekly/latest"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: "var(--spotify-green)",
              textDecoration: "underline",
              fontWeight: 500,
            }}
          >
            https://charts.spotify.com/charts/view/regional-us-weekly/latest
          </a>
          ) is not scrapeable directly. Paste the share link or track ID of the current #1 song to update the SpotifyUSA number ones playlist.
        </p>

        <div className="form-group" style={{ margin: 0 }}>
          <input
            type="text"
            placeholder="Paste Spotify track link (e.g., https://open.spotify.com/track/...)"
            value={spotifyNumberOne}
            onChange={(e) => onSpotifyNumberOneChange(e.target.value)}
            className="form-input"
            id="spotify-usa-no1-input"
          />
        </div>
      </div>

      {/* Sync Playlists Action Panel */}
      <div
        className="glass-panel"
        style={{
          padding: "32px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
          gap: "20px",
          background: "radial-gradient(circle at bottom, rgba(29, 185, 84, 0.05) 0%, rgba(23, 23, 33, 0.4) 100%)",
        }}
      >
        <div>
          <h2 style={{ fontSize: "1.5rem", fontWeight: 800 }}>Execute Playlist Synchronization</h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginTop: "6px", maxWidth: 500 }}>
            {unresolvedSongsCount > 0 ? (
              <span style={{ color: "var(--danger)", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                <AlertTriangle size={14} /> You must resolve {unresolvedSongsCount} song mapping(s) before syncing.
              </span>
            ) : (
              "All songs mapped successfully. You are ready to update your Spotify playlists!"
            )}
          </p>
        </div>

        <button
          onClick={onExecuteUpdate}
          className="btn btn-primary"
          style={{ padding: "16px 40px", fontSize: "1.1rem" }}
          disabled={unresolvedSongsCount > 0 || updatingPlaylists}
          id="execute-sync-btn"
        >
          {updatingPlaylists ? (
            <>
              <Loader2 size={20} className="spin" /> Updating Playlists...
            </>
          ) : (
            <>
              Run Playlists Update <ArrowRight size={18} />
            </>
          )}
        </button>
      </div>

      {/* Logs console */}
      {(updatingPlaylists || updateLogs.length > 0) && (
        <div className="glass-panel" style={{ padding: "24px", background: "#0a0a0f", border: "1px solid #1a1a26" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              borderBottom: "1px solid var(--border)",
              paddingBottom: "12px",
              marginBottom: "16px",
            }}
          >
            <h3
              style={{
                fontSize: "1rem",
                fontFamily: "monospace",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <Loader2
                size={16}
                className={updatingPlaylists ? "spin" : ""}
                style={{ color: updatingPlaylists ? "var(--spotify-green)" : "var(--text-secondary)" }}
              />
              Execution Logs
            </h3>
            {updateCompleted && <span className="badge badge-success">Completed Successfully</span>}
          </div>
          <div
            style={{
              fontFamily: "monospace",
              fontSize: "0.8rem",
              color: "#39ff14",
              maxHeight: "300px",
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: "6px",
              textAlign: "left",
              whiteSpace: "pre-wrap",
            }}
            id="logs-console"
          >
            {updateLogs.map((logLine, index) => (
              <div key={index} style={{ color: logLine.startsWith("[ERROR]") ? "var(--danger)" : undefined }}>
                {logLine}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
