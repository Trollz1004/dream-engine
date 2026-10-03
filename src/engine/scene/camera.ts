/**
 * DREAM Engine — Camera
 * Pure TypeScript, zero external dependencies.
 */

import { Vec3 } from '../math/vec3.ts';
import { Mat4 } from '../math/mat4.ts';
import { SceneNode } from './node.ts';

export class Camera extends SceneNode {
  fovYRad: number;
  aspect: number;
  near: number;
  far: number;

  projectionMatrix: Mat4;
  viewMatrix: Mat4;
  viewProjectionMatrix: Mat4;

  target: Vec3;
  up: Vec3;

  // Orbit / 3rd-person camera angles
  yaw: number = 0;       // Horizontal angle (radians)
  pitch: number = 0.25;  // Vertical angle (radians)
  distance: number = 5.0; // Distance to target

  constructor(fovYDeg = 60, aspect = 16 / 9, near = 0.1, far = 1000) {
    super('Camera');
    this.fovYRad = (fovYDeg * Math.PI) / 180;
    this.aspect = aspect;
    this.near = near;
    this.far = far;

    this.projectionMatrix = new Mat4();
    this.viewMatrix = new Mat4();
    this.viewProjectionMatrix = new Mat4();
    this.target = new Vec3(0, 1.0, 0);
    this.up = new Vec3(0, 1, 0);

    this.updateProjection();
    this.updateView();
  }

  setAspect(aspect: number): void {
    if (this.aspect !== aspect) {
      this.aspect = aspect;
      this.updateProjection();
    }
  }

  setFov(fovYDeg: number): void {
    const clamped = Math.max(30, Math.min(120, fovYDeg));
    this.fovYRad = (clamped * Math.PI) / 180;
    this.updateProjection();
  }

  updateProjection(): void {
    this.projectionMatrix.makePerspective(this.fovYRad, this.aspect, this.near, this.far);
  }

  viewMode: 'third-person' | 'first-person' = 'third-person';

  toggleViewMode(): 'third-person' | 'first-person' {
    this.viewMode = this.viewMode === 'third-person' ? 'first-person' : 'third-person';
    return this.viewMode;
  }

  updateOrbit(targetPos: Vec3): void {
    this.target.copy(targetPos);

    const cosPitch = Math.cos(this.pitch);
    const sinPitch = Math.sin(this.pitch);
    const sinYaw = Math.sin(this.yaw);
    const cosYaw = Math.cos(this.yaw);

    if (this.viewMode === 'first-person') {
      // Camera is located at eye height
      this.position.set(this.target.x, this.target.y, this.target.z);
      // Forward look target
      const forwardTarget = new Vec3(
        this.target.x - sinYaw * cosPitch * 10,
        this.target.y - sinPitch * 10,
        this.target.z - cosYaw * cosPitch * 10
      );
      this.viewMatrix.makeLookAt(this.position, forwardTarget, this.up);
      this.viewProjectionMatrix.copy(this.projectionMatrix).multiply(this.viewMatrix);
    } else {
      // 3rd Person Orbit
      const offsetX = this.distance * cosPitch * sinYaw;
      const offsetY = this.distance * sinPitch;
      const offsetZ = this.distance * cosPitch * cosYaw;

      this.position.set(
        this.target.x + offsetX,
        this.target.y + offsetY,
        this.target.z + offsetZ
      );

      this.updateView();
    }
  }

  updateView(): void {
    this.viewMatrix.makeLookAt(this.position, this.target, this.up);
    this.viewProjectionMatrix.copy(this.projectionMatrix).multiply(this.viewMatrix);
  }
}
