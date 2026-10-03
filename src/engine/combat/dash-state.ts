/**
 * DREAM Engine — Dash with Invulnerability Frames
 * Exact parity with dash_state.gd and docs/gdd/02-action-combat.md
 * 
 * Invulnerable through travel (0.25s), vulnerable on startup (0.06s),
 * wide open through recovery (0.30s).
 */

export class DashState {
  static readonly STARTUP: number = 0.06;
  static readonly INVULNERABLE: number = 0.25;
  static readonly RECOVERY: number = 0.30;
  static readonly COOLDOWN: number = 0.90; // from start of dash
  static readonly STAMINA_COST: number = 25.0;
  static readonly SPEED: number = 14.0; // metres per second

  private _t: number = -1.0;
  private _cooldownLeft: number = 0.0;

  totalLength(): number {
    return DashState.STARTUP + DashState.INVULNERABLE + DashState.RECOVERY;
  }

  canStart(stamina: number): boolean {
    return this._t < 0.0 && this._cooldownLeft <= 0.0 && stamina >= DashState.STAMINA_COST;
  }

  start(): void {
    this._t = 0.0;
    this._cooldownLeft = DashState.COOLDOWN;
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

  isDashing(): boolean {
    return this._t >= 0.0;
  }

  isInvulnerable(): boolean {
    return this._t >= DashState.STARTUP && this._t < DashState.STARTUP + DashState.INVULNERABLE;
  }

  isRecovery(): boolean {
    return this._t >= DashState.STARTUP + DashState.INVULNERABLE && this._t < this.totalLength();
  }

  cooldownLeft(): number {
    return this._cooldownLeft;
  }

  phase(): 'cooling' | 'ready' | 'startup' | 'invulnerable' | 'recovery' {
    if (this._t < 0.0) {
      return this._cooldownLeft > 0.0 ? 'cooling' : 'ready';
    }
    if (this._t < DashState.STARTUP) {
      return 'startup';
    }
    if (this._t < DashState.STARTUP + DashState.INVULNERABLE) {
      return 'invulnerable';
    }
    return 'recovery';
  }

  progress(): number {
    if (this._t < 0.0) return 0.0;
    return Math.max(0.0, Math.min(1.0, this._t / this.totalLength()));
  }

  // Debug/test inspection
  get time(): number {
    return this._t;
  }
}
