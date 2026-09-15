"use client";

import { type MouseEvent, type ReactNode, useRef } from "react";
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from "motion/react";
import { Badge } from "@/components/ui/Badge";
import {
  ArrowRightIcon,
  ChevronDownIcon,
  StoreIcon,
  TagIcon,
} from "@/components/ui/icons";
import { EASE_OUT_EXPO } from "./Reveal";

const PHONE_WIDTH = "w-[190px]";

function MiniPhone({ children }: { children: ReactNode }) {
  return (
    <div
      className={`${PHONE_WIDTH} shrink-0 rounded-[1.6rem] border border-line bg-surface p-2 shadow-card`}
    >
      <div className="mx-auto mb-1.5 h-1 w-7 rounded-full bg-line" />
      <div className="flex flex-col gap-2.5 rounded-[1.1rem] bg-bg p-3">
        {children}
      </div>
    </div>
  );
}

/** Panah/penghubung antar-layar — animasi pulsa lembut, arah beda di mobile vs desktop. */
function FlowConnector() {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      className="flex shrink-0 flex-col items-center gap-1 px-1 py-2 lg:px-2 lg:py-0"
      animate={
        prefersReducedMotion ? undefined : { scale: [1, 1.1, 1], opacity: [0.85, 1, 0.85] }
      }
      transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
    >
      <div className="flex size-8 items-center justify-center rounded-full bg-brand-tint text-brand">
        <ArrowRightIcon className="hidden size-4 lg:block" />
        <ChevronDownIcon className="size-4 lg:hidden" />
      </div>
      <span className="text-center text-[10px] font-semibold uppercase tracking-wide text-ink-muted">
        Otomatis
      </span>
    </motion.div>
  );
}

/**
 * Mockup hero — bukan foto, murni komponen & token warna sama dengan produk
 * asli. Dua "layar" (menu Pembeli -> dashboard Pedagang) dihubungkan
 * `FlowConnector`, cerita utama landing: Pesanan Pembeli otomatis nyampe ke
 * Pedagang, tanpa dicek manual. Satu grup dianimasikan bareng (entrance,
 * parallax scroll, tilt hover) — bukan per-layar, biar tetap sederhana.
 */
export function OrderFlowMockup() {
  const ref = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const parallaxY = useTransform(scrollYProgress, [0, 1], [60, -60]);

  const rx = useMotionValue(0);
  const ry = useMotionValue(0);
  const springRx = useSpring(rx, { stiffness: 260, damping: 24 });
  const springRy = useSpring(ry, { stiffness: 260, damping: 24 });

  function handleMouseMove(e: MouseEvent<HTMLDivElement>) {
    if (prefersReducedMotion || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    ry.set((px - 0.5) * 10);
    rx.set((0.5 - py) * 10);
  }

  function handleMouseLeave() {
    rx.set(0);
    ry.set(0);
  }

  return (
    <motion.div
      ref={ref}
      initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.94, x: 30 }}
      whileInView={
        prefersReducedMotion ? undefined : { opacity: 1, scale: 1, x: 0 }
      }
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.9, ease: EASE_OUT_EXPO }}
      style={{ y: prefersReducedMotion ? 0 : parallaxY }}
      className="mx-auto w-full max-w-[220px] lg:mx-0 lg:ml-auto lg:max-w-none"
    >
      <motion.div
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{ transformPerspective: 1000, rotateX: springRx, rotateY: springRy }}
        className="flex flex-col items-center gap-1 lg:flex-row lg:items-center lg:justify-center lg:gap-1"
      >
        {/* Layar 1: Pembeli pesan */}
        <MiniPhone>
          <div className="flex items-center justify-between">
            <span className="inline-flex min-w-0 items-center gap-1 text-xs font-bold text-ink">
              <StoreIcon className="size-3.5 shrink-0 text-brand" />
              <span className="truncate">Bakso Pak Budi</span>
            </span>
            <Badge tone="success" className="shrink-0">
              Buka
            </Badge>
          </div>

          <div className="flex items-center gap-2 rounded-control border border-line bg-surface p-2">
            <div className="flex size-7 shrink-0 items-center justify-center rounded-control bg-brand-tint text-brand">
              <TagIcon className="size-3.5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[11px] font-semibold text-ink">
                Bakso Urat
              </p>
              <p className="text-[11px] font-bold tabular-nums text-ink">
                Rp15.000
              </p>
            </div>
          </div>

          <div className="flex h-8 items-center justify-center rounded-full bg-brand-strong px-3 text-[11px] font-semibold text-white">
            Buat Pesanan
          </div>
        </MiniPhone>

        <FlowConnector />

        {/* Layar 2: Pedagang terima */}
        <MiniPhone>
          <p className="text-xs font-bold text-ink">Pesanan Masuk</p>

          <div className="rounded-control border border-line bg-surface p-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold tabular-nums text-ink">
                K3F9
              </span>
              <Badge tone="info">Dibayar</Badge>
            </div>
            <p className="mt-1 truncate text-[10px] text-ink-muted">
              Rina &middot; 2x Bakso Urat
            </p>
            <div className="mt-2 flex h-7 items-center justify-center rounded-full bg-brand-strong text-[10px] font-semibold text-white">
              Tandai Diproses
            </div>
          </div>
        </MiniPhone>
      </motion.div>
    </motion.div>
  );
}
