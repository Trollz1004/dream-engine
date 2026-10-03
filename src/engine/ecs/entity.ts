/**
 * DREAM Engine — Entity Component Store (ECS)
 * Pure TypeScript, zero external dependencies.
 */

import { Component, ComponentType } from './components.ts';

export class Entity {
  readonly id: string;
  name: string;
  tag: string;
  enabled = true;
  private components: Map<ComponentType, Component> = new Map();

  constructor(id: string, name = 'Entity', tag = 'Untagged') {
    this.id = id;
    this.name = name;
    this.tag = tag;
  }

  setComponent<T extends Component>(comp: T): this {
    this.components.set(comp.type, comp);
    return this;
  }

  getComponent<T extends Component>(type: T['type']): T | undefined {
    return this.components.get(type) as T | undefined;
  }

  hasComponent(type: ComponentType): boolean {
    return this.components.has(type);
  }

  removeComponent(type: ComponentType): boolean {
    return this.components.delete(type);
  }

  getAllComponents(): Component[] {
    return Array.from(this.components.values());
  }
}

export class World {
  private entities: Map<string, Entity> = new Map();
  private nextId = 1;

  createEntity(name = 'Entity', tag = 'Untagged'): Entity {
    const id = `ent_${this.nextId++}_${Math.random().toString(36).substring(2, 7)}`;
    const entity = new Entity(id, name, tag);
    this.entities.set(id, entity);
    return entity;
  }

  removeEntity(id: string): boolean {
    return this.entities.delete(id);
  }

  getEntity(id: string): Entity | undefined {
    return this.entities.get(id);
  }

  getAllEntities(): Entity[] {
    return Array.from(this.entities.values());
  }

  query(...types: ComponentType[]): Entity[] {
    const results: Entity[] = [];
    for (const entity of this.entities.values()) {
      if (!entity.enabled) continue;
      let match = true;
      for (const t of types) {
        if (!entity.hasComponent(t)) {
          match = false;
          break;
        }
      }
      if (match) {
        results.push(entity);
      }
    }
    return results;
  }

  clear(): void {
    this.entities.clear();
    this.nextId = 1;
  }

  get count(): number {
    return this.entities.size;
  }
}
