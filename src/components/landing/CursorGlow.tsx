"use client";

import { useEffect, useState } from "react";
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from "motion/react";

const SIZE = 560;

/**
 * Bola cahaya lembut yang mengikuti kursor — cuma di perangkat pointer halus
 * (desktop) & kalau User tidak minta reduced motion. Murni dekoratif
 * (`pointer-events-none`), tidak pernah menghalangi interaksi.
 */
export function CursorGlow() {
  const prefersReducedMotion = useReducedMotion();
  const [enabled, setEnabled] = useState(false);
  const x = useMotionValue(-SIZE);
  const y = useMotionValue(-SIZE);
  const springX = useSpring(x, { stiffness: 120, damping: 22, mass: 0.6 });
  const springY = useSpring(y, { stiffness: 120, damping: 22, mass: 0.6 });
  const left = useTransform(springX, (v) => v - SIZE / 2);
  const top = useTransform(springY, (v) => v - SIZE / 2);

  useEffect(() => {
    if (prefersReducedMotion) return;
    if (!window.matchMedia("(pointer: fine)").matches) return;
    setEnabled(true);

    function handleMove(e: PointerEvent) {
      x.set(e.clientX);
      y.set(e.clientY);
    }
    window.addEventListener("pointermove", handleMove);
    return () => window.removeEventListener("pointermove", handleMove);
  }, [prefersReducedMotion, x, y]);

  if (!enabled) return null;

  return (
    <motion.div
      aria-hidden="true"
      className="pointer-events-none fixed left-0 top-0 z-0 opacity-[0.14] blur-3xl"
      style={{
        x: left,
        y: top,
        width: SIZE,
        height: SIZE,
        background:
          "radial-gradient(circle, var(--color-brand) 0%, transparent 70%)",
      }}
    />
  );
}
