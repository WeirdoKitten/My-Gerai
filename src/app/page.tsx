export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-zinc-50 px-6 text-center dark:bg-black">
      <h1 className="text-3xl font-semibold tracking-tight text-black dark:text-zinc-50">
        MyGerai
      </h1>
      <p className="mt-3 max-w-sm text-zinc-600 dark:text-zinc-400">
        Proyek masih tahap pengembangan. Lihat{" "}
        <code className="rounded bg-black/[.06] px-1.5 py-0.5 font-mono text-[0.9em] dark:bg-white/[.08]">
          docs/BACKLOG.md
        </code>{" "}
        untuk rencana ke depan.
      </p>
    </div>
  );
}
