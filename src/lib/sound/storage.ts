const SOUND_STORAGE_KEY = "mygerai_order_sound_v1";

/** Default aktif (mirip GoFood/GrabFood) — Pedagang bisa matikan lewat ikon header. */
export function loadSoundPref(): boolean {
  try {
    const raw = window.localStorage.getItem(SOUND_STORAGE_KEY);
    if (raw === null) return true;
    return JSON.parse(raw) === true;
  } catch {
    return true;
  }
}

export function saveSoundPref(enabled: boolean): void {
  try {
    window.localStorage.setItem(SOUND_STORAGE_KEY, JSON.stringify(enabled));
  } catch {
    // localStorage bisa gagal (private browsing, kuota penuh) — abaikan,
    // preferensi cuma tidak tersimpan lintas-sesi, fitur tetap jalan.
  }
}
