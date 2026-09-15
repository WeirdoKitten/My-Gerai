"use client";

import type { ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils/cn";

export const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;

/** Bungkus konten apa pun — fade + slide-up sekali saat masuk viewport. */
export function Reveal({
  children,
  className,
  delay = 0,
  y = 28,
  duration = 0.7,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  y?: number;
  duration?: number;
}) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      initial={prefersReducedMotion ? false : { opacity: 0, y }}
      whileInView={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration, delay, ease: EASE_OUT_EXPO }}
      className={cn(className)}
    >
      {children}
    </motion.div>
  );
}
