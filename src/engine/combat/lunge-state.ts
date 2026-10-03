/**
 * DREAM Engine — Dream Lunge (W+F)
 * Exact parity with lunge_state.gd and docs/gdd/02-action-combat.md
 * 
 * Forward gap-closing thrust covering 6 metres in 0.25 seconds.
 */

export class LungeState {
  static readonly STARTUP: number = 0.08;
  static readonly TRAVEL: number = 0.25;
  static readonly RECOVERY: number = 0.22;
  static readonly COOLDOWN: number = 4.0; // from start of lunge
  static readonly STAMINA_COST: number = 20.0;
  static readonly DAMAGE: number = 18.0;
  static readonly TRAVEL_DISTANCE: number = 6.0;
  static readonly REACH: number = 6.5; // metres
  static readonly HALF_ARC: number = 0.35; // radians (narrow thrust)

  private _t: number = -1.0;
  private _cooldownLeft: number = 0.0;
  private _hitUsed: boolean = false;

  totalLength(): number {
    return LungeState.STARTUP + LungeState.TRAVEL + LungeState.RECOVERY;
  }

  isLunging(): boolean {
    return this._t >= 0.0;
  }

  isActive(): boolean {
    return (
      this._t >= LungeState.STARTUP &&
      this._t < LungeState.STARTUP + LungeState.TRAVEL
    );
  }

  canStart(stamina: number): boolean {
    return this._t < 0.0 && this._cooldownLeft <= 0.0 && stamina >= LungeState.STAMINA_COST;
  }

  start(): void {
    this._t = 0.0;
    this._hitUsed = false;
    this._cooldownLeft = LungeState.COOLDOWN;
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

  travelSpeed(): number {
    return LungeState.TRAVEL_DISTANCE / LungeState.TRAVEL;
  }

  cooldownLeft(): number {
    return this._cooldownLeft;
  }

  phase(): 'cooling' | 'ready' | 'startup' | 'travel' | 'recovery' {
    if (this._t < 0.0) {
      return this._cooldownLeft > 0.0 ? 'cooling' : 'ready';
    }
    if (this._t < LungeState.STARTUP) return 'startup';
    if (this._t < LungeState.STARTUP + LungeState.TRAVEL) return 'travel';
    return 'recovery';
  }

  progress(): number {
    if (this._t < 0.0) return 0.0;
    return Math.max(0.0, Math.min(1.0, this._t / this.totalLength()));
  }

  get time(): number {
    return this._t;
  }
}
