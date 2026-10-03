/**
 * DREAM Engine — Unified Engine Renderer Manager
 * Auto-detects WebGPU; seamlessly falls back to WebGL2 if unavailable.
 * Tracks performance metrics and logs one line per second:
 * [DREAM] backend=<webgpu|webgl2> profile=<day|night> fps=<n> luma=<avg>
 */

import { IRenderer, RenderItem, RenderMetrics } from './types.ts';
import { WebGPURenderer } from './webgpu-renderer.ts';
import { WebGL2Renderer } from './webgl2-renderer.ts';
import { Mat4 } from '../math/mat4.ts';
import { Vec3 } from '../math/vec3.ts';
import { getRenderProfile, getActiveFallbacks, RenderProfileData, WorldMode } from './render-profile.ts';

export class EngineRenderer {
  private canvas: HTMLCanvasElement;
  private renderer: IRenderer | null = null;
  private activeBackend: 'WebGPU' | 'WebGL2' = 'WebGL2';

  // Metrics
  private frameCount = 0;
  private lastTime = performance.now();
  private fps = 60;
  private frameTimeMs = 16.6;
  private currentLuma = 0.45;

  // Environment state
  worldMode: WorldMode = 'day';
  profile: RenderProfileData;

  // Real-time Settings Adjusters
  exposureMultiplier = 1.0;
  fogDensityMultiplier = 1.0;
  keyEnergyMultiplier = 1.0;
  ambientEnergyMultiplier = 1.0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.profile = getRenderProfile(this.worldMode, true);
  }

  async init(): Promise<void> {
    let initialized = false;

    // 1. Attempt WebGPU initialization
    try {
      const webgpu = new WebGPURenderer(this.canvas);
      const webgpuSuccess = await webgpu.init();
      if (webgpuSuccess) {
        this.renderer = webgpu;
        this.activeBackend = 'WebGPU';
        initialized = true;
      }
    } catch (err) {
      console.warn('[DREAM] WebGPU init exception, falling back to WebGL2:', err);
    }

    // 2. Fallback to WebGL2 if WebGPU not available
    if (!initialized) {
      try {
        const webgl2 = new WebGL2Renderer(this.canvas);
        const webgl2Success = await webgl2.init();
        if (webgl2Success) {
          this.renderer = webgl2;
          this.activeBackend = 'WebGL2';
          initialized = true;
        }
      } catch (err) {
        console.error('[DREAM] WebGL2 init exception:', err);
      }
    }

    if (!initialized) {
      throw new Error('[DREAM] Neither WebGPU nor WebGL2 could be initialized on this device.');
    }
  }

  setWorldMode(mode: WorldMode): void {
    this.worldMode = mode;
    this.profile = getRenderProfile(this.worldMode, true);
  }

  toggleWorldMode(): WorldMode {
    this.worldMode = this.worldMode === 'day' ? 'night' : 'day';
    this.setWorldMode(this.worldMode);
    return this.worldMode;
  }

  resize(width: number, height: number): void {
    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
      this.renderer?.resize(width, height);
    }
  }

  render(
    items: RenderItem[],
    viewMatrix: Mat4,
    projectionMatrix: Mat4,
    cameraPos: Vec3
  ): void {
    if (!this.renderer) return;

    const start = performance.now();

    // Calculate sun direction from profile key_rotation (pitch, yaw, roll)
    const pitchRad = (this.profile.key_rotation[0] * Math.PI) / 180;
    const yawRad = (this.profile.key_rotation[1] * Math.PI) / 180;
    const sunDir = new Vec3(
      Math.sin(yawRad) * Math.cos(pitchRad),
      -Math.sin(pitchRad),
      Math.cos(yawRad) * Math.cos(pitchRad)
    ).normalize();

    const effectiveProfile: RenderProfileData = {
      ...this.profile,
      exposure: Math.max(0.1, this.profile.exposure * this.exposureMultiplier),
      fog_density: Math.max(0.0, this.profile.fog_density * this.fogDensityMultiplier),
      key_energy: Math.max(0.0, this.profile.key_energy * this.keyEnergyMultiplier),
      ambient_energy: Math.max(0.0, this.profile.ambient_energy * this.ambientEnergyMultiplier),
    };

    try {
      this.renderer.render(
        items,
        viewMatrix,
        projectionMatrix,
        cameraPos,
        effectiveProfile,
        sunDir
      );
    } catch (err) {
      console.error('[DREAM] Render error on backend', this.activeBackend, err);
      // If WebGPU crashed at draw time, switch to WebGL2
      if (this.activeBackend === 'WebGPU') {
        console.warn('[DREAM] Switching to WebGL2 fallback due to runtime error.');
        this.renderer.dispose();
        const webgl2 = new WebGL2Renderer(this.canvas);
        webgl2.init().then((ok) => {
          if (ok) {
            this.renderer = webgl2;
            this.activeBackend = 'WebGL2';
          }
        });
        return;
      }
    }

    const end = performance.now();
    this.frameTimeMs = end - start;

    // Periodically update luma and print 1 console line per second
    this.frameCount++;
    if (end - this.lastTime >= 1000) {
      this.fps = Math.round((this.frameCount * 1000) / (end - this.lastTime));
      this.frameCount = 0;
      this.lastTime = end;

      if (this.renderer?.readLuma) {
        this.currentLuma = this.renderer.readLuma();
      }

      const backendTag = this.activeBackend.toLowerCase();
      console.log(`[DREAM] backend=${backendTag} profile=${this.worldMode} fps=${this.fps} luma=${this.currentLuma.toFixed(3)}`);
    }
  }

  readLuma(): number {
    if (this.renderer?.readLuma) {
      this.currentLuma = this.renderer.readLuma();
    }
    return this.currentLuma;
  }

  getMetrics(drawCalls: number, triangles: number): RenderMetrics {
    return {
      fps: this.fps,
      frameTimeMs: Math.max(0.1, Number(this.frameTimeMs.toFixed(1))),
      drawCalls,
      triangles,
      backend: this.activeBackend,
      worldMode: this.worldMode,
      activeFallbacks: getActiveFallbacks(this.profile),
      luma: Number(this.currentLuma.toFixed(3)),
    };
  }

  dispose(): void {
    this.renderer?.dispose();
    this.renderer = null;
  }
}
