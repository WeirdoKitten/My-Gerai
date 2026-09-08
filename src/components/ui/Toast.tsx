"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";
import { cn } from "@/lib/utils/cn";
import { CheckIcon } from "./icons";

type ToastContextValue = { showToast: (message: string) => void };

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx)
    throw new Error("useToast() harus dipakai di dalam <ToastProvider>.");
  return ctx;
}

/** Notifikasi ringan sekali-lewat (mis. "Item ditambahkan"). Satu toast aktif. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<{ id: number; message: string } | null>(
    null,
  );
  const [leaving, setLeaving] = useState(false);
  const timers = useRef<number[]>([]);

  const showToast = useCallback((message: string) => {
    for (const t of timers.current) window.clearTimeout(t);
    timers.current = [];
    setLeaving(false);
    setToast({ id: Date.now(), message });
    timers.current.push(
      window.setTimeout(() => setLeaving(true), 1900),
      window.setTimeout(() => setToast(null), 2150),
    );
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toast ? (
        <div
          key={toast.id}
          className="pointer-events-none fixed inset-x-0 top-4 z-50 flex justify-center px-4"
        >
          <div
            className={cn(
              "flex items-center gap-2 rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white shadow-card",
              leaving
                ? "motion-safe:animate-[toast-out_240ms_ease-in_forwards]"
                : "motion-safe:animate-[toast-in_220ms_ease-out]",
            )}
          >
            <CheckIcon className="size-4 text-success" />
            {toast.message}
          </div>
        </div>
      ) : null}
    </ToastContext.Provider>
  );
}
