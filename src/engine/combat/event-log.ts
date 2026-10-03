/**
 * DREAM Engine — In-Memory World Event Append-Only Log
 * Strict conformance to docs/tech/data-contracts.md
 */

import { WorldEventEnvelope, validateWorldEvent } from '../contracts/world-event';

export class EventLog {
  private _events: WorldEventEnvelope[] = [];

  append(event: WorldEventEnvelope): boolean {
    const val = validateWorldEvent(event);
    if (!val.valid) {
      console.error('[DREAM EventLog] Validation failed:', val.errors);
      return false;
    }
    this._events.push(event);
    return true;
  }

  getAll(): readonly WorldEventEnvelope[] {
    return this._events;
  }

  count(): number {
    return this._events.length;
  }

  toJSONL(): string {
    return this._events.map((e) => JSON.stringify(e)).join('\n');
  }

  dumpToConsole(): void {
    console.log(`=== [DREAM World Event Log (${this._events.length} events)] ===`);
    for (let i = 0; i < this._events.length; i++) {
      console.log(`[Event ${i + 1}] ${JSON.stringify(this._events[i])}`);
    }
    console.log('=== [End World Event Log] ===');
  }

  clear(): void {
    this._events = [];
  }
}
