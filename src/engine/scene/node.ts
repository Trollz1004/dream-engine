/**
 * DREAM Engine — Scene Graph Node
 * Pure TypeScript, zero external dependencies.
 */

import { Vec3 } from '../math/vec3.ts';
import { Quat } from '../math/quat.ts';
import { Mat4 } from '../math/mat4.ts';

export class SceneNode {
  id: string;
  name: string;
  position: Vec3;
  rotation: Quat;
  scale: Vec3;

  localMatrix: Mat4;
  worldMatrix: Mat4;

  parent: SceneNode | null = null;
  children: SceneNode[] = [];
  visible = true;

  constructor(name = 'Node', id?: string) {
    this.name = name;
    this.id = id || Math.random().toString(36).substring(2, 9);
    this.position = new Vec3();
    this.rotation = new Quat();
    this.scale = new Vec3(1, 1, 1);
    this.localMatrix = new Mat4();
    this.worldMatrix = new Mat4();
  }

  add(child: SceneNode): this {
    if (child.parent) {
      child.parent.remove(child);
    }
    child.parent = this;
    this.children.push(child);
    return this;
  }

  remove(child: SceneNode): this {
    const idx = this.children.indexOf(child);
    if (idx !== -1) {
      child.parent = null;
      this.children.splice(idx, 1);
    }
    return this;
  }

  updateMatrix(): void {
    this.localMatrix.compose(this.position, this.rotation, this.scale);
  }

  updateWorldMatrix(parentWorldMatrix?: Mat4): void {
    this.updateMatrix();
    if (parentWorldMatrix) {
      this.worldMatrix.copy(parentWorldMatrix).multiply(this.localMatrix);
    } else if (this.parent) {
      this.worldMatrix.copy(this.parent.worldMatrix).multiply(this.localMatrix);
    } else {
      this.worldMatrix.copy(this.localMatrix);
    }

    for (const child of this.children) {
      child.updateWorldMatrix(this.worldMatrix);
    }
  }

  getWorldPosition(out = new Vec3()): Vec3 {
    return out.set(
      this.worldMatrix.elements[12],
      this.worldMatrix.elements[13],
      this.worldMatrix.elements[14]
    );
  }

  traverse(callback: (node: SceneNode) => void): void {
    callback(this);
    for (const child of this.children) {
      child.traverse(callback);
    }
  }
}
