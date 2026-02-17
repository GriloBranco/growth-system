"use client";

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";

type ToastType = "success" | "error" | "info";

interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue>({ toast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

let nextId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((message: string, type: ToastType = "success") => {
    const id = nextId++;
    setToasts((prev) => [...prev, { id, message, type }]);
  }, []);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

const TOAST_STYLES: Record<ToastType, string> = {
  success: "bg-emerald-600 text-white",
  error: "bg-red-600 text-white",
  info: "bg-zinc-700 text-white",
};

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: number) => void }) {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(toast.id), 3000);
    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  return (
    <div
      className={`px-4 py-2.5 rounded-lg shadow-lg text-sm font-medium animate-in slide-in-from-right ${TOAST_STYLES[toast.type]}`}
      style={{ animation: "slideIn 0.2s ease-out" }}
    >
      <div className="flex items-center gap-2">
        {toast.type === "success" && <span>&#10003;</span>}
        {toast.type === "error" && <span>&#10007;</span>}
        {toast.type === "info" && <span>&#8505;</span>}
        <span>{toast.message}</span>
        <button onClick={() => onDismiss(toast.id)} className="ml-2 opacity-70 hover:opacity-100">&times;</button>
      </div>
    </div>
  );
}
