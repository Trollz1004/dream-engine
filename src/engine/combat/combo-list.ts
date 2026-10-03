/**
 * DREAM Engine — Combo List Data
 * Exact parity with combo_list.gd
 * 
 * Lists every combination the build resolves in plain words, with its
 * defensive tag, marking stubs honestly as not yet in this build.
 */

import { Combo } from './combo';

export interface ComboRow {
  id: string;
  name: string;
  keys: string;
  sentence: string;
  tag: string;
  section: string;
  stub: boolean;
  example?: [string, boolean, string];
  state?: string;
  stubSets?: string[];
}

export const TAG_IFRAMES = 'invulnerability frames';
export const TAG_GUARD = 'guard';
export const TAG_SUPER_ARMOUR = 'super armour';
export const TAG_NONE = 'none';
export const NOT_YET = 'not yet in this build';

export const SECTION_MOVING = 'Moving';
export const SECTION_FIGHTING = 'Fighting';
export const SECTION_OTHER = 'Other keys';
export const SECTION_NOT_YET = 'Not yet in this build';

export const FIGHTING_ROWS: Omit<ComboRow, 'section' | 'stub'>[] = [
  {
    id: 'dash',
    name: 'Dash',
    keys: 'Shift + direction + action key',
    example: ['W', true, 'F'],
    state: 'dash',
    sentence:
      'A quick dodge the way you are heading. Its travel slips through attacks untouched; its recovery is wide open. Any action key works: Q, E, R, F, Z, C or a mouse button.',
    tag: TAG_IFRAMES,
  },
  {
    id: 'light_chain',
    name: 'Light attack chain',
    keys: 'Left mouse, up to 3 times',
    example: ['', false, 'LMB'],
    state: 'attack',
    sentence:
      'Three quick strikes that flow as one when each press lands inside the last one\'s window.',
    tag: TAG_NONE,
  },
  {
    id: 'heavy',
    name: 'Heavy attack',
    keys: 'Right mouse',
    example: ['', false, 'RMB'],
    state: 'heavy',
    sentence:
      'One slower, harder swing. Once it starts it runs to the end, then leaves you open.',
    tag: TAG_NONE,
  },
  {
    id: 'guard',
    name: 'Guard',
    keys: 'Q alone',
    example: ['', false, 'Q'],
    state: 'guard',
    sentence:
      'Raise a guard that takes most of a hit. It lowers on its own and leaves you open for a moment.',
    tag: TAG_GUARD,
  },
  {
    id: 'lunge',
    name: 'Dream Lunge',
    keys: 'Hold W, press F',
    example: ['W', false, 'F'],
    state: 'lunge',
    sentence:
      'A thrust that closes six metres in a quarter of a second, then a short opening.',
    tag: TAG_NONE,
  },
  {
    id: 'burst',
    name: 'Nightveil Burst',
    keys: 'R alone',
    example: ['', false, 'R'],
    state: 'burst',
    sentence:
      'A short wind-up, then a shockwave all around you. The answer to it is distance.',
    tag: TAG_NONE,
  },
];

export const MOVING_ROWS: Omit<ComboRow, 'section' | 'stub'>[] = [
  {
    id: 'move',
    name: 'Walk',
    keys: 'W A S D',
    sentence: 'Walk the way the camera faces. The mouse looks around.',
    tag: TAG_NONE,
  },
  {
    id: 'sprint',
    name: 'Sprint',
    keys: 'Shift + direction',
    sentence:
      'Run while stamina lasts. Shift with a direction is always movement, never a skill.',
    tag: TAG_NONE,
  },
  {
    id: 'auto_sprint',
    name: 'Auto-sprint',
    keys: 'Double tap a direction',
    sentence: 'Keeps running with no key held, for the long roads.',
    tag: TAG_NONE,
  },
];

export const OTHER_ROWS: Omit<ComboRow, 'section' | 'stub'>[] = [
  {
    id: 'nightfall',
    name: 'Nightfall',
    keys: 'N',
    sentence: 'The same spot, dreamed at night: neon, rain and dark towers.',
    tag: TAG_NONE,
  },
  {
    id: 'combo_list',
    name: 'This list',
    keys: 'L',
    sentence: 'Opens and closes this list. Escape frees the mouse.',
    tag: TAG_NONE,
  },
  {
    id: 'c0d3x',
    name: 'C0D3X & Radar',
    keys: 'M',
    sentence: 'Tactical landmark radar, node map, and gathering blueprints.',
    tag: TAG_NONE,
  },
  {
    id: 'settings',
    name: 'System Settings',
    keys: 'O or Esc',
    sentence: 'Graphics exposure, fov, audio volume, and controller calibration.',
    tag: TAG_NONE,
  },
  {
    id: 'event_log',
    name: 'Dump World Event Log',
    keys: 'K',
    sentence: 'Outputs the append-only in-memory JSONL world event log to console.',
    tag: TAG_NONE,
  },
];

export function isWorkingSkill(direction: string, shift: boolean, actionKey: string): boolean {
  const skill = Combo.resolve(direction, shift, actionKey);
  if (skill === Combo.MOVEMENT) return false;
  if (shift && direction !== '') return true;
  if (actionKey === 'LMB' || actionKey === 'RMB') return true;
  return skill === 'Q' || skill === 'R' || skill === 'W+F';
}

export function getStubRows(): ComboRow[] {
  const rows: ComboRow[] = [];
  for (const key of Combo.ACTION_KEYS) {
    if (key === 'LMB' || key === 'RMB') continue;
    const sets: string[] = [];
    for (const dir of ['', ...Combo.DIRECTIONS]) {
      if (!isWorkingSkill(dir, false, key)) {
        sets.push(Combo.displayKeys(dir, false, key));
      }
    }
    if (sets.length > 0) {
      rows.push({
        id: `stub_${key.toLowerCase()}`,
        name: `${key} key sets`,
        keys: sets.join(', '),
        sentence: 'These key sets are read and named on screen, but no move is behind them yet.',
        tag: NOT_YET,
        section: SECTION_NOT_YET,
        stub: true,
        stubSets: sets,
      });
    }
  }
  return rows;
}

export function getAllComboRows(): ComboRow[] {
  const out: ComboRow[] = [];
  for (const r of MOVING_ROWS) {
    out.push({ ...r, section: SECTION_MOVING, stub: false });
  }
  for (const r of FIGHTING_ROWS) {
    out.push({ ...r, section: SECTION_FIGHTING, stub: false });
  }
  for (const r of OTHER_ROWS) {
    out.push({ ...r, section: SECTION_OTHER, stub: false });
  }
  for (const r of getStubRows()) {
    out.push(r);
  }
  return out;
}
