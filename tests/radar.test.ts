/**
 * DREAM Engine — Tactical Radar Minimap Projection Tests
 * Tests relative coordinate offsets, rotation by camera yaw,
 * distance measurement, and circumference clamping.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

export function calculateRelativeRadarPos(
  playerX: number,
  playerZ: number,
  poiX: number,
  poiZ: number,
  cameraYaw: number,
  range: number,
  radarRadius: number,
  mode: 'heading' | 'north'
): { relX: number; relZ: number; dist: number; sx: number; sy: number; clamped: boolean } {
  const dx = poiX - playerX;
  const dz = poiZ - playerZ;
  const dist = Math.sqrt(dx * dx + dz * dz);

  let relX = dx;
  let relZ = dz;

  if (mode === 'heading') {
    const cosY = Math.cos(cameraYaw);
    const sinY = Math.sin(cameraYaw);
    relX = dx * cosY - dz * sinY;
    relZ = dx * sinY + dz * cosY;
  }

  const scale = radarRadius / range;
  let sx = radarRadius + relX * scale;
  let sy = radarRadius + relZ * scale;
  let clamped = false;

  if (dist > range) {
    clamped = true;
    const angle = Math.atan2(relZ, relX);
    sx = radarRadius + Math.cos(angle) * radarRadius;
    sy = radarRadius + Math.sin(angle) * radarRadius;
  }

  return { relX, relZ, dist, sx, sy, clamped };
}

export function yawToHeadingDeg(yaw: number): number {
  let deg = Math.round((-yaw * 180) / Math.PI) % 360;
  if (deg < 0) deg += 360;
  if (deg === 0) deg = 0;
  return deg;
}

test('Radar Minimap: Distance and Heading Calculations', () => {
  // 1. Hollow Sentinel at (0, -10) from player at (0, 0), yaw = 0 (facing North -Z)
  const res1 = calculateRelativeRadarPos(0, 0, 0, -10, 0, 50, 80, 'heading');
  assert.equal(res1.dist, 10);
  assert.equal(res1.clamped, false);
  assert.equal(res1.relX, 0);
  assert.equal(res1.relZ, -10);
  // Screen position: sx is center (80), sy is upward (80 - 10/50*80 = 64)
  assert.equal(res1.sx, 80);
  assert.equal(res1.sy, 64);

  // 2. Turn 90 degrees right: cameraYaw = Math.PI / 2
  const res2 = calculateRelativeRadarPos(0, 0, 0, -10, Math.PI / 2, 50, 80, 'heading');
  assert.equal(res2.dist, 10);
  assert.ok(Math.abs(res2.relX - 10) < 1e-5);
  assert.ok(Math.abs(res2.relZ) < 1e-5);
  // Now to the right: sx = 80 + 16 = 96, sy = 80
  assert.ok(Math.abs(res2.sx - 96) < 1e-5);
  assert.ok(Math.abs(res2.sy - 80) < 1e-5);

  // 3. Turn 180 degrees: cameraYaw = Math.PI
  const res3 = calculateRelativeRadarPos(0, 0, 0, -10, Math.PI, 50, 80, 'heading');
  assert.equal(res3.dist, 10);
  assert.ok(Math.abs(res3.relX) < 1e-5);
  assert.ok(Math.abs(res3.relZ - 10) < 1e-5);
  // Directly behind: sx = 80, sy = 80 + 16 = 96
  assert.ok(Math.abs(res3.sx - 80) < 1e-5);
  assert.ok(Math.abs(res3.sy - 96) < 1e-5);

  // 4. Clamping when POI is beyond range
  // Far monolith at (0, -100) with range = 40m
  const res4 = calculateRelativeRadarPos(0, 0, 0, -100, 0, 40, 80, 'heading');
  assert.equal(res4.dist, 100);
  assert.equal(res4.clamped, true);
  // Clamped directly to perimeter (angle -PI/2 -> sx = 80, sy = 0)
  assert.ok(Math.abs(res4.sx - 80) < 1e-5);
  assert.ok(Math.abs(res4.sy - 0) < 1e-5);

  // 5. Compass Heading Degree conversion
  assert.equal(yawToHeadingDeg(0), 0); // North
  assert.equal(yawToHeadingDeg(-Math.PI / 2), 90); // East
  assert.equal(yawToHeadingDeg(-Math.PI), 180); // South
  assert.equal(yawToHeadingDeg(-3 * Math.PI / 2), 270); // West
});
