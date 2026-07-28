"use client";

import { useState, useMemo, useCallback } from "react";
import { useFetchData } from "@/hooks/useFetchData";
import { SpotifyPlaylist, SpotifyTrack } from "./types";
import { ToastNotification, ToastState } from "@/components/ToastNotification";
import { PlaylistsListView } from "./components/PlaylistsListView";
import { PlaylistDetailView } from "./components/PlaylistDetailView";
import { CopyTargetDialog } from "./components/CopyTargetDialog";
import { CustomConfirmationDialog } from "./components/CustomConfirmationDialog";
import { BASE_PATH } from "@/lib/config";

export default function PlaylistsPage() {
  const [playlists, setPlaylists] = useState<SpotifyPlaylist[]>([]);
  const [userId, setUserId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");

  // Playlist detail modal state
  const [selectedPlaylist, setSelectedPlaylist] = useState<SpotifyPlaylist | null>(null);
  const [tracks, setTracks] = useState<SpotifyTrack[]>([]);
  const [loadingTracks, setLoadingTracks] = useState(false);
  const [tracksError, setTracksError] = useState<string | null>(null);

  // Copy target modal state
  const [isCopyModalOpen, setIsCopyModalOpen] = useState(false);
  const [copying, setCopying] = useState(false);
  const [targetSearchQuery, setTargetSearchQuery] = useState("");
  const [allowDuplicates, setAllowDuplicates] = useState(false);

  // Deduplication state
  const [deduplicating, setDeduplicating] = useState(false);

  // Track reorder state
  const [savingOrder, setSavingOrder] = useState(false);

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

  // Show toast notification helper
  const showNotification = useCallback((type: ToastState["type"], message: string) => {
    setToast({ type, message, visible: true });
    setTimeout(() => {
      setToast((prev) => ({ ...prev, visible: false }));
    }, 4500);
  }, []);

  // Fetch Playlists
  const fetchPlaylists = useCallback(
    async (showToast = false) => {
      await Promise.resolve();
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`${BASE_PATH}/api/playlists`);
        if (!res.ok) {
          throw new Error(`Failed to load playlists: ${res.statusText}`);
        }
        const data = await res.json();
        setPlaylists(data.playlists || []);
        setUserId(data.userId || "");
        if (showToast) {
          showNotification("success", "Playlists list updated.");
        }
      } catch (err) {
        console.error(err);
        setError(err instanceof Error ? err.message : "An error occurred while loading your playlists.");
      } finally {
        setLoading(false);
      }
    },
    [showNotification]
  );

  useFetchData(fetchPlaylists, [fetchPlaylists]);

  // Filtered playlists
  const filteredPlaylists = useMemo(() => {
    return playlists.filter(
      (playlist) =>
        playlist.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (playlist.description && playlist.description.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [playlists, searchQuery]);

  // Open playlist tracks
  const handleOpenPlaylist = async (playlist: SpotifyPlaylist) => {
    setSelectedPlaylist(playlist);
    setLoadingTracks(true);
    setTracksError(null);
    setTracks([]);

    try {
      const res = await fetch(`${BASE_PATH}/api/playlists/${playlist.id}`);
      if (!res.ok) {
        throw new Error(`Failed to fetch playlist tracks: ${res.statusText}`);
      }
      const data = await res.json();
      setTracks(data.tracks || []);
      if (data.playlist) {
        setSelectedPlaylist(data.playlist);
        setPlaylists((prevPlaylists) =>
          prevPlaylists.map((p) => (p.id === data.playlist.id ? data.playlist : p))
        );
      }
    } catch (err) {
      console.error(err);
      setTracksError(err instanceof Error ? err.message : "Failed to load tracks for this playlist.");
    } finally {
      setLoadingTracks(false);
    }
  };

  // Execute the API call to remove duplicates
  const executeRemoveDuplicates = async (playlist: SpotifyPlaylist) => {
    setDeduplicating(true);
    try {
      const res = await fetch(`${BASE_PATH}/api/playlists/${playlist.id}/remove-duplicates`, {
        method: "POST",
      });

      if (!res.ok) {
        throw new Error(`Deduplication request failed: ${res.statusText}`);
      }

      const data = await res.json();

      if (data.removedCount > 0) {
        setDialog({
          isOpen: true,
          type: "success",
          title: "Duplicates Removed",
          message: `${data.removedCount} track(s) removed successfully`,
        });
        showNotification("success", `Removed ${data.removedCount} duplicate track(s) successfully!`);
        // Refresh tracks
        handleOpenPlaylist(playlist);
        // Refresh playlists counts
        fetchPlaylists();
      } else {
        setDialog({
          isOpen: true,
          type: "info",
          title: "No Duplicates Found",
          message: "No duplicate tracks found in this playlist.",
        });
        showNotification("info", "No duplicate tracks found in this playlist.");
      }
    } catch (err) {
      console.error(err);
      setDialog({
        isOpen: true,
        type: "error",
        title: "Deduplication Failed",
        message: err instanceof Error ? err.message : "Failed to remove duplicates.",
      });
      showNotification("error", err instanceof Error ? err.message : "Failed to remove duplicates.");
    } finally {
      setDeduplicating(false);
    }
  };

  // Remove Duplicates
  const handleRemoveDuplicates = () => {
    if (!selectedPlaylist) return;

    setDialog({
      isOpen: true,
      type: "confirm",
      title: "Remove Duplicates",
      message: `Are you sure you want to scan and remove duplicates from "${selectedPlaylist.name}"?`,
      onConfirm: () => executeRemoveDuplicates(selectedPlaylist),
    });
  };

  // Execute Save Order to Spotify
  const executeSaveOrder = async (playlist: SpotifyPlaylist, reorderedTracks: SpotifyTrack[]) => {
    setSavingOrder(true);
    try {
      const res = await fetch(`${BASE_PATH}/api/playlists/${playlist.id}/reorder`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          trackUris: reorderedTracks.map((t) => t.uri),
        }),
      });

      if (!res.ok) {
        throw new Error(`Save track order request failed: ${res.statusText}`);
      }

      const data = await res.json();
      showNotification("success", `Updated track order for "${playlist.name}" on Spotify!`);
      setDialog({
        isOpen: true,
        type: "success",
        title: "Order Saved",
        message: `Successfully saved new track order (${data.reorderedCount || reorderedTracks.length} tracks) to "${playlist.name}" on Spotify.`,
      });
      // Refresh playlist tracks
      handleOpenPlaylist(playlist);
    } catch (err) {
      console.error(err);
      const msg = err instanceof Error ? err.message : "Failed to save track order.";
      setDialog({
        isOpen: true,
        type: "error",
        title: "Save Order Failed",
        message: msg,
      });
      showNotification("error", msg);
    } finally {
      setSavingOrder(false);
    }
  };

  // Save Order Handler
  const handleSaveOrder = (reorderedTracks: SpotifyTrack[]) => {
    if (!selectedPlaylist) return;

    setDialog({
      isOpen: true,
      type: "confirm",
      title: "Save Track Order to Spotify",
      message: `Are you sure you want to apply this new track order to "${selectedPlaylist.name}" on Spotify?`,
      onConfirm: () => executeSaveOrder(selectedPlaylist, reorderedTracks),
    });
  };

  // Open Copy Target Picker
  const handleOpenCopyPicker = () => {
    setIsCopyModalOpen(true);
    setTargetSearchQuery("");
    setAllowDuplicates(false);
  };

  // Execute Copy Tracks
  const handleCopyTracks = async (targetPlaylist: SpotifyPlaylist) => {
    if (!selectedPlaylist) return;

    setCopying(true);
    try {
      const res = await fetch(`${BASE_PATH}/api/playlists/${selectedPlaylist.id}/copy-to`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          targetPlaylistId: targetPlaylist.id,
          allowDuplicates,
        }),
      });

      if (!res.ok) {
        throw new Error(`Copy tracks request failed: ${res.statusText}`);
      }

      const data = await res.json();

      if (data.copiedCount > 0) {
        showNotification("success", `Copied ${data.copiedCount} song(s) to "${targetPlaylist.name}"!`);
        setIsCopyModalOpen(false);
        // Update target playlist count in local state to bypass stale cache
        setPlaylists((prevPlaylists) =>
          prevPlaylists.map((p) =>
            p.id === targetPlaylist.id
              ? { ...p, tracks: { total: p.tracks.total + data.copiedCount } }
              : p
          )
        );
        // Refresh playlists
        fetchPlaylists();
      } else {
        showNotification("info", `All tracks from "${selectedPlaylist.name}" already exist in "${targetPlaylist.name}".`);
        setIsCopyModalOpen(false);
      }
    } catch (err) {
      console.error(err);
      showNotification("error", err instanceof Error ? err.message : "Failed to copy tracks.");
    } finally {
      setCopying(false);
    }
  };

  // Filter writeable playlists for copy target
  const writeablePlaylists = useMemo(() => {
    return playlists.filter((playlist) => {
      // Cannot copy to itself
      if (selectedPlaylist && playlist.id === selectedPlaylist.id) {
        return false;
      }

      const isOwner = playlist.owner.id === userId;
      const isCollaborative = playlist.collaborative;
      const matchesSearch = playlist.name.toLowerCase().includes(targetSearchQuery.toLowerCase());

      return (isOwner || isCollaborative) && matchesSearch;
    });
  }, [playlists, userId, selectedPlaylist, targetSearchQuery]);

  return (
    <div
      className="animated-fade-in"
      style={{ display: "flex", flexDirection: "column", gap: "24px" }}
      id="playlists-page"
    >
      {/* Toast Notification */}
      <ToastNotification toast={toast} />

      {selectedPlaylist ? (
        /* Playlist Detail Page */
        <PlaylistDetailView
          selectedPlaylist={selectedPlaylist}
          onBack={() => setSelectedPlaylist(null)}
          userId={userId}
          tracks={tracks}
          loadingTracks={loadingTracks}
          tracksError={tracksError}
          onOpenCopyPicker={handleOpenCopyPicker}
          onRemoveDuplicates={handleRemoveDuplicates}
          deduplicating={deduplicating}
          onSaveOrder={handleSaveOrder}
          savingOrder={savingOrder}
        />
      ) : (
        /* Playlists Grid List Page */
        <PlaylistsListView
          searchQuery={searchQuery}
          onSearchQueryChange={setSearchQuery}
          loading={loading}
          error={error}
          filteredPlaylists={filteredPlaylists}
          onRefresh={() => fetchPlaylists(true)}
          onSelectPlaylist={handleOpenPlaylist}
        />
      )}

      {/* Copy Target Selection Dialog */}
      <CopyTargetDialog
        isOpen={isCopyModalOpen}
        selectedPlaylist={selectedPlaylist}
        onClose={() => setIsCopyModalOpen(false)}
        copying={copying}
        targetSearchQuery={targetSearchQuery}
        onTargetSearchQueryChange={setTargetSearchQuery}
        writeablePlaylists={writeablePlaylists}
        onCopyTracks={handleCopyTracks}
        allowDuplicates={allowDuplicates}
        onAllowDuplicatesChange={setAllowDuplicates}
      />

      {/* Custom Confirmation / Alert Dialog Modal */}
      <CustomConfirmationDialog
        dialog={dialog}
        onClose={() => setDialog((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
