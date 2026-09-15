"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { loadSoundPref, saveSoundPref } from "./storage";

type SoundContextValue = {
  enabled: boolean;
  toggle: () => void;
  /** Mainkan chime notifikasi Pesanan baru — no-op kalau `enabled` false atau audio belum "dibuka" oleh gesture User. */
  playOrderChime: () => void;
};

const SoundContext = createContext<SoundContextValue | null>(null);

export function useSound(): SoundContextValue {
  const ctx = useContext(SoundContext);
  if (!ctx) throw new Error("useSound() harus dipakai di dalam <SoundProvider>.");
  return ctx;
}

const CHIME_SRC = "/sounds/order-chime.wav";

/**
 * Notifikasi suara Pesanan masuk (mirip GoFood/GrabFood) untuk dashboard
 * Pedagang. Chime = file audio statis (`public/sounds/order-chime.wav`,
 * digenerate lokal — bukan diambil dari layanan pihak ketiga), diputar
 * lewat elemen `<audio>` bawaan browser.
 *
 * Browser mengunci pemutaran audio sampai ada gesture User (klik/tap/
 * keydown) di halaman — didengarkan sekali secara global lalu ditandai
 * "terbuka" di sini, supaya notifikasi Pesanan pertama tidak diam-diam
 * gagal bunyi.
 */
export function SoundProvider({ children }: { children: ReactNode }) {
  const [enabled, setEnabled] = useState(true);
  const [hydrated, setHydrated] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const unlockedRef = useRef(false);

  // Baca localStorage setelah mount (bukan di initializer) supaya tidak
  // memicu hydration mismatch di Next.js App Router — pola sama CartProvider.
  useEffect(() => {
    setEnabled(loadSoundPref());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    saveSoundPref(enabled);
  }, [enabled, hydrated]);

  useEffect(() => {
    const audio = new Audio(CHIME_SRC);
    audio.preload = "auto";
    audioRef.current = audio;
  }, []);

  useEffect(() => {
    function unlock() {
      unlockedRef.current = true;
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    }
    window.addEventListener("pointerdown", unlock);
    window.addEventListener("keydown", unlock);
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  const playOrderChime = useCallback(() => {
    if (!enabled || !unlockedRef.current || !audioRef.current) return;
    try {
      audioRef.current.currentTime = 0;
      void audioRef.current.play().catch(() => {});
    } catch {
      // Pemutaran gagal (browser tidak dukung, dsb) — abaikan, Pesanan tetap masuk normal.
    }
  }, [enabled]);

  const value = useMemo<SoundContextValue>(
    () => ({ enabled, toggle: () => setEnabled((v) => !v), playOrderChime }),
    [enabled, playOrderChime],
  );

  return (
    <SoundContext.Provider value={value}>{children}</SoundContext.Provider>
  );
}
