/**
 * DREAM Engine — Renderer Types & Interfaces
 * Pure TypeScript, zero external dependencies.
 */

import { Mat4 } from '../math/mat4.ts';
import { Vec3 } from '../math/vec3.ts';
import { MeshGeometry, MaterialProperties } from '../scene/mesh.ts';
import { RenderProfileData } from './render-profile.ts';

export interface RenderItem {
  geometry: MeshGeometry;
  modelMatrix: Mat4;
  material: MaterialProperties;
}

export interface RenderMetrics {
  fps: number;
  frameTimeMs: number;
  drawCalls: number;
  triangles: number;
  backend: 'WebGPU' | 'WebGL2';
  worldMode: 'day' | 'night';
  activeFallbacks: string[];
  luma: number;
}

export interface IRenderer {
  readonly backend: 'WebGPU' | 'WebGL2';
  init(): Promise<boolean>;
  resize(width: number, height: number): void;
  render(
    items: RenderItem[],
    viewMatrix: Mat4,
    projectionMatrix: Mat4,
    cameraPos: Vec3,
    profile: RenderProfileData,
    sunDirection: Vec3
  ): void;
  readLuma?(): number;
  dispose(): void;
}
