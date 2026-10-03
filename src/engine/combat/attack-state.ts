/**
 * DREAM Engine — Light Attack Chain
 * Exact parity with attack_state.gd and docs/gdd/02-action-combat.md
 * 
 * 3-step chain; next swing can be entered once active window finishes,
 * during recovery.
 */

export class AttackState {
  static readonly STARTUP: number = 0.10;
  static readonly ACTIVE: number = 0.12;
  static readonly RECOVERY: number = 0.34;
  static readonly MAX_STEPS: number = 3;
  static readonly STAMINA_COST: number = 8.0;
  static readonly REACH: number = 3.4; // metres in front of character
  static readonly HALF_ARC: number = 0.9; // radians either side of facing
  static readonly DAMAGE_STEP_1: number = 10.0;
  static readonly DAMAGE_STEP_2: number = 14.0;
  static readonly DAMAGE_STEP_3: number = 21.0;

  private _t: number = -1.0;
  private _step: number = 0;
  private _hitUsed: boolean = false;

  totalLength(): number {
    return AttackState.STARTUP + AttackState.ACTIVE + AttackState.RECOVERY;
  }

  isAttacking(): boolean {
    return this._t >= 0.0;
  }

  isActive(): boolean {
    return this._t >= AttackState.STARTUP && this._t < AttackState.STARTUP + AttackState.ACTIVE;
  }

  canChain(): boolean {
    return this.isAttacking() && this._t >= AttackState.STARTUP + AttackState.ACTIVE;
  }

  nextStep(): number {
    if (this.isAttacking()) {
      return Math.min(this._step + 1, AttackState.MAX_STEPS);
    }
    return 1;
  }

  step(): number {
    return this._step;
  }

  canStart(stamina: number): boolean {
    if (stamina < AttackState.STAMINA_COST) return false;
    if (!this.isAttacking()) return true;
    return this.canChain();
  }

  start(): void {
    this._step = this.nextStep();
    this._t = 0.0;
    this._hitUsed = false;
  }

  advance(delta: number): void {
    if (this._t < 0.0) return;
    this._t += delta;
    if (this._t >= this.totalLength()) {
      this._t = -1.0;
      this._step = 0;
    }
  }

  takeHitWindow(): boolean {
    if (!this.isActive() || this._hitUsed) return false;
    this._hitUsed = true;
    return true;
  }

  damageForStep(stepNumber: number): number {
    switch (stepNumber) {
      case 1:
        return 10.0;
      case 2:
        return 14.0;
      case 3:
      default:
        return 21.0;
    }
  }

  phase(): 'ready' | 'winding up' | 'striking' | 'recovering' {
    if (this._t < 0.0) return 'ready';
    if (this._t < AttackState.STARTUP) return 'winding up';
    if (this._t < AttackState.STARTUP + AttackState.ACTIVE) return 'striking';
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
