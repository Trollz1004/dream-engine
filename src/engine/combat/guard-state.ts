/**
 * DREAM Engine — Guard Stance
 * Exact parity with guard_state.gd and docs/gdd/02-action-combat.md
 * 
 * Q alone: absorbs 75% of incoming damage while active.
 */

export class GuardState {
  static readonly STARTUP: number = 0.08;
  static readonly ACTIVE: number = 0.45;
  static readonly RECOVERY: number = 0.25;
  static readonly COOLDOWN: number = 1.10; // from start of stance
  static readonly STAMINA_COST: number = 15.0;
  static readonly BLOCK_REDUCTION: number = 0.75; // 75% absorbed

  private _t: number = -1.0;
  private _cooldownLeft: number = 0.0;

  totalLength(): number {
    return GuardState.STARTUP + GuardState.ACTIVE + GuardState.RECOVERY;
  }

  isGuard(): boolean {
    return this._t >= 0.0;
  }

  isActive(): boolean {
    return (
      this._t >= GuardState.STARTUP &&
      this._t < GuardState.STARTUP + GuardState.ACTIVE
    );
  }

  canStart(stamina: number): boolean {
    return !this.isGuard() && this._cooldownLeft <= 0.0 && stamina >= GuardState.STAMINA_COST;
  }

  start(): void {
    this._t = 0.0;
    this._cooldownLeft = GuardState.COOLDOWN;
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

  cooldownLeft(): number {
    return this._cooldownLeft;
  }

  phase(): 'cooling' | 'ready' | 'raising' | 'guarding' | 'recovering' {
    if (this._t < 0.0) {
      return this._cooldownLeft > 0.0 ? 'cooling' : 'ready';
    }
    if (this._t < GuardState.STARTUP) return 'raising';
    if (this._t < GuardState.STARTUP + GuardState.ACTIVE) return 'guarding';
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
