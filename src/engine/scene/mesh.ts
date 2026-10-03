/**
 * DREAM Engine — Mesh & Procedural Geometries
 * Pure TypeScript, zero external dependencies.
 */

export interface GeometryData {
  positions: Float32Array; // 3 floats per vertex
  normals: Float32Array;   // 3 floats per vertex
  uvs: Float32Array;       // 2 floats per vertex
  colors?: Float32Array;   // 4 floats per vertex (RGBA)
  indices: Uint16Array | Uint32Array;
}

export interface MaterialProperties {
  baseColor: [number, number, number, number];
  roughness: number;
  metallic: number;
  emissive: [number, number, number];
  emissiveIntensity: number;
  rimIntensity?: number;
  isSky?: boolean;
  isGround?: boolean;
}

export class MeshGeometry {
  positions: Float32Array;
  normals: Float32Array;
  uvs: Float32Array;
  colors?: Float32Array;
  indices: Uint16Array | Uint32Array;
  vertexCount: number;
  indexCount: number;

  constructor(data: GeometryData) {
    this.positions = data.positions;
    this.normals = data.normals;
    this.uvs = data.uvs;
    this.colors = data.colors;
    this.indices = data.indices;
    this.vertexCount = this.positions.length / 3;
    this.indexCount = this.indices.length;
  }
}

/**
 * Creates a ground plane centered at (0, 0, 0) in XZ plane with normals pointing up (0, 1, 0).
 */
export function createGroundPlane(size = 200, subdivisions = 10): MeshGeometry {
  const half = size * 0.5;
  const segs = subdivisions;
  const step = size / segs;

  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let z = 0; z <= segs; z++) {
    for (let x = 0; x <= segs; x++) {
      const px = -half + x * step;
      const pz = -half + z * step;

      positions.push(px, 0, pz);
      normals.push(0, 1, 0);
      uvs.push((px / 10), (pz / 10)); // 1 UV unit per 10 world units
    }
  }

  const rowSize = segs + 1;
  for (let z = 0; z < segs; z++) {
    for (let x = 0; x < segs; x++) {
      const a = z * rowSize + x;
      const b = a + 1;
      const c = (z + 1) * rowSize + x;
      const d = c + 1;

      indices.push(a, c, b);
      indices.push(b, c, d);
    }
  }

  return new MeshGeometry({
    positions: new Float32Array(positions),
    normals: new Float32Array(normals),
    uvs: new Float32Array(uvs),
    indices: indices.length > 65535 ? new Uint32Array(indices) : new Uint16Array(indices),
  });
}

/**
 * Creates a 3D capsule centered along Y axis with base at y = 0.
 * Total height = height, radius = radius.
 */
export function createCapsuleGeometry(
  radius = 0.4,
  height = 1.8,
  radialSegments = 24,
  rings = 8
): MeshGeometry {
  const cylinderHeight = Math.max(0.1, height - radius * 2);
  const halfCyl = cylinderHeight * 0.5;
  const centerY = radius + halfCyl; // Character center height

  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  // Helper to add vertex
  function addVertex(x: number, y: number, z: number, nx: number, ny: number, nz: number, u: number, v: number) {
    positions.push(x, y, z);
    normals.push(nx, ny, nz);
    uvs.push(u, v);
  }

  // Top Hemisphere
  for (let lat = 0; lat <= rings; lat++) {
    const theta = (lat * Math.PI) / (2 * rings);
    const sinTheta = Math.sin(theta);
    const cosTheta = Math.cos(theta);

    for (let lon = 0; lon <= radialSegments; lon++) {
      const phi = (lon * 2 * Math.PI) / radialSegments;
      const sinPhi = Math.sin(phi);
      const cosPhi = Math.cos(phi);

      const nx = cosPhi * sinTheta;
      const ny = cosTheta;
      const nz = sinPhi * sinTheta;

      const px = radius * nx;
      const py = centerY + halfCyl + radius * (ny - 1) + radius;
      const pz = radius * nz;

      addVertex(px, py, pz, nx, ny, nz, lon / radialSegments, 1.0 - (lat / (rings * 4)));
    }
  }

  // Cylinder Body
  for (let i = 0; i <= 2; i++) {
    const yFrac = i / 2;
    const py = centerY + halfCyl - yFrac * cylinderHeight;

    for (let lon = 0; lon <= radialSegments; lon++) {
      const phi = (lon * 2 * Math.PI) / radialSegments;
      const sinPhi = Math.sin(phi);
      const cosPhi = Math.cos(phi);

      const nx = cosPhi;
      const ny = 0;
      const nz = sinPhi;

      addVertex(radius * nx, py, radius * nz, nx, ny, nz, lon / radialSegments, 0.5);
    }
  }

  // Bottom Hemisphere
  for (let lat = 0; lat <= rings; lat++) {
    const theta = Math.PI * 0.5 + (lat * Math.PI) / (2 * rings);
    const sinTheta = Math.sin(theta);
    const cosTheta = Math.cos(theta);

    for (let lon = 0; lon <= radialSegments; lon++) {
      const phi = (lon * 2 * Math.PI) / radialSegments;
      const sinPhi = Math.sin(phi);
      const cosPhi = Math.cos(phi);

      const nx = cosPhi * sinTheta;
      const ny = cosTheta;
      const nz = sinPhi * sinTheta;

      const px = radius * nx;
      const py = centerY - halfCyl + radius * ny;
      const pz = radius * nz;

      addVertex(px, py, pz, nx, ny, nz, lon / radialSegments, 0.25 - (lat / (rings * 4)));
    }
  }

  // Build index grid
  const totalRings = (rings + 1) + 3 + (rings + 1);
  const segCols = radialSegments + 1;

  for (let r = 0; r < totalRings - 1; r++) {
    for (let c = 0; c < radialSegments; c++) {
      const a = r * segCols + c;
      const b = a + 1;
      const cIdx = (r + 1) * segCols + c;
      const d = cIdx + 1;

      indices.push(a, cIdx, b);
      indices.push(b, cIdx, d);
    }
  }

  return new MeshGeometry({
    positions: new Float32Array(positions),
    normals: new Float32Array(normals),
    uvs: new Float32Array(uvs),
    indices: indices.length > 65535 ? new Uint32Array(indices) : new Uint16Array(indices),
  });
}

/**
 * Creates a scenic monolith/pillar mesh for world depth and spatial scale.
 */
export function createMonolithGeometry(w = 1.2, h = 4.5, d = 1.2): MeshGeometry {
  const hw = w * 0.5;
  const hd = d * 0.5;

  const positions = new Float32Array([
    // Front face
    -hw, 0,  hd,   hw, 0,  hd,   hw, h,  hd,  -hw, h,  hd,
    // Back face
    -hw, 0, -hd,  -hw, h, -hd,   hw, h, -hd,   hw, 0, -hd,
    // Top face
    -hw, h, -hd,  -hw, h,  hd,   hw, h,  hd,   hw, h, -hd,
    // Bottom face
    -hw, 0, -hd,   hw, 0, -hd,   hw, 0,  hd,  -hw, 0,  hd,
    // Right face
     hw, 0, -hd,   hw, h, -hd,   hw, h,  hd,   hw, 0,  hd,
    // Left face
    -hw, 0, -hd,  -hw, 0,  hd,  -hw, h,  hd,  -hw, h, -hd,
  ]);

  const normals = new Float32Array([
    0, 0, 1,  0, 0, 1,  0, 0, 1,  0, 0, 1,
    0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1,
    0, 1, 0,  0, 1, 0,  0, 1, 0,  0, 1, 0,
    0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0,
    1, 0, 0,  1, 0, 0,  1, 0, 0,  1, 0, 0,
   -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0,
  ]);

  const uvs = new Float32Array([
    0, 0, 1, 0, 1, 1, 0, 1,
    0, 0, 1, 0, 1, 1, 0, 1,
    0, 0, 1, 0, 1, 1, 0, 1,
    0, 0, 1, 0, 1, 1, 0, 1,
    0, 0, 1, 0, 1, 1, 0, 1,
    0, 0, 1, 0, 1, 1, 0, 1,
  ]);

  const indices = new Uint16Array([
    0, 1, 2,      0, 2, 3,    // Front
    4, 5, 6,      4, 6, 7,    // Back
    8, 9, 10,     8, 10, 11,  // Top
    12, 13, 14,   12, 14, 15, // Bottom
    16, 17, 18,   16, 18, 19, // Right
    20, 21, 22,   20, 22, 23  // Left
  ]);

  return new MeshGeometry({ positions, normals, uvs, indices });
}

/**
 * Creates a sky hemisphere for atmosphere gradient and sun disk rendering.
 */
export function createSkyDomeGeometry(radius = 800, segments = 24, rings = 12): MeshGeometry {
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let r = 0; r <= rings; r++) {
    // from zenith (0) down to slightly below horizon (PI * 0.55)
    const theta = (r * Math.PI * 0.55) / rings;
    const sinTheta = Math.sin(theta);
    const cosTheta = Math.cos(theta);

    for (let s = 0; s <= segments; s++) {
      const phi = (s * 2 * Math.PI) / segments;
      const sinPhi = Math.sin(phi);
      const cosPhi = Math.cos(phi);

      const x = radius * cosPhi * sinTheta;
      const y = radius * cosTheta;
      const z = radius * sinPhi * sinTheta;

      // Inverted normal facing inward
      positions.push(x, y, z);
      normals.push(-cosPhi * sinTheta, -cosTheta, -sinPhi * sinTheta);
      uvs.push(s / segments, r / rings);
    }
  }

  const cols = segments + 1;
  for (let r = 0; r < rings; r++) {
    for (let s = 0; s < segments; s++) {
      const a = r * cols + s;
      const b = a + 1;
      const c = (r + 1) * cols + s;
      const d = c + 1;

      indices.push(a, b, c);
      indices.push(b, d, c);
    }
  }

  return new MeshGeometry({
    positions: new Float32Array(positions),
    normals: new Float32Array(normals),
    uvs: new Float32Array(uvs),
    indices: indices.length > 65535 ? new Uint32Array(indices) : new Uint16Array(indices),
  });
}

/**
 * Creates a centered or offset box geometry with custom dimensions and center offset.
 */
export function createBoxGeometry(w = 1.0, h = 1.0, d = 1.0, ox = 0, oy = 0, oz = 0): MeshGeometry {
  const hw = w * 0.5;
  const hh = h * 0.5;
  const hd = d * 0.5;

  const minX = ox - hw, maxX = ox + hw;
  const minY = oy - hh, maxY = oy + hh;
  const minZ = oz - hd, maxZ = oz + hd;

  const positions = new Float32Array([
    // Front face (Z+)
    minX, minY, maxZ,   maxX, minY, maxZ,   maxX, maxY, maxZ,   minX, maxY, maxZ,
    // Back face (Z-)
    minX, minY, minZ,   minX, maxY, minZ,   maxX, maxY, minZ,   maxX, minY, minZ,
    // Top face (Y+)
    minX, maxY, minZ,   minX, maxY, maxZ,   maxX, maxY, maxZ,   maxX, maxY, minZ,
    // Bottom face (Y-)
    minX, minY, minZ,   maxX, minY, minZ,   maxX, minY, maxZ,   minX, minY, maxZ,
    // Right face (X+)
    maxX, minY, minZ,   maxX, maxY, minZ,   maxX, maxY, maxZ,   maxX, minY, maxZ,
    // Left face (X-)
    minX, minY, minZ,   minX, minY, maxZ,   minX, maxY, maxZ,   minX, maxY, minZ,
  ]);

  const normals = new Float32Array([
    0, 0, 1,   0, 0, 1,   0, 0, 1,   0, 0, 1,
    0, 0, -1,  0, 0, -1,  0, 0, -1,  0, 0, -1,
    0, 1, 0,   0, 1, 0,   0, 1, 0,   0, 1, 0,
    0, -1, 0,  0, -1, 0,  0, -1, 0,  0, -1, 0,
    1, 0, 0,   1, 0, 0,   1, 0, 0,   1, 0, 0,
   -1, 0, 0,  -1, 0, 0,  -1, 0, 0,  -1, 0, 0,
  ]);

  const uvs = new Float32Array([
    0, 0, 1, 0, 1, 1, 0, 1,
    0, 0, 1, 0, 1, 1, 0, 1,
    0, 0, 1, 0, 1, 1, 0, 1,
    0, 0, 1, 0, 1, 1, 0, 1,
    0, 0, 1, 0, 1, 1, 0, 1,
    0, 0, 1, 0, 1, 1, 0, 1,
  ]);

  const indices = new Uint16Array([
    0, 1, 2,      0, 2, 3,
    4, 5, 6,      4, 6, 7,
    8, 9, 10,     8, 10, 11,
    12, 13, 14,   12, 14, 15,
    16, 17, 18,   16, 18, 19,
    20, 21, 22,   20, 22, 23,
  ]);

  return new MeshGeometry({ positions, normals, uvs, indices });
}

/**
 * Creates a heroic humanoid Cyber-Knight avatar model.
 * Replaces basic capsule with an articulated MMO warrior silhouette:
 * Head helm with geminEyE cyber-optic visor, armored chest plate with core reactor,
 * shoulder pauldrons, articulated gauntlets, knee armor, heavy boots, and back spinal spine.
 */
export function createCyberKnightGeometries() {
  return {
    head: createBoxGeometry(0.32, 0.30, 0.32, 0, 1.62, 0),
    visor: createBoxGeometry(0.28, 0.08, 0.12, 0, 1.62, 0.17),
    torso: createBoxGeometry(0.54, 0.58, 0.34, 0, 1.16, 0),
    core: createBoxGeometry(0.16, 0.16, 0.08, 0, 1.25, 0.18),
    pauldronL: createBoxGeometry(0.24, 0.22, 0.26, -0.38, 1.38, 0),
    pauldronR: createBoxGeometry(0.24, 0.22, 0.26, 0.38, 1.38, 0),
    armL: createBoxGeometry(0.16, 0.52, 0.16, -0.36, 1.02, 0),
    armR: createBoxGeometry(0.16, 0.52, 0.16, 0.36, 1.02, 0),
    blade: createBoxGeometry(0.08, 0.75, 0.12, 0.38, 0.85, 0.25),
    hip: createBoxGeometry(0.44, 0.18, 0.30, 0, 0.78, 0),
    legL: createBoxGeometry(0.18, 0.68, 0.20, -0.15, 0.36, 0),
    legR: createBoxGeometry(0.18, 0.68, 0.20, 0.15, 0.36, 0),
    spine: createBoxGeometry(0.10, 0.54, 0.12, 0, 1.18, -0.20),
  };
}
