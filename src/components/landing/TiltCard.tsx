"use client";

import { type MouseEvent, type ReactNode, useRef } from "react";
import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useSpring,
} from "motion/react";
import { cardClasses } from "@/components/ui/Card";
import { cn } from "@/lib/utils/cn";

/**
 * Pengganti `Card` yang bisa dianimasikan — tilt 3D mengikuti posisi kursor +
 * sorotan (spotlight) lembut yang mengikuti kursor. Dipakai khusus di
 * landing page untuk kartu fitur/langkah yang butuh hover "premium".
 */
export function TiltCard({
  children,
  className,
  pad = "lg",
  elevated = false,
}: {
  children: ReactNode;
  className?: string;
  pad?: "none" | "sm" | "md" | "lg";
  elevated?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();
  const rx = useMotionValue(0);
  const ry = useMotionValue(0);
  const springRx = useSpring(rx, { stiffness: 300, damping: 28 });
  const springRy = useSpring(ry, { stiffness: 300, damping: 28 });
  const glowX = useMotionValue(50);
  const glowY = useMotionValue(50);
  const glowBackground = useMotionTemplate`radial-gradient(260px circle at ${glowX}% ${glowY}%, var(--color-brand-tint), transparent 70%)`;

  function handleMouseMove(e: MouseEvent<HTMLDivElement>) {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    glowX.set(px * 100);
    glowY.set(py * 100);
    if (prefersReducedMotion) return;
    ry.set((px - 0.5) * 12);
    rx.set((0.5 - py) * 12);
  }

  function handleMouseLeave() {
    rx.set(0);
    ry.set(0);
  }

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      whileHover={prefersReducedMotion ? undefined : { scale: 1.015 }}
      transition={{ type: "spring", stiffness: 300, damping: 24 }}
      style={{
        rotateX: springRx,
        rotateY: springRy,
        transformPerspective: 900,
      }}
      className={cn(
        "group relative overflow-hidden",
        cardClasses({ pad, elevated }),
        className,
      )}
    >
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{ background: glowBackground }}
      />
      <div className="relative">{children}</div>
    </motion.div>
  );
}
