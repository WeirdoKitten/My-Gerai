// Kirim byte ESC/POS ke printer thermal mini lewat Web Bluetooth (BLE).
// Hanya jalan di browser berbasis Chromium (Chrome Android, Chrome/Edge
// desktop). Printer yang cuma punya Bluetooth Classic (SPP) tidak bisa.

// Tipe minimal Web Bluetooth — belum ada di lib.dom TypeScript, dan tidak
// sepadan menambah dependency @types hanya untuk beberapa baris ini.
type BleCharacteristic = {
  properties: { write: boolean; writeWithoutResponse: boolean };
  writeValueWithResponse(value: BufferSource): Promise<void>;
  writeValueWithoutResponse(value: BufferSource): Promise<void>;
};
type BleService = {
  getCharacteristics(): Promise<BleCharacteristic[]>;
};
type BleServer = {
  connected: boolean;
  connect(): Promise<BleServer>;
  getPrimaryServices(): Promise<BleService[]>;
};
type BleDevice = { name?: string; gatt?: BleServer };
type BluetoothApi = {
  requestDevice(options: {
    acceptAllDevices: boolean;
    optionalServices: string[];
  }): Promise<BleDevice>;
};

// UUID service yang dipakai printer thermal mini populer (merek generik
// China, Xprinter, Goojprt, Epson TM BLE, dll). Web Bluetooth mewajibkan
// service didaftarkan di sini sebelum boleh diakses.
const PRINTER_SERVICE_UUIDS = [
  "000018f0-0000-1000-8000-00805f9b34fb",
  "0000ff00-0000-1000-8000-00805f9b34fb",
  "0000ffe0-0000-1000-8000-00805f9b34fb",
  "0000fee7-0000-1000-8000-00805f9b34fb",
  "e7810a71-73ae-499d-8c15-faa9aef0c3f2",
  "49535343-fe7d-4ae5-8fa9-9fafd205e455",
];

// Paket kecil + jeda — buffer printer murah gampang meluap kalau dibanjiri.
const CHUNK_SIZE = 100;
const CHUNK_DELAY_MS = 20;

export class PrinterError extends Error {}

/** Pengguna menutup dialog pilih printer — bukan error, cukup diam. */
export class PrinterCancelledError extends PrinterError {}

let device: BleDevice | null = null;
let characteristic: BleCharacteristic | null = null;

function getBluetooth(): BluetoothApi | null {
  if (typeof navigator === "undefined") return null;
  return (
    (navigator as Navigator & { bluetooth?: BluetoothApi }).bluetooth ?? null
  );
}

export function isBluetoothPrintingSupported(): boolean {
  return getBluetooth() !== null;
}

async function findWritableCharacteristic(
  server: BleServer,
): Promise<BleCharacteristic> {
  const services = await server.getPrimaryServices();
  for (const service of services) {
    const characteristics = await service.getCharacteristics();
    const writable = characteristics.find(
      (c) => c.properties.write || c.properties.writeWithoutResponse,
    );
    if (writable) return writable;
  }
  throw new PrinterError(
    "Perangkat ini tidak dikenali sebagai printer struk. Pastikan yang dipilih printer thermal Bluetooth.",
  );
}

async function connect(): Promise<BleCharacteristic> {
  if (device?.gatt?.connected && characteristic) return characteristic;

  const bluetooth = getBluetooth();
  if (!bluetooth) {
    throw new PrinterError(
      "Browser ini belum mendukung printer Bluetooth. Pakai Chrome di Android.",
    );
  }

  // Printer yang pernah dipilih di sesi ini disambung ulang tanpa dialog.
  if (!device) {
    try {
      device = await bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: PRINTER_SERVICE_UUIDS,
      });
    } catch (error) {
      // Chrome memakai NotFoundError untuk dua hal: dialog ditutup pengguna
      // ("User cancelled...") dan adaptor Bluetooth mati/tidak ada — hanya
      // yang pertama boleh diam.
      if (error instanceof DOMException && error.name === "NotFoundError") {
        if (/cancel/i.test(error.message)) {
          throw new PrinterCancelledError("Pemilihan printer dibatalkan.");
        }
        throw new PrinterError(
          "Bluetooth tidak aktif atau tidak tersedia di perangkat ini. Nyalakan Bluetooth lalu coba lagi.",
        );
      }
      throw new PrinterError(
        "Tidak bisa membuka pencarian printer. Pastikan Bluetooth HP menyala.",
      );
    }
  }

  try {
    if (!device.gatt) throw new Error("GATT tidak tersedia");
    const server = await device.gatt.connect();
    characteristic = await findWritableCharacteristic(server);
    return characteristic;
  } catch (error) {
    // Lupakan printer supaya tombol berikutnya membuka dialog pilih lagi.
    device = null;
    characteristic = null;
    if (error instanceof PrinterError) throw error;
    throw new PrinterError(
      "Gagal tersambung ke printer. Pastikan printer menyala dan dekat HP, lalu coba lagi.",
    );
  }
}

/** Kirim data ke printer; minta pilih printer dulu kalau belum ada di sesi ini. */
export async function printBytes(data: Uint8Array): Promise<void> {
  const target = await connect();
  try {
    for (let offset = 0; offset < data.length; offset += CHUNK_SIZE) {
      const chunk = data.slice(offset, offset + CHUNK_SIZE);
      if (target.properties.write) {
        await target.writeValueWithResponse(chunk);
      } else {
        await target.writeValueWithoutResponse(chunk);
        await new Promise((resolve) => setTimeout(resolve, CHUNK_DELAY_MS));
      }
    }
  } catch {
    characteristic = null;
    throw new PrinterError(
      "Sambungan ke printer terputus saat mencetak. Coba lagi.",
    );
  }
}
