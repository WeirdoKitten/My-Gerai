const TILE_SIZE = 280;

// Ikon dari `ui/icons.tsx` (Store/Tag/Receipt/Cart/Qr) dipakai ulang persis
// path-nya, cuma diserak + dimiringkan dalam satu ubin — motif jadi terasa
// "milik" MyGerai sendiri (ikon yang sama dipakai di seluruh app), bukan
// clipart generik. Warna sangat pudar (`stroke-opacity` 0.07) supaya cuma
// jadi tekstur latar, tidak mengganggu keterbacaan teks di atasnya.
const ICONS = [
  {
    // Store
    x: 26,
    y: 34,
    rotate: -10,
    scale: 1.3,
    d: [
      "M4 9V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v3",
      "M3 9h18l-1 3.5a2 2 0 0 1-2 1.5 2.3 2.3 0 0 1-2-1.2 2.3 2.3 0 0 1-4 0 2.3 2.3 0 0 1-4 0A2.3 2.3 0 0 1 6 14a2 2 0 0 1-2-1.5Z",
      "M5 14v6a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-6",
    ],
  },
  {
    // Tag
    x: 186,
    y: 26,
    rotate: 15,
    scale: 1.1,
    d: ["M3.5 3.5h7l10 10-7 7-10-10z"],
    circle: { cx: 7.5, cy: 7.5, r: 1.5 },
  },
  {
    // Receipt
    x: 104,
    y: 138,
    rotate: -6,
    scale: 1.15,
    d: [
      "M4 2v20l2-1.5L8 22l2-1.5L12 22l2-1.5L16 22l2-1.5L20 22V2l-2 1.5L16 2l-2 1.5L12 2l-2 1.5L8 2 6 3.5Z",
      "M8 7h8M8 11h8M8 15h5",
    ],
  },
  {
    // Cart
    x: 212,
    y: 168,
    rotate: 8,
    scale: 1.2,
    d: [
      "M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12",
    ],
    circles: [
      { cx: 8, cy: 21, r: 1 },
      { cx: 19, cy: 21, r: 1 },
    ],
  },
  {
    // QR
    x: 22,
    y: 198,
    rotate: -14,
    scale: 1,
    d: ["M14 14h3v3h-3zM21 14v.01M14 21h.01M17 17h.01M21 17v4M17 21h4"],
    rects: [
      { x: 3, y: 3, w: 7, h: 7 },
      { x: 14, y: 3, w: 7, h: 7 },
      { x: 3, y: 14, w: 7, h: 7 },
    ],
  },
];

function buildTileSvg(): string {
  const groups = ICONS.map((icon) => {
    const paths = icon.d.map((d) => `<path d="${d}"/>`).join("");
    const circle =
      "circle" in icon && icon.circle
        ? `<circle cx="${icon.circle.cx}" cy="${icon.circle.cy}" r="${icon.circle.r}"/>`
        : "";
    const circles =
      "circles" in icon && icon.circles
        ? icon.circles
            .map((c) => `<circle cx="${c.cx}" cy="${c.cy}" r="${c.r}"/>`)
            .join("")
        : "";
    const rects =
      "rects" in icon && icon.rects
        ? icon.rects
            .map(
              (r) =>
                `<rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" rx="1"/>`,
            )
            .join("")
        : "";
    return `<g transform="translate(${icon.x} ${icon.y}) rotate(${icon.rotate}) scale(${icon.scale})">${paths}${circle}${circles}${rects}</g>`;
  }).join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${TILE_SIZE}" height="${TILE_SIZE}" viewBox="0 0 ${TILE_SIZE} ${TILE_SIZE}"><g fill="none" stroke="#EA580C" stroke-opacity="0.07" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${groups}</g></svg>`;
}

// `encodeURIComponent` wajib atas SELURUH markup — SVG-nya sendiri penuh
// tanda kutip ganda (`width="280"` dst.), kalau tidak di-encode maka CSS
// `url("data:...")` di bawah bakal berhenti membaca di kutip pertama yang
// ditemui (`xmlns="` merusak seluruh data URI).
const TILE_DATA_URL = `url("data:image/svg+xml,${encodeURIComponent(buildTileSvg())}")`;

/**
 * Tekstur latar landing/`gerai` — ikon produk (Toko/Tag/Nota/Keranjang/QR)
 * diserak sangat pudar, `fixed` supaya tidak ikut discroll (terasa satu
 * "lapisan" konsisten di belakang semua seksi). Statis (CSS murni, tanpa
 * JS/motion) — cuma dekorasi, bukan efek hover/scroll.
 */
export function BackgroundPattern() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-30"
      style={{
        backgroundImage: TILE_DATA_URL,
        backgroundRepeat: "repeat",
        backgroundSize: `${TILE_SIZE}px ${TILE_SIZE}px`,
      }}
    />
  );
}
