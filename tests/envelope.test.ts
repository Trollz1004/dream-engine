import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorldEvent, validateWorldEvent } from '../src/engine/contracts/world-event.ts';

test('Contracts: World Event Envelope validation and generation', () => {
  const event = createWorldEvent(
    'player.perfect_dodge',
    'first-gate',
    ['player:hero-001', 'npc:dummy-001'],
    {
      playerId: 'hero-001',
      attackName: 'Focus Beam',
      dodgeResult: 'perfect',
      iFrameConfirmed: true,
    },
    {
      salienceReason: 'signature dodge against Focus Beam',
      reactionEligible: true,
    }
  );

  // Validate schema version 0.1.0
  assert.equal(event.schemaVersion, '0.1.0');
  assert.ok(event.eventId.startsWith('evt-dream-'));
  assert.equal(event.eventName, 'player.perfect_dodge');
  assert.equal(event.region, 'first-gate');
  assert.equal(event.privacyClassification, 'game-relevant-only');
  assert.equal(event.ageModeClassification, 'STANDARD');
  assert.equal(event.salienceMetadata.reactionEligible, true);

  // Run contract validator
  const validation = validateWorldEvent(event);
  assert.equal(validation.valid, true);
  assert.equal(validation.errors.length, 0);

  // Test invalid envelope catches
  const invalid = { ...event, schemaVersion: '9.9.9' };
  const failResult = validateWorldEvent(invalid);
  assert.equal(failResult.valid, false);
  assert.ok(failResult.errors.some(e => e.includes('Invalid schemaVersion')));
});
