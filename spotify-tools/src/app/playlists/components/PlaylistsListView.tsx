"use client";

import { Music, Search, X, Loader2, AlertTriangle, Globe, Lock, Users } from "lucide-react";
import Image from "next/image";
import { SpotifyPlaylist } from "../types";

interface PlaylistsListViewProps {
  searchQuery: string;
  onSearchQueryChange: (q: string) => void;
  loading: boolean;
  error: string | null;
  filteredPlaylists: SpotifyPlaylist[];
  onRefresh: () => void;
  onSelectPlaylist: (playlist: SpotifyPlaylist) => void;
}

export function PlaylistsListView({
  searchQuery,
  onSearchQueryChange,
  loading,
  error,
  filteredPlaylists,
  onRefresh,
  onSelectPlaylist,
}: PlaylistsListViewProps) {
  return (
    <>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <h1 style={{ fontSize: "2.25rem", fontWeight: 800 }}>Playlists Manager</h1>
          <p style={{ color: "var(--text-secondary)", marginTop: "4px" }}>
            View your library, remove duplicate tracks, and back up Spotify-curated lists.
          </p>
        </div>
        <button
          className="btn btn-secondary"
          onClick={onRefresh}
          disabled={loading}
          id="refresh-playlists-btn"
        >
          {loading ? <Loader2 size={16} className="spin" /> : "Refresh Playlists"}
        </button>
      </div>

      {/* Search Filter */}
      <div className="glass-panel" style={{ padding: "16px", display: "flex", alignItems: "center", gap: "12px" }}>
        <Search size={20} style={{ color: "var(--text-secondary)" }} />
        <input
          type="text"
          placeholder="Search playlists in your library..."
          value={searchQuery}
          onChange={(e) => onSearchQueryChange(e.target.value)}
          className="form-input"
          style={{ border: "none", background: "transparent", padding: 0 }}
          id="playlists-search-input"
        />
        {searchQuery && (
          <button
            onClick={() => onSearchQueryChange("")}
            style={{ background: "transparent", border: "none", color: "var(--text-secondary)", cursor: "pointer" }}
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Loading State */}
      {loading && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "100px 0", gap: "16px" }}>
          <Loader2 size={48} className="spin" style={{ color: "var(--spotify-green)" }} />
          <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem" }}>Loading your Spotify playlists...</p>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="glass-panel" style={{ padding: "32px", textAlign: "center", border: "1px solid var(--danger)" }}>
          <AlertTriangle size={48} style={{ color: "var(--danger)", margin: "0 auto 16px auto" }} />
          <h3 style={{ fontSize: "1.25rem", marginBottom: "8px" }}>Failed to load playlists</h3>
          <p style={{ color: "var(--text-secondary)", marginBottom: "20px" }}>{error}</p>
          <button className="btn btn-primary" onClick={onRefresh}>
            Try Again
          </button>
        </div>
      )}

      {/* Grid List */}
      {!loading && !error && (
        <>
          {filteredPlaylists.length === 0 ? (
            <div style={{ textAlign: "center", padding: "80px 0", color: "var(--text-secondary)" }}>
              <Music size={48} style={{ opacity: 0.3, marginBottom: "16px" }} />
              <h3>No playlists found</h3>
              <p style={{ fontSize: "0.9rem" }}>Try adjusting your search query.</p>
            </div>
          ) : (
            <div className="grid grid-cols-4" id="playlists-grid">
              {filteredPlaylists.map((playlist) => (
                <div
                  key={playlist.id}
                  className="card"
                  style={{ gap: "12px", cursor: "pointer" }}
                  onClick={() => onSelectPlaylist(playlist)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onSelectPlaylist(playlist);
                    }
                  }}
                >
                  <div
                    style={{
                      position: "relative",
                      width: "100%",
                      paddingBottom: "100%",
                      borderRadius: "var(--radius-md)",
                      overflow: "hidden",
                      background: "#222",
                    }}
                  >
                    {playlist.images && playlist.images.length > 0 ? (
                      <Image
                        src={playlist.images[0].url}
                        alt={playlist.name}
                        fill
                        unoptimized
                        style={{ objectFit: "cover" }}
                      />
                    ) : (
                      <div
                        style={{
                          position: "absolute",
                          top: 0,
                          left: 0,
                          width: "100%",
                          height: "100%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Music size={48} style={{ color: "var(--text-muted)" }} />
                      </div>
                    )}
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "4px", flex: 1 }}>
                    <h3
                      style={{
                        fontSize: "1rem",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        display: "-webkit-box",
                        WebkitLineClamp: 1,
                        WebkitBoxOrient: "vertical",
                      }}
                      title={playlist.name}
                    >
                      {playlist.name}
                    </h3>
                    <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                      By {playlist.owner.display_name || "Spotify"}
                    </p>
                    <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "4px" }}>
                      {playlist.tracks.total} songs
                    </p>
                  </div>

                  <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                    {playlist.public ? (
                      <span className="badge badge-secondary" style={{ fontSize: "0.7rem", gap: "3px", alignItems: "center" }}>
                        <Globe size={10} /> Public
                      </span>
                    ) : (
                      <span className="badge badge-secondary" style={{ fontSize: "0.7rem", gap: "3px", alignItems: "center" }}>
                        <Lock size={10} /> Private
                      </span>
                    )}

                    {playlist.collaborative && (
                      <span className="badge badge-info" style={{ fontSize: "0.7rem", gap: "3px", alignItems: "center" }}>
                        <Users size={10} /> Collaborative
                      </span>
                    )}
                  </div>

                  <div
                    className="btn btn-secondary"
                    style={{ width: "100%", marginTop: "8px", padding: "8px 16px", textAlign: "center" }}
                    id={`open-playlist-${playlist.id}`}
                  >
                    Open Playlist
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </>
  );
}
