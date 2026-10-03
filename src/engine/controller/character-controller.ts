/**
 * DREAM Engine — Capsule Character Controller
 * Pure TypeScript, zero external dependencies.
 * Walks with WASD, moves relative to camera yaw, ground collision clamping.
 */

import { Vec3 } from '../math/vec3.ts';
import { Quat } from '../math/quat.ts';
import { Capsule } from '../math/collision.ts';
import { Camera } from '../scene/camera.ts';
import { InputManager } from '../input/input-manager.ts';
import { CombatManager } from '../combat/combat-manager.ts';

export class CharacterController {
  position: Vec3;
  velocity: Vec3;
  facingYaw: number;
  capsule: Capsule;

  walkSpeed: number = 5.5; // exact 5.5 m/s per GDD
  runSpeed: number = 9.5;  // exact 9.5 m/s per GDD
  turnSpeed: number = 12.0; // Radians per sec
  friction: number = 10.0;
  gravity: number = 24.0; // matches player.gd GRAVITY

  isGrounded: boolean = true;
  isMoving: boolean = false;
  isSprinting: boolean = false;

  // Invert axes
  invertNorthSouth: boolean = false;
  invertLeftRight: boolean = false;
  invertMouseX: boolean = false;
  invertMouseY: boolean = false;

  constructor(initialPos = new Vec3(0, 0, 0), radius = 0.4, height = 1.8) {
    this.position = initialPos.clone();
    this.velocity = new Vec3();
    this.facingYaw = 0;
    this.capsule = new Capsule(this.position, radius, height);
  }

  update(dt: number, input: InputManager, camera: Camera, combat?: CombatManager): void {
    // 1. Process Gamepad & Mouse Look
    const gp = input.pollGamepad();
    const mouseDelta = input.consumeMouseDelta();
    if (mouseDelta.x !== 0 || mouseDelta.y !== 0) {
      const signMX = this.invertMouseX ? 1 : -1;
      const signMY = this.invertMouseY ? -1 : 1;
      camera.yaw += mouseDelta.x * signMX;
      camera.pitch = Math.max(-0.6, Math.min(1.2, camera.pitch - mouseDelta.y * signMY));
    }

    // 2. Consume combat actions if combat manager is present
    if (combat) {
      const actions = input.consumePendingActions();
      for (const act of actions) {
        combat.trySkill(act.direction, act.shift, act.actionKey, camera.yaw, this.position);
      }
    }

    // 3. Compute Movement Intent from WASD and Gamepad Stick
    let moveForward = 0;
    let moveRight = 0;

    if (input.isDown('KeyW') || input.isDown('ArrowUp') || input.isDown('w')) moveForward += 1;
    if (input.isDown('KeyS') || input.isDown('ArrowDown') || input.isDown('s')) moveForward -= 1;
    if (input.isDown('KeyD') || input.isDown('ArrowRight') || input.isDown('d')) moveRight += 1;
    if (input.isDown('KeyA') || input.isDown('ArrowLeft') || input.isDown('a')) moveRight -= 1;

    // Add gamepad stick input (gp.moveY < 0 is pushed forward)
    if (gp.moveY !== 0) moveForward += -gp.moveY;
    if (gp.moveX !== 0) moveRight += gp.moveX;

    const inputLen = Math.sqrt(moveForward * moveForward + moveRight * moveRight);
    this.isMoving = inputLen > 0.01;

    // Movement direction relative to camera yaw
    // Standard forward is (-sin(yaw), -cos(yaw)), right is (cos(yaw), -sin(yaw))
    const signNS = this.invertNorthSouth ? -1 : 1;
    const signLR = this.invertLeftRight ? -1 : 1;

    const forwardX = -Math.sin(camera.yaw) * signNS;
    const forwardZ = -Math.cos(camera.yaw) * signNS;
    const rightX = Math.cos(camera.yaw) * signLR;
    const rightZ = -Math.sin(camera.yaw) * signLR;

    let targetVelX = 0;
    let targetVelZ = 0;
    let accelRate = this.isMoving ? 15.0 : this.friction;

    // Handle Active Combat Dash / Lunge Override Velocities
    if (combat && combat.dash.isDashing()) {
      if (combat.dash.phase() === 'recovery') {
        // Recovery is wide open, player cannot steer out
        targetVelX = 0;
        targetVelZ = 0;
        accelRate = 40.0;
      } else {
        // Startup and invulnerable travel (14 m/s)
        targetVelX = combat.dashDirection.x * 14.0;
        targetVelZ = combat.dashDirection.z * 14.0;
        accelRate = 80.0;
      }
      this.isSprinting = false;
    } else if (combat && combat.lunge.isLunging()) {
      if (combat.lunge.phase() === 'travel') {
        targetVelX = combat.lungeDirection.x * combat.lunge.travelSpeed();
        targetVelZ = combat.lungeDirection.z * combat.lunge.travelSpeed();
        accelRate = 80.0;
      } else {
        targetVelX = 0;
        targetVelZ = 0;
        accelRate = 40.0;
      }
      this.isSprinting = false;
    } else if (this.isMoving) {
      const normF = moveForward / inputLen;
      const normR = moveRight / inputLen;

      const dirX = forwardX * normF + rightX * normR;
      const dirZ = forwardZ * normF + rightZ * normR;

      const hasStamina = combat ? combat.stamina > 0 : true;
      const wantsSprint =
        input.isDown('ShiftLeft') ||
        input.isDown('ShiftRight') ||
        gp.isSprinting ||
        (combat ? combat.autoSprint : false);

      this.isSprinting = wantsSprint && hasStamina;
      const speed = this.isSprinting ? this.runSpeed : this.walkSpeed;
      targetVelX = dirX * speed;
      targetVelZ = dirZ * speed;

      // Rotate capsule character toward movement direction smoothly
      const targetFacingYaw = Math.atan2(dirX, dirZ);
      let diff = targetFacingYaw - this.facingYaw;
      while (diff < -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;
      this.facingYaw += diff * Math.min(1.0, this.turnSpeed * dt);
    } else {
      this.isSprinting = false;
      if (combat) combat.autoSprint = false;
    }

    // 4. Accelerate / Decelerate velocity
    this.velocity.x += (targetVelX - this.velocity.x) * Math.min(1.0, accelRate * dt);
    this.velocity.z += (targetVelZ - this.velocity.z) * Math.min(1.0, accelRate * dt);

    // Gravity
    if (!this.isGrounded) {
      this.velocity.y -= this.gravity * dt;
    }

    // Apply movement
    this.position.x += this.velocity.x * dt;
    this.position.y += this.velocity.y * dt;
    this.position.z += this.velocity.z * dt;

    // 4. Ground Collision & Clamping
    this.capsule.center.copy(this.position);
    if (this.capsule.intersectsGround(0)) {
      this.capsule.clampToGround(0);
      this.position.copy(this.capsule.center);
      this.velocity.y = 0;
      this.isGrounded = true;
    }

    // 5. Update Camera to follow Capsule
    const eyeHeight = this.position.y + this.capsule.height * 0.65;
    const camTarget = new Vec3(this.position.x, eyeHeight, this.position.z);
    camera.updateOrbit(camTarget);
  }

  getRotationQuaternion(out = new Quat()): Quat {
    return out.setFromEuler(0, this.facingYaw, 0);
  }
}
