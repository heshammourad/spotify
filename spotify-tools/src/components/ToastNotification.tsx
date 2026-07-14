"use client";

import { Check, AlertTriangle, Music } from "lucide-react";

export interface ToastState {
  type: "success" | "error" | "info" | "warning";
  message: string;
  visible: boolean;
}

interface ToastNotificationProps {
  toast: ToastState;
}

export function ToastNotification({ toast }: ToastNotificationProps) {
  if (!toast.visible) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: "80px",
        right: "24px",
        zIndex: 1000,
        background:
          toast.type === "success"
            ? "rgba(29, 185, 84, 0.95)"
            : toast.type === "error"
            ? "rgba(233, 20, 41, 0.95)"
            : toast.type === "warning"
            ? "rgba(240, 173, 78, 0.95)"
            : "rgba(23, 23, 33, 0.95)",
        color: toast.type === "success" ? "#000" : "#fff",
        border: toast.type === "success" ? "none" : "1px solid var(--border)",
        padding: "14px 24px",
        borderRadius: "var(--radius-lg)",
        boxShadow: "var(--shadow-lg)",
        display: "flex",
        alignItems: "center",
        gap: "12px",
        backdropFilter: "blur(12px)",
        transition: "all 0.3s ease",
        animation: "fadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
      }}
      id="toast-notification"
    >
      {toast.type === "success" && <Check size={18} />}
      {toast.type === "error" && <AlertTriangle size={18} />}
      {toast.type === "warning" && <AlertTriangle size={18} />}
      {toast.type === "info" && <Music size={18} />}
      <span style={{ fontWeight: 600, fontSize: "0.9rem" }}>{toast.message}</span>
    </div>
  );
}
