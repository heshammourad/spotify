"use client";

import { Disc, ChevronUp, ChevronDown, AlertTriangle } from "lucide-react";
import { RequestChart, RequestSong, SpotifySearchResult } from "../types";
import { SongMappingRow } from "./SongMappingRow";

interface ChartAccordionItemProps {
  chart: RequestChart;
  isExpanded: boolean;
  onToggleExpanded: () => void;
  searchQueries: Record<string, string>;
  searchResults: Record<string, SpotifySearchResult[]>;
  searching: Record<string, boolean>;
  manualLinks: Record<string, string>;
  onSearchQueryChange: (songKey: string, query: string) => void;
  onManualLinkChange: (songKey: string, link: string) => void;
  onSearchSong: (chartId: string, song: RequestSong) => Promise<void>;
  onMapSong: (chartId: string, song: RequestSong, spotifyId: string) => Promise<void>;
  onManualMap: (chartId: string, song: RequestSong) => Promise<void>;
  onSkipSong: (chartId: string, song: RequestSong) => void;
  onResetMapping: (chartId: string, song: RequestSong) => void;
  onClearSearchResults: (songKey: string) => void;
}

export function ChartAccordionItem({
  chart,
  isExpanded,
  onToggleExpanded,
  searchQueries,
  searchResults,
  searching,
  manualLinks,
  onSearchQueryChange,
  onManualLinkChange,
  onSearchSong,
  onMapSong,
  onManualMap,
  onSkipSong,
  onResetMapping,
  onClearSearchResults,
}: ChartAccordionItemProps) {
  // Format date helper
  const formatDate = (dateStr: string) => {
    if (!dateStr) return "-";
    if (dateStr === "Never updated") return dateStr;

    // Parse "YYYY-MM-DD" in local time to avoid timezone offset shifts
    const parts = dateStr.split("-");
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const date = new Date(year, month, day);
      if (!isNaN(date.getTime())) {
        return date.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
      }
    }

    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  };

  const unmappedCountInChart = chart.songs.filter((s) => !s.isMapped).length;

  return (
    <div
      className="glass-panel"
      style={{
        padding: 0,
        overflow: "hidden",
        border: chart.isUpToDate ? "1px solid var(--border)" : "1px solid rgba(240, 173, 78, 0.2)",
      }}
    >
      {/* Accordion Trigger */}
      <div
        onClick={onToggleExpanded}
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "20px 24px",
          cursor: "pointer",
          background: "var(--bg-surface)",
          transition: "var(--transition)",
        }}
        className="accordion-header"
      >
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: "50%",
              background: "rgba(255, 255, 255, 0.05)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Disc
              size={18}
              style={{ color: chart.isUpToDate ? "var(--spotify-green)" : "rgba(240, 173, 78, 1)" }}
            />
          </div>
          <div>
            <h3 style={{ fontSize: "1.1rem" }}>
              {chart.name} <span style={{ color: "var(--text-muted)", fontWeight: "normal" }}>|</span>{" "}
              {formatDate(chart.date)}
            </h3>
            <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "2px" }}>
              Database Synced Date: <span style={{ color: "#fff" }}>{formatDate(chart.dbDate)}</span>
            </p>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          {chart.isUpToDate ? (
            <span className="badge badge-success">Up to Date</span>
          ) : (
            <span className="badge" style={{ background: "rgba(240, 173, 78, 0.15)", color: "#f0ad4e" }}>
              Pending Sync
            </span>
          )}

          {unmappedCountInChart > 0 && <span className="badge badge-danger">{unmappedCountInChart} unmapped</span>}

          {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </div>
      </div>

      {/* Accordion Content */}
      {isExpanded && (
        <div
          style={{
            padding: "24px",
            borderTop: "1px solid var(--border)",
            display: "flex",
            flexDirection: "column",
            gap: "20px",
          }}
        >
          {chart.error ? (
            <div style={{ color: "var(--danger)", display: "flex", gap: "8px", alignItems: "center" }}>
              <AlertTriangle size={16} />
              <span>{chart.error}</span>
            </div>
          ) : (
            <div className="table-container" style={{ maxHeight: "400px", overflowY: "auto" }}>
              <table className="custom-table">
                <thead>
                  <tr>
                    <th style={{ width: "60px" }}>Rank</th>
                    <th style={{ width: "80px" }}>Prev</th>
                    <th>Song</th>
                    <th style={{ width: "260px" }}>Spotify Mapping</th>
                    <th style={{ width: "120px" }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {chart.songs.map((song) => {
                    const songKey = `${chart.id}-${song.rank}`;
                    return (
                      <SongMappingRow
                        key={songKey}
                        chartId={chart.id}
                        song={song}
                        searchQuery={searchQueries[songKey] || ""}
                        searchResults={searchResults[songKey] || []}
                        isSearching={searching[songKey] || false}
                        manualLink={manualLinks[songKey] || ""}
                        onSearchQueryChange={onSearchQueryChange}
                        onManualLinkChange={onManualLinkChange}
                        onSearchSong={onSearchSong}
                        onMapSong={onMapSong}
                        onManualMap={onManualMap}
                        onSkipSong={onSkipSong}
                        onResetMapping={onResetMapping}
                        onClearSearchResults={onClearSearchResults}
                      />
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
