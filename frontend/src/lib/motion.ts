import { useReducedMotion, type Variants } from 'framer-motion';

/**
 * Shared, B2B-appropriate motion primitives.
 *
 * Everything here is intentionally subtle and fast — this is a tool tradies
 * check between jobs, not a portfolio site. All variants collapse to
 * instant/no-movement when the user prefers reduced motion (handled at the
 * call site via `useReducedMotion`).
 */

export const EASE_OUT = [0.22, 1, 0.36, 1] as const;

/** Fade + small rise. Used for page-level and section reveals. */
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.34, ease: EASE_OUT } },
};

/** Container that staggers its children in on mount / scroll-in. */
export const staggerContainer = (stagger = 0.055, delay = 0): Variants => ({
  hidden: {},
  show: { transition: { staggerChildren: stagger, delayChildren: delay } },
});

/** A single staggered child (job cards, list items). */
export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: EASE_OUT } },
};

/** Instant, movement-free variants for `prefers-reduced-motion`. Children that
 *  set `variants={staggerItem}` still need a `hidden`/`show` pair to resolve
 *  against, so we reuse the same keys with zero-duration, no-transform steps. */
export const instantContainer: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0 } },
};
export const instantItem: Variants = {
  hidden: { opacity: 1 },
  show: { opacity: 1 },
};

/** Route transition for dashboard pages. */
export const pageTransition: Variants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.28, ease: EASE_OUT } },
  exit: { opacity: 0, y: -6, transition: { duration: 0.16, ease: 'easeIn' } },
};

/**
 * Returns variants that are safe under `prefers-reduced-motion`: when the user
 * opts out, movement is stripped and only a near-instant opacity change remains.
 */
export function useMotionSafe<T extends Variants>(variants: T, reducedVariants?: Variants): Variants {
  const reduce = useReducedMotion();
  if (!reduce) return variants;
  return (
    reducedVariants ?? {
      hidden: { opacity: 0 },
      show: { opacity: 1, transition: { duration: 0.01 } },
      exit: { opacity: 0, transition: { duration: 0.01 } },
    }
  );
}
