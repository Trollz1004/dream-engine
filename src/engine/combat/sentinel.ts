/**
 * DREAM Engine — Hollow Sentinel Combat Automaton
 * Exact parity with dummy.gd and docs/gdd/02-action-combat.md
 * 
 * Signature Attack: Focus Beam (Cycle 4.2s, Wind-up 1.4s with locked aim, Active 0.30s)
 * Beam Length: 26.0m, Beam Width: 2.2m, Damage: 18.0, Max Health: 120.0, Down Duration: 4.0s
 */

import { Vec3 } from '../math/vec3';

export class HollowSentinel {
  static readonly CYCLE: number = 4.2;
  static readonly TELEGRAPH: number = 1.4;
  static readonly ACTIVE: number = 0.30;
  static readonly BEAM_LENGTH: number = 26.0;
  static readonly BEAM_WIDTH: number = 2.2;
  static readonly DAMAGE: number = 18.0;
  static readonly HEALTH_MAX: number = 120.0;
  static readonly DOWN_DURATION: number = 4.0;
  static readonly DISPLAY_NAME: string = 'Hollow Sentinel';
  static readonly ATTACK_NAME: string = 'Focus Beam';

  position: Vec3;
  health: number = HollowSentinel.HEALTH_MAX;
  display_name: string = HollowSentinel.DISPLAY_NAME;

  private _t: number = 0.0;
  private _downFor: number = 0.0;
  private _flinch: number = 0.0;
  private _aim: Vec3 = new Vec3(0, 0, 1);
  private _resolved: boolean = false;
  private _beamFiredThisCycle: boolean = false;

  constructor(position: Vec3 = new Vec3(0, 0, -10)) {
    this.position = position.clone();
  }

  update(
    delta: number,
    playerPosition: Vec3,
    onFireBeam?: (sentinel: HollowSentinel) => void,
    onDown?: () => void,
    onRevive?: () => void
  ): void {
    this._flinch = Math.max(0.0, this._flinch - delta);

    if (this._downFor > 0.0) {
      this._downFor -= delta;
      if (this._downFor <= 0.0) {
        this.health = HollowSentinel.HEALTH_MAX;
        this._t = 0.0;
        this._resolved = false;
        this._beamFiredThisCycle = false;
        if (onRevive) onRevive();
      }
      return;
    }

    this._t = (this._t + delta) % HollowSentinel.CYCLE;
    const telegraphStart =
      HollowSentinel.CYCLE - HollowSentinel.TELEGRAPH - HollowSentinel.ACTIVE; // 2.5s
    const activeStart = HollowSentinel.CYCLE - HollowSentinel.ACTIVE; // 3.9s

    if (this._t < telegraphStart) {
      // Idle phase
      this._resolved = false;
      this._beamFiredThisCycle = false;
    } else if (this._t < activeStart) {
      // Wind-up / Telegraph phase (1.4s)
      const windupProgress =
        (this._t - telegraphStart) / HollowSentinel.TELEGRAPH;

      // Lock aim at the start of wind-up (progress < 0.05)
      if (windupProgress < 0.05) {
        const toPlayer = new Vec3(
          playerPosition.x - this.position.x,
          0.0,
          playerPosition.z - this.position.z
        );
        const len = toPlayer.length();
        if (len > 0.01) {
          this._aim = toPlayer.normalize();
        }
      }
    } else {
      // Active Fire Phase (0.30s)
      if (!this._beamFiredThisCycle) {
        this._beamFiredThisCycle = true;
        if (onFireBeam) {
          onFireBeam(this);
        }
      }
    }
  }

  hitsPlayer(playerPosition: Vec3): boolean {
    const toPlayerX = playerPosition.x - this.position.x;
    const toPlayerZ = playerPosition.z - this.position.z;

    // along = toPlayer . aim
    const along = toPlayerX * this._aim.x + toPlayerZ * this._aim.z;
    if (along < 0.0 || along > HollowSentinel.BEAM_LENGTH) {
      return false;
    }

    // across = length(toPlayer - aim * along)
    const acrossX = toPlayerX - this._aim.x * along;
    const acrossZ = toPlayerZ - this._aim.z * along;
    const across = Math.sqrt(acrossX * acrossX + acrossZ * acrossZ);

    return across <= HollowSentinel.BEAM_WIDTH * 0.5;
  }

  takeHit(damage: number, onDefeated?: () => void): boolean {
    if (this._downFor > 0.0) return false;
    this.health = Math.max(0.0, this.health - damage);
    this._flinch = 0.18;
    if (this.health <= 0.0) {
      this._downFor = HollowSentinel.DOWN_DURATION;
      this._resolved = true;
      if (onDefeated) onDefeated();
      return true;
    }
    return false;
  }

  isDown(): boolean {
    return this._downFor > 0.0;
  }

  isTelegraphing(): boolean {
    if (this._downFor > 0.0) return false;
    const telegraphStart =
      HollowSentinel.CYCLE - HollowSentinel.TELEGRAPH - HollowSentinel.ACTIVE;
    const activeStart = HollowSentinel.CYCLE - HollowSentinel.ACTIVE;
    return this._t >= telegraphStart && this._t < activeStart;
  }

  isFiring(): boolean {
    if (this._downFor > 0.0) return false;
    const activeStart = HollowSentinel.CYCLE - HollowSentinel.ACTIVE;
    return this._t >= activeStart;
  }

  telegraphProgress(): number {
    if (!this.isTelegraphing()) return 0.0;
    const telegraphStart =
      HollowSentinel.CYCLE - HollowSentinel.TELEGRAPH - HollowSentinel.ACTIVE;
    return Math.max(
      0.0,
      Math.min(1.0, (this._t - telegraphStart) / HollowSentinel.TELEGRAPH)
    );
  }

  get aimDirection(): Vec3 {
    return this._aim;
  }

  get cycleTime(): number {
    return this._t;
  }

  timeUntilFire(): number {
    if (this._downFor > 0.0) return -1.0;
    const activeStart = HollowSentinel.CYCLE - HollowSentinel.ACTIVE;
    if (this._t >= activeStart) return 0.0;
    return activeStart - this._t;
  }

  reset(): void {
    this.health = HollowSentinel.HEALTH_MAX;
    this._t = 0.0;
    this._downFor = 0.0;
    this._resolved = false;
    this._beamFiredThisCycle = false;
  }
}
