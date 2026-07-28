"use client";

import { useState, useMemo } from "react";
import {
  ArrowLeft,
  Music,
  Globe,
  Lock,
  Users,
  Copy,
  Trash2,
  AlertTriangle,
  ExternalLink,
  Sparkles,
  ArrowUpDown,
  RotateCcw,
  Save,
} from "lucide-react";
import CircularProgress from "@mui/material/CircularProgress";
import Image from "next/image";
import { SpotifyPlaylist, SpotifyTrack } from "../types";
import { smartOrderTracks } from "@/lib/smartOrder";

export type SortMode = "original" | "artist_separation" | "title" | "artist";

interface PlaylistDetailViewProps {
  selectedPlaylist: SpotifyPlaylist;
  onBack: () => void;
  userId: string;
  tracks: SpotifyTrack[];
  loadingTracks: boolean;
  tracksError: string | null;
  onOpenCopyPicker: () => void;
  onRemoveDuplicates: () => void;
  deduplicating: boolean;
  onSaveOrder?: (reorderedTracks: SpotifyTrack[], sortMode: SortMode) => void;
  savingOrder?: boolean;
}

export function PlaylistDetailView({
  selectedPlaylist,
  onBack,
  userId,
  tracks,
  loadingTracks,
  tracksError,
  onOpenCopyPicker,
  onRemoveDuplicates,
  deduplicating,
  onSaveOrder,
  savingOrder = false,
}: PlaylistDetailViewProps) {
  const [sortMode, setSortMode] = useState<SortMode>("original");

  // Format date helper
  const formatDate = (dateStr: string) => {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  };

  const hasWriteAccess = selectedPlaylist.owner.id === userId || selectedPlaylist.collaborative;

  // Compute sorted tracks based on selected sort mode
  const displayTracks = useMemo(() => {
    if (sortMode === "artist_separation") {
      return smartOrderTracks(tracks);
    }
    if (sortMode === "title") {
      return [...tracks].sort((a, b) => a.title.localeCompare(b.title));
    }
    if (sortMode === "artist") {
      return [...tracks].sort((a, b) => {
        const artistA = a.artists[0] || "";
        const artistB = b.artists[0] || "";
        return artistA.localeCompare(artistB);
      });
    }
    return tracks;
  }, [tracks, sortMode]);

  const isModifiedOrder = sortMode !== "original";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }} className="animated-fade-in" id="playlist-detail-page">
      {/* Back Button */}
      <div>
        <button
          className="btn btn-secondary"
          onClick={onBack}
          style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "8px 16px" }}
          id="back-to-playlists-btn"
        >
          <ArrowLeft size={16} /> Back to Playlists
        </button>
      </div>

      {/* Playlist Info */}
      <div
        className="glass-panel"
        style={{
          display: "flex",
          gap: "24px",
          padding: "24px",
          background: "linear-gradient(to bottom, rgba(29, 185, 84, 0.08) 0%, rgba(23, 23, 33, 0.5) 100%)",
          flexWrap: "wrap",
        }}
      >
        <div
          style={{
            width: "120px",
            height: "120px",
            borderRadius: "var(--radius-md)",
            overflow: "hidden",
            flexShrink: 0,
            background: "#222",
            boxShadow: "var(--shadow-md)",
          }}
        >
          {selectedPlaylist.images && selectedPlaylist.images.length > 0 ? (
            <Image
              src={selectedPlaylist.images[0].url}
              alt={selectedPlaylist.name}
              width={120}
              height={120}
              unoptimized
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Music size={40} style={{ color: "var(--text-muted)" }} />
            </div>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", flex: "1 1 300px", minWidth: 0 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <div style={{ display: "flex", gap: "6px", alignItems: "center", flexWrap: "wrap" }}>
              <span style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--spotify-green)", fontWeight: 700 }}>
                Playlist
              </span>
              {selectedPlaylist.public ? (
                <span className="badge badge-secondary" style={{ fontSize: "0.7rem", gap: "3px", alignItems: "center" }}>
                  <Globe size={10} /> Public
                </span>
              ) : (
                <span className="badge badge-secondary" style={{ fontSize: "0.7rem", gap: "3px", alignItems: "center" }}>
                  <Lock size={10} /> Private
                </span>
              )}

              {selectedPlaylist.collaborative && (
                <span className="badge badge-info" style={{ fontSize: "0.7rem", gap: "3px", alignItems: "center" }}>
                  <Users size={10} /> Collaborative
                </span>
              )}
            </div>
            <h2 style={{ fontSize: "1.75rem", fontWeight: 800, wordBreak: "break-word" }}>{selectedPlaylist.name}</h2>
            {selectedPlaylist.description && (
              <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginTop: "4px", wordBreak: "break-word" }}>
                {selectedPlaylist.description}
              </p>
            )}
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: "12px", marginTop: "12px" }}>
            <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
              By {selectedPlaylist.owner.display_name || "Spotify"} &bull; {selectedPlaylist.tracks.total} songs
            </p>

            {/* Action buttons */}
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              {/* Artist Separation quick button */}
              <button
                className={`btn ${sortMode === "artist_separation" ? "btn-primary" : "btn-secondary"}`}
                onClick={() => setSortMode(sortMode === "artist_separation" ? "original" : "artist_separation")}
                disabled={loadingTracks || tracks.length === 0}
                id="playlist-action-artist-separation"
                title="Sort tracks so artists are evenly distributed throughout the playlist"
                style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
              >
                <Sparkles size={16} /> Artist Separation
              </button>

              <button
                className="btn btn-secondary"
                onClick={onOpenCopyPicker}
                disabled={loadingTracks || tracks.length === 0}
                id="playlist-action-copy"
              >
                <Copy size={16} /> Copy to...
              </button>

              {/* Remove duplicates is only enabled if the user has write access */}
              {hasWriteAccess ? (
                <button
                  className="btn btn-primary"
                  onClick={onRemoveDuplicates}
                  disabled={loadingTracks || deduplicating || tracks.length === 0}
                  id="playlist-action-dedup"
                >
                  {deduplicating ? <CircularProgress size={16} color="inherit" /> : <Trash2 size={16} />}
                  Remove Duplicates
                </button>
              ) : (
                <span
                  className="badge badge-secondary"
                  style={{ padding: "8px 12px", display: "inline-flex", alignItems: "center", gap: "6px" }}
                  title="Spotify curated or private lists cannot be cleaned, but you can copy them into your own list."
                >
                  <Lock size={12} /> Read-only
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tracks List Container */}
      <div className="glass-panel" style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "16px" }} id="modal-tracks-container">
        {/* Sorting & Filter Header Controls */}
        {!loadingTracks && !tracksError && tracks.length > 0 && (
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "12px",
              paddingBottom: "12px",
              borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
              <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: "6px" }}>
                <ArrowUpDown size={14} /> Sort By:
              </span>

              <select
                value={sortMode}
                onChange={(e) => setSortMode(e.target.value as SortMode)}
                style={{
                  background: "rgba(255, 255, 255, 0.05)",
                  color: "var(--text-main)",
                  border: "1px solid rgba(255, 255, 255, 0.15)",
                  borderRadius: "var(--radius-sm)",
                  padding: "6px 12px",
                  fontSize: "0.85rem",
                  cursor: "pointer",
                  outline: "none",
                }}
                id="sort-mode-select"
              >
                <option value="original" style={{ background: "#1a1a24" }}>Original Spotify Order</option>
                <option value="artist_separation" style={{ background: "#1a1a24" }}>✨ Artist Separation (Smart Order)</option>
                <option value="title" style={{ background: "#1a1a24" }}>Track Title (A-Z)</option>
                <option value="artist" style={{ background: "#1a1a24" }}>Artist Name (A-Z)</option>
              </select>

              {isModifiedOrder && (
                <button
                  className="btn btn-secondary"
                  onClick={() => setSortMode("original")}
                  style={{ padding: "4px 10px", fontSize: "0.75rem", display: "inline-flex", alignItems: "center", gap: "4px" }}
                  id="reset-sort-btn"
                >
                  <RotateCcw size={12} /> Reset Order
                </button>
              )}
            </div>

            {/* Save Order to Spotify Button */}
            {hasWriteAccess && isModifiedOrder && onSaveOrder && (
              <button
                className="btn btn-primary"
                onClick={() => onSaveOrder(displayTracks, sortMode)}
                disabled={savingOrder}
                style={{ padding: "8px 16px", fontSize: "0.85rem", display: "inline-flex", alignItems: "center", gap: "6px" }}
                id="save-order-spotify-btn"
              >
                {savingOrder ? <CircularProgress size={14} color="inherit" /> : <Save size={14} />}
                Save New Order to Spotify
              </button>
            )}
          </div>
        )}

        {/* Info Banner when Artist Separation is active */}
        {sortMode === "artist_separation" && !loadingTracks && (
          <div
            style={{
              padding: "12px 16px",
              borderRadius: "var(--radius-md)",
              background: "rgba(29, 185, 84, 0.1)",
              border: "1px solid rgba(29, 185, 84, 0.3)",
              display: "flex",
              alignItems: "center",
              gap: "10px",
              fontSize: "0.85rem",
              color: "var(--spotify-green)",
            }}
            id="artist-separation-banner"
          >
            <Sparkles size={18} style={{ flexShrink: 0 }} />
            <div>
              <strong>Artist Separation Active:</strong> Tracks are rearranged to maximize spacing between songs by the same artist using the SortYourMusic smart-order algorithm.
              {hasWriteAccess ? " Click 'Save New Order to Spotify' above to apply this order to your playlist." : ""}
            </div>
          </div>
        )}

        {loadingTracks && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "60px 0", gap: "12px" }}>
            <CircularProgress size={36} style={{ color: "var(--spotify-green)" }} />
            <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>Fetching tracks...</p>
          </div>
        )}

        {tracksError && !loadingTracks && (
          <div style={{ color: "var(--danger)", textAlign: "center", padding: "40px 0" }}>
            <AlertTriangle size={32} style={{ margin: "0 auto 12px auto" }} />
            <p>{tracksError}</p>
          </div>
        )}

        {!loadingTracks && !tracksError && (
          <>
            {displayTracks.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 0", color: "var(--text-secondary)" }}>
                No songs in this playlist.
              </div>
            ) : (
              <div className="table-container">
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th style={{ width: "50px" }}>#</th>
                      <th>Title</th>
                      <th>Artist</th>
                      <th>Added At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayTracks.map((track, idx) => (
                      <tr key={`${track.id}-${idx}`}>
                        <td style={{ color: "var(--text-muted)" }}>{idx + 1}</td>
                        <td style={{ fontWeight: 600 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            {track.title}
                            <a
                              href={`https://open.spotify.com/track/${track.id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ color: "var(--text-muted)" }}
                              title="Listen on Spotify"
                            >
                              <ExternalLink size={12} />
                            </a>
                          </div>
                        </td>
                        <td style={{ color: "var(--text-secondary)" }}>{track.artists.join(", ")}</td>
                        <td style={{ color: "var(--text-muted)" }}>{formatDate(track.added_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
