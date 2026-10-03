/**
 * DREAM Engine — Entity Component System Components
 * Pure TypeScript, zero external dependencies.
 */

import { Vec3 } from '../math/vec3.ts';
import { Quat } from '../math/quat.ts';
import { Capsule } from '../math/collision.ts';
import { MeshGeometry, MaterialProperties } from '../scene/mesh.ts';

export interface TransformComponent {
  type: 'Transform';
  position: Vec3;
  rotation: Quat;
  scale: Vec3;
}

export interface MeshRendererComponent {
  type: 'MeshRenderer';
  geometry: MeshGeometry;
  material: MaterialProperties;
  castShadow?: boolean;
  receiveShadow?: boolean;
}

export interface CharacterControllerComponent {
  type: 'CharacterController';
  walkSpeed: number;
  runSpeed: number;
  capsule: Capsule;
  velocity: Vec3;
  isGrounded: boolean;
  facingYaw: number;
  isInvulnerable: boolean;
  iFrameRemaining: number;
  currentStamina: number;
  maxStamina: number;
}

export interface LightComponent {
  type: 'Light';
  kind: 'directional' | 'point';
  color: [number, number, number];
  intensity: number;
  direction?: Vec3;
}

export type Component =
  | TransformComponent
  | MeshRendererComponent
  | CharacterControllerComponent
  | LightComponent;

export type ComponentType = Component['type'];
