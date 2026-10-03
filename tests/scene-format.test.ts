import test from 'node:test';
import assert from 'node:assert/strict';
import {
  serializeScene,
  parseScene,
  instantiateSceneObjects,
  SceneObjectDefinition
} from '../src/engine/contracts/scene-format.ts';
import { SceneNode } from '../src/engine/scene/node.ts';

test('Contracts: Scene format serialization, loading and instantiation', () => {
  const objects: SceneObjectDefinition[] = [
    {
      id: 'ground-1',
      name: 'Ground',
      type: 'ground',
      position: [0, 0, 0],
      rotation: [0, 0, 0, 1],
      scale: [1, 1, 1],
    },
    {
      id: 'spawn-point-1',
      name: 'Starter Spawn',
      type: 'spawn_point',
      position: [10, 0, 5],
      rotation: [0, 0, 0, 1],
      scale: [1, 1, 1],
      properties: {
        profileId: 'first-gate-starter',
      },
    },
    {
      id: 'monolith-1',
      name: 'Gate Pillar',
      type: 'monolith',
      position: [-8, 0, 12],
      rotation: [0, 0, 0, 1],
      scale: [1.2, 4.0, 1.2],
    },
  ];

  const jsonStr = serializeScene('scene-first-gate', 'First Gate Field', 'day', objects);
  assert.ok(jsonStr.includes('scene-first-gate'));
  assert.ok(jsonStr.includes('First Gate Field'));

  // Parse back
  const parsed = parseScene(jsonStr);
  assert.equal(parsed.sceneId, 'scene-first-gate');
  assert.equal(parsed.worldMode, 'day');
  assert.equal(parsed.objects.length, 3);
  assert.equal(parsed.objects[1].name, 'Starter Spawn');

  // Instantiate into scene hierarchy
  const root = new SceneNode('WorldRoot');
  const nodes = instantiateSceneObjects(parsed, root);
  assert.equal(nodes.length, 3);
  assert.equal(root.children.length, 3);
  assert.equal(nodes[1].position.x, 10);
  assert.equal(nodes[1].position.z, 5);
});
