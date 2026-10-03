/**
 * DREAM Engine — Platform WebGL2 Renderer
 * Pure WebGL2 platform API implementation.
 * Zero external libraries (no three.js, Babylon, etc.).
 * Includes direct gl.readPixels luma measurement and [DREAM] error logging.
 */

import { IRenderer, RenderItem } from './types.ts';
import { Mat4 } from '../math/mat4.ts';
import { Vec3 } from '../math/vec3.ts';
import { RenderProfileData } from './render-profile.ts';

const VS_SOURCE = `#version 300 es
layout(location = 0) in vec3 a_position;
layout(location = 1) in vec3 a_normal;
layout(location = 2) in vec2 a_uv;

uniform mat4 u_model;
uniform mat4 u_view;
uniform mat4 u_projection;
uniform int u_isSky;

out vec3 v_worldPos;
out vec3 v_normal;
out vec2 v_uv;

void main() {
  vec4 worldPos = u_model * vec4(a_position, 1.0);
  v_worldPos = worldPos.xyz;
  v_normal = normalize(mat3(u_model) * a_normal);
  v_uv = a_uv;

  vec4 clip = u_projection * u_view * worldPos;
  if (u_isSky == 1) {
    clip.z = clip.w * 0.99999;
  }
  gl_Position = clip;
}
`;

const FS_SOURCE = `#version 300 es
precision highp float;

in vec3 v_worldPos;
in vec3 v_normal;
in vec2 v_uv;

out vec4 fragColor;

// Environment / Profile
uniform vec3 u_cameraPos;
uniform vec3 u_skyTop;
uniform vec3 u_skyHorizon;
uniform vec3 u_groundHorizon;
uniform vec3 u_sunDir;
uniform vec3 u_sunColor;
uniform float u_sunIntensity;
uniform float u_ambientIntensity;
uniform float u_exposure;

// Fog
uniform vec3 u_fogColor;
uniform float u_fogDensity;

// Material
uniform vec4 u_baseColor;
uniform float u_roughness;
uniform float u_metallic;
uniform vec3 u_emissive;
uniform float u_emissiveIntensity;
uniform float u_rimIntensity;
uniform int u_isSky;
uniform int u_isGround;
uniform int u_isNight;

// Contact Darkening / Shadow disc
uniform vec3 u_capsulePos;
uniform int u_enableContactDarkening;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

void main() {
  if (u_isSky == 1) {
    vec3 dir = normalize(v_worldPos - u_cameraPos);
    float h = clamp(dir.y, 0.0, 1.0);
    vec3 sky = mix(u_skyHorizon, u_skyTop, pow(h, 0.45));

    // Sun / Moon Disc
    float sunDot = max(0.0, dot(dir, normalize(u_sunDir)));
    float sunDisc = smoothstep(0.9980, 0.9996, sunDot);
    float glowPow = (u_isNight == 1) ? 90.0 : 24.0;
    float sunGlow = pow(sunDot, glowPow) * 0.4;
    sky += u_sunColor * (sunDisc * 2.5 + sunGlow * u_sunIntensity);

    // Stars at Night
    if (u_isNight == 1 && dir.y > 0.08) {
      vec2 seed = floor(dir.xz / (dir.y + 0.25) * 280.0);
      float rand = hash(seed);
      if (rand > 0.982) {
        sky += vec3(0.9, 0.95, 1.0) * (rand - 0.982) * 50.0;
      }
    }

    fragColor = vec4(sky * u_exposure, 1.0);
    return;
  }

  vec3 N = normalize(v_normal);
  vec3 V = normalize(u_cameraPos - v_worldPos);
  vec3 L = normalize(u_sunDir);
  vec3 H = normalize(L + V);

  vec3 albedo = u_baseColor.rgb;

  // Ground plane grid
  if (u_isGround == 1) {
    vec3 dayGround = vec3(0.28, 0.23, 0.18);
    vec3 nightGround = vec3(0.07, 0.08, 0.11);
    albedo = (u_isNight == 1) ? nightGround : dayGround;

    vec2 coord = v_worldPos.xz * 0.5;
    vec2 grid = abs(fract(coord - 0.5) - 0.5);
    float line = min(grid.x, grid.y);
    if (line < 0.02) {
      vec3 lineColor = (u_isNight == 1) ? vec3(0.16, 0.20, 0.30) : vec3(0.42, 0.35, 0.28);
      albedo = mix(albedo, lineColor, 0.45);
    }

    // Contact Darkening Fallback under Capsule
    if (u_enableContactDarkening == 1) {
      float dist = length(v_worldPos.xz - u_capsulePos.xz);
      float shadowRadius = 0.85;
      if (dist < shadowRadius) {
        float shadowAlpha = smoothstep(shadowRadius, 0.05, dist) * 0.70;
        albedo *= (1.0 - shadowAlpha);
      }
    }
  }

  // Diffuse Lighting
  float NdotL = max(0.0, dot(N, L));
  vec3 diffuse = albedo * u_sunColor * (NdotL * u_sunIntensity);

  // Ambient Lighting
  float ambFactor = clamp(N.y * 0.5 + 0.5, 0.0, 1.0);
  vec3 ambient = albedo * mix(u_groundHorizon, u_skyTop, ambFactor) * u_ambientIntensity;

  // Specular
  float NdotH = max(0.0, dot(N, H));
  float specular = pow(NdotH, 32.0) * 0.25 * u_sunIntensity * (NdotL > 0.0 ? 1.0 : 0.0);
  vec3 specColor = u_sunColor * specular;

  // Rim Lighting
  float NdotV = max(0.0, dot(N, V));
  float rim = pow(1.0 - NdotV, 3.2) * u_rimIntensity;
  vec3 rimColor = ((u_isNight == 1) ? vec3(0.55, 0.80, 1.0) : vec3(1.0, 0.86, 0.64)) * rim;

  // Emissive
  vec3 emissive = u_emissive * u_emissiveIntensity;

  vec3 color = ambient + diffuse + specColor + rimColor + emissive;

  // Distance Fog
  float dist = length(u_cameraPos - v_worldPos);
  float fogFactor = clamp(1.0 - exp(-pow(dist * u_fogDensity, 1.25)), 0.0, 1.0);
  color = mix(color, u_fogColor, fogFactor);

  color *= u_exposure;
  fragColor = vec4(color, u_baseColor.a);
}
`;

interface BufferCache {
  vao: WebGLVertexArrayObject;
  vbo: WebGLBuffer;
  nbo: WebGLBuffer;
  tbo: WebGLBuffer;
  ibo: WebGLBuffer;
  indexCount: number;
  indexType: number;
}

export class WebGL2Renderer implements IRenderer {
  readonly backend = 'WebGL2' as const;
  private canvas: HTMLCanvasElement;
  private gl: WebGL2RenderingContext | null = null;
  private program: WebGLProgram | null = null;
  private bufferMap = new Map<number, BufferCache>();
  private nextGeomId = 1;
  private geomIdMap = new WeakMap<object, number>();

  private uLocs: Record<string, WebGLUniformLocation | null> = {};
  private lastLuma = 0.45;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
  }

  async init(): Promise<boolean> {
    const gl = this.canvas.getContext('webgl2', {
      alpha: false,
      antialias: true,
      depth: true,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: true,
    });

    if (!gl) {
      console.warn('[DREAM] WebGL2: Context not available.');
      return false;
    }

    this.gl = gl;

    // Compile shaders
    const vs = this.compileShader(gl.VERTEX_SHADER, VS_SOURCE);
    const fs = this.compileShader(gl.FRAGMENT_SHADER, FS_SOURCE);
    if (!vs || !fs) return false;

    const program = gl.createProgram();
    if (!program) return false;

    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('[DREAM] WebGL2 program link error:', gl.getProgramInfoLog(program));
      return false;
    }

    this.program = program;

    const uniformNames = [
      'u_model', 'u_view', 'u_projection', 'u_cameraPos',
      'u_skyTop', 'u_skyHorizon', 'u_groundHorizon',
      'u_sunDir', 'u_sunColor', 'u_sunIntensity', 'u_ambientIntensity',
      'u_exposure', 'u_fogColor', 'u_fogDensity',
      'u_baseColor', 'u_roughness', 'u_metallic',
      'u_emissive', 'u_emissiveIntensity', 'u_rimIntensity',
      'u_isSky', 'u_isGround', 'u_isNight',
      'u_capsulePos', 'u_enableContactDarkening'
    ];

    for (const name of uniformNames) {
      this.uLocs[name] = gl.getUniformLocation(program, name);
    }

    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    // Disable face culling to ensure geometry is never clipped regardless of winding
    gl.disable(gl.CULL_FACE);

    return true;
  }

  resize(width: number, height: number): void {
    if (this.gl) {
      this.gl.viewport(0, 0, width, height);
    }
  }

  render(
    items: RenderItem[],
    viewMatrix: Mat4,
    projectionMatrix: Mat4,
    cameraPos: Vec3,
    profile: RenderProfileData,
    sunDirection: Vec3
  ): void {
    const gl = this.gl;
    const program = this.program;
    if (!gl || !program) return;

    gl.clearColor(profile.sky_top[0], profile.sky_top[1], profile.sky_top[2], 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    gl.useProgram(program);

    if (this.uLocs['u_view']) gl.uniformMatrix4fv(this.uLocs['u_view'], false, viewMatrix.elements);
    if (this.uLocs['u_projection']) gl.uniformMatrix4fv(this.uLocs['u_projection'], false, projectionMatrix.elements);
    if (this.uLocs['u_cameraPos']) gl.uniform3f(this.uLocs['u_cameraPos'], cameraPos.x, cameraPos.y, cameraPos.z);

    if (this.uLocs['u_skyTop']) gl.uniform3f(this.uLocs['u_skyTop'], profile.sky_top[0], profile.sky_top[1], profile.sky_top[2]);
    if (this.uLocs['u_skyHorizon']) gl.uniform3f(this.uLocs['u_skyHorizon'], profile.sky_horizon[0], profile.sky_horizon[1], profile.sky_horizon[2]);
    if (this.uLocs['u_groundHorizon']) gl.uniform3f(this.uLocs['u_groundHorizon'], profile.ground_horizon[0], profile.ground_horizon[1], profile.ground_horizon[2]);

    if (this.uLocs['u_sunDir']) gl.uniform3f(this.uLocs['u_sunDir'], sunDirection.x, sunDirection.y, sunDirection.z);
    if (this.uLocs['u_sunColor']) gl.uniform3f(this.uLocs['u_sunColor'], profile.key_color[0], profile.key_color[1], profile.key_color[2]);
    if (this.uLocs['u_sunIntensity']) gl.uniform1f(this.uLocs['u_sunIntensity'], profile.key_energy);
    if (this.uLocs['u_ambientIntensity']) gl.uniform1f(this.uLocs['u_ambientIntensity'], profile.ambient_energy);
    if (this.uLocs['u_exposure']) gl.uniform1f(this.uLocs['u_exposure'], profile.exposure);

    if (this.uLocs['u_fogColor']) gl.uniform3f(this.uLocs['u_fogColor'], profile.fog_color[0], profile.fog_color[1], profile.fog_color[2]);
    if (this.uLocs['u_fogDensity']) gl.uniform1f(this.uLocs['u_fogDensity'], profile.fog_density);
    if (this.uLocs['u_isNight']) gl.uniform1i(this.uLocs['u_isNight'], profile.world === 'night' ? 1 : 0);
    if (this.uLocs['u_enableContactDarkening']) gl.uniform1i(this.uLocs['u_enableContactDarkening'], profile.contact_darkening ? 1 : 0);

    // Locate capsule
    for (const item of items) {
      if (!item.material.isSky && !item.material.isGround && this.uLocs['u_capsulePos']) {
        const cx = item.modelMatrix.elements[12];
        const cy = item.modelMatrix.elements[13];
        const cz = item.modelMatrix.elements[14];
        gl.uniform3f(this.uLocs['u_capsulePos'], cx, cy, cz);
        break;
      }
    }

    // Render items
    for (const item of items) {
      const buffer = this.getOrCreateBuffer(item.geometry);

      if (this.uLocs['u_model']) gl.uniformMatrix4fv(this.uLocs['u_model'], false, item.modelMatrix.elements);

      const mat = item.material;
      if (this.uLocs['u_baseColor']) gl.uniform4fv(this.uLocs['u_baseColor'], mat.baseColor);
      if (this.uLocs['u_roughness']) gl.uniform1f(this.uLocs['u_roughness'], mat.roughness);
      if (this.uLocs['u_metallic']) gl.uniform1f(this.uLocs['u_metallic'], mat.metallic);
      if (this.uLocs['u_emissive']) gl.uniform3fv(this.uLocs['u_emissive'], mat.emissive);
      if (this.uLocs['u_emissiveIntensity']) gl.uniform1f(this.uLocs['u_emissiveIntensity'], mat.emissiveIntensity);
      if (this.uLocs['u_rimIntensity']) gl.uniform1f(this.uLocs['u_rimIntensity'], mat.rimIntensity ?? profile.material_rim);
      if (this.uLocs['u_isSky']) gl.uniform1i(this.uLocs['u_isSky'], mat.isSky ? 1 : 0);
      if (this.uLocs['u_isGround']) gl.uniform1i(this.uLocs['u_isGround'], mat.isGround ? 1 : 0);

      if (mat.isSky) {
        gl.depthMask(false);
      } else {
        gl.depthMask(true);
      }

      gl.bindVertexArray(buffer.vao);
      gl.drawElements(gl.TRIANGLES, buffer.indexCount, buffer.indexType, 0);
      gl.bindVertexArray(null);
    }

    gl.depthMask(true);

    // Read real pixel luma
    this.updateRealLuma();
  }

  private updateRealLuma(): void {
    const gl = this.gl;
    if (!gl) return;

    // Sample a 16x16 grid of pixels from the canvas center
    const w = 16;
    const h = 16;
    const startX = Math.floor(Math.max(0, gl.drawingBufferWidth * 0.5 - 8));
    const startY = Math.floor(Math.max(0, gl.drawingBufferHeight * 0.5 - 8));
    const pixels = new Uint8Array(w * h * 4);

    try {
      gl.readPixels(startX, startY, w, h, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
      let totalLuma = 0;
      const count = w * h;
      for (let i = 0; i < pixels.length; i += 4) {
        const r = pixels[i] / 255.0;
        const g = pixels[i + 1] / 255.0;
        const b = pixels[i + 2] / 255.0;
        totalLuma += 0.2126 * r + 0.7152 * g + 0.0722 * b;
      }
      this.lastLuma = totalLuma / count;
    } catch {
      // Fallback
    }
  }

  readLuma(): number {
    return this.lastLuma;
  }

  private getOrCreateBuffer(geometry: RenderItem['geometry']): BufferCache {
    let id = this.geomIdMap.get(geometry);
    if (!id) {
      id = this.nextGeomId++;
      this.geomIdMap.set(geometry, id);
    }

    let cache = this.bufferMap.get(id);
    if (!cache && this.gl) {
      const gl = this.gl;
      const vao = gl.createVertexArray()!;
      gl.bindVertexArray(vao);

      const vbo = gl.createBuffer()!;
      gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
      gl.bufferData(gl.ARRAY_BUFFER, geometry.positions, gl.STATIC_DRAW);
      gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);

      const nbo = gl.createBuffer()!;
      gl.bindBuffer(gl.ARRAY_BUFFER, nbo);
      gl.bufferData(gl.ARRAY_BUFFER, geometry.normals, gl.STATIC_DRAW);
      gl.enableVertexAttribArray(1);
      gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 0, 0);

      const tbo = gl.createBuffer()!;
      gl.bindBuffer(gl.ARRAY_BUFFER, tbo);
      gl.bufferData(gl.ARRAY_BUFFER, geometry.uvs, gl.STATIC_DRAW);
      gl.enableVertexAttribArray(2);
      gl.vertexAttribPointer(2, 2, gl.FLOAT, false, 0, 0);

      const ibo = gl.createBuffer()!;
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, geometry.indices, gl.STATIC_DRAW);

      gl.bindVertexArray(null);

      const isUint32 = geometry.indices instanceof Uint32Array;
      const indexType = isUint32 ? gl.UNSIGNED_INT : gl.UNSIGNED_SHORT;

      cache = {
        vao,
        vbo,
        nbo,
        tbo,
        ibo,
        indexCount: geometry.indexCount,
        indexType,
      };
      this.bufferMap.set(id, cache);
    }

    return cache!;
  }

  private compileShader(type: number, src: string): WebGLShader | null {
    if (!this.gl) return null;
    const shader = this.gl.createShader(type);
    if (!shader) return null;
    this.gl.shaderSource(shader, src);
    this.gl.compileShader(shader);
    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
      console.error('[DREAM] Shader compile error:', this.gl.getShaderInfoLog(shader));
      this.gl.deleteShader(shader);
      return null;
    }
    return shader;
  }

  dispose(): void {
    if (this.gl) {
      for (const b of this.bufferMap.values()) {
        this.gl.deleteVertexArray(b.vao);
        this.gl.deleteBuffer(b.vbo);
        this.gl.deleteBuffer(b.nbo);
        this.gl.deleteBuffer(b.tbo);
        this.gl.deleteBuffer(b.ibo);
      }
      this.bufferMap.clear();
      if (this.program) {
        this.gl.deleteProgram(this.program);
      }
    }
  }
}
