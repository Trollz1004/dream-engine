/**
 * DREAM Engine — Collision & Ray Primitives
 * Pure TypeScript, zero external dependencies.
 */

import { Vec3 } from './vec3.ts';

export class Ray {
  origin: Vec3;
  direction: Vec3;

  constructor(origin = new Vec3(), direction = new Vec3(0, 0, -1)) {
    this.origin = origin.clone();
    this.direction = direction.clone().normalize();
  }

  set(origin: Vec3, direction: Vec3): this {
    this.origin.copy(origin);
    this.direction.copy(direction).normalize();
    return this;
  }

  at(t: number, out = new Vec3()): Vec3 {
    return out.copy(this.direction).scale(t).add(this.origin);
  }

  intersectPlane(planeNormal: Vec3, planeConstant: number): number | null {
    const denominator = planeNormal.dot(this.direction);
    if (Math.abs(denominator) < 1e-6) {
      return null;
    }
    const t = -(this.origin.dot(planeNormal) + planeConstant) / denominator;
    return t >= 0 ? t : null;
  }
}

export class AABB {
  min: Vec3;
  max: Vec3;

  constructor(min = new Vec3(-0.5, -0.5, -0.5), max = new Vec3(0.5, 0.5, 0.5)) {
    this.min = min.clone();
    this.max = max.clone();
  }

  containsPoint(p: Vec3): boolean {
    return (
      p.x >= this.min.x && p.x <= this.max.x &&
      p.y >= this.min.y && p.y <= this.max.y &&
      p.z >= this.min.z && p.z <= this.max.z
    );
  }

  intersects(other: AABB): boolean {
    return (
      this.min.x <= other.max.x && this.max.x >= other.min.x &&
      this.min.y <= other.max.y && this.max.y >= other.min.y &&
      this.min.z <= other.max.z && this.max.z >= other.min.z
    );
  }
}

/**
 * Capsule defined by base center, total height, and radius.
 * Capsule extends from center.y to center.y + height.
 * Hemispherical caps at bottom (center.y + radius) and top (center.y + height - radius).
 */
export class Capsule {
  center: Vec3;
  radius: number;
  height: number;

  constructor(center = new Vec3(0, 0, 0), radius = 0.4, height = 1.8) {
    this.center = center.clone();
    this.radius = radius;
    this.height = Math.max(height, radius * 2);
  }

  getBottomHemisphereCenter(out = new Vec3()): Vec3 {
    return out.set(this.center.x, this.center.y + this.radius, this.center.z);
  }

  getTopHemisphereCenter(out = new Vec3()): Vec3 {
    return out.set(this.center.x, this.center.y + this.height - this.radius, this.center.z);
  }

  intersectsGround(groundY = 0): boolean {
    return this.center.y < groundY;
  }

  clampToGround(groundY = 0): void {
    if (this.center.y < groundY) {
      this.center.y = groundY;
    }
  }

  distanceToPoint(point: Vec3): number {
    const bottom = this.getBottomHemisphereCenter();
    const top = this.getTopHemisphereCenter();
    const seg = Vec3.sub(top, bottom);
    const segLenSq = seg.lengthSq();

    let t = 0;
    if (segLenSq > 1e-6) {
      const v = Vec3.sub(point, bottom);
      t = Math.max(0, Math.min(1, v.dot(seg) / segLenSq));
    }
    const closestOnSeg = bottom.addScaled(seg, t);
    return Math.max(0, closestOnSeg.distanceTo(point) - this.radius);
  }
}
