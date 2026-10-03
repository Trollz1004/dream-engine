/**
 * DREAM Engine — Combat Authoritative Manager
 * Orchestrates combat state, stamina/health pools, inputs, hit resolution,
 * sentinel interactions, and event logging.
 * Strict conformance to docs/gdd/02-action-combat.md and godot slice scripts.
 */

import { DashState } from './dash-state';
import { AttackState } from './attack-state';
import { HeavyAttackState } from './heavy-attack-state';
import { GuardState } from './guard-state';
import { LungeState } from './lunge-state';
import { BurstState } from './burst-state';
import { Combo } from './combo';
import { HollowSentinel } from './sentinel';
import { EventLog } from './event-log';
import { createWorldEvent, createPerfectDodgeEvent } from '../contracts/world-event';
import { Vec3 } from '../math/vec3';

export interface CombatFeedback {
  lastEvent: string;
  eventAge: number;
  hitFlashTime: number;
  screenShakeTime: number;
}

export class CombatManager {
  static readonly HEALTH_MAX: number = 100.0;
  static readonly STAMINA_MAX: number = 100.0;
  static readonly STAMINA_REGEN: number = 20.0;
  static readonly SPRINT_DRAIN: number = 10.0;
  static readonly DOUBLE_TAP_WINDOW: number = 0.30;
  static readonly HIT_FLASH_DURATION: number = 0.28;
  static readonly WALK_SPEED: number = 5.5;
  static readonly SPRINT_SPEED: number = 9.5;

  health: number = CombatManager.HEALTH_MAX;
  stamina: number = CombatManager.STAMINA_MAX;

  readonly dash = new DashState();
  readonly attack = new AttackState();
  readonly heavy = new HeavyAttackState();
  readonly guard = new GuardState();
  readonly lunge = new LungeState();
  readonly burst = new BurstState();
  readonly sentinel = new HollowSentinel(new Vec3(0, 0, -10));
  readonly eventLog = new EventLog();

  // Double tap tracking
  private _lastTapTime: Record<string, number> = {};
  autoSprint: boolean = false;

  // Directions
  dashDirection: Vec3 = new Vec3(0, 0, -1);
  lungeDirection: Vec3 = new Vec3(0, 0, -1);

  // Readout & effects
  lastEventText: string = 'Ready';
  eventAge: number = 0.0;
  hitFlashTime: number = 0.0;
  screenShakeTime: number = 0.0;

  // Visual effects queues for renderer
  activeSlashArcs: Array<{
    x: number;
    y: number;
    z: number;
    yaw: number;
    radius: number;
    halfArc: number;
    duration: number;
    elapsed: number;
  }> = [];

  activeBursts: Array<{
    x: number;
    y: number;
    z: number;
    radius: number;
    duration: number;
    elapsed: number;
  }> = [];

  // Register tap for double-tap auto-sprint
  registerDirectionTap(direction: string, currentTime: number): void {
    const last = this._lastTapTime[direction] || 0;
    if (currentTime - last <= CombatManager.DOUBLE_TAP_WINDOW) {
      this.autoSprint = true;
      this.say('Auto-sprint engaged');
    }
    this._lastTapTime[direction] = currentTime;
  }

  // Handle skill activation
  trySkill(
    direction: string,
    shift: boolean,
    actionKey: string,
    cameraYaw: number,
    playerPos: Vec3
  ): string {
    const skill = Combo.resolve(direction, shift, actionKey);
    if (skill === Combo.MOVEMENT) return skill;

    // Shift + direction + action key = Dash
    if (shift && direction !== '') {
      if (!this.dash.canStart(this.stamina)) {
        this.say(`${skill} not ready`);
        return skill;
      }
      this.stamina -= DashState.STAMINA_COST;
      this.dash.start();
      this.autoSprint = false;

      // Compute dash vector relative to camera yaw
      this.dashDirection = this.calculateDirectionVector(direction, cameraYaw);
      this.say(`Dash ${skill}`);

      this.eventLog.append(
        createWorldEvent('player.dash', 'first-gate', ['player:player-001'], {
          skill,
          direction,
          staminaRemaining: this.stamina,
        })
      );
      return skill;
    }

    if (actionKey === 'LMB') {
      if (this.heavy.isAttacking()) {
        this.say('Swing not ready');
      } else if (this.attack.canStart(this.stamina)) {
        this.stamina -= AttackState.STAMINA_COST;
        this.attack.start();
        const step = this.attack.step();
        this.say(`Swing ${step}`);

        // Add visual slash arc
        this.activeSlashArcs.push({
          x: playerPos.x,
          y: playerPos.y + 0.9,
          z: playerPos.z,
          yaw: cameraYaw,
          radius: AttackState.REACH * 0.7,
          halfArc: AttackState.HALF_ARC,
          duration: AttackState.STARTUP + AttackState.ACTIVE,
          elapsed: 0,
        });

        this.eventLog.append(
          createWorldEvent('player.light_attack', 'first-gate', ['player:player-001'], {
            step,
            staminaRemaining: this.stamina,
          })
        );
      } else {
        this.say('Swing not ready');
      }
      return skill;
    }

    if (actionKey === 'RMB') {
      if (this.attack.isAttacking()) {
        this.say('Heavy not ready');
      } else if (this.heavy.canStart(this.stamina)) {
        this.stamina -= HeavyAttackState.STAMINA_COST;
        this.heavy.start();
        this.say('Heavy swing');

        this.activeSlashArcs.push({
          x: playerPos.x,
          y: playerPos.y + 0.9,
          z: playerPos.z,
          yaw: cameraYaw,
          radius: HeavyAttackState.REACH * 0.8,
          halfArc: HeavyAttackState.HALF_ARC,
          duration: HeavyAttackState.STARTUP + HeavyAttackState.ACTIVE,
          elapsed: 0,
        });

        this.eventLog.append(
          createWorldEvent('player.heavy_attack', 'first-gate', ['player:player-001'], {
            damage: HeavyAttackState.DAMAGE,
            staminaRemaining: this.stamina,
          })
        );
      } else {
        this.say('Heavy not ready');
      }
      return skill;
    }

    if (skill === 'Q') {
      if (this.guard.canStart(this.stamina)) {
        this.stamina -= GuardState.STAMINA_COST;
        this.guard.start();
        this.say('Guard up');

        this.eventLog.append(
          createWorldEvent('player.guard', 'first-gate', ['player:player-001'], {
            blockReduction: GuardState.BLOCK_REDUCTION,
            staminaRemaining: this.stamina,
          })
        );
      } else {
        this.say('Guard not ready');
      }
      return skill;
    }

    if (skill === 'W+F') {
      if (this.lunge.canStart(this.stamina)) {
        this.stamina -= LungeState.STAMINA_COST;
        this.lunge.start();
        this.lungeDirection = this.calculateDirectionVector('W', cameraYaw);
        this.say('Dream Lunge');

        this.eventLog.append(
          createWorldEvent('player.lunge', 'first-gate', ['player:player-001'], {
            travelDistance: LungeState.TRAVEL_DISTANCE,
            damage: LungeState.DAMAGE,
            staminaRemaining: this.stamina,
          })
        );
      } else {
        this.say('Lunge not ready');
      }
      return skill;
    }

    if (skill === 'R') {
      if (this.burst.canStart(this.stamina)) {
        this.stamina -= BurstState.STAMINA_COST;
        this.burst.start();
        this.say('Nightveil Burst');

        this.activeBursts.push({
          x: playerPos.x,
          y: playerPos.y + 0.1,
          z: playerPos.z,
          radius: BurstState.RADIUS,
          duration: BurstState.STARTUP + BurstState.ACTIVE,
          elapsed: 0,
        });

        this.eventLog.append(
          createWorldEvent('player.burst', 'first-gate', ['player:player-001'], {
            radius: BurstState.RADIUS,
            damage: BurstState.DAMAGE,
            staminaRemaining: this.stamina,
          })
        );
      } else {
        this.say('Burst not ready');
      }
      return skill;
    }

    // Any other skill without move implementation marks its name on screen
    this.say(`Skill ${skill}`);
    return skill;
  }

  calculateDirectionVector(direction: string, cameraYaw: number): Vec3 {
    let forward = 0;
    let right = 0;
    if (direction === 'W') forward = 1;
    else if (direction === 'S') forward = -1;
    else if (direction === 'D') right = 1;
    else if (direction === 'A') right = -1;

    const baseForwardX = -Math.sin(cameraYaw);
    const baseForwardZ = -Math.cos(cameraYaw);
    const baseRightX = Math.cos(cameraYaw);
    const baseRightZ = -Math.sin(cameraYaw);

    const dirX = baseForwardX * forward + baseRightX * right;
    const dirZ = baseForwardZ * forward + baseRightZ * right;
    const len = Math.sqrt(dirX * dirX + dirZ * dirZ);
    if (len > 0.001) {
      return new Vec3(dirX / len, 0, dirZ / len);
    }
    return new Vec3(baseForwardX, 0, baseForwardZ);
  }

  update(
    delta: number,
    playerPos: Vec3,
    isSprinting: boolean,
    cameraYaw: number
  ): void {
    this.dash.advance(delta);
    this.attack.advance(delta);
    this.heavy.advance(delta);
    this.guard.advance(delta);
    this.lunge.advance(delta);
    this.burst.advance(delta);

    this.eventAge += delta;
    this.hitFlashTime = Math.max(0.0, this.hitFlashTime - delta);
    this.screenShakeTime = Math.max(0.0, this.screenShakeTime - delta);

    // Update active VFX lifetimes
    for (let i = this.activeSlashArcs.length - 1; i >= 0; i--) {
      this.activeSlashArcs[i].elapsed += delta;
      if (this.activeSlashArcs[i].elapsed >= this.activeSlashArcs[i].duration) {
        this.activeSlashArcs.splice(i, 1);
      }
    }
    for (let i = this.activeBursts.length - 1; i >= 0; i--) {
      this.activeBursts[i].elapsed += delta;
      if (this.activeBursts[i].elapsed >= this.activeBursts[i].duration) {
        this.activeBursts.splice(i, 1);
      }
    }

    // Stamina Regeneration & Drain
    if (isSprinting) {
      this.stamina = Math.max(0.0, this.stamina - CombatManager.SPRINT_DRAIN * delta);
    } else if (!this.dash.isDashing() && !this.lunge.isLunging()) {
      this.stamina = Math.min(
        CombatManager.STAMINA_MAX,
        this.stamina + CombatManager.STAMINA_REGEN * delta
      );
    }

    // Update Hollow Sentinel
    this.sentinel.update(
      delta,
      playerPos,
      (sentinel) => {
        // When beam fires
        this.eventLog.append(
          createWorldEvent('sentinel.beam_fired', 'first-gate', ['npc:sentinel-001'], {
            attackName: HollowSentinel.ATTACK_NAME,
            damage: HollowSentinel.DAMAGE,
          })
        );

        if (sentinel.hitsPlayer(playerPos)) {
          this.tryTakeHit(HollowSentinel.DAMAGE, HollowSentinel.ATTACK_NAME);
        }
      },
      () => {
        // When sentinel defeated
        this.say('Sentinel defeated! Rebuilding in 4.0s');
        this.eventLog.append(
          createWorldEvent('sentinel.defeated', 'first-gate', ['npc:sentinel-001'], {
            respawnDuration: HollowSentinel.DOWN_DURATION,
          })
        );
      },
      () => {
        // When sentinel revives
        this.say('Sentinel re-awakened');
      }
    );

    // Resolve Player attacks against Sentinel
    this.resolveAttackHits(playerPos, cameraYaw);
  }

  // Attempt to hit player from external attack (e.g. Sentinel Focus Beam)
  tryTakeHit(damage: number, attackName: string = HollowSentinel.ATTACK_NAME): boolean {
    if (this.dash.isInvulnerable()) {
      this.say('PERFECT DODGE');
      const event = createPerfectDodgeEvent(
        'player-001',
        'cross-eyed-0001',
        'sentinel-001',
        attackName,
        'first-gate'
      );
      this.eventLog.append(event);
      return false;
    }

    let taken = damage;
    const blocked = this.guard.isActive();
    if (blocked) {
      taken *= 1.0 - GuardState.BLOCK_REDUCTION;
      this.say(`BLOCKED for ${Math.round(taken)}`);
    } else {
      this.say(`HIT for ${Math.round(taken)}`);
    }

    this.health = Math.max(0.0, this.health - taken);
    this.hitFlashTime = CombatManager.HIT_FLASH_DURATION;
    this.screenShakeTime = 0.25;

    this.eventLog.append(
      createWorldEvent('player.hit_taken', 'first-gate', ['player:player-001'], {
        attackName,
        damageTaken: taken,
        blocked,
        healthRemaining: this.health,
      })
    );

    if (this.health <= 0.0) {
      this.health = CombatManager.HEALTH_MAX;
      this.say('DOWN - health reset');
    }

    return true;
  }

  // Resolve player melee attacks against Sentinel
  private resolveAttackHits(playerPos: Vec3, cameraYaw: number): void {
    if (this.sentinel.isDown()) return;

    const toSentinelX = this.sentinel.position.x - playerPos.x;
    const toSentinelZ = this.sentinel.position.z - playerPos.z;
    const distToSentinel = Math.sqrt(toSentinelX * toSentinelX + toSentinelZ * toSentinelZ);

    // Facing direction
    const facingX = -Math.sin(cameraYaw);
    const facingZ = -Math.cos(cameraYaw);

    // Light attack chain hit
    if (this.attack.takeHitWindow()) {
      if (distToSentinel <= AttackState.REACH) {
        const dot = (toSentinelX * facingX + toSentinelZ * facingZ) / (distToSentinel || 1);
        const angle = Math.acos(Math.max(-1, Math.min(1, dot)));
        if (angle <= AttackState.HALF_ARC) {
          const dmg = this.attack.damageForStep(this.attack.step());
          this.sentinel.takeHit(dmg);
          this.say(`Swing ${this.attack.step()} hit for ${Math.round(dmg)}`);
          this.screenShakeTime = 0.12;

          this.eventLog.append(
            createWorldEvent('player.hit_landed', 'first-gate', ['player:player-001', 'npc:sentinel-001'], {
              attackType: 'light',
              step: this.attack.step(),
              damage: dmg,
              sentinelHealthRemaining: this.sentinel.health,
            })
          );
        } else {
          this.say(`Swing ${this.attack.step()} missed`);
        }
      } else {
        this.say(`Swing ${this.attack.step()} missed`);
      }
    }

    // Heavy attack hit
    if (this.heavy.takeHitWindow()) {
      if (distToSentinel <= HeavyAttackState.REACH) {
        const dot = (toSentinelX * facingX + toSentinelZ * facingZ) / (distToSentinel || 1);
        const angle = Math.acos(Math.max(-1, Math.min(1, dot)));
        if (angle <= HeavyAttackState.HALF_ARC) {
          this.sentinel.takeHit(HeavyAttackState.DAMAGE);
          this.say(`Heavy swing hit for ${Math.round(HeavyAttackState.DAMAGE)}`);
          this.screenShakeTime = 0.22;

          this.eventLog.append(
            createWorldEvent('player.hit_landed', 'first-gate', ['player:player-001', 'npc:sentinel-001'], {
              attackType: 'heavy',
              damage: HeavyAttackState.DAMAGE,
              sentinelHealthRemaining: this.sentinel.health,
            })
          );
        } else {
          this.say('Heavy swing missed');
        }
      } else {
        this.say('Heavy swing missed');
      }
    }

    // Lunge hit
    if (this.lunge.takeHitWindow()) {
      if (distToSentinel <= LungeState.REACH) {
        const dot = (toSentinelX * facingX + toSentinelZ * facingZ) / (distToSentinel || 1);
        const angle = Math.acos(Math.max(-1, Math.min(1, dot)));
        if (angle <= LungeState.HALF_ARC) {
          this.sentinel.takeHit(LungeState.DAMAGE);
          this.say(`Dream Lunge hit for ${Math.round(LungeState.DAMAGE)}`);
          this.screenShakeTime = 0.18;

          this.eventLog.append(
            createWorldEvent('player.hit_landed', 'first-gate', ['player:player-001', 'npc:sentinel-001'], {
              attackType: 'lunge',
              damage: LungeState.DAMAGE,
              sentinelHealthRemaining: this.sentinel.health,
            })
          );
        } else {
          this.say('Dream Lunge missed');
        }
      } else {
        this.say('Dream Lunge missed');
      }
    }

    // Burst hit
    if (this.burst.takeHitWindow()) {
      this.screenShakeTime = 0.25;
      if (distToSentinel <= BurstState.RADIUS) {
        this.sentinel.takeHit(BurstState.DAMAGE);
        this.say(`Nightveil Burst hit for ${Math.round(BurstState.DAMAGE)}`);

        this.eventLog.append(
          createWorldEvent('player.hit_landed', 'first-gate', ['player:player-001', 'npc:sentinel-001'], {
            attackType: 'burst',
            damage: BurstState.DAMAGE,
            sentinelHealthRemaining: this.sentinel.health,
          })
        );
      }
    }
  }

  // Returns character capsule glow color:
  // Yellow during invulnerable window; red during recovery; white/red during hit flash
  getCharacterGlow(timeOfDay: 'day' | 'night'): {
    r: number;
    g: number;
    b: number;
    isGlow: boolean;
    stateName: string;
  } {
    if (this.dash.isInvulnerable()) {
      // Glows YELLOW during the invulnerable window and only then!
      return { r: 1.0, g: 0.88, b: 0.15, isGlow: true, stateName: 'invulnerable' };
    }
    if (this.dash.isRecovery()) {
      // Recovery shows RED
      return { r: 0.95, g: 0.15, b: 0.15, isGlow: true, stateName: 'recovery' };
    }
    if (this.hitFlashTime > 0.0) {
      return { r: 1.0, g: 0.2, b: 0.2, isGlow: true, stateName: 'hit_flash' };
    }
    if (this.guard.isActive()) {
      return { r: 0.2, g: 0.6, b: 1.0, isGlow: true, stateName: 'guard' };
    }
    // Standard baseline visor glow
    if (timeOfDay === 'night') {
      return { r: 0.1, g: 0.85, b: 0.95, isGlow: false, stateName: 'idle' };
    }
    return { r: 0.95, g: 0.65, b: 0.2, isGlow: false, stateName: 'idle' };
  }

  say(text: string): void {
    this.lastEventText = text;
    this.eventAge = 0.0;
  }
}
