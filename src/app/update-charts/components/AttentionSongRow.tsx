"use client";

import { Search, Save, X, Plus, Music } from "lucide-react";
import CircularProgress from "@mui/material/CircularProgress";
import Image from "next/image";
import { RequestSong, SpotifySearchResult } from "../types";

interface AttentionSongRowProps {
  song: RequestSong;
  appearsInCharts: { id: string; name: string }[];
  stateKey: string;
  representativeChartId: string;
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
  onClearSearchResults: (songKey: string) => void;
}

export function AttentionSongRow({
  song,
  appearsInCharts,
  stateKey,
  representativeChartId,
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
  onClearSearchResults,
}: AttentionSongRowProps) {
  return (
    <tr style={{ verticalAlign: "top" }}>
      <td style={{ padding: "16px 12px" }}>
        <div>
          <div style={{ fontWeight: 600, fontSize: "0.95rem" }}>{song.title}</div>
          <div style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginTop: "2px" }}>
            {song.artist}
          </div>
        </div>
      </td>
      <td style={{ padding: "16px 12px" }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
          {appearsInCharts.map((c) => (
            <span
              key={c.id}
              className="badge"
              style={{
                background: "rgba(255, 255, 255, 0.05)",
                color: "var(--text-secondary)",
                border: "1px solid var(--border)",
                fontSize: "0.75rem",
              }}
            >
              {c.name}
            </span>
          ))}
        </div>
      </td>
      <td style={{ padding: "12px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {/* Spotify Search Input */}
          <div style={{ display: "flex", gap: "6px" }}>
            <input
              type="text"
              placeholder="Search query..."
              value={searchQuery}
              onChange={(e) => onSearchQueryChange(stateKey, e.target.value)}
              className="form-input"
              style={{ padding: "6px 10px", fontSize: "0.8rem" }}
              id={`attention-search-input-${stateKey}`}
            />
            <button
              onClick={() => onSearchSong(representativeChartId, song)}
              className="btn btn-secondary"
              style={{ padding: "6px 12px", fontSize: "0.8rem", borderRadius: "var(--radius-md)" }}
              disabled={isSearching}
              id={`attention-search-btn-${stateKey}`}
            >
              {isSearching ? <CircularProgress size={12} color="inherit" /> : <Search size={12} />}
            </button>
          </div>

          {/* Manual Link Input */}
          <div style={{ display: "flex", gap: "6px" }}>
            <input
              type="text"
              placeholder="Paste Spotify URL or track ID..."
              value={manualLink}
              onChange={(e) => onManualLinkChange(stateKey, e.target.value)}
              className="form-input"
              style={{ padding: "6px 10px", fontSize: "0.8rem" }}
              id={`attention-manual-input-${stateKey}`}
            />
            <button
              onClick={() => onManualMap(representativeChartId, song)}
              className="btn btn-secondary"
              style={{
                padding: "6px 12px",
                fontSize: "0.8rem",
                borderRadius: "var(--radius-md)",
                color: "var(--spotify-green)",
              }}
              title="Map Link"
              id={`attention-manual-btn-${stateKey}`}
            >
              <Save size={12} />
            </button>
          </div>

          {/* Spotify Search Results */}
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
              id={`attention-search-results-${stateKey}`}
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
                  onClick={() => onClearSearchResults(stateKey)}
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
                    onClick={() => onMapSong(representativeChartId, song, result.id)}
                    className="btn btn-primary"
                    style={{ padding: "4px 8px", fontSize: "0.7rem", borderRadius: "4px" }}
                    id={`attention-select-${result.id}`}
                  >
                    <Plus size={10} /> Select
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </td>
      <td style={{ padding: "16px 12px" }}>
        <button
          onClick={() => onSkipSong(representativeChartId, song)}
          className="btn btn-secondary"
          style={{ padding: "6px 12px", fontSize: "0.8rem", width: "100%" }}
          id={`attention-skip-${stateKey}`}
        >
          Skip Song
        </button>
      </td>
    </tr>
  );
}
