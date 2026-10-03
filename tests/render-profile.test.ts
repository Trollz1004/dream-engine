import test from 'node:test';
import assert from 'node:assert/strict';
import { getRenderProfile, getActiveFallbacks } from '../src/engine/renderer/render-profile.ts';

test('RenderProfile: Day and Night profiles and web fallback compliance', () => {
  const day = getRenderProfile('day', true);
  assert.equal(day.world, 'day');
  assert.equal(day.platform, 'web');
  assert.equal(day.stars, false);
  assert.equal(day.key_energy, 2.2);

  // Active fallbacks for Day on Web:
  // contact_darkening, haze_cards, emitter_halos
  const dayFallbacks = getActiveFallbacks(day);
  assert.ok(dayFallbacks.includes('contact_darkening'));
  assert.ok(dayFallbacks.includes('haze_cards'));
  assert.ok(dayFallbacks.includes('emitter_halos'));
  assert.equal(dayFallbacks.includes('light_shafts'), false);

  const night = getRenderProfile('night', true);
  assert.equal(night.world, 'night');
  assert.equal(night.platform, 'web');
  assert.equal(night.stars, true);
  assert.equal(night.star_count, 4200);
  assert.equal(night.key_energy, 0.45);

  // Active fallbacks for Night on Web:
  // contact_darkening, light_shafts, mirror_layer, emitter_halos
  const nightFallbacks = getActiveFallbacks(night);
  assert.ok(nightFallbacks.includes('contact_darkening'));
  assert.ok(nightFallbacks.includes('light_shafts'));
  assert.ok(nightFallbacks.includes('mirror_layer'));
  assert.ok(nightFallbacks.includes('emitter_halos'));
  assert.equal(nightFallbacks.includes('haze_cards'), false);
});
