"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { CheckCircle, XCircle, AlertTriangle, Info, X, ExternalLink, Loader2 } from "lucide-react";
import { getSolscanUrl } from "@/lib/explorer";
import { parseError, CogniStreamErrorCode, getErrorMessage } from "@/lib/errors";

// ─── Types ──────────────────────────────────────────────────────────────────────

export type ToastType = "success" | "error" | "warning" | "info" | "loading";

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  signature?: string;
  duration?: number;
  persistent?: boolean;
}

interface ToastContextType {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, "id">) => string;
  removeToast: (id: string) => void;
  updateToast: (id: string, updates: Partial<Toast>) => void;
  // Convenience methods
  success: (title: string, message?: string, signature?: string) => string;
  error: (title: string, message?: string) => string;
  txError: (error: unknown, context?: string) => string;
  warning: (title: string, message?: string) => string;
  info: (title: string, message?: string) => string;
  loading: (title: string, message?: string) => string;
}

// ─── Context ────────────────────────────────────────────────────────────────────

const ToastContext = createContext<ToastContextType | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

// ─── Provider ───────────────────────────────────────────────────────────────────

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((toast: Omit<Toast, "id">) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const newToast: Toast = { ...toast, id };
    
    setToasts((prev) => [...prev, newToast]);

    // Auto-remove after duration (unless persistent or loading)
    if (!toast.persistent && toast.type !== "loading") {
      const duration = toast.duration || (toast.type === "error" ? 8000 : 5000);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration);
    }

    return id;
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const updateToast = useCallback((id: string, updates: Partial<Toast>) => {
    setToasts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...updates } : t))
    );

    // If updating to non-loading type, set auto-remove
    if (updates.type && updates.type !== "loading" && !updates.persistent) {
      const duration = updates.duration || (updates.type === "error" ? 8000 : 5000);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration);
    }
  }, []);

  // Convenience methods
  const success = useCallback(
    (title: string, message?: string, signature?: string) =>
      addToast({ type: "success", title, message, signature }),
    [addToast]
  );

  const error = useCallback(
    (title: string, message?: string) =>
      addToast({ type: "error", title, message }),
    [addToast]
  );

  const txError = useCallback(
    (err: unknown, context?: string) => {
      const parsed = parseError(err);
      const title = context ? `${context} Failed` : "Transaction Failed";
      let message = parsed.message;
      
      // If it's a known CogniStream error, get user-friendly message
      if (parsed.code !== undefined && parsed.code !== null) {
        const friendlyMsg = getErrorMessage(parsed.code as CogniStreamErrorCode);
        if (friendlyMsg) {
          message = friendlyMsg;
        }
      }

      return addToast({ type: "error", title, message });
    },
    [addToast]
  );

  const warning = useCallback(
    (title: string, message?: string) =>
      addToast({ type: "warning", title, message }),
    [addToast]
  );

  const info = useCallback(
    (title: string, message?: string) =>
      addToast({ type: "info", title, message }),
    [addToast]
  );

  const loading = useCallback(
    (title: string, message?: string) =>
      addToast({ type: "loading", title, message, persistent: true }),
    [addToast]
  );

  return (
    <ToastContext.Provider
      value={{
        toasts,
        addToast,
        removeToast,
        updateToast,
        success,
        error,
        txError,
        warning,
        info,
        loading,
      }}
    >
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
}

// ─── Toast Container ────────────────────────────────────────────────────────────

function ToastContainer({
  toasts,
  onRemove,
}: {
  toasts: Toast[];
  onRemove: (id: string) => void;
}) {
  return (
    <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-3 pointer-events-none">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={onRemove} />
      ))}
    </div>
  );
}

// ─── Toast Item ─────────────────────────────────────────────────────────────────

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: (id: string) => void }) {
  const [isExiting, setIsExiting] = useState(false);

  const handleRemove = () => {
    setIsExiting(true);
    setTimeout(() => onRemove(toast.id), 200);
  };

  const config = {
    success: {
      icon: <CheckCircle className="w-5 h-5" />,
      bg: "bg-surgical/10",
      border: "border-surgical",
      text: "text-surgical",
      iconBg: "bg-surgical",
    },
    error: {
      icon: <XCircle className="w-5 h-5" />,
      bg: "bg-iodine/10",
      border: "border-iodine",
      text: "text-iodine",
      iconBg: "bg-iodine",
    },
    warning: {
      icon: <AlertTriangle className="w-5 h-5" />,
      bg: "bg-iodine/5",
      border: "border-iodine/50",
      text: "text-iodine",
      iconBg: "bg-iodine/80",
    },
    info: {
      icon: <Info className="w-5 h-5" />,
      bg: "bg-cobalt/10",
      border: "border-cobalt",
      text: "text-cobalt",
      iconBg: "bg-cobalt",
    },
    loading: {
      icon: <Loader2 className="w-5 h-5 animate-spin" />,
      bg: "bg-paper",
      border: "border-charcoal/30",
      text: "text-charcoal",
      iconBg: "bg-charcoal/10",
    },
  };

  const c = config[toast.type];

  return (
    <div
      className={`
        pointer-events-auto
        ${c.bg} ${c.border} border-2
        shadow-brutal
        min-w-[320px] max-w-[420px]
        transform transition-all duration-200
        ${isExiting ? "opacity-0 translate-x-4" : "opacity-100 translate-x-0"}
      `}
    >
      <div className="flex items-start gap-3 p-3">
        <div className={`${c.iconBg} p-1.5 text-white shrink-0`}>
          {c.icon}
        </div>

        <div className="flex-1 min-w-0">
          <p className={`font-heading font-bold text-sm ${c.text}`}>{toast.title}</p>
          {toast.message && (
            <p className="font-mono text-[11px] text-charcoal/70 mt-1 break-words">
              {toast.message}
            </p>
          )}
          {toast.signature && (
            <a
              href={getSolscanUrl("tx", toast.signature)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-mono text-[10px] text-cobalt hover:underline mt-2"
            >
              View on Solscan <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>

        {toast.type !== "loading" && (
          <button
            onClick={handleRemove}
            className="p-1 hover:bg-charcoal/10 rounded transition-colors shrink-0"
          >
            <X className="w-4 h-4 text-charcoal/50" />
          </button>
        )}
      </div>
    </div>
  );
}

export default ToastProvider;
