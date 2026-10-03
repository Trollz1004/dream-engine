/**
 * DREAM Engine — Scripted Proof Sequence Timing Math Verification
 * Tests the exact mathematical constants and sequence windows for ?proof=1:
 * - 2.0s Walk
 * - Sentinel Cycle 1 Focus Beam dodge with exact dash startup (0.06s) and invulnerable window (0.25s)
 * - 0 perfect dodge damage
 * - 3-step Light chain (10, 14, 21 dmg) + Heavy attack (32 dmg)
 * - Sentinel Cycle 2 Focus Beam guard with exact startup (0.08s) and 75% absorption
 * - 4.5 guarded beam damage
 * - Dream Lunge (18 dmg) + Nightveil Burst (25 dmg) = 120 total damage
 * - Sentinel down for 4.0s
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { CombatManager } from '../src/engine/combat/combat-manager';
import { DashState } from '../src/engine/combat/dash-state';
import { AttackState } from '../src/engine/combat/attack-state';
import { HeavyAttackState } from '../src/engine/combat/heavy-attack-state';
import { GuardState } from '../src/engine/combat/guard-state';
import { LungeState } from '../src/engine/combat/lunge-state';
import { BurstState } from '../src/engine/combat/burst-state';
import { HollowSentinel } from '../src/engine/combat/sentinel';
import { Vec3 } from '../src/engine/math/vec3';

test('Scripted Proof Sequence: Constant Math and Timing Windows', () => {
  // 1. Verify Constants
  assert.equal(CombatManager.WALK_SPEED, 5.5);
  assert.equal(HollowSentinel.CYCLE, 4.2);
  assert.equal(HollowSentinel.TELEGRAPH, 1.4);
  assert.equal(HollowSentinel.ACTIVE, 0.3);
  assert.equal(HollowSentinel.DAMAGE, 18.0);
  assert.equal(HollowSentinel.HEALTH_MAX, 120.0);
  assert.equal(GuardState.BLOCK_REDUCTION, 0.75);

  // 2. Focus Beam Window Math
  const telegraphStart = HollowSentinel.CYCLE - HollowSentinel.TELEGRAPH - HollowSentinel.ACTIVE; // 2.50s
  const activeStart = HollowSentinel.CYCLE - HollowSentinel.ACTIVE; // 3.90s
  assert.equal(Number(telegraphStart.toFixed(2)), 2.5);
  assert.equal(Number(activeStart.toFixed(2)), 3.9);

  // 3. Dash Timing Alignment for Perfect Dodge
  // If dash starts at 3.84s:
  const dashTrigger = 3.84;
  const dashStartupEnd = dashTrigger + DashState.STARTUP; // 3.84 + 0.06 = 3.90s
  const dashInvulnEnd = dashStartupEnd + DashState.INVULNERABLE; // 3.90 + 0.25 = 4.15s
  assert.equal(Number(dashStartupEnd.toFixed(2)), 3.90);
  assert.equal(Number(dashInvulnEnd.toFixed(2)), 4.15);

  // Beam fires at 3.90s, exactly as invulnerability begins!
  assert.ok(dashStartupEnd <= activeStart && dashInvulnEnd >= activeStart);

  // 4. Guard Timing Alignment for 75% Absorption
  // Cycle 2 active beam fires at 4.2 + 3.9 = 8.10s
  const cycle2ActiveStart = HollowSentinel.CYCLE + activeStart; // 8.10s
  assert.equal(Number(cycle2ActiveStart.toFixed(2)), 8.10);

  // Guard triggered at 8.00s:
  const guardTrigger = 8.00;
  const guardStartupEnd = guardTrigger + GuardState.STARTUP; // 8.00 + 0.08 = 8.08s
  const guardActiveEnd = guardStartupEnd + GuardState.ACTIVE; // 8.08 + 0.45 = 8.53s
  assert.equal(Number(guardStartupEnd.toFixed(2)), 8.08);
  assert.equal(Number(guardActiveEnd.toFixed(2)), 8.53);
  assert.ok(guardStartupEnd <= cycle2ActiveStart && guardActiveEnd >= cycle2ActiveStart);

  // Beam active duration is 0.30s (from 8.10 to 8.40s).
  // Guard is active through 8.57s, absorbing 75% of incoming hit:
  const expectedGuardedDamage = HollowSentinel.DAMAGE * (1.0 - GuardState.BLOCK_REDUCTION);
  assert.equal(expectedGuardedDamage, 4.5);

  // 5. Total Attack Sequence Damage against Hollow Sentinel (120 HP)
  const l1Dmg = AttackState.DAMAGE_STEP_1; // 10
  const l2Dmg = AttackState.DAMAGE_STEP_2; // 14
  const l3Dmg = AttackState.DAMAGE_STEP_3; // 21
  const heavyDmg = HeavyAttackState.DAMAGE; // 32
  const lungeDmg = LungeState.DAMAGE; // 18
  const burstDmg = BurstState.DAMAGE; // 25
  const totalDmg = l1Dmg + l2Dmg + l3Dmg + heavyDmg + lungeDmg + burstDmg;
  assert.equal(totalDmg, 120.0);
  assert.equal(totalDmg, HollowSentinel.HEALTH_MAX);
});

test('Scripted Proof Sequence: Full Authoritative Simulation Run', () => {
  const combat = new CombatManager();
  const playerPos = new Vec3(0, 0, 3.5);
  const dt = 1 / 120;
  let simTime = 0.0;
  let perfectDodgeDamage = 0;
  let guardedBeamDamage = 0;
  let dashTriggered = false;
  let guardTriggered = false;
  let l1Triggered = false;
  let l2Triggered = false;
  let l3Triggered = false;
  let heavyTriggered = false;
  let lungeTriggered = false;
  let burstTriggered = false;

  // Step simulation up to 10 seconds
  const totalSteps = 10 * 120;
  for (let s = 0; s < totalSteps; s++) {
    simTime += dt;

    // 1. Walk 2.0s towards Sentinel
    if (simTime < 2.0) {
      playerPos.z -= CombatManager.WALK_SPEED * dt;
    }

    // 2. Dash at 3.84s
    if (simTime >= 3.84 && !dashTriggered) {
      dashTriggered = true;
      combat.trySkill('W', true, 'F', 0, playerPos);
    }

    // Measure perfect dodge damage during active beam
    if (simTime >= 3.90 && simTime <= 4.20) {
      perfectDodgeDamage = 100.0 - combat.health;
    }

    // 3. Three light attacks
    if (simTime >= 4.80 && !l1Triggered) {
      l1Triggered = true;
      combat.trySkill('', false, 'LMB', 0, playerPos);
    }
    if (simTime >= 5.05 && !l2Triggered) {
      l2Triggered = true;
      combat.trySkill('', false, 'LMB', 0, playerPos);
    }
    if (simTime >= 5.30 && !l3Triggered) {
      l3Triggered = true;
      combat.trySkill('', false, 'LMB', 0, playerPos);
    }

    // 4. One heavy strike (after L3 recovery finishes at 5.86s)
    if (simTime >= 5.90 && !heavyTriggered) {
      heavyTriggered = true;
      combat.trySkill('', false, 'RMB', 0, playerPos);
    }

    // 5. Guard at 8.00s
    if (simTime >= 8.00 && !guardTriggered) {
      guardTriggered = true;
      combat.trySkill('', false, 'Q', 0, playerPos);
    }

    // Measure guarded beam damage after cycle 2 beam
    if (simTime >= 8.35 && guardedBeamDamage === 0) {
      guardedBeamDamage = Number((100.0 - combat.health).toFixed(1));
    }

    // 6. Dream Lunge
    if (simTime >= 8.90 && !lungeTriggered) {
      lungeTriggered = true;
      combat.trySkill('W', false, 'F', 0, playerPos);
    }

    // 7. Nightveil Burst
    if (simTime >= 9.40 && !burstTriggered) {
      burstTriggered = true;
      combat.trySkill('', false, 'R', 0, playerPos);
    }

    // Authoritative update
    combat.update(dt, playerPos, false, 0);
  }

  // Exact assertions on outcomes
  assert.equal(perfectDodgeDamage, 0, 'Perfect dodge through beam must deal 0 damage');
  assert.equal(guardedBeamDamage, 4.5, 'Guarded beam must absorb 75% and deal exactly 4.5 damage');
  assert.equal(combat.sentinel.health, 0, 'Sentinel health must reach 0 from exact 120 damage combo');
  assert.ok(combat.sentinel.isDown(), 'Sentinel must be in down state');

  // Verify event log contains perfect dodge and beam events
  const events = combat.eventLog.getAll();
  assert.ok(events.length > 5, 'Event log must have recorded combat actions');
  const dodgeEvents = events.filter((e) => e.eventName === 'player.perfect_dodge');
  assert.equal(dodgeEvents.length, 1, 'Must have exactly 1 perfect dodge event');
  const hitTakenEvents = events.filter((e) => e.eventName === 'player.hit_taken');
  assert.ok(hitTakenEvents.length >= 1, 'Must have recorded guarded hit taken event');
  const hitPayload = hitTakenEvents[0].structuredPayload as Record<string, unknown>;
  assert.equal(hitPayload.damageTaken, 4.5);
  assert.equal(hitPayload.blocked, true);
});
