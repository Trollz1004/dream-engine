/**
 * DREAM Engine — Core Quaternion Math
 * Pure TypeScript, zero external dependencies.
 */

import { Vec3 } from './vec3.ts';

export class Quat {
  x: number;
  y: number;
  z: number;
  w: number;

  constructor(x = 0, y = 0, z = 0, w = 1) {
    this.x = x;
    this.y = y;
    this.z = z;
    this.w = w;
  }

  set(x: number, y: number, z: number, w: number): this {
    this.x = x;
    this.y = y;
    this.z = z;
    this.w = w;
    return this;
  }

  identity(): this {
    return this.set(0, 0, 0, 1);
  }

  copy(q: Quat): this {
    return this.set(q.x, q.y, q.z, q.w);
  }

  clone(): Quat {
    return new Quat(this.x, this.y, this.z, this.w);
  }

  setFromAxisAngle(axis: Vec3, rad: number): this {
    const half = rad * 0.5;
    const s = Math.sin(half);
    const norm = axis.clone().normalize();
    return this.set(norm.x * s, norm.y * s, norm.z * s, Math.cos(half));
  }

  setFromEuler(pitch: number, yaw: number, roll: number): this {
    // YXZ order commonly used in camera & FPS controllers
    const c1 = Math.cos(yaw * 0.5);
    const s1 = Math.sin(yaw * 0.5);
    const c2 = Math.cos(pitch * 0.5);
    const s2 = Math.sin(pitch * 0.5);
    const c3 = Math.cos(roll * 0.5);
    const s3 = Math.sin(roll * 0.5);

    this.x = s2 * c1 * c3 + c2 * s1 * s3;
    this.y = c2 * s1 * c3 - s2 * c1 * s3;
    this.z = c2 * c1 * s3 - s2 * s1 * c3;
    this.w = c2 * c1 * c3 + s2 * s1 * s3;
    return this;
  }

  multiply(q: Quat): this {
    const ax = this.x, ay = this.y, az = this.z, aw = this.w;
    const bx = q.x, by = q.y, bz = q.z, bw = q.w;

    this.x = aw * bx + ax * bw + ay * bz - az * by;
    this.y = aw * by - ax * bz + ay * bw + az * bx;
    this.z = aw * bz + ax * by - ay * bx + az * bw;
    this.w = aw * bw - ax * bx - ay * by - az * bz;
    return this;
  }

  slerp(qb: Quat, t: number): this {
    if (t === 0) return this;
    if (t === 1) return this.copy(qb);

    let cosHalfTheta = this.w * qb.w + this.x * qb.x + this.y * qb.y + this.z * qb.z;
    let bx = qb.x, by = qb.y, bz = qb.z, bw = qb.w;

    if (cosHalfTheta < 0) {
      this.w = -this.w;
      this.x = -this.x;
      this.y = -this.y;
      this.z = -this.z;
      cosHalfTheta = -cosHalfTheta;
    }

    if (cosHalfTheta >= 1.0) {
      return this;
    }

    const sinHalfTheta = Math.sqrt(1.0 - cosHalfTheta * cosHalfTheta);
    if (Math.abs(sinHalfTheta) < 0.001) {
      this.w = 0.5 * (this.w + bw);
      this.x = 0.5 * (this.x + bx);
      this.y = 0.5 * (this.y + by);
      this.z = 0.5 * (this.z + bz);
      return this;
    }

    const halfTheta = Math.acos(cosHalfTheta);
    const ratioA = Math.sin((1 - t) * halfTheta) / sinHalfTheta;
    const ratioB = Math.sin(t * halfTheta) / sinHalfTheta;

    this.w = this.w * ratioA + bw * ratioB;
    this.x = this.x * ratioA + bx * ratioB;
    this.y = this.y * ratioA + by * ratioB;
    this.z = this.z * ratioA + bz * ratioB;
    return this;
  }
}
