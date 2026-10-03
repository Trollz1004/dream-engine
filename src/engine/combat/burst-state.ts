/**
 * DREAM Engine — Nightveil Burst (R alone)
 * Exact parity with burst_state.gd and docs/gdd/02-action-combat.md
 * 
 * Radial shockwave around player with radius 4.0m.
 */

export class BurstState {
  static readonly STARTUP: number = 0.30;
  static readonly ACTIVE: number = 0.10;
  static readonly RECOVERY: number = 0.35;
  static readonly COOLDOWN: number = 8.0; // from start of burst
  static readonly STAMINA_COST: number = 25.0;
  static readonly DAMAGE: number = 25.0;
  static readonly RADIUS: number = 4.0; // metres

  private _t: number = -1.0;
  private _cooldownLeft: number = 0.0;
  private _hitUsed: boolean = false;

  totalLength(): number {
    return BurstState.STARTUP + BurstState.ACTIVE + BurstState.RECOVERY;
  }

  isBursting(): boolean {
    return this._t >= 0.0;
  }

  isActive(): boolean {
    return (
      this._t >= BurstState.STARTUP &&
      this._t < BurstState.STARTUP + BurstState.ACTIVE
    );
  }

  canStart(stamina: number): boolean {
    return this._t < 0.0 && this._cooldownLeft <= 0.0 && stamina >= BurstState.STAMINA_COST;
  }

  start(): void {
    this._t = 0.0;
    this._hitUsed = false;
    this._cooldownLeft = BurstState.COOLDOWN;
  }

  advance(delta: number): void {
    if (this._t >= 0.0) {
      this._t += delta;
      if (this._t >= this.totalLength()) {
        this._t = -1.0;
      }
    }
    this._cooldownLeft = Math.max(0.0, this._cooldownLeft - delta);
  }

  takeHitWindow(): boolean {
    if (!this.isActive() || this._hitUsed) return false;
    this._hitUsed = true;
    return true;
  }

  cooldownLeft(): number {
    return this._cooldownLeft;
  }

  phase(): 'cooling' | 'ready' | 'windup' | 'burst' | 'recovery' {
    if (this._t < 0.0) {
      return this._cooldownLeft > 0.0 ? 'cooling' : 'ready';
    }
    if (this._t < BurstState.STARTUP) return 'windup';
    if (this._t < BurstState.STARTUP + BurstState.ACTIVE) return 'burst';
    return 'recovery';
  }

  progress(): number {
    if (this._t < 0.0) return 0.0;
    return Math.max(0.0, Math.min(1.0, this._t / this.totalLength()));
  }

  static hits(
    centerX: number,
    centerZ: number,
    targetX: number,
    targetZ: number
  ): boolean {
    const dx = targetX - centerX;
    const dz = targetZ - centerZ;
    return Math.sqrt(dx * dx + dz * dz) <= BurstState.RADIUS;
  }

  get time(): number {
    return this._t;
  }
}
