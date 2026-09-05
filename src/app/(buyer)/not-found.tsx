export default function BuyerNotFound() {
  return (
    <div className="flex flex-col items-center gap-2 py-16 text-center">
      <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
        Halaman Tidak Ditemukan
      </h1>
      <p className="text-zinc-500 dark:text-zinc-400">
        Lapak yang kamu cari tidak ada, sudah tidak aktif, atau tautannya salah.
      </p>
    </div>
  );
}
