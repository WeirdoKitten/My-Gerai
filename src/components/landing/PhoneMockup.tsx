"use client";

import { type MouseEvent, useRef } from "react";
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
  CheckIcon,
  StoreIcon,
  TagIcon,
} from "@/components/ui/icons";
import { EASE_OUT_EXPO } from "./Reveal";

const ITEMS = [
  { name: "Bakso Urat", price: "Rp15.000" },
  { name: "Es Teh Manis", price: "Rp5.000" },
];

/**
 * Mockup HP di hero — bukan foto, murni komponen & token warna yang sama
 * dengan produk asli. Parallax mengikuti scroll, tilt 3D mengikuti kursor.
 */
export function PhoneMockup() {
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
    ry.set((px - 0.5) * 16);
    rx.set((0.5 - py) * 16);
  }

  function handleMouseLeave() {
    rx.set(0);
    ry.set(0);
  }

  return (
    <motion.div
      ref={ref}
      initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.92, x: 40 }}
      whileInView={
        prefersReducedMotion ? undefined : { opacity: 1, scale: 1, x: 0 }
      }
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.9, ease: EASE_OUT_EXPO }}
      style={{ y: prefersReducedMotion ? 0 : parallaxY }}
      className="relative mx-auto w-full max-w-[300px] lg:mx-0 lg:ml-auto"
    >
      <motion.div
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{
          rotateX: springRx,
          rotateY: springRy,
          transformPerspective: 1000,
        }}
        className="rounded-[2rem] border border-line bg-surface p-3 shadow-card"
      >
        <div className="mx-auto mb-2 h-1.5 w-10 rounded-full bg-line" />
        <div className="flex flex-col gap-3 rounded-[1.4rem] bg-bg p-4">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 text-sm font-bold text-ink">
              <StoreIcon className="size-4 text-brand" />
              Bakso Pak Budi
            </span>
            <Badge tone="success">Buka</Badge>
          </div>

          <div className="flex flex-col gap-2">
            {ITEMS.map((item, i) => (
              <motion.div
                key={item.name}
                initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
                whileInView={
                  prefersReducedMotion ? undefined : { opacity: 1, y: 0 }
                }
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.3 + i * 0.1 }}
                className="flex items-center gap-3 rounded-control border border-line bg-surface p-2.5"
              >
                <div className="flex size-10 shrink-0 items-center justify-center rounded-control bg-brand-tint text-brand">
                  <TagIcon className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink">
                    {item.name}
                  </p>
                  <p className="text-sm font-bold tabular-nums text-ink">
                    {item.price}
                  </p>
                </div>
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full border border-line text-ink">
                  +
                </span>
              </motion.div>
            ))}
          </div>

          <div className="relative flex h-11 items-center justify-between overflow-hidden rounded-full bg-brand-strong px-4 text-sm font-semibold text-white">
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 -translate-x-full bg-[linear-gradient(110deg,transparent_20%,rgb(255_255_255_/_0.35)_50%,transparent_80%)] motion-safe:animate-[shimmer_3.5s_ease-in-out_infinite]"
            />
            <span>2 item</span>
            <span className="inline-flex items-center gap-1.5 tabular-nums">
              Rp20.000
              <ArrowRightIcon className="size-4" />
            </span>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.8, y: 10 }}
        whileInView={
          prefersReducedMotion ? undefined : { opacity: 1, scale: 1, y: 0 }
        }
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay: 0.9, ease: EASE_OUT_EXPO }}
        className="absolute -bottom-4 -left-4 hidden items-center gap-2 rounded-card border border-line bg-surface p-3 shadow-card sm:flex"
      >
        <CheckIcon className="size-4 shrink-0 text-success" />
        <span className="text-xs font-semibold text-ink">
          Pesanan diterima otomatis
        </span>
      </motion.div>
    </motion.div>
  );
}
