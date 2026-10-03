/**
 * DREAM Engine — Pure JSON Scene Storage Contract
 * Text-only scene specification for DREAM Maker & Git storage.
 */

import { SceneNode } from '../scene/node.ts';
import { createCapsuleGeometry, createGroundPlane, createMonolithGeometry } from '../scene/mesh.ts';
import { Vec3 } from '../math/vec3.ts';
import { Quat } from '../math/quat.ts';

export interface SceneObjectDefinition {
  id: string;
  name: string;
  type: 'ground' | 'capsule' | 'monolith' | 'spawn_point' | 'custom';
  position: [number, number, number];
  rotation: [number, number, number, number]; // Quaternion x,y,z,w
  scale: [number, number, number];
  properties?: {
    color?: [number, number, number, number];
    profileId?: string;
    tag?: string;
  };
}

export interface DreamSceneDocument {
  formatVersion: '0.1.0';
  sceneId: string;
  name: string;
  worldMode: 'day' | 'night';
  createdAt: string;
  updatedAt: string;
  objects: SceneObjectDefinition[];
}

export function serializeScene(
  sceneId: string,
  name: string,
  worldMode: 'day' | 'night',
  objects: SceneObjectDefinition[]
): string {
  const doc: DreamSceneDocument = {
    formatVersion: '0.1.0',
    sceneId,
    name,
    worldMode,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    objects,
  };
  return JSON.stringify(doc, null, 2);
}

export function parseScene(jsonString: string): DreamSceneDocument {
  const data = JSON.parse(jsonString) as DreamSceneDocument;
  if (data.formatVersion !== '0.1.0') {
    throw new Error(`Unsupported scene format version: ${data.formatVersion}`);
  }
  if (!Array.isArray(data.objects)) {
    throw new Error('Scene must contain an objects array');
  }
  return data;
}

export function instantiateSceneObjects(scene: DreamSceneDocument, root: SceneNode): SceneNode[] {
  const createdNodes: SceneNode[] = [];

  for (const obj of scene.objects) {
    const node = new SceneNode(obj.name, obj.id);
    node.position.set(obj.position[0], obj.position[1], obj.position[2]);
    node.rotation.set(obj.rotation[0], obj.rotation[1], obj.rotation[2], obj.rotation[3]);
    node.scale.set(obj.scale[0], obj.scale[1], obj.scale[2]);

    root.add(node);
    createdNodes.push(node);
  }

  root.updateWorldMatrix();
  return createdNodes;
}
