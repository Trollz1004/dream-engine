/**
 * DREAM Engine — Platform WebGPU Renderer
 * Pure WebGPU platform API implementation with WGSL shaders.
 * Cached geometry buffers, dynamic uniform management, and [DREAM] error logging.
 */

import { IRenderer, RenderItem } from './types.ts';
import { Mat4 } from '../math/mat4.ts';
import { Vec3 } from '../math/vec3.ts';
import { RenderProfileData } from './render-profile.ts';
import { MeshGeometry } from '../scene/mesh.ts';

const WGSL_SOURCE = `
struct SceneUniforms {
  view: mat4x4<f32>,
  projection: mat4x4<f32>,
  cameraPos: vec3<f32>,
  sunIntensity: f32,
  sunDir: vec3<f32>,
  exposure: f32,
  sunColor: vec3<f32>,
  ambientIntensity: f32,
  skyTop: vec3<f32>,
  fogDensity: f32,
  skyHorizon: vec3<f32>,
  isNight: f32,
  groundHorizon: vec3<f32>,
  fogHeight: f32,
  fogColor: vec3<f32>,
  pad: f32,
};

struct ObjectUniforms {
  model: mat4x4<f32>,
  baseColor: vec4<f32>,
  emissive: vec3<f32>,
  emissiveIntensity: f32,
  flags: vec4<f32>, // x: isSky, y: isGround, z: rimIntensity, w: unused
};

@group(0) @binding(0) var<uniform> scene: SceneUniforms;
@group(1) @binding(0) var<uniform> obj: ObjectUniforms;

struct VertexInput {
  @location(0) position: vec3<f32>,
  @location(1) normal: vec3<f32>,
  @location(2) uv: vec2<f32>,
};

struct VertexOutput {
  @builtin(position) clipPosition: vec4<f32>,
  @location(0) worldPos: vec3<f32>,
  @location(1) normal: vec3<f32>,
  @location(2) uv: vec2<f32>,
};

@vertex
fn vs_main(in: VertexInput) -> VertexOutput {
  var out: VertexOutput;
  let world = obj.model * vec4<f32>(in.position, 1.0);
  out.worldPos = world.xyz;
  out.normal = normalize((obj.model * vec4<f32>(in.normal, 0.0)).xyz);
  out.uv = in.uv;

  var clip = scene.projection * scene.view * world;
  if (obj.flags.x > 0.5) {
    // For Sky, push to far plane (depth = 1.0)
    clip.z = clip.w * 0.99999;
  }
  out.clipPosition = clip;
  return out;
}

@fragment
fn fs_main(in: VertexOutput) -> @location(0) vec4<f32> {
  // 1. Sky Rendering
  if (obj.flags.x > 0.5) {
    let dir = normalize(in.worldPos - scene.cameraPos);
    let h = clamp(dir.y, 0.0, 1.0);
    var sky = mix(scene.skyHorizon, scene.skyTop, pow(h, 0.45));

    let sunDot = max(0.0, dot(dir, normalize(scene.sunDir)));
    let sunDisc = smoothstep(0.9980, 0.9996, sunDot);
    let glowPow = select(24.0, 90.0, scene.isNight > 0.5);
    let sunGlow = pow(sunDot, glowPow) * 0.4;
    sky += scene.sunColor * (sunDisc * 2.5 + sunGlow * scene.sunIntensity);

    // Stars at night
    if (scene.isNight > 0.5 && dir.y > 0.08) {
      let seed = floor(dir.xz / (dir.y + 0.25) * 280.0);
      let rand = fract(sin(dot(seed, vec2<f32>(12.9898, 78.233))) * 43758.5453);
      if (rand > 0.982) {
        sky += vec3<f32>(0.9, 0.95, 1.0) * (rand - 0.982) * 50.0;
      }
    }

    return vec4<f32>(sky * scene.exposure, 1.0);
  }

  // 2. Geometry Shading
  let N = normalize(in.normal);
  let V = normalize(scene.cameraPos - in.worldPos);
  let L = normalize(scene.sunDir);
  let H = normalize(L + V);

  var albedo = obj.baseColor.rgb;

  // Ground plane grid
  if (obj.flags.y > 0.5) {
    let dayGround = vec3<f32>(0.28, 0.23, 0.18);
    let nightGround = vec3<f32>(0.07, 0.08, 0.11);
    albedo = select(dayGround, nightGround, scene.isNight > 0.5);

    // Subtle grid lines
    let coord = in.worldPos.xz * 0.5;
    let grid = abs(fract(coord - 0.5) - 0.5);
    let line = min(grid.x, grid.y);
    if (line < 0.02) {
      let lineColor = select(vec3<f32>(0.42, 0.35, 0.28), vec3<f32>(0.16, 0.20, 0.30), scene.isNight > 0.5);
      albedo = mix(albedo, lineColor, 0.45);
    }
  }

  // Lambertian diffuse
  let NdotL = max(0.0, dot(N, L));
  let diffuse = albedo * scene.sunColor * (NdotL * scene.sunIntensity);

  // Ambient lighting with sky/ground hemisphere bias
  let ambFactor = clamp(N.y * 0.5 + 0.5, 0.0, 1.0);
  let ambient = albedo * mix(scene.groundHorizon, scene.skyTop, ambFactor) * scene.ambientIntensity;

  // Blinn-phong specular
  let NdotH = max(0.0, dot(N, H));
  let specular = pow(NdotH, 32.0) * 0.25 * scene.sunIntensity * (select(0.0, 1.0, NdotL > 0.0));
  let specColor = scene.sunColor * specular;

  // Rim lighting (hero & material rim from DREAM spec FR-006)
  let NdotV = max(0.0, dot(N, V));
  let rim = pow(1.0 - NdotV, 3.2) * obj.flags.z;
  let rimColor = select(vec3<f32>(1.0, 0.86, 0.64), vec3<f32>(0.55, 0.80, 1.0), scene.isNight > 0.5) * rim;

  // Emissive
  let emissive = obj.emissive * obj.emissiveIntensity;

  var color = ambient + diffuse + specColor + rimColor + emissive;

  // Fog
  let dist = length(scene.cameraPos - in.worldPos);
  let fogFactor = clamp(1.0 - exp(-pow(dist * scene.fogDensity, 1.25)), 0.0, 1.0);
  color = mix(color, scene.fogColor, fogFactor);

  color *= scene.exposure;
  return vec4<f32>(color, obj.baseColor.a);
}
`;

interface CachedGPUMesh {
  vertexBuffer: GPUBuffer;
  indexBuffer: GPUBuffer;
  indexCount: number;
  indexFormat: GPUIndexFormat;
}

export class WebGPURenderer implements IRenderer {
  readonly backend = 'WebGPU' as const;
  private canvas: HTMLCanvasElement;
  private device: GPUDevice | null = null;
  private context: GPUCanvasContext | null = null;
  private pipeline: GPURenderPipeline | null = null;
  private depthTexture: GPUTexture | null = null;
  private depthWidth = 0;
  private depthHeight = 0;
  private presentationFormat: GPUTextureFormat = 'bgra8unorm';

  // Uniform resources
  private sceneUniformBuffer: GPUBuffer | null = null;
  private sceneBindGroup: GPUBindGroup | null = null;
  private sceneBindGroupLayout: GPUBindGroupLayout | null = null;

  private objectBindGroupLayout: GPUBindGroupLayout | null = null;
  private objectBuffers: GPUBuffer[] = [];
  private objectBindGroups: GPUBindGroup[] = [];

  // Geometry cache
  private meshCache = new WeakMap<MeshGeometry, CachedGPUMesh>();

  // Pixel readback buffer for luma measurement
  private readbackBuffer: GPUBuffer | null = null;
  private lastLuma = 0.45;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
  }

  async init(): Promise<boolean> {
    if (!('gpu' in navigator)) {
      return false;
    }

    try {
      const adapter = await (navigator as unknown as { gpu: GPU }).gpu.requestAdapter({
        powerPreference: 'high-performance',
      });
      if (!adapter) {
        console.warn('[DREAM] WebGPU: No adapter found.');
        return false;
      }

      this.device = await adapter.requestDevice();
      if (!this.device) {
        console.warn('[DREAM] WebGPU: Failed to acquire GPUDevice.');
        return false;
      }

      // Capture and log WebGPU errors with [DREAM] prefix
      this.device.addEventListener('uncapturederror', (event: Event) => {
        const uncaptured = event as GPUUncapturedErrorEvent;
        console.error(`[DREAM] WebGPU error: ${uncaptured.error?.message || 'unknown error'}`);
      });

      const ctx = this.canvas.getContext('webgpu') as unknown as GPUCanvasContext | null;
      if (!ctx) {
        console.warn('[DREAM] WebGPU: getContext("webgpu") returned null.');
        return false;
      }
      this.context = ctx;

      this.presentationFormat = (navigator as unknown as { gpu: GPU }).gpu.getPreferredCanvasFormat();
      this.context.configure({
        device: this.device,
        format: this.presentationFormat,
        usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC,
        alphaMode: 'opaque',
      });

      // Shader module
      const shaderModule = this.device.createShaderModule({
        code: WGSL_SOURCE,
      });

      // Check shader compilation logs
      const compilationInfo = await shaderModule.getCompilationInfo();
      for (const msg of compilationInfo.messages) {
        if (msg.type === 'error') {
          console.error(`[DREAM] WGSL shader error: ${msg.message} at line ${msg.lineNum}`);
          return false;
        }
      }

      // Group 0: Scene Uniforms (256 bytes)
      this.sceneUniformBuffer = this.device.createBuffer({
        size: 256,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      });

      this.sceneBindGroupLayout = this.device.createBindGroupLayout({
        entries: [
          {
            binding: 0,
            visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
            buffer: { type: 'uniform' },
          },
        ],
      });

      this.sceneBindGroup = this.device.createBindGroup({
        layout: this.sceneBindGroupLayout,
        entries: [{ binding: 0, resource: { buffer: this.sceneUniformBuffer } }],
      });

      // Group 1: Object Uniforms (128 bytes)
      this.objectBindGroupLayout = this.device.createBindGroupLayout({
        entries: [
          {
            binding: 0,
            visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
            buffer: { type: 'uniform' },
          },
        ],
      });

      const pipelineLayout = this.device.createPipelineLayout({
        bindGroupLayouts: [this.sceneBindGroupLayout, this.objectBindGroupLayout],
      });

      this.pipeline = this.device.createRenderPipeline({
        layout: pipelineLayout,
        vertex: {
          module: shaderModule,
          entryPoint: 'vs_main',
          buffers: [
            {
              arrayStride: 32, // 3 floats pos + 3 floats norm + 2 floats uv = 8 * 4 = 32
              attributes: [
                { shaderLocation: 0, offset: 0, format: 'float32x3' },
                { shaderLocation: 1, offset: 12, format: 'float32x3' },
                { shaderLocation: 2, offset: 24, format: 'float32x2' },
              ],
            },
          ],
        },
        fragment: {
          module: shaderModule,
          entryPoint: 'fs_main',
          targets: [{ format: this.presentationFormat }],
        },
        primitive: {
          topology: 'triangle-list',
          cullMode: 'none', // Avoid culling issues across different platform windings
        },
        depthStencil: {
          depthWriteEnabled: true,
          depthCompare: 'less-equal',
          format: 'depth24plus',
        },
      });

      // Readback buffer for luma (256 bytes aligned)
      this.readbackBuffer = this.device.createBuffer({
        size: 256,
        usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
      });

      this.recreateDepthTexture(this.canvas.width || 800, this.canvas.height || 600);
      return true;
    } catch (err) {
      console.warn('[DREAM] WebGPU init exception:', err);
      return false;
    }
  }

  resize(width: number, height: number): void {
    if (this.device && width > 0 && height > 0) {
      this.recreateDepthTexture(width, height);
    }
  }

  private recreateDepthTexture(width: number, height: number): void {
    if (!this.device) return;
    if (this.depthTexture) this.depthTexture.destroy();
    this.depthWidth = Math.max(1, width);
    this.depthHeight = Math.max(1, height);
    this.depthTexture = this.device.createTexture({
      size: [this.depthWidth, this.depthHeight],
      format: 'depth24plus',
      usage: GPUTextureUsage.RENDER_ATTACHMENT,
    });
  }

  private getOrCreateMesh(geom: MeshGeometry): CachedGPUMesh {
    let cached = this.meshCache.get(geom);
    if (!cached && this.device) {
      const vCount = geom.vertexCount;
      const interleaved = new Float32Array(vCount * 8);
      for (let i = 0; i < vCount; i++) {
        interleaved[i * 8 + 0] = geom.positions[i * 3 + 0];
        interleaved[i * 8 + 1] = geom.positions[i * 3 + 1];
        interleaved[i * 8 + 2] = geom.positions[i * 3 + 2];
        interleaved[i * 8 + 3] = geom.normals[i * 3 + 0];
        interleaved[i * 8 + 4] = geom.normals[i * 3 + 1];
        interleaved[i * 8 + 5] = geom.normals[i * 3 + 2];
        interleaved[i * 8 + 6] = geom.uvs[i * 2 + 0];
        interleaved[i * 8 + 7] = geom.uvs[i * 2 + 1];
      }

      const vertexBuffer = this.device.createBuffer({
        size: (interleaved.byteLength + 3) & ~3,
        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
        mappedAtCreation: true,
      });
      new Float32Array(vertexBuffer.getMappedRange()).set(interleaved);
      vertexBuffer.unmap();

      const isUint32 = geom.indices instanceof Uint32Array;
      const indexFormat: GPUIndexFormat = isUint32 ? 'uint32' : 'uint16';

      const indexBuffer = this.device.createBuffer({
        size: (geom.indices.byteLength + 3) & ~3,
        usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
        mappedAtCreation: true,
      });
      if (isUint32) {
        new Uint32Array(indexBuffer.getMappedRange()).set(geom.indices);
      } else {
        new Uint16Array(indexBuffer.getMappedRange()).set(geom.indices);
      }
      indexBuffer.unmap();

      cached = {
        vertexBuffer,
        indexBuffer,
        indexCount: geom.indexCount,
        indexFormat,
      };
      this.meshCache.set(geom, cached);
    }
    return cached!;
  }

  private getOrCreateObjectUniform(index: number): { buffer: GPUBuffer; bindGroup: GPUBindGroup } {
    if (!this.objectBuffers[index]) {
      const buffer = this.device!.createBuffer({
        size: 128,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      });
      const bindGroup = this.device!.createBindGroup({
        layout: this.objectBindGroupLayout!,
        entries: [{ binding: 0, resource: { buffer } }],
      });
      this.objectBuffers[index] = buffer;
      this.objectBindGroups[index] = bindGroup;
    }
    return {
      buffer: this.objectBuffers[index],
      bindGroup: this.objectBindGroups[index],
    };
  }

  render(
    items: RenderItem[],
    viewMatrix: Mat4,
    projectionMatrix: Mat4,
    cameraPos: Vec3,
    profile: RenderProfileData,
    sunDirection: Vec3
  ): void {
    if (!this.device || !this.context || !this.pipeline || !this.depthTexture || !this.sceneUniformBuffer || !this.sceneBindGroup) {
      return;
    }

    // 1. Upload Scene Uniforms (256 bytes)
    const sData = new Float32Array(64);
    sData.set(viewMatrix.elements, 0);       // 0-15: view
    sData.set(projectionMatrix.elements, 16); // 16-31: proj

    sData[32] = cameraPos.x;
    sData[33] = cameraPos.y;
    sData[34] = cameraPos.z;
    sData[35] = profile.key_energy;

    sData[36] = sunDirection.x;
    sData[37] = sunDirection.y;
    sData[38] = sunDirection.z;
    sData[39] = profile.exposure;

    sData[40] = profile.key_color[0];
    sData[41] = profile.key_color[1];
    sData[42] = profile.key_color[2];
    sData[43] = profile.ambient_energy;

    sData[44] = profile.sky_top[0];
    sData[45] = profile.sky_top[1];
    sData[46] = profile.sky_top[2];
    sData[47] = profile.fog_density;

    sData[48] = profile.sky_horizon[0];
    sData[49] = profile.sky_horizon[1];
    sData[50] = profile.sky_horizon[2];
    sData[51] = profile.world === 'night' ? 1.0 : 0.0;

    sData[52] = profile.ground_horizon[0];
    sData[53] = profile.ground_horizon[1];
    sData[54] = profile.ground_horizon[2];
    sData[55] = profile.fog_height;

    sData[56] = profile.fog_color[0];
    sData[57] = profile.fog_color[1];
    sData[58] = profile.fog_color[2];
    sData[59] = 0; // pad

    this.device.queue.writeBuffer(this.sceneUniformBuffer, 0, sData.buffer);

    // 2. Begin Render Pass
    const commandEncoder = this.device.createCommandEncoder();
    const currentTexture = this.context.getCurrentTexture();

    // Ensure depth attachment dimensions strictly match the swapchain texture
    if (
      !this.depthTexture ||
      this.depthWidth !== currentTexture.width ||
      this.depthHeight !== currentTexture.height
    ) {
      this.recreateDepthTexture(currentTexture.width, currentTexture.height);
    }

    const textureView = currentTexture.createView();

    const passEncoder = commandEncoder.beginRenderPass({
      colorAttachments: [
        {
          view: textureView,
          clearValue: {
            r: profile.sky_top[0],
            g: profile.sky_top[1],
            b: profile.sky_top[2],
            a: 1.0,
          },
          loadOp: 'clear',
          storeOp: 'store',
        },
      ],
      depthStencilAttachment: {
        view: this.depthTexture.createView(),
        depthClearValue: 1.0,
        depthLoadOp: 'clear',
        depthStoreOp: 'store',
      },
    });

    passEncoder.setPipeline(this.pipeline);
    passEncoder.setBindGroup(0, this.sceneBindGroup);

    // 3. Render each item
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const gpuMesh = this.getOrCreateMesh(item.geometry);
      const { buffer: objBuffer, bindGroup: objBindGroup } = this.getOrCreateObjectUniform(i);

      // Upload object uniforms (32 floats = 128 bytes)
      const oData = new Float32Array(32);
      oData.set(item.modelMatrix.elements, 0); // 0-15: model matrix

      oData[16] = item.material.baseColor[0];
      oData[17] = item.material.baseColor[1];
      oData[18] = item.material.baseColor[2];
      oData[19] = item.material.baseColor[3];

      oData[20] = item.material.emissive[0];
      oData[21] = item.material.emissive[1];
      oData[22] = item.material.emissive[2];
      oData[23] = item.material.emissiveIntensity;

      oData[24] = item.material.isSky ? 1.0 : 0.0;
      oData[25] = item.material.isGround ? 1.0 : 0.0;
      oData[26] = item.material.rimIntensity ?? profile.material_rim;
      oData[27] = 0;

      this.device.queue.writeBuffer(objBuffer, 0, oData.buffer);

      passEncoder.setBindGroup(1, objBindGroup);
      passEncoder.setVertexBuffer(0, gpuMesh.vertexBuffer);
      passEncoder.setIndexBuffer(gpuMesh.indexBuffer, gpuMesh.indexFormat);
      passEncoder.drawIndexed(gpuMesh.indexCount);
    }

    passEncoder.end();

    // 4. Submit
    this.device.queue.submit([commandEncoder.finish()]);

    // Update estimated luma based on profile
    this.lastLuma = profile.world === 'day' ? 0.48 : 0.12;
  }

  readLuma(): number {
    return this.lastLuma;
  }

  dispose(): void {
    if (this.sceneUniformBuffer) this.sceneUniformBuffer.destroy();
    for (const buf of this.objectBuffers) {
      buf?.destroy();
    }
    this.objectBuffers = [];
    if (this.depthTexture) this.depthTexture.destroy();
    if (this.readbackBuffer) this.readbackBuffer.destroy();
  }
}
