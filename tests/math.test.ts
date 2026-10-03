import test from 'node:test';
import assert from 'node:assert/strict';
import { Vec3 } from '../src/engine/math/vec3.ts';
import { Mat4 } from '../src/engine/math/mat4.ts';
import { Quat } from '../src/engine/math/quat.ts';
import { Ray, Capsule, AABB } from '../src/engine/math/collision.ts';

test('Math: Vec3 operations', () => {
  const a = new Vec3(1, 2, 3);
  const b = new Vec3(4, 5, 6);

  // Add
  const addRes = Vec3.add(a, b);
  assert.equal(addRes.x, 5);
  assert.equal(addRes.y, 7);
  assert.equal(addRes.z, 9);

  // Sub
  const subRes = Vec3.sub(b, a);
  assert.equal(subRes.x, 3);
  assert.equal(subRes.y, 3);
  assert.equal(subRes.z, 3);

  // Dot product
  assert.equal(a.dot(b), 1 * 4 + 2 * 5 + 3 * 6); // 4 + 10 + 18 = 32

  // Cross product
  const crossRes = Vec3.cross(new Vec3(1, 0, 0), new Vec3(0, 1, 0));
  assert.equal(crossRes.x, 0);
  assert.equal(crossRes.y, 0);
  assert.equal(crossRes.z, 1);

  // Length & Normalize
  const v = new Vec3(0, 3, 4);
  assert.equal(v.length(), 5);
  v.normalize();
  assert.ok(Math.abs(v.length() - 1) < 1e-5);
  assert.ok(Math.abs(v.y - 0.6) < 1e-5);
  assert.ok(Math.abs(v.z - 0.8) < 1e-5);

  // Lerp
  const l1 = new Vec3(0, 0, 0);
  const l2 = new Vec3(10, 20, 30);
  l1.lerp(l2, 0.5);
  assert.equal(l1.x, 5);
  assert.equal(l1.y, 10);
  assert.equal(l1.z, 15);
});

test('Math: Mat4 operations', () => {
  const m = new Mat4();
  assert.equal(m.elements[0], 1);
  assert.equal(m.elements[5], 1);
  assert.equal(m.elements[10], 1);
  assert.equal(m.elements[15], 1);

  // Translation
  m.makeTranslation(10, -5, 25);
  assert.equal(m.elements[12], 10);
  assert.equal(m.elements[13], -5);
  assert.equal(m.elements[14], 25);

  // Invert translation
  const inv = m.clone().invert();
  assert.equal(inv.elements[12], -10);
  assert.equal(inv.elements[13], 5);
  assert.equal(inv.elements[14], -25);

  // Multiply identity
  const m2 = new Mat4().identity();
  m2.multiply(m);
  assert.equal(m2.elements[12], 10);
  assert.equal(m2.elements[13], -5);
  assert.equal(m2.elements[14], 25);

  // Transform point
  const pt = new Vec3(1, 1, 1);
  const transformed = m.transformPoint(pt);
  assert.equal(transformed.x, 11);
  assert.equal(transformed.y, -4);
  assert.equal(transformed.z, 26);
});

test('Math: Quat operations', () => {
  const q = new Quat();
  assert.equal(q.w, 1);
  assert.equal(q.x, 0);

  // Axis angle rotation around Y 90 deg
  const qY90 = new Quat().setFromAxisAngle(new Vec3(0, 1, 0), Math.PI * 0.5);
  assert.ok(Math.abs(qY90.y - Math.sin(Math.PI * 0.25)) < 1e-5);
  assert.ok(Math.abs(qY90.w - Math.cos(Math.PI * 0.25)) < 1e-5);

  // Slerp halfway
  const qIdentity = new Quat();
  const qHalf = qIdentity.clone().slerp(qY90, 0.5);
  assert.ok(qHalf.y > 0);
  assert.ok(qHalf.w > 0);
});

test('Math: Ray and Capsule collisions', () => {
  // Ray plane intersection
  const ray = new Ray(new Vec3(0, 10, 0), new Vec3(0, -1, 0));
  const t = ray.intersectPlane(new Vec3(0, 1, 0), 0); // y = 0 plane
  assert.equal(t, 10);

  const hitPoint = ray.at(t!);
  assert.equal(hitPoint.x, 0);
  assert.equal(hitPoint.y, 0);
  assert.equal(hitPoint.z, 0);

  // Capsule ground clamping
  const capsule = new Capsule(new Vec3(2, -0.5, 3), 0.4, 1.8);
  assert.equal(capsule.intersectsGround(0), true);
  capsule.clampToGround(0);
  assert.equal(capsule.center.y, 0);
  assert.equal(capsule.intersectsGround(0), false);

  // AABB
  const box1 = new AABB(new Vec3(0, 0, 0), new Vec3(2, 2, 2));
  const box2 = new AABB(new Vec3(1, 1, 1), new Vec3(3, 3, 3));
  const box3 = new AABB(new Vec3(5, 5, 5), new Vec3(6, 6, 6));

  assert.equal(box1.intersects(box2), true);
  assert.equal(box1.intersects(box3), false);
  assert.equal(box1.containsPoint(new Vec3(1, 1, 1)), true);
  assert.equal(box1.containsPoint(new Vec3(3, 1, 1)), false);
});
