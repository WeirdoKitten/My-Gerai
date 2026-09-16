import QRCode from "qrcode";

/** Path StoreIcon (lucide-style, viewBox 24x24) — dipakai sebagai lambang di tengah QR, sinkron dengan `Wordmark`/`icons.tsx`. */
const STORE_ICON_PATHS = [
  "M4 9V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v3",
  "M3 9h18l-1 3.5a2 2 0 0 1-2 1.5 2.3 2.3 0 0 1-2-1.2 2.3 2.3 0 0 1-4 0 2.3 2.3 0 0 1-4 0A2.3 2.3 0 0 1 6 14a2 2 0 0 1-2-1.5Z",
  "M5 14v6a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-6",
];

// Nilai literal dari globals.css (bukan var(--...)) — file SVG hasil unduhan
// berdiri sendiri, tidak ikut membawa stylesheet aplikasi.
const INK = "#1c1917";
const INK_MUTED = "#78716c";
const LINE = "#eae3db";
const BRAND_STRONG = "#c2410c";
const BRAND_TINT = "#fff1e7";
const SURFACE = "#ffffff";

/** Dimensi tetap poster (tidak berubah oleh panjang URL) — dipakai lagi saat merasterisasi ke PNG di klien. */
export const QR_POSTER_SIZE = { width: 520, height: 612 };

const HEADER_MAX_WIDTH = 420;
const HEADER_CHAR_WIDTH_FACTOR = 0.62; // heuristik lebar huruf Arial Bold

/** Pilih ukuran font terbesar yang muat, potong dengan "…" kalau nama Lapak tetap kepanjangan di ukuran terkecil. */
function fitHeaderText(text: string): { text: string; fontSize: number } {
  const candidateSizes = [26, 22, 18, 15];
  for (const fontSize of candidateSizes) {
    if (text.length * fontSize * HEADER_CHAR_WIDTH_FACTOR <= HEADER_MAX_WIDTH) {
      return { text, fontSize };
    }
  }
  const smallest = candidateSizes.at(-1) as number;
  const maxChars = Math.floor(
    HEADER_MAX_WIDTH / (smallest * HEADER_CHAR_WIDTH_FACTOR),
  );
  const truncated =
    text.length > maxChars ? `${text.slice(0, maxChars - 1).trimEnd()}…` : text;
  return { text: truncated, fontSize: smallest };
}

type QrPosterOptions = {
  url: string;
  headerText: string;
  captionTitle: string;
  captionSubtitle: string;
};

/**
 * Poster QR mandiri (frame batik + judul + lambang toko di tengah QR +
 * caption) — dipakai untuk QR pendaftaran Pedagang & QR Menu tiap Lapak,
 * beda cuma teksnya. Bukan QR polos, supaya tetap menarik saat diunduh &
 * dicetak lepas dari halaman. Logo di tengah aman karena errorCorrectionLevel
 * "H" mentolerir ~30% area tertutup — lingkaran logo di sini cuma ~4%.
 */
export async function buildQrPoster({
  url,
  headerText,
  captionTitle,
  captionSubtitle,
}: QrPosterOptions): Promise<string> {
  const qrSvg = await QRCode.toString(url, {
    type: "svg",
    errorCorrectionLevel: "H",
    margin: 0,
    color: { dark: INK, light: "#00000000" },
  });
  const viewBoxMatch = qrSvg.match(/viewBox="0 0 (\d+) \d+"/);
  const pathMatch = qrSvg.match(/<path[^>]*\sd="([^"]+)"/);
  if (!viewBoxMatch || !pathMatch) {
    throw new Error("Format SVG dari library qrcode berubah — parsing gagal");
  }
  const modules = Number(viewBoxMatch[1]);
  const pathData = pathMatch[1];
  const header = fitHeaderText(headerText);

  const size = QR_POSTER_SIZE.width;
  const frame = 24;
  const headerHeight = 64;
  const qrCard = 400;
  const qrSize = qrCard - 64;
  const qrCardX = (size - qrCard) / 2;
  const qrCardY = frame + headerHeight + 28;
  const qrX = (size - qrSize) / 2;
  const qrY = qrCardY + (qrCard - qrSize) / 2;
  const scale = qrSize / modules;
  const logoR = 36;
  const logoCx = size / 2;
  const logoCy = qrY + qrSize / 2;
  const height = QR_POSTER_SIZE.height;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${height}" viewBox="0 0 ${size} ${height}">
  <defs>
    <filter id="cardShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="6" stdDeviation="10" flood-color="${BRAND_STRONG}" flood-opacity="0.18" />
    </filter>
    <pattern id="batikKawung" width="64" height="64" patternUnits="userSpaceOnUse">
      <g fill="${BRAND_STRONG}" opacity="0.07">
        <ellipse cx="32" cy="14" rx="11" ry="15" />
        <ellipse cx="32" cy="50" rx="11" ry="15" />
        <ellipse cx="14" cy="32" rx="15" ry="11" />
        <ellipse cx="50" cy="32" rx="15" ry="11" />
        <circle cx="32" cy="32" r="5" />
        <circle cx="0" cy="0" r="5" />
        <circle cx="64" cy="0" r="5" />
        <circle cx="0" cy="64" r="5" />
        <circle cx="64" cy="64" r="5" />
      </g>
    </pattern>
  </defs>

  <rect width="${size}" height="${height}" rx="36" fill="${BRAND_TINT}" />
  <rect width="${size}" height="${height}" rx="36" fill="url(#batikKawung)" />
  <rect x="3" y="3" width="${size - 6}" height="${height - 6}" rx="33" fill="none" stroke="${BRAND_STRONG}" stroke-width="3" />

  <rect x="${frame}" y="${frame}" width="${size - frame * 2}" height="${headerHeight}" rx="18" fill="${BRAND_STRONG}" />
  <text x="${size / 2}" y="${frame + headerHeight / 2 + header.fontSize * 0.32}" text-anchor="middle" font-family="Arial, sans-serif" font-size="${header.fontSize}" font-weight="800" fill="${SURFACE}">${escapeXml(header.text)}</text>

  <rect x="${qrCardX}" y="${qrCardY}" width="${qrCard}" height="${qrCard}" rx="24" fill="${SURFACE}" stroke="${LINE}" stroke-width="2" filter="url(#cardShadow)" />
  <g transform="translate(${qrX} ${qrY}) scale(${scale})" shape-rendering="crispEdges">
    <path stroke="${INK}" d="${pathData}" />
  </g>

  <circle cx="${logoCx}" cy="${logoCy}" r="${logoR}" fill="${BRAND_STRONG}" stroke="${SURFACE}" stroke-width="4" />
  <svg x="${logoCx - 18}" y="${logoCy - 18}" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="${SURFACE}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    ${STORE_ICON_PATHS.map((d) => `<path d="${d}" />`).join("\n    ")}
  </svg>

  <text x="${size / 2}" y="${qrCardY + qrCard + 40}" text-anchor="middle" font-family="Arial, sans-serif" font-size="18" font-weight="700" fill="${INK}">${escapeXml(captionTitle)}</text>
  <text x="${size / 2}" y="${qrCardY + qrCard + 64}" text-anchor="middle" font-family="Arial, sans-serif" font-size="13" fill="${INK_MUTED}">${escapeXml(captionSubtitle)}</text>
</svg>`;

  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

/** Nama Lapak/teks header ditulis Pedagang sendiri (bukan konstanta) — escape biar aman disisipkan ke XML. */
function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function buildRegistrationQrPoster(url: string): Promise<string> {
  return buildQrPoster({
    url,
    headerText: "MyGerai",
    captionTitle: "Scan & Daftar Gratis",
    captionSubtitle: "100% harga jual milikmu",
  });
}

export async function buildMenuQrPoster(
  url: string,
  stallName: string,
): Promise<string> {
  return buildQrPoster({
    url,
    headerText: stallName,
    captionTitle: "Scan untuk Lihat Menu",
    captionSubtitle: "Pesan & bayar QRIS langsung dari HP",
  });
}
