"use client";

import { Check, ExternalLink, Search, Loader2, Save, X, Plus, Music } from "lucide-react";
import Image from "next/image";
import { RequestSong, SpotifySearchResult } from "../types";

interface SongMappingRowProps {
  chartId: string;
  song: RequestSong;
  searchQuery: string;
  searchResults: SpotifySearchResult[];
  isSearching: boolean;
  manualLink: string;
  onSearchQueryChange: (songKey: string, query: string) => void;
  onManualLinkChange: (songKey: string, link: string) => void;
  onSearchSong: (chartId: string, song: RequestSong) => Promise<void>;
  onMapSong: (chartId: string, song: RequestSong, spotifyId: string) => Promise<void>;
  onManualMap: (chartId: string, song: RequestSong) => Promise<void>;
  onSkipSong: (chartId: string, song: RequestSong) => void;
  onResetMapping: (chartId: string, song: RequestSong) => void;
  onClearSearchResults: (songKey: string) => void;
}

export function SongMappingRow({
  chartId,
  song,
  searchQuery,
  searchResults,
  isSearching,
  manualLink,
  onSearchQueryChange,
  onManualLinkChange,
  onSearchSong,
  onMapSong,
  onManualMap,
  onSkipSong,
  onResetMapping,
  onClearSearchResults,
}: SongMappingRowProps) {
  const songKey = `${chartId}-${song.rank}`;
  const isUnmapped = !song.isMapped;
  const isSkipped = song.isMapped && song.spotifyId === "";

  return (
    <tr style={{ verticalAlign: "top" }}>
      <td style={{ fontWeight: 700, padding: "16px 12px" }}>#{song.rank}</td>
      <td style={{ color: "var(--text-muted)", padding: "16px 12px" }}>({song.lw})</td>
      <td style={{ padding: "16px 12px" }}>
        <div>
          <div style={{ fontWeight: 600, fontSize: "0.95rem" }}>{song.title}</div>
          <div style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginTop: "2px" }}>
            {song.artist}
          </div>
        </div>
      </td>
      <td style={{ padding: "12px" }}>
        {/* Mapped State */}
        {!isUnmapped && (
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            {isSkipped ? (
              <>
                <span className="badge badge-secondary" style={{ padding: "4px 8px" }}>
                  Skipped
                </span>
                <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Unavailable</span>
              </>
            ) : (
              <>
                <span
                  className="badge badge-success"
                  style={{ display: "flex", alignItems: "center", gap: "4px", padding: "4px 8px" }}
                >
                  <Check size={12} /> Cached
                </span>
                <span
                  style={{
                    fontSize: "0.8rem",
                    fontFamily: "monospace",
                    color: "var(--text-secondary)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    maxWidth: "120px",
                    display: "inline-block",
                  }}
                >
                  {song.spotifyId}
                </span>
                <a
                  href={`https://open.spotify.com/track/${song.spotifyId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "var(--text-secondary)" }}
                  title="View on Spotify"
                >
                  <ExternalLink size={12} />
                </a>
              </>
            )}
          </div>
        )}

        {/* Unmapped state search form */}
        {isUnmapped && (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <div style={{ display: "flex", gap: "6px" }}>
              <input
                type="text"
                placeholder="Search query..."
                value={searchQuery}
                onChange={(e) => onSearchQueryChange(songKey, e.target.value)}
                className="form-input"
                style={{ padding: "6px 10px", fontSize: "0.8rem" }}
                id={`search-input-${songKey}`}
              />
              <button
                onClick={() => onSearchSong(chartId, song)}
                className="btn btn-secondary"
                style={{ padding: "6px 12px", fontSize: "0.8rem", borderRadius: "var(--radius-md)" }}
                disabled={isSearching}
                id={`search-btn-${songKey}`}
              >
                {isSearching ? <Loader2 size={12} className="spin" /> : <Search size={12} />}
              </button>
            </div>

            {/* Manual Paste ID */}
            <div style={{ display: "flex", gap: "6px" }}>
              <input
                type="text"
                placeholder="Paste Spotify URL or track ID..."
                value={manualLink}
                onChange={(e) => onManualLinkChange(songKey, e.target.value)}
                className="form-input"
                style={{ padding: "6px 10px", fontSize: "0.8rem" }}
                id={`manual-input-${songKey}`}
              />
              <button
                onClick={() => onManualMap(chartId, song)}
                className="btn btn-secondary"
                style={{
                  padding: "6px 12px",
                  fontSize: "0.8rem",
                  borderRadius: "var(--radius-md)",
                  color: "var(--spotify-green)",
                }}
                title="Map Link"
                id={`manual-btn-${songKey}`}
              >
                <Save size={12} />
              </button>
            </div>

            {/* Spotify Search Results list dropdown */}
            {searchResults.length > 0 && (
              <div
                style={{
                  background: "var(--bg-surface)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-md)",
                  padding: "6px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "6px",
                  marginTop: "4px",
                }}
                id={`search-results-${songKey}`}
              >
                <div
                  style={{
                    fontSize: "0.75rem",
                    color: "var(--text-secondary)",
                    fontWeight: 600,
                    borderBottom: "1px solid var(--border)",
                    paddingBottom: "4px",
                    display: "flex",
                    justifyContent: "space-between",
                  }}
                >
                  <span>Matches on Spotify:</span>
                  <button
                    onClick={() => onClearSearchResults(songKey)}
                    style={{ background: "transparent", border: "none", color: "var(--text-secondary)", cursor: "pointer" }}
                  >
                    <X size={10} />
                  </button>
                </div>
                {searchResults.map((result) => (
                  <div
                    key={result.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      padding: "4px",
                      borderRadius: "var(--radius-sm)",
                      background: "var(--bg-card)",
                    }}
                  >
                    {result.image ? (
                      <Image
                        src={result.image}
                        alt={result.title}
                        width={32}
                        height={32}
                        unoptimized
                        style={{ borderRadius: 2 }}
                      />
                    ) : (
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          background: "#222",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Music size={12} />
                      </div>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: "0.8rem",
                          fontWeight: 600,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {result.title}
                      </div>
                      <div
                        style={{
                          fontSize: "0.7rem",
                          color: "var(--text-secondary)",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {result.artists.join(", ")}
                      </div>
                    </div>
                    <button
                      onClick={() => onMapSong(chartId, song, result.id)}
                      className="btn btn-primary"
                      style={{ padding: "4px 8px", fontSize: "0.7rem", borderRadius: "4px" }}
                      id={`select-${result.id}`}
                    >
                      <Plus size={10} /> Select
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </td>
      <td style={{ padding: "16px 12px" }}>
        {isUnmapped ? (
          <button
            onClick={() => onSkipSong(chartId, song)}
            className="btn btn-secondary"
            style={{ padding: "6px 12px", fontSize: "0.8rem", width: "100%" }}
            id={`skip-${songKey}`}
          >
            Skip Song
          </button>
        ) : (
          <button
            onClick={() => onResetMapping(chartId, song)}
            className="btn btn-secondary"
            style={{ padding: "6px 12px", fontSize: "0.8rem", width: "100%", border: "1px dashed var(--border)" }}
            id={`change-${songKey}`}
          >
            Change
          </button>
        )}
      </td>
    </tr>
  );
}
