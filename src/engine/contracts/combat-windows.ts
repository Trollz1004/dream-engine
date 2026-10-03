/**
 * DREAM Engine — Authoritative Combat Timing Windows & Constants
 * Exact conformance to docs/gdd/02-action-combat.md and godot slice scripts
 * Schema Version: 0.1.0
 */

export interface TimingWindow {
  totalDuration: number;
  iFrameStart: number;
  iFrameEnd: number;
  recoveryStart: number;
  recoveryEnd: number;
  staminaCost: number;
  cooldown?: number;
}

export interface SentinelTiming {
  cycle: number;
  telegraph: number;
  active: number;
  beamLength: number;
  beamWidth: number;
  damage: number;
  healthMax: number;
  downDuration: number;
}

export const COMBAT_WINDOWS: Record<string, TimingWindow> = {
  dash: {
    totalDuration: 0.61, // 0.06 startup + 0.25 invuln + 0.30 recovery
    iFrameStart: 0.06,
    iFrameEnd: 0.31,
    recoveryStart: 0.31,
    recoveryEnd: 0.61,
    staminaCost: 25,
    cooldown: 0.90,
  },
  light_attack: {
    totalDuration: 0.56, // 0.10 startup + 0.12 active + 0.34 recovery
    iFrameStart: -1,
    iFrameEnd: -1,
    recoveryStart: 0.22,
    recoveryEnd: 0.56,
    staminaCost: 8,
  },
  heavy_attack: {
    totalDuration: 0.92, // 0.28 startup + 0.14 active + 0.50 recovery
    iFrameStart: -1,
    iFrameEnd: -1,
    recoveryStart: 0.42,
    recoveryEnd: 0.92,
    staminaCost: 18,
    cooldown: 1.20,
  },
  guard: {
    totalDuration: 0.78, // 0.08 startup + 0.45 active + 0.25 recovery
    iFrameStart: -1,
    iFrameEnd: -1,
    recoveryStart: 0.53,
    recoveryEnd: 0.78,
    staminaCost: 15,
    cooldown: 1.10,
  },
  lunge: {
    totalDuration: 0.55, // 0.08 startup + 0.25 travel + 0.22 recovery
    iFrameStart: -1,
    iFrameEnd: -1,
    recoveryStart: 0.33,
    recoveryEnd: 0.55,
    staminaCost: 20,
    cooldown: 4.0,
  },
  burst: {
    totalDuration: 0.75, // 0.30 startup + 0.10 active + 0.35 recovery
    iFrameStart: -1,
    iFrameEnd: -1,
    recoveryStart: 0.40,
    recoveryEnd: 0.75,
    staminaCost: 25,
    cooldown: 8.0,
  },
};

export const SENTINEL_TIMING: SentinelTiming = {
  cycle: 4.2,
  telegraph: 1.4,
  active: 0.30,
  beamLength: 26.0,
  beamWidth: 2.2,
  damage: 18.0,
  healthMax: 120.0,
  downDuration: 4.0,
};

export function isInvulnerableAt(actionName: string, timeInAction: number): boolean {
  const window = COMBAT_WINDOWS[actionName];
  if (!window || window.iFrameStart < 0) return false;
  return timeInAction >= window.iFrameStart && timeInAction < window.iFrameEnd;
}

export function isRecoveryAt(actionName: string, timeInAction: number): boolean {
  const window = COMBAT_WINDOWS[actionName];
  if (!window) return false;
  return timeInAction >= window.recoveryStart && timeInAction <= window.recoveryEnd;
}
