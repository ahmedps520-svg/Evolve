import { LazyMotion, MotionConfig, domMax } from 'framer-motion';
import type { ReactNode } from 'react';

/**
 * Motion features ship with the app shell. Loading them lazily saves a few KB but lets a fast tap
 * land before exit animations can run, which would leave `AnimatePresence` waiting forever.
 * Components use the lightweight `m` primitives.
 */
export function MotionProvider({ motion, children }: { motion: 'system' | 'reduced' | 'full'; children: ReactNode }) {
  return (
    <LazyMotion features={domMax} strict>
      <MotionConfig reducedMotion={motion === 'reduced' ? 'always' : motion === 'full' ? 'never' : 'user'}>{children}</MotionConfig>
    </LazyMotion>
  );
}

/** Snappy, low-bounce springs. Fast, never wobbly. */
export const spring = { type: 'spring', stiffness: 420, damping: 34, mass: 0.8 } as const;
export const softSpring = { type: 'spring', stiffness: 260, damping: 30 } as const;
export const easeOut = [0.16, 1, 0.3, 1] as const;
