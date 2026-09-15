"use client";

import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils/cn";
import { EASE_OUT_EXPO } from "./Reveal";

const WORD_VARIANTS = {
  hidden: { y: "115%" },
  visible: { y: "0%" },
};

/**
 * Judul besar yang masuk kata-per-kata dari bawah, terpotong rapi
 * (`overflow-hidden` per kata) — efek "mask reveal" khas hero situs premium.
 *
 * `whileInView` dipasang di pembungkus TERLUAR (tidak pernah ikut
 * ditransformasi/dipotong) lalu dipropagasikan ke tiap kata lewat
 * `variants` — kalau viewport-nya dipasang di elemen kata sendiri, elemen
 * itu (yang posisi awalnya sengaja di luar area `overflow-hidden`
 * induknya) tidak pernah terdeteksi "masuk viewport" oleh
 * `IntersectionObserver` (yang menghormati clipping leluhur), jadi reveal-nya
 * tidak pernah terpicu.
 */
export function RevealText({
  text,
  className,
  delay = 0,
}: {
  text: string;
  className?: string;
  delay?: number;
}) {
  const prefersReducedMotion = useReducedMotion();
  const words = text.split(" ");

  if (prefersReducedMotion) {
    return <span className={className}>{text}</span>;
  }

  return (
    <motion.span
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0 }}
      className={cn("inline", className)}
    >
      {words.map((word, i) => (
        <span
          // biome-ignore lint/suspicious/noArrayIndexKey: `text` statis per instance, urutan kata tidak pernah berubah
          key={`${word}-${i}`}
          className="-mb-[0.2em] inline-block overflow-hidden pb-[0.2em] align-bottom"
        >
          <motion.span
            className="inline-block"
            variants={WORD_VARIANTS}
            transition={{
              duration: 0.8,
              delay: delay + i * 0.07,
              ease: EASE_OUT_EXPO,
            }}
          >
            {word}
            {i < words.length - 1 ? " " : ""}
          </motion.span>
        </span>
      ))}
    </motion.span>
  );
}
