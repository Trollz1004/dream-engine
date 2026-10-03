/**
 * DREAM Engine — Heavy Attack
 * Exact parity with heavy_attack_state.gd and docs/gdd/02-action-combat.md
 * 
 * One committed swing, gated by cooldown (1.20s from start).
 */

export class HeavyAttackState {
  static readonly STARTUP: number = 0.28;
  static readonly ACTIVE: number = 0.14;
  static readonly RECOVERY: number = 0.50;
  static readonly COOLDOWN: number = 1.20; // from start of swing
  static readonly STAMINA_COST: number = 18.0;
  static readonly DAMAGE: number = 32.0;
  static readonly REACH: number = 3.6; // metres
  static readonly HALF_ARC: number = 0.8; // radians

  private _t: number = -1.0;
  private _cooldownLeft: number = 0.0;
  private _hitUsed: boolean = false;

  totalLength(): number {
    return HeavyAttackState.STARTUP + HeavyAttackState.ACTIVE + HeavyAttackState.RECOVERY;
  }

  isAttacking(): boolean {
    return this._t >= 0.0;
  }

  isActive(): boolean {
    return (
      this._t >= HeavyAttackState.STARTUP &&
      this._t < HeavyAttackState.STARTUP + HeavyAttackState.ACTIVE
    );
  }

  canStart(stamina: number): boolean {
    return !this.isAttacking() && this._cooldownLeft <= 0.0 && stamina >= HeavyAttackState.STAMINA_COST;
  }

  start(): void {
    this._t = 0.0;
    this._hitUsed = false;
    this._cooldownLeft = HeavyAttackState.COOLDOWN;
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

  phase(): 'cooling' | 'ready' | 'winding up' | 'striking' | 'recovering' {
    if (this._t < 0.0) {
      return this._cooldownLeft > 0.0 ? 'cooling' : 'ready';
    }
    if (this._t < HeavyAttackState.STARTUP) return 'winding up';
    if (this._t < HeavyAttackState.STARTUP + HeavyAttackState.ACTIVE) return 'striking';
    return 'recovering';
  }

  progress(): number {
    if (this._t < 0.0) return 0.0;
    return Math.max(0.0, Math.min(1.0, this._t / this.totalLength()));
  }

  get time(): number {
    return this._t;
  }
}
