"use client";

import Dialog from "@mui/material/Dialog";
import { AlertTriangle, Check, Music, X } from "lucide-react";

interface CustomDialogState {
  isOpen: boolean;
  type: "confirm" | "success" | "info" | "error";
  title: string;
  message: string;
  onConfirm?: () => void;
}

interface CustomConfirmationDialogProps {
  dialog: CustomDialogState;
  onClose: () => void;
}

export function CustomConfirmationDialog({ dialog, onClose }: CustomConfirmationDialogProps) {
  return (
    <Dialog
      open={dialog.isOpen}
      onClose={onClose}
      slotProps={{
        paper: {
          style: {
            backgroundColor: "transparent",
            boxShadow: "none",
            overflow: "visible",
          },
        },
        backdrop: {
          style: {
            backgroundColor: "rgba(0, 0, 0, 0.8)",
            backdropFilter: "blur(8px)",
          },
        },
      }}
    >
      {dialog.isOpen && (
        <div
          className="glass-panel animated-fade-in"
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "20px",
            padding: "24px",
            textAlign: "center",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            boxShadow: "0 20px 40px rgba(0,0,0,0.5)",
            width: "100%",
            maxWidth: "400px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "center" }}>
            {dialog.type === "confirm" && (
              <div style={{ background: "rgba(224, 86, 36, 0.15)", color: "#e05624", borderRadius: "50%", padding: "16px" }}>
                <AlertTriangle size={36} />
              </div>
            )}
            {dialog.type === "success" && (
              <div style={{ background: "rgba(30, 215, 96, 0.15)", color: "var(--spotify-green)", borderRadius: "50%", padding: "16px" }}>
                <Check size={36} />
              </div>
            )}
            {dialog.type === "info" && (
              <div style={{ background: "rgba(33, 150, 243, 0.15)", color: "#2196f3", borderRadius: "50%", padding: "16px" }}>
                <Music size={36} />
              </div>
            )}
            {dialog.type === "error" && (
              <div style={{ background: "rgba(235, 87, 87, 0.15)", color: "#eb5757", borderRadius: "50%", padding: "16px" }}>
                <X size={36} />
              </div>
            )}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <h3 style={{ fontSize: "1.25rem", fontWeight: 700, margin: 0, color: "#fff" }}>
              {dialog.title}
            </h3>
            <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", margin: 0, lineHeight: "1.5" }}>
              {dialog.message}
            </p>
          </div>

          <div style={{ display: "flex", gap: "12px", justifyContent: "center", marginTop: "8px" }}>
            {dialog.type === "confirm" ? (
              <>
                <button
                  className="btn btn-secondary"
                  onClick={onClose}
                  style={{ flex: 1, padding: "10px 16px" }}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-primary"
                  onClick={() => {
                    onClose();
                    if (dialog.onConfirm) dialog.onConfirm();
                  }}
                  style={{
                    flex: 1,
                    padding: "10px 16px",
                    background: "var(--spotify-green)",
                    border: "none",
                    color: "#000",
                    fontWeight: 600,
                  }}
                >
                  Confirm
                </button>
              </>
            ) : (
              <button
                className="btn btn-primary"
                onClick={onClose}
                style={{
                  minWidth: "120px",
                  padding: "10px 16px",
                  background: "var(--spotify-green)",
                  border: "none",
                  color: "#000",
                  fontWeight: 600,
                }}
              >
                OK
              </button>
            )}
          </div>
        </div>
      )}
    </Dialog>
  );
}
