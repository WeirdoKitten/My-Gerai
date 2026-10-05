/**
 * Cache in-memory sederhana dengan TTL, per proses Node. Aman karena
 * deployment saat ini single-instance (asumsi sama dengan rate-limiter, lihat
 * docs/ARSITEKTUR-SISTEM.md); kalau nanti multi-instance, tiap instance punya
 * cache sendiri dan invalidasi hanya berlaku di instance yang memicunya — TTL
 * yang pendek membatasi seberapa lama data bisa basi.
 *
 * Yang disimpan adalah Promise, jadi banyak request bersamaan untuk key yang
 * sama hanya memicu satu kali `load` (mencegah "thundering herd"). Load yang
 * gagal tidak disimpan. Lihat docs/STRESS-TEST.md untuk alasan & ukurannya.
 */
/**
 * TTL untuk cache DATA (yang bisa basi): hanya aktif di produksi. Di
 * `next dev` (uji manual & E2E, yang sering mengubah DB langsung) TTL = 0,
 * jadi selalu membaca DB. Cache hasil fungsi murni (mis. render QR) tidak
 * perlu memakai ini.
 */
export function productionTtl(ms: number): number {
  return process.env.NODE_ENV === "production" ? ms : 0;
}

export type TtlCache<K, V> = {
  get(key: K, load: () => Promise<V>): Promise<V>;
  delete(key: K): void;
  clear(): void;
};

export function createTtlCache<K, V>({
  ttlMs,
  maxEntries,
}: {
  ttlMs: number;
  maxEntries: number;
}): TtlCache<K, V> {
  const entries = new Map<K, { value: Promise<V>; expiresAt: number }>();

  return {
    get(key, load) {
      const now = Date.now();
      const hit = entries.get(key);
      if (hit && hit.expiresAt > now) return hit.value;

      const value = load();
      entries.delete(key);
      entries.set(key, { value, expiresAt: now + ttlMs });
      value.catch(() => {
        if (entries.get(key)?.value === value) entries.delete(key);
      });

      // Map menjaga urutan sisip — entri tertua dibuang duluan.
      while (entries.size > maxEntries) {
        const oldest = entries.keys().next().value as K;
        entries.delete(oldest);
      }
      return value;
    },
    delete(key) {
      entries.delete(key);
    },
    clear() {
      entries.clear();
    },
  };
}
