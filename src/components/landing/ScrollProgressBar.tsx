"use client";

import { motion, useScroll, useSpring } from "motion/react";

/** Garis tipis di atas layar yang terisi sesuai progres scroll halaman. */
export function ScrollProgressBar() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 200,
    damping: 30,
    restDelta: 0.001,
  });

  return (
    <motion.div
      aria-hidden="true"
      style={{ scaleX }}
      className="fixed inset-x-0 top-0 z-50 h-[3px] origin-left bg-brand-strong"
    />
  );
}
