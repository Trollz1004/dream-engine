import test from 'node:test';
import assert from 'node:assert/strict';
import {
  COMBAT_WINDOWS,
  SENTINEL_TIMING,
  isInvulnerableAt,
  isRecoveryAt
} from '../src/engine/contracts/combat-windows.ts';
import { DashState } from '../src/engine/combat/dash-state.ts';
import { AttackState } from '../src/engine/combat/attack-state.ts';
import { HeavyAttackState } from '../src/engine/combat/heavy-attack-state.ts';
import { GuardState } from '../src/engine/combat/guard-state.ts';
import { LungeState } from '../src/engine/combat/lunge-state.ts';
import { BurstState } from '../src/engine/combat/burst-state.ts';
import { HollowSentinel } from '../src/engine/combat/sentinel.ts';
import { Combo } from '../src/engine/combat/combo.ts';
import { CombatManager } from '../src/engine/combat/combat-manager.ts';
import { Vec3 } from '../src/engine/math/vec3.ts';

test('Stage 1 Parity: Dash timing windows, speed, stamina and i-frame verification', () => {
  const dash = new DashState();

  assert.equal(DashState.STARTUP, 0.06);
  assert.equal(DashState.INVULNERABLE, 0.25);
  assert.equal(DashState.RECOVERY, 0.30);
  assert.equal(DashState.COOLDOWN, 0.90);
  assert.equal(DashState.STAMINA_COST, 25.0);
  assert.equal(DashState.SPEED, 14.0);
  assert.equal(dash.totalLength(), 0.61);

  // Gated by stamina
  assert.equal(dash.canStart(24.9), false);
  assert.equal(dash.canStart(25.0), true);

  dash.start();
  assert.equal(dash.isDashing(), true);
  assert.equal(dash.phase(), 'startup');
  assert.equal(dash.isInvulnerable(), false);

  // At 0.05s: still startup (hittable)
  dash.advance(0.05);
  assert.equal(dash.isInvulnerable(), false);
  assert.equal(dash.phase(), 'startup');

  // At 0.07s: inside invulnerability window (cannot be hit)
  dash.advance(0.02); // t = 0.07s
  assert.equal(dash.isInvulnerable(), true);
  assert.equal(dash.phase(), 'invulnerable');

  // Through middle of travel at t = 0.25s: still invulnerable
  dash.advance(0.18); // t = 0.25s
  assert.equal(dash.isInvulnerable(), true);

  // At t = 0.32s: in recovery (wide open)
  dash.advance(0.07); // t = 0.32s
  assert.equal(dash.isInvulnerable(), false);
  assert.equal(dash.isRecovery(), true);
  assert.equal(dash.phase(), 'recovery');

  // At t = 0.62s: completed dash, now on cooldown
  dash.advance(0.30); // t = 0.62s
  assert.equal(dash.isDashing(), false);
  assert.equal(dash.phase(), 'cooling');
  assert.ok(dash.cooldownLeft() > 0.0);

  // Cooldown remaining prevents re-start even with enough stamina
  assert.equal(dash.canStart(100), false);

  // Advance cooldown to 0
  dash.advance(dash.cooldownLeft());
  assert.equal(dash.phase(), 'ready');
  assert.equal(dash.canStart(100), true);

  // Contract helper functions check
  assert.equal(isInvulnerableAt('dash', 0.01), false);
  assert.equal(isInvulnerableAt('dash', 0.10), true);
  assert.equal(isInvulnerableAt('dash', 0.30), true);
  assert.equal(isInvulnerableAt('dash', 0.35), false);
  assert.equal(isRecoveryAt('dash', 0.35), true);
});

test('Stage 1 Parity: Light attack chain timing, chaining windows and damage per step', () => {
  const attack = new AttackState();

  assert.equal(AttackState.STARTUP, 0.10);
  assert.equal(AttackState.ACTIVE, 0.12);
  assert.equal(AttackState.RECOVERY, 0.34);
  assert.equal(AttackState.MAX_STEPS, 3);
  assert.equal(AttackState.STAMINA_COST, 8.0);
  assert.equal(AttackState.REACH, 3.4);
  assert.equal(AttackState.HALF_ARC, 0.9);
  assert.equal(attack.totalLength(), 0.56);

  // Damage exact values per step
  assert.equal(attack.damageForStep(1), 10.0);
  assert.equal(attack.damageForStep(2), 14.0);
  assert.equal(attack.damageForStep(3), 21.0);

  // Step 1 swing
  attack.start();
  assert.equal(attack.step(), 1);
  assert.equal(attack.phase(), 'winding up');

  attack.advance(0.11); // t = 0.11s: in active window
  assert.equal(attack.isActive(), true);
  assert.equal(attack.phase(), 'striking');
  assert.equal(attack.takeHitWindow(), true);
  assert.equal(attack.takeHitWindow(), false); // hit once per swing

  // Cannot chain while active
  assert.equal(attack.canChain(), false);

  attack.advance(0.12); // t = 0.23s: in recovery (chain window opens)
  assert.equal(attack.isActive(), false);
  assert.equal(attack.canChain(), true);
  assert.equal(attack.phase(), 'recovering');

  // Chain into step 2
  assert.equal(attack.nextStep(), 2);
  attack.start();
  assert.equal(attack.step(), 2);

  // Advance to recovery and chain into step 3
  attack.advance(AttackState.STARTUP + AttackState.ACTIVE + 0.01);
  assert.equal(attack.nextStep(), 3);
  attack.start();
  assert.equal(attack.step(), 3);

  // Step 3 does not exceed MAX_STEPS
  attack.advance(AttackState.STARTUP + AttackState.ACTIVE + 0.01);
  assert.equal(attack.nextStep(), 3);
});

test('Stage 1 Parity: Heavy attack timing, damage, cooldown and reach', () => {
  const heavy = new HeavyAttackState();

  assert.equal(HeavyAttackState.STARTUP, 0.28);
  assert.equal(HeavyAttackState.ACTIVE, 0.14);
  assert.equal(HeavyAttackState.RECOVERY, 0.50);
  assert.equal(HeavyAttackState.COOLDOWN, 1.20);
  assert.equal(HeavyAttackState.STAMINA_COST, 18.0);
  assert.equal(HeavyAttackState.DAMAGE, 32.0);
  assert.equal(HeavyAttackState.REACH, 3.6);
  assert.equal(HeavyAttackState.HALF_ARC, 0.8);
  assert.equal(heavy.totalLength(), 0.92);

  heavy.start();
  assert.equal(heavy.isAttacking(), true);
  assert.equal(heavy.phase(), 'winding up');

  heavy.advance(0.29); // active window
  assert.equal(heavy.isActive(), true);
  assert.equal(heavy.phase(), 'striking');
  assert.equal(heavy.takeHitWindow(), true);
  assert.equal(heavy.takeHitWindow(), false);

  heavy.advance(0.15); // recovery
  assert.equal(heavy.phase(), 'recovering');

  heavy.advance(0.50); // swing ended, cooldown outlasts recovery
  assert.equal(heavy.isAttacking(), false);
  assert.equal(heavy.phase(), 'cooling');
  assert.ok(heavy.cooldownLeft() > 0.0);
});

test('Stage 1 Parity: Guard stance timing, cooldown, stamina cost and 75% absorption', () => {
  const guard = new GuardState();

  assert.equal(GuardState.STARTUP, 0.08);
  assert.equal(GuardState.ACTIVE, 0.45);
  assert.equal(GuardState.RECOVERY, 0.25);
  assert.equal(GuardState.COOLDOWN, 1.10);
  assert.equal(GuardState.STAMINA_COST, 15.0);
  assert.equal(GuardState.BLOCK_REDUCTION, 0.75);
  assert.equal(guard.totalLength(), 0.78);

  guard.start();
  assert.equal(guard.isGuard(), true);
  assert.equal(guard.phase(), 'raising');
  assert.equal(guard.isActive(), false);

  guard.advance(0.09); // active window
  assert.equal(guard.isActive(), true);
  assert.equal(guard.phase(), 'guarding');

  guard.advance(0.46); // recovery window
  assert.equal(guard.isActive(), false);
  assert.equal(guard.phase(), 'recovering');

  guard.advance(0.26); // cooldown window
  assert.equal(guard.isGuard(), false);
  assert.equal(guard.phase(), 'cooling');
});

test('Stage 1 Parity: Dream Lunge W+F timing, travel distance, damage and reach', () => {
  const lunge = new LungeState();

  assert.equal(LungeState.STARTUP, 0.08);
  assert.equal(LungeState.TRAVEL, 0.25);
  assert.equal(LungeState.RECOVERY, 0.22);
  assert.equal(LungeState.COOLDOWN, 4.0);
  assert.equal(LungeState.STAMINA_COST, 20.0);
  assert.equal(LungeState.DAMAGE, 18.0);
  assert.equal(LungeState.TRAVEL_DISTANCE, 6.0);
  assert.equal(LungeState.REACH, 6.5);
  assert.equal(LungeState.HALF_ARC, 0.35);
  assert.equal(lunge.totalLength(), 0.55);
  assert.equal(lunge.travelSpeed(), 24.0);

  lunge.start();
  assert.equal(lunge.isLunging(), true);
  assert.equal(lunge.phase(), 'startup');

  lunge.advance(0.09);
  assert.equal(lunge.isActive(), true);
  assert.equal(lunge.phase(), 'travel');
  assert.equal(lunge.takeHitWindow(), true);

  lunge.advance(0.26);
  assert.equal(lunge.isActive(), false);
  assert.equal(lunge.phase(), 'recovery');
});

test('Stage 1 Parity: Nightveil Burst R timing, radius, damage and cooldown', () => {
  const burst = new BurstState();

  assert.equal(BurstState.STARTUP, 0.30);
  assert.equal(BurstState.ACTIVE, 0.10);
  assert.equal(BurstState.RECOVERY, 0.35);
  assert.equal(BurstState.COOLDOWN, 8.0);
  assert.equal(BurstState.STAMINA_COST, 25.0);
  assert.equal(BurstState.DAMAGE, 25.0);
  assert.equal(BurstState.RADIUS, 4.0);
  assert.equal(burst.totalLength(), 0.75);

  burst.start();
  assert.equal(burst.isBursting(), true);
  assert.equal(burst.phase(), 'windup');

  burst.advance(0.31);
  assert.equal(burst.isActive(), true);
  assert.equal(burst.phase(), 'burst');
  assert.equal(burst.takeHitWindow(), true);

  // Radial hit test check
  assert.equal(BurstState.hits(0, 0, 3.5, 0), true);
  assert.equal(BurstState.hits(0, 0, 4.0, 0), true);
  assert.equal(BurstState.hits(0, 0, 4.1, 0), false);
});

test('Stage 1 Parity: Hollow Sentinel cycle timing, locked aim, beam geometry and health', () => {
  const sentinel = new HollowSentinel(new Vec3(0, 0, -10));

  assert.equal(HollowSentinel.CYCLE, 4.2);
  assert.equal(HollowSentinel.TELEGRAPH, 1.4);
  assert.equal(HollowSentinel.ACTIVE, 0.30);
  assert.equal(HollowSentinel.BEAM_LENGTH, 26.0);
  assert.equal(HollowSentinel.BEAM_WIDTH, 2.2);
  assert.equal(HollowSentinel.DAMAGE, 18.0);
  assert.equal(HollowSentinel.HEALTH_MAX, 120.0);
  assert.equal(HollowSentinel.DOWN_DURATION, 4.0);

  // Contract match check
  assert.equal(SENTINEL_TIMING.cycle, 4.2);
  assert.equal(SENTINEL_TIMING.telegraph, 1.4);
  assert.equal(SENTINEL_TIMING.active, 0.30);
  assert.equal(SENTINEL_TIMING.damage, 18.0);
  assert.equal(SENTINEL_TIMING.healthMax, 120.0);

  // Initial state: t=0 is idle
  sentinel.update(0.01, new Vec3(0, 0, 0));
  assert.equal(sentinel.isTelegraphing(), false);
  assert.equal(sentinel.isFiring(), false);

  // At t = 2.51s: enters telegraph (wind-up for 1.4s)
  sentinel.update(2.50, new Vec3(0, 0, 0));
  assert.equal(sentinel.isTelegraphing(), true);
  assert.equal(sentinel.isFiring(), false);

  // At t = 3.91s: enters fire phase (0.30s active beam)
  sentinel.update(1.40, new Vec3(0, 0, 0));
  assert.equal(sentinel.isFiring(), true);

  // Beam collision test (sentinel at 0, 0, -10, player at 0, 0, 0; distance along aim is 10m)
  assert.equal(sentinel.hitsPlayer(new Vec3(0, 0, 0)), true);
  // Across threshold: half-width is 1.1m
  assert.equal(sentinel.hitsPlayer(new Vec3(1.0, 0, 0)), true);
  assert.equal(sentinel.hitsPlayer(new Vec3(1.5, 0, 0)), false);
  // Past 26m length: sentinel at (0, 0, -10), player at (0, 0, 17) -> distance 27m
  assert.equal(sentinel.hitsPlayer(new Vec3(0, 0, 17)), false);

  // Damage and down duration
  sentinel.takeHit(120);
  assert.equal(sentinel.health, 0);
  assert.equal(sentinel.isDown(), true);

  // While down, does not fire
  sentinel.update(2.0, new Vec3(0, 0, 0));
  assert.equal(sentinel.isDown(), true);

  // Stands again after 4.0s at 120 HP
  sentinel.update(2.1, new Vec3(0, 0, 0));
  assert.equal(sentinel.isDown(), false);
  assert.equal(sentinel.health, 120.0);
});

test('Stage 1 Parity: Combo grammar resolution, Shift distinction and movement rule', () => {
  // Direction with Shift alone is MOVEMENT, never a skill
  assert.equal(Combo.resolve('W', true, ''), Combo.MOVEMENT);
  assert.equal(Combo.resolve('A', true, ''), Combo.MOVEMENT);

  // Skill is direction, optional Shift, and one action key
  assert.equal(Combo.resolve('W', false, 'F'), 'W+F');
  assert.equal(Combo.resolve('W', true, 'F'), 'W+SHIFT+F');
  assert.equal(Combo.resolve('', false, 'Q'), 'Q');
  assert.equal(Combo.resolve('', false, 'R'), 'R');
  assert.equal(Combo.resolve('', false, 'LMB'), 'LMB');
  assert.equal(Combo.resolve('', false, 'RMB'), 'RMB');
  assert.equal(Combo.resolve('S', true, 'Q'), 'S+SHIFT+Q');
});

test('Stage 1 Parity: CombatManager perfect dodge against Focus Beam and World Event logging', () => {
  const manager = new CombatManager();
  assert.equal(CombatManager.HEALTH_MAX, 100.0);
  assert.equal(CombatManager.STAMINA_MAX, 100.0);
  assert.equal(CombatManager.STAMINA_REGEN, 20.0);
  assert.equal(CombatManager.SPRINT_DRAIN, 10.0);
  assert.equal(CombatManager.DOUBLE_TAP_WINDOW, 0.30);
  assert.equal(CombatManager.HIT_FLASH_DURATION, 0.28);
  assert.equal(CombatManager.WALK_SPEED, 5.5);
  assert.equal(CombatManager.SPRINT_SPEED, 9.5);

  const initialEvents = manager.eventLog.count();

  // Test 1: Guard absorbs 75% of incoming 18.0 damage
  manager.trySkill('', false, 'Q', 0, new Vec3(0, 0, 0));
  manager.guard.advance(GuardState.STARTUP + 0.05); // in active guard
  assert.equal(manager.guard.isActive(), true);

  const hitSuccess = manager.tryTakeHit(18.0, 'Focus Beam');
  assert.equal(hitSuccess, true);
  // Damage taken: 18 * (1 - 0.75) = 4.5 -> Health = 100 - 4.5 = 95.5
  assert.equal(manager.health, 95.5);
  assert.equal(manager.eventLog.count() > initialEvents, true);

  // Test 2: Perfect Dodge through Focus Beam during invulnerable window
  manager.dash.start();
  manager.dash.advance(DashState.STARTUP + 0.05); // in invulnerable window
  assert.equal(manager.dash.isInvulnerable(), true);

  const dodgeResult = manager.tryTakeHit(18.0, 'Focus Beam');
  // Dashing during invulnerable window takes zero damage!
  assert.equal(dodgeResult, false);
  assert.equal(manager.health, 95.5); // undamaged!
  assert.equal(manager.lastEventText, 'PERFECT DODGE');

  // Verify world event was written to the log
  const allEvents = manager.eventLog.getAll();
  const lastEvent = allEvents[allEvents.length - 1];
  assert.equal(lastEvent.eventName, 'player.perfect_dodge');
  assert.equal(lastEvent.schemaVersion, '0.1.0');
  assert.equal((lastEvent.structuredPayload as Record<string, unknown>).dodgeResult, 'perfect');
  assert.equal((lastEvent.structuredPayload as Record<string, unknown>).iFrameConfirmed, true);
});
