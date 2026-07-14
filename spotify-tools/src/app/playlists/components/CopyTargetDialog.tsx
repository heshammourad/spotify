"use client";

import Dialog from "@mui/material/Dialog";
import Image from "next/image";
import { Search, X, Loader2, Music } from "lucide-react";
import { SpotifyPlaylist } from "../types";

interface CopyTargetDialogProps {
  isOpen: boolean;
  selectedPlaylist: SpotifyPlaylist | null;
  onClose: () => void;
  copying: boolean;
  targetSearchQuery: string;
  onTargetSearchQueryChange: (q: string) => void;
  writeablePlaylists: SpotifyPlaylist[];
  onCopyTracks: (target: SpotifyPlaylist) => Promise<void>;
}

export function CopyTargetDialog({
  isOpen,
  selectedPlaylist,
  onClose,
  copying,
  targetSearchQuery,
  onTargetSearchQueryChange,
  writeablePlaylists,
  onCopyTracks,
}: CopyTargetDialogProps) {
  return (
    <Dialog
      open={isOpen && selectedPlaylist !== null}
      onClose={onClose}
      slotProps={{
        backdrop: {
          style: {
            background: "rgba(0, 0, 0, 0.85)",
            backdropFilter: "blur(6px)",
          },
        },
        paper: {
          className: "glass-panel animated-fade-in",
          style: {
            width: "100%",
            maxWidth: "500px",
            maxHeight: "80vh",
            display: "flex",
            flexDirection: "column",
            padding: 0,
            overflow: "hidden",
            background: "rgba(18, 18, 18, 0.8)",
            border: "1px solid var(--border)",
            color: "var(--text-primary)",
          },
        },
      }}
      id="copy-target-modal"
    >
      <div
        style={{
          padding: "20px 24px",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <h3 style={{ fontSize: "1.2rem", fontWeight: 700, margin: 0 }}>
          Copy songs from &quot;{selectedPlaylist?.name}&quot;
        </h3>
        <button
          onClick={onClose}
          style={{
            background: "transparent",
            border: "none",
            cursor: "pointer",
            color: "var(--text-secondary)",
            display: "flex",
            alignItems: "center",
          }}
        >
          <X size={20} />
        </button>
      </div>

      <div
        style={{
          padding: "20px 24px",
          display: "flex",
          flexDirection: "column",
          gap: "16px",
          flex: 1,
          overflowY: "hidden",
        }}
      >
        <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", margin: 0 }}>
          Select a target playlist to copy these songs into. We&apos;ll automatically filter out duplicates.
        </p>

        {/* Search target lists */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            padding: "10px 14px",
            background: "var(--bg-input)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-md)",
          }}
        >
          <Search size={16} style={{ color: "var(--text-secondary)" }} />
          <input
            type="text"
            placeholder="Search target playlists..."
            value={targetSearchQuery}
            onChange={(e) => onTargetSearchQueryChange(e.target.value)}
            style={{
              border: "none",
              background: "transparent",
              width: "100%",
              color: "#fff",
              outline: "none",
              fontSize: "0.85rem",
            }}
            id="copy-target-search"
          />
        </div>

        {/* Targets List */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: "8px",
            paddingRight: "4px",
          }}
          id="copy-target-list"
        >
          {copying ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "40px 0", gap: "12px" }}>
              <Loader2 size={32} className="spin" style={{ color: "var(--spotify-green)" }} />
              <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", margin: 0 }}>Copying songs...</p>
            </div>
          ) : (
            <>
              {writeablePlaylists.length === 0 ? (
                <div style={{ textAlign: "center", padding: "30px 0", color: "var(--text-secondary)", fontSize: "0.85rem" }}>
                  No writeable playlists found. (You can only copy to playlists you own or collaborate on).
                </div>
              ) : (
                writeablePlaylists.map((target) => (
                  <button
                    key={target.id}
                    onClick={() => onCopyTracks(target)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      padding: "10px",
                      background: "var(--bg-surface)",
                      border: "1px solid var(--border)",
                      borderRadius: "var(--radius-md)",
                      cursor: "pointer",
                      textAlign: "left",
                      width: "100%",
                      transition: "var(--transition)",
                      color: "var(--text-primary)",
                    }}
                    className="copy-target-item"
                    id={`copy-to-${target.id}`}
                  >
                    <div
                      style={{
                        width: "40px",
                        height: "40px",
                        borderRadius: "4px",
                        overflow: "hidden",
                        background: "#222",
                        flexShrink: 0,
                      }}
                    >
                      {target.images && target.images.length > 0 ? (
                        <Image
                          src={target.images[0].url}
                          alt={target.name}
                          width={40}
                          height={40}
                          unoptimized
                          style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        />
                      ) : (
                        <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <Music size={16} style={{ color: "var(--text-muted)" }} />
                        </div>
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: "0.9rem",
                          fontWeight: 600,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {target.name}
                      </div>
                      <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                        {target.tracks.total} tracks &bull; By {target.owner.display_name || "You"}
                      </div>
                    </div>
                  </button>
                ))
              )}
            </>
          )}
        </div>
      </div>

      <div
        style={{
          padding: "16px 24px",
          borderTop: "1px solid var(--border)",
          display: "flex",
          justifyContent: "flex-end",
          background: "var(--bg-surface)",
        }}
      >
        <button className="btn btn-secondary" onClick={onClose} disabled={copying}>
          Cancel
        </button>
      </div>
    </Dialog>
  );
}
