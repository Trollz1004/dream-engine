/**
 * DREAM Engine — World Event Envelope Contract
 * Strict conformance to docs/tech/data-contracts.md and specs/001-world-bus-cross-eyed-slice
 * Schema Version: 0.1.0
 */

export type PrivacyClassification =
  | 'game-relevant-only'
  | 'public-lore'
  | 'private-memory'
  | 'audit-log';

export type AgeModeClassification = 'STANDARD' | 'TEEN' | 'ALL_AGES';

export interface SalienceMetadata {
  candidateReason: string;
  reactionEligible: boolean;
  salienceScore?: number;
}

export interface WorldEventEnvelope<T = Record<string, unknown>> {
  schemaVersion: '0.1.0';
  eventId: string;
  eventName: string;
  timestamp: string; // ISO 8601
  correlationId: string;
  region: string;
  involvedEntityIds: string[];
  structuredPayload: T;
  privacyClassification: PrivacyClassification;
  ageModeClassification: AgeModeClassification;
  salienceMetadata: SalienceMetadata;
}

let eventCounter = 1;

export function createWorldEvent<T extends Record<string, unknown>>(
  eventName: string,
  region: string,
  involvedEntityIds: string[],
  payload: T,
  options: {
    correlationId?: string;
    privacy?: PrivacyClassification;
    ageMode?: AgeModeClassification;
    salienceReason?: string;
    reactionEligible?: boolean;
    timestamp?: string;
  } = {}
): WorldEventEnvelope<T> {
  const seq = String(eventCounter++).padStart(6, '0');
  const now = options.timestamp || new Date().toISOString();

  return {
    schemaVersion: '0.1.0',
    eventId: `evt-dream-${seq}`,
    eventName,
    timestamp: now,
    correlationId: options.correlationId || `corr-dream-${Date.now()}`,
    region,
    involvedEntityIds,
    structuredPayload: payload,
    privacyClassification: options.privacy || 'game-relevant-only',
    ageModeClassification: options.ageMode || 'STANDARD',
    salienceMetadata: {
      candidateReason: options.salienceReason || `World event: ${eventName}`,
      reactionEligible: options.reactionEligible ?? false,
    },
  };
}

export function validateWorldEvent(event: unknown): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!event || typeof event !== 'object') {
    return { valid: false, errors: ['Event must be a non-null object'] };
  }

  const e = event as Partial<WorldEventEnvelope>;

  if (e.schemaVersion !== '0.1.0') {
    errors.push(`Invalid schemaVersion: expected "0.1.0", got "${e.schemaVersion}"`);
  }
  if (!e.eventId || typeof e.eventId !== 'string' || e.eventId.length < 3) {
    errors.push('Invalid or missing eventId');
  }
  if (!e.eventName || typeof e.eventName !== 'string' || !/^[a-z]+(\.[a-z_]+)+$/.test(e.eventName)) {
    errors.push(`Invalid eventName "${e.eventName}": must follow domain.event_name pattern`);
  }
  if (!e.timestamp || isNaN(Date.parse(e.timestamp))) {
    errors.push('Invalid or unparseable ISO 8601 timestamp');
  }
  if (!e.region || typeof e.region !== 'string') {
    errors.push('Missing or invalid region');
  }
  if (!Array.isArray(e.involvedEntityIds)) {
    errors.push('involvedEntityIds must be an array of strings');
  }
  if (!e.structuredPayload || typeof e.structuredPayload !== 'object') {
    errors.push('structuredPayload must be a JSON object');
  }
  if (!e.privacyClassification) {
    errors.push('Missing privacyClassification');
  }
  if (!e.ageModeClassification) {
    errors.push('Missing ageModeClassification');
  }
  if (!e.salienceMetadata || typeof e.salienceMetadata !== 'object') {
    errors.push('Missing salienceMetadata');
  }

  return { valid: errors.length === 0, errors };
}

export function createPerfectDodgeEvent(
  playerId: string,
  encounterId: string,
  bossId: string,
  attackName: string,
  region: string
): WorldEventEnvelope {
  return createWorldEvent(
    'player.perfect_dodge',
    region,
    [`player:${playerId}`, `npc:${bossId}`, `encounter:${encounterId}`],
    {
      playerId,
      encounterId,
      bossId,
      attackName,
      dodgeResult: 'perfect',
      iFrameConfirmed: true,
      combatOutcomeId: `combat-outcome-${Date.now()}`,
    },
    {
      correlationId: `enc-${encounterId}`,
      salienceReason: `signature dodge against ${attackName}`,
      reactionEligible: true,
    }
  );
}
