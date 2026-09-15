"use client";

import { motion, useReducedMotion } from "motion/react";

/** Gumpalan gradien lembut yang melayang pelan di latar hero — dekoratif. */
export function AmbientBlobs() {
  const prefersReducedMotion = useReducedMotion();

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
    >
      <motion.div
        className="absolute -left-24 -top-24 size-[420px] rounded-full opacity-50 blur-3xl"
        style={{
          background:
            "radial-gradient(circle, var(--color-brand-tint) 0%, transparent 70%)",
        }}
        animate={
          prefersReducedMotion
            ? undefined
            : { x: [0, 30, 0], y: [0, 20, 0] }
        }
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute -right-32 top-1/3 size-[380px] rounded-full opacity-40 blur-3xl"
        style={{
          background:
            "radial-gradient(circle, var(--color-brand-tint) 0%, transparent 70%)",
        }}
        animate={
          prefersReducedMotion
            ? undefined
            : { x: [0, -25, 0], y: [0, -30, 0] }
        }
        transition={{ duration: 17, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
}
