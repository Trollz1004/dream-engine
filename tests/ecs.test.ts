import test from 'node:test';
import assert from 'node:assert/strict';
import { World } from '../src/engine/ecs/entity.ts';
import { Vec3 } from '../src/engine/math/vec3.ts';
import { Quat } from '../src/engine/math/quat.ts';

test('ECS: World creation and entity queries', () => {
  const world = new World();
  assert.equal(world.count, 0);

  const e1 = world.createEntity('Player', 'Hero');
  const e2 = world.createEntity('Enemy', 'Monster');
  const e3 = world.createEntity('Marker', 'Environment');

  assert.equal(world.count, 3);
  assert.equal(world.getEntity(e1.id)?.name, 'Player');

  // Add Transform
  e1.setComponent({
    type: 'Transform',
    position: new Vec3(1, 2, 3),
    rotation: new Quat(),
    scale: new Vec3(1, 1, 1),
  });

  e2.setComponent({
    type: 'Transform',
    position: new Vec3(10, 0, 10),
    rotation: new Quat(),
    scale: new Vec3(1, 1, 1),
  });

  // Query entities with Transform
  const withTransform = world.query('Transform');
  assert.equal(withTransform.length, 2);

  // Add Light
  e3.setComponent({
    type: 'Light',
    kind: 'point',
    color: [1, 1, 1],
    intensity: 2.0,
  });

  const withLight = world.query('Light');
  assert.equal(withLight.length, 1);
  assert.equal(withLight[0].name, 'Marker');

  // Remove entity
  world.removeEntity(e2.id);
  assert.equal(world.count, 2);
  assert.equal(world.query('Transform').length, 1);

  // Clear world
  world.clear();
  assert.equal(world.count, 0);
});
