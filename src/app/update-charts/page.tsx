"use client";

import { useState, useMemo } from "react";
import { useFetchData } from "@/hooks/useFetchData";
import { AlertTriangle } from "lucide-react";
import CircularProgress from "@mui/material/CircularProgress";
import { RequestChart, RequestSong, SpotifySearchResult } from "./types";
import { ToastNotification, ToastState } from "@/components/ToastNotification";
import { ChartAccordionItem } from "./components/ChartAccordionItem";
import { SyncActionPanel } from "./components/SyncActionPanel";
import { AttentionSongRow } from "./components/AttentionSongRow";
import { CustomConfirmationDialog } from "@/app/playlists/components/CustomConfirmationDialog";

export default function UpdateChartsPage() {
  const [charts, setCharts] = useState<RequestChart[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Accordion expanded states
  const [expandedCharts, setExpandedCharts] = useState<Record<string, boolean>>({});

  // Search Spotify states
  const [searchQueries, setSearchQueries] = useState<Record<string, string>>({});
  const [searchResults, setSearchResults] = useState<Record<string, SpotifySearchResult[]>>({});
  const [searching, setSearching] = useState<Record<string, boolean>>({});
  const [manualLinks, setManualLinks] = useState<Record<string, string>>({});

  // Spotify USA Number One state
  const [spotifyNumberOne, setSpotifyNumberOne] = useState("");

  // Execution states
  const [updatingPlaylists, setUpdatingPlaylists] = useState(false);
  const [updateLogs, setUpdateLogs] = useState<string[]>([]);
  const [updateCompleted, setUpdateCompleted] = useState(false);

  // Custom Dialog Modal state
  const [dialog, setDialog] = useState<{
    isOpen: boolean;
    type: "confirm" | "success" | "info" | "error";
    title: string;
    message: string;
    onConfirm?: () => void;
  }>({
    isOpen: false,
    type: "info",
    title: "",
    message: "",
  });

  // Toast notification state
  const [toast, setToast] = useState<ToastState>({
    type: "info",
    message: "",
    visible: false,
  });

  const showNotification = (type: ToastState["type"], message: string) => {
    setToast({ type, message, visible: true });
    setTimeout(() => {
      setToast((prev) => ({ ...prev, visible: false }));
    }, 4500);
  };

  // Fetch charts & mapping status
  const fetchCharts = async (showToast = false) => {
    try {
      setLoading(true);
      setError(null);
      setUpdateCompleted(false);
      setUpdateLogs([]);

      const res = await fetch("/spotify-tools/api/charts");
      if (!res.ok) {
        throw new Error(`Failed to load charts data: ${res.statusText}`);
      }
      const data = await res.json();

      setCharts(data.charts || []);

      // Initialize expanded state (collapsed by default)
      const initialExpanded: Record<string, boolean> = {};
      const newSearchQueries = { ...searchQueries };
      data.charts?.forEach((c: RequestChart) => {
        initialExpanded[c.id] = false;

        // Pre-fill search inputs for each song
        c.songs.forEach((song) => {
          const songKey = `${c.id}-${song.rank}`;
          newSearchQueries[songKey] = `${song.title} ${song.artist}`;
        });
      });
      setExpandedCharts(initialExpanded);
      setSearchQueries(newSearchQueries);

      if (showToast) {
        showNotification("success", "Billboard charts refetched and database sync checked.");
      }
    } catch (err) {
      console.error(err);
      const message = err instanceof Error ? err.message : "Failed to parse chart scraper response.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useFetchData(fetchCharts, []);

  const toggleChartExpanded = (chartId: string) => {
    setExpandedCharts((prev) => ({ ...prev, [chartId]: !prev[chartId] }));
  };

  // Search Spotify for a song
  const handleSearchSong = async (chartId: string, song: RequestSong) => {
    const songKey = `${chartId}-${song.rank}`;
    const query = searchQueries[songKey] || `${song.title} ${song.artist}`;

    setSearching((prev) => ({ ...prev, [songKey]: true }));
    try {
      const res = await fetch(`/spotify-tools/api/charts/search?q=${encodeURIComponent(query)}`);
      if (!res.ok) {
        throw new Error(`Search failed: ${res.statusText}`);
      }
      const data = await res.json();
      setSearchResults((prev) => ({ ...prev, [songKey]: data.results || [] }));

      if (data.results?.length === 0) {
        showNotification("warning", "No matches found on Spotify. Try editing the search query.");
      }
    } catch (err) {
      console.error(err);
      const message = err instanceof Error ? err.message : "Search failed.";
      showNotification("error", message);
    } finally {
      setSearching((prev) => ({ ...prev, [songKey]: false }));
    }
  };

  // Map song (save mapping to DB and update state)
  const handleMapSong = async (chartId: string, song: RequestSong, spotifyId: string) => {
    const songKey = `${chartId}-${song.rank}`;

    try {
      const res = await fetch("/spotify-tools/api/charts/map", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: spotifyId,
          title: song.title,
          artists: song.artist,
        }),
      });

      if (!res.ok) {
        throw new Error(`Mapping failed: ${res.statusText}`);
      }

      // Update state locally for all matching songs across all charts
      setCharts((prevCharts) =>
        prevCharts.map((c) => ({
          ...c,
          songs: c.songs.map((s) => {
            if (
              s.title.toLowerCase().trim() === song.title.toLowerCase().trim() &&
              s.artist.toLowerCase().trim() === song.artist.toLowerCase().trim()
            ) {
              return { ...s, spotifyId, isMapped: true };
            }
            return s;
          }),
        }))
      );

      // Clean search results
      setSearchResults((prev) => {
        const copy = { ...prev };
        delete copy[songKey];
        return copy;
      });

      showNotification("success", `Mapped "${song.title}" to Spotify ID ${spotifyId}`);
    } catch (err) {
      console.error(err);
      const message = err instanceof Error ? err.message : "Failed to map song.";
      showNotification("error", message);
    }
  };

  // Map manually pasted URL
  const handleManualMap = async (chartId: string, song: RequestSong) => {
    const songKey = `${chartId}-${song.rank}`;
    const link = manualLinks[songKey];

    if (!link) {
      showNotification("warning", "Please paste a valid Spotify track link or ID first.");
      return;
    }

    // Extract ID (e.g. from URL https://open.spotify.com/track/4PTG3Z6ehGkBF3IGqjVvxR?si=...)
    const match = link.match(/track\/([a-zA-Z0-9]{22})/);
    const spotifyId = match ? match[1] : link.trim();

    if (spotifyId.length !== 22) {
      showNotification("error", "Invalid Spotify Track ID. Must be 22 characters or a valid share link.");
      return;
    }

    await handleMapSong(chartId, song, spotifyId);
    setManualLinks((prev) => ({ ...prev, [songKey]: "" }));
  };

  // Skip a song (stores empty mapping or sets isMapped to true with null id)
  const handleSkipSong = (chartId: string, song: RequestSong) => {
    setCharts((prevCharts) =>
      prevCharts.map((c) => ({
        ...c,
        songs: c.songs.map((s) => {
          if (
            s.title.toLowerCase().trim() === song.title.toLowerCase().trim() &&
            s.artist.toLowerCase().trim() === song.artist.toLowerCase().trim()
          ) {
            return { ...s, spotifyId: "", isMapped: true }; // Empty string ID means skipped/unavailable
          }
          return s;
        }),
      }))
    );
    showNotification("info", `Skipped track "${song.title}". It will not be added to playlists.`);
  };

  // Reset/Change mapping
  const handleResetMapping = (chartId: string, song: RequestSong) => {
    setCharts((prevCharts) =>
      prevCharts.map((c) => ({
        ...c,
        songs: c.songs.map((s) => {
          if (
            s.title.toLowerCase().trim() === song.title.toLowerCase().trim() &&
            s.artist.toLowerCase().trim() === song.artist.toLowerCase().trim()
          ) {
            return { ...s, spotifyId: null, isMapped: false };
          }
          return s;
        }),
      }))
    );
  };

  // Check if all songs across all charts are resolved
  const unresolvedSongsCount = useMemo(() => {
    let count = 0;
    charts.forEach((c) => {
      c.songs.forEach((s) => {
        if (!s.isMapped) count++;
      });
    });
    return count;
  }, [charts]);

  // Deduplicated tracks needing attention
  const attentionSongs = useMemo(() => {
    const songMap = new Map<
      string,
      {
        song: RequestSong;
        charts: { id: string; name: string }[];
        stateKey: string;
        representativeChartId: string;
      }
    >();

    charts.forEach((chart) => {
      chart.songs.forEach((song) => {
        if (!song.isMapped) {
          const key = `${song.title.toLowerCase().trim()}|${song.artist.toLowerCase().trim()}`;
          if (!songMap.has(key)) {
            const stateKey = `${chart.id}-${song.rank}`;
            songMap.set(key, {
              song,
              charts: [{ id: chart.id, name: chart.name }],
              stateKey,
              representativeChartId: chart.id,
            });
          } else {
            const currentItem = songMap.get(key)!;
            if (!currentItem.charts.some((c) => c.id === chart.id)) {
              currentItem.charts.push({ id: chart.id, name: chart.name });
            }
          }
        }
      });
    });

    return Array.from(songMap.values());
  }, [charts]);

  // Execute playlists update
  const handleExecuteUpdate = async () => {
    if (unresolvedSongsCount > 0) {
      showNotification("error", `Cannot run update. You have ${unresolvedSongsCount} unmapped songs.`);
      return;
    }

    setDialog({
      isOpen: true,
      type: "confirm",
      title: "Sync Playlists",
      message: "Are you sure you want to execute playlist updates? This will clear the Temp playlist and update Spotify playlists.",
      onConfirm: executeUpdate,
    });
  };

  const executeUpdate = async () => {
    setUpdatingPlaylists(true);
    setUpdateLogs(["Triggering playlist update backend execution..."]);
    setUpdateCompleted(false);

    try {
      const chartsPayload = charts.map((c) => ({
        id: c.id,
        date: c.date,
        songs: c.songs.map((s) => ({
          rank: s.rank,
          lw: s.lw,
          title: s.title,
          artist: s.artist,
          spotifyId: s.spotifyId || "", // Send empty if skipped
        })),
      }));

      const res = await fetch("/spotify-tools/api/charts/update-playlists", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          charts: chartsPayload,
          spotifyNumberOne,
        }),
      });

      if (!res.ok) {
        throw new Error(`Execution failed: ${res.statusText}`);
      }

      const data = await res.json();
      setUpdateLogs(data.log || ["Execution completed with no logs returned."]);
      setUpdateCompleted(true);
      showNotification("success", "Spotify playlists updated successfully!");
    } catch (err) {
      console.error(err);
      const message = err instanceof Error ? err.message : String(err);
      setUpdateLogs((prev) => [...prev, `[ERROR] Execution failed: ${message}`]);
      showNotification("error", message || "Failed to update playlists.");
    } finally {
      setUpdatingPlaylists(false);
    }
  };

  return (
    <div
      className="animated-fade-in"
      style={{ display: "flex", flexDirection: "column", gap: "24px" }}
      id="charts-page"
    >
      {/* Toast Notification */}
      <ToastNotification toast={toast} />

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <h1 style={{ fontSize: "2.25rem", fontWeight: 800 }}>Weekly Charts Sync</h1>
          <p style={{ color: "var(--text-secondary)", marginTop: "4px" }}>
            Refetch Billboard weekly charts, match mappings from the database, and sync to Spotify.
          </p>
        </div>
        <button
          className="btn btn-secondary"
          onClick={() => fetchCharts(true)}
          disabled={loading || updatingPlaylists}
          id="refetch-charts-btn"
        >
          {loading ? <CircularProgress size={16} color="inherit" /> : "Refetch Charts"}
        </button>
      </div>

      {/* Loading state */}
      {loading && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "100px 0", gap: "16px" }}>
          <CircularProgress size={48} style={{ color: "var(--spotify-green)" }} />
          <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem" }}>
            Scraping Billboard charts &amp; loading database mappings...
          </p>
        </div>
      )}

      {/* Error state */}
      {error && !loading && (
        <div className="glass-panel" style={{ padding: "32px", textAlign: "center", border: "1px solid var(--danger)" }}>
          <AlertTriangle size={48} style={{ color: "var(--danger)", margin: "0 auto 16px auto" }} />
          <h3 style={{ fontSize: "1.25rem", marginBottom: "8px" }}>Failed to scrape charts</h3>
          <p style={{ color: "var(--text-secondary)", marginBottom: "20px" }}>{error}</p>
          <button className="btn btn-primary" onClick={() => fetchCharts()}>
            Try Again
          </button>
        </div>
      )}

      {/* Tracks Needing Attention Panel */}
      {!loading && !error && attentionSongs.length > 0 && (
        <div
          className="glass-panel"
          style={{ display: "flex", flexDirection: "column", gap: "16px", border: "1px solid rgba(233, 20, 41, 0.2)" }}
          id="attention-panel"
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span className="badge badge-danger" style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <AlertTriangle size={12} /> Attention Required
            </span>
            <h2 style={{ fontSize: "1.25rem", fontWeight: 700 }}>Unmapped Songs ({attentionSongs.length})</h2>
          </div>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
            The following new songs are in your active charts but are not yet mapped to Spotify. Resolving them here will map them across all charts they appear in.
          </p>
          <div className="table-container" style={{ maxHeight: "400px", overflowY: "auto" }}>
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Song</th>
                  <th>Appears In</th>
                  <th style={{ width: "280px" }}>Spotify Mapping</th>
                  <th style={{ width: "125px" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {attentionSongs.map(({ song, charts: songCharts, stateKey, representativeChartId }) => (
                  <AttentionSongRow
                    key={stateKey}
                    song={song}
                    appearsInCharts={songCharts}
                    stateKey={stateKey}
                    representativeChartId={representativeChartId}
                    searchQuery={searchQueries[stateKey] || ""}
                    searchResults={searchResults[stateKey] || []}
                    isSearching={searching[stateKey] || false}
                    manualLink={manualLinks[stateKey] || ""}
                    onSearchQueryChange={(key, q) => setSearchQueries((prev) => ({ ...prev, [key]: q }))}
                    onManualLinkChange={(key, link) => setManualLinks((prev) => ({ ...prev, [key]: link }))}
                    onSearchSong={handleSearchSong}
                    onMapSong={handleMapSong}
                    onManualMap={handleManualMap}
                    onSkipSong={handleSkipSong}
                    onClearSearchResults={(key) =>
                      setSearchResults((prev) => {
                        const copy = { ...prev };
                        delete copy[key];
                        return copy;
                      })
                    }
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Charts List Accordion */}
      {!loading && !error && (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }} id="charts-accordion-list">
          {charts.map((chart) => (
            <ChartAccordionItem
              key={chart.id}
              chart={chart}
              isExpanded={!!expandedCharts[chart.id]}
              onToggleExpanded={() => toggleChartExpanded(chart.id)}
              searchQueries={searchQueries}
              searchResults={searchResults}
              searching={searching}
              manualLinks={manualLinks}
              onSearchQueryChange={(songKey, q) => setSearchQueries((prev) => ({ ...prev, [songKey]: q }))}
              onManualLinkChange={(songKey, link) => setManualLinks((prev) => ({ ...prev, [songKey]: link }))}
              onSearchSong={handleSearchSong}
              onMapSong={handleMapSong}
              onManualMap={handleManualMap}
              onSkipSong={handleSkipSong}
              onResetMapping={handleResetMapping}
              onClearSearchResults={(songKey) =>
                setSearchResults((prev) => {
                  const copy = { ...prev };
                  delete copy[songKey];
                  return copy;
                })
              }
            />
          ))}
        </div>
      )}

      {/* Action panel & USA number one input */}
      {!loading && !error && (
        <SyncActionPanel
          spotifyNumberOne={spotifyNumberOne}
          onSpotifyNumberOneChange={setSpotifyNumberOne}
          unresolvedSongsCount={unresolvedSongsCount}
          updatingPlaylists={updatingPlaylists}
          updateLogs={updateLogs}
          updateCompleted={updateCompleted}
          onExecuteUpdate={handleExecuteUpdate}
        />
      )}

      {/* Custom Confirmation / Alert Dialog Modal */}
      <CustomConfirmationDialog
        dialog={dialog}
        onClose={() => setDialog((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
