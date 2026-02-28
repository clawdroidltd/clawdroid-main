/**
 * Clawdroid runtime defaults and product identity.
 * Central place for Clawdroid-specific tuning and feature flags used by the agent.
 */

export const CLAWDROID_RUNTIME = {
  /** Product name used in session logs and diagnostics */
  productName: "Clawdroid",
  /** Log file prefix so session files are easy to filter */
  logPrefix: "clawdroid",
  /** Reference resolution used for swipe/coordinate defaults (Clawdroid target devices) */
  referenceResolution: { width: 1080, height: 2400 },
  /** Default gesture duration for Clawdroid UX (ms) */
  gestureDurationMs: 300,
  /** Whether to prefer on-device / offline-first when available */
  preferOffline: true,
} as const;

export type ClawdroidRuntime = typeof CLAWDROID_RUNTIME;
