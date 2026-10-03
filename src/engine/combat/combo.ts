/**
 * DREAM Engine — Combo Grammar
 * Exact parity with combo.gd and docs/gdd/02-action-combat.md
 * 
 * Rules:
 * - A direction with Shift alone is movement (never a skill).
 * - A skill is a direction, an optional Shift, and one action key.
 * - Every distinct set of keys is its own separate skill, and Shift is part of the set.
 */

export class Combo {
  static readonly MOVEMENT: string = 'MOVEMENT';
  static readonly ACTION_KEYS: readonly string[] = [
    'Q', 'E', 'R', 'F', 'Z', 'C', 'LMB', 'RMB'
  ];
  static readonly DIRECTIONS: readonly string[] = ['W', 'A', 'S', 'D'];

  static resolve(direction: string, shift: boolean, actionKey: string): string {
    if (!Combo.ACTION_KEYS.includes(actionKey)) {
      return Combo.MOVEMENT;
    }

    const parts: string[] = [];
    if (direction && Combo.DIRECTIONS.includes(direction.toUpperCase())) {
      parts.push(direction.toUpperCase());
    }
    if (shift) {
      parts.push('SHIFT');
    }
    parts.push(actionKey);

    return parts.join('+');
  }

  static displayKeys(direction: string, shift: boolean, actionKey: string): string {
    const parts: string[] = [];
    if (direction) {
      parts.push(direction.toUpperCase());
    }
    if (shift) {
      parts.push('Shift');
    }
    parts.push(actionKey);
    let text = parts.join(' + ');
    if (!direction && !shift) {
      text += ' alone';
    }
    return text;
  }
}
