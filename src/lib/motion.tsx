import { LazyMotion, MotionConfig } from 'framer-motion';
import type { ReactNode } from 'react';

const loadFeatures = () => import('./motionFeatures').then((m) => m.default);

/** Motion features load in their own chunk; components use the lightweight `m` primitives. */
export function MotionProvider({ motion, children }: { motion: 'system' | 'reduced' | 'full'; children: ReactNode }) {
  return (
    <LazyMotion features={loadFeatures} strict>
      <MotionConfig reducedMotion={motion === 'reduced' ? 'always' : motion === 'full' ? 'never' : 'user'}>{children}</MotionConfig>
    </LazyMotion>
  );
}

/** Snappy, low-bounce springs. Fast, never wobbly. */
export const spring = { type: 'spring', stiffness: 420, damping: 34, mass: 0.8 } as const;
export const softSpring = { type: 'spring', stiffness: 260, damping: 30 } as const;
export const easeOut = [0.16, 1, 0.3, 1] as const;
