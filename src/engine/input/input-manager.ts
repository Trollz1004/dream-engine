/**
 * DREAM Engine — Input Manager
 * Pure TypeScript, zero external dependencies.
 * Handles Keyboard, Pointer Lock Mouse Look, fallback mouse drag,
 * Escape release, and full HTML5 Gamepad / Controller API support.
 */

export class InputManager {
  private keysDown: Set<string> = new Set();
  private keysPressed: Set<string> = new Set();

  private mouseDeltaX = 0;
  private mouseDeltaY = 0;
  private isPointerLocked = false;
  private isControlActive = false;

  private canvas: HTMLCanvasElement | null = null;
  private isMouseDown = false;
  private lastMouseX = 0;
  private lastMouseY = 0;

  // Sensitivity
  mouseSensitivity = 0.0022;

  // Gamepad State
  gamepadConnected = false;
  gamepadId = '';
  gamepadDeadzone = 0.15;
  gamepadSensitivity = 2.2;
  private prevGamepadButtons: boolean[] = [];

  // Combat Pending Actions
  private pendingActions: Array<{ actionKey: string; shift: boolean; direction: string }> = [];

  // Listeners
  private onKeyDownBound: (e: KeyboardEvent) => void;
  private onKeyUpBound: (e: KeyboardEvent) => void;
  private onMouseMoveBound: (e: MouseEvent) => void;
  private onMouseDownBound: (e: MouseEvent) => void;
  private onMouseUpBound: (e: MouseEvent) => void;
  private onContextMenuBound: (e: MouseEvent) => void;
  private onPointerLockChangeBound: () => void;
  private onPointerLockErrorBound: () => void;
  private onGamepadConnectedBound: (e: GamepadEvent) => void;
  private onGamepadDisconnectedBound: (e: GamepadEvent) => void;

  // Callbacks
  onDayNightToggle?: () => void;
  onControlStateChange?: (active: boolean, locked: boolean) => void;
  onPointerLockRefused?: (message: string) => void;
  onToggleViewMode?: () => void;
  onToggleMap?: () => void;
  onToggleComboList?: () => void;
  onToggleGeminEye?: () => void;
  onDumpEventLog?: () => void;
  onToggleSettings?: () => void;
  onGamepadChange?: (connected: boolean, id: string) => void;
  onUserInteract?: () => void;

  constructor() {
    this.onKeyDownBound = this.handleKeyDown.bind(this);
    this.onKeyUpBound = this.handleKeyUp.bind(this);
    this.onMouseMoveBound = this.handleMouseMove.bind(this);
    this.onMouseDownBound = this.handleMouseDown.bind(this);
    this.onMouseUpBound = this.handleMouseUp.bind(this);
    this.onContextMenuBound = this.handleContextMenu.bind(this);
    this.onPointerLockChangeBound = this.handlePointerLockChange.bind(this);
    this.onPointerLockErrorBound = this.handlePointerLockError.bind(this);
    this.onGamepadConnectedBound = this.handleGamepadConnected.bind(this);
    this.onGamepadDisconnectedBound = this.handleGamepadDisconnected.bind(this);
  }

  attach(canvas: HTMLCanvasElement): void {
    this.detach();
    this.canvas = canvas;

    window.addEventListener('keydown', this.onKeyDownBound);
    window.addEventListener('keyup', this.onKeyUpBound);
    window.addEventListener('mousemove', this.onMouseMoveBound);
    canvas.addEventListener('mousedown', this.onMouseDownBound);
    canvas.addEventListener('contextmenu', this.onContextMenuBound);
    window.addEventListener('mouseup', this.onMouseUpBound);
    document.addEventListener('pointerlockchange', this.onPointerLockChangeBound);
    document.addEventListener('pointerlockerror', this.onPointerLockErrorBound);
    window.addEventListener('gamepadconnected', this.onGamepadConnectedBound);
    window.addEventListener('gamepaddisconnected', this.onGamepadDisconnectedBound);

    // Initial check for already connected gamepads
    this.checkInitialGamepads();
  }

  detach(): void {
    window.removeEventListener('keydown', this.onKeyDownBound);
    window.removeEventListener('keyup', this.onKeyUpBound);
    window.removeEventListener('mousemove', this.onMouseMoveBound);
    if (this.canvas) {
      this.canvas.removeEventListener('mousedown', this.onMouseDownBound);
      this.canvas.removeEventListener('contextmenu', this.onContextMenuBound);
    }
    window.removeEventListener('mouseup', this.onMouseUpBound);
    document.removeEventListener('pointerlockchange', this.onPointerLockChangeBound);
    document.removeEventListener('pointerlockerror', this.onPointerLockErrorBound);
    window.removeEventListener('gamepadconnected', this.onGamepadConnectedBound);
    window.removeEventListener('gamepaddisconnected', this.onGamepadDisconnectedBound);
    this.keysDown.clear();
    this.keysPressed.clear();
    this.canvas = null;
    this.isControlActive = false;
    this.isPointerLocked = false;
  }

  requestControl(): void {
    if (!this.canvas) return;

    this.isControlActive = true;
    this.canvas.focus();
    this.onUserInteract?.();

    try {
      const promise = this.canvas.requestPointerLock() as unknown as Promise<void> | undefined;
      if (promise && typeof promise.then === 'function') {
        promise.catch((err) => {
          console.warn('[DREAM] Pointer lock request rejected:', err);
          this.handlePointerLockError();
        });
      }
    } catch (err) {
      console.warn('[DREAM] Pointer lock request threw:', err);
      this.handlePointerLockError();
    }

    if (this.onControlStateChange) {
      this.onControlStateChange(this.isControlActive, this.isPointerLocked);
    }
  }

  releaseControl(): void {
    this.isControlActive = false;
    this.isPointerLocked = false;
    try {
      if (document.pointerLockElement) {
        document.exitPointerLock();
      }
    } catch {
      // Ignore exitPointerLock errors in unattached or non-focused context
    }
    this.keysDown.clear();
    if (this.onControlStateChange) {
      this.onControlStateChange(false, false);
    }
  }

  private handlePointerLockError(): void {
    this.isPointerLocked = false;
    // Keep control active so keyboard and mouse-drag fallback continue to function
    this.isControlActive = true;
    if (this.onPointerLockRefused) {
      this.onPointerLockRefused('Pointer lock refused by browser/iframe. Drag mouse to look; WASD to walk.');
    }
    if (this.onControlStateChange) {
      this.onControlStateChange(this.isControlActive, this.isPointerLocked);
    }
  }

  private handlePointerLockChange(): void {
    const isLocked = document.pointerLockElement === this.canvas;
    this.isPointerLocked = isLocked;

    if (this.onControlStateChange) {
      this.onControlStateChange(this.isControlActive, this.isPointerLocked);
    }
  }

  private handleKeyDown(e: KeyboardEvent): void {
    this.onUserInteract?.();
    const code = e.code;
    const keyLower = e.key ? e.key.toLowerCase() : '';
    if (!this.keysDown.has(code)) {
      this.keysPressed.add(code);
    }
    this.keysDown.add(code);
    if (keyLower) {
      this.keysDown.add(keyLower);
      this.keysPressed.add(keyLower);
    }

    // Escape frees the mouse and brings the overlay back
    if (code === 'Escape' || e.key === 'Escape') {
      this.releaseControl();
      return;
    }

    // Toggle Day/Night on 'N'
    if (code === 'KeyN' || keyLower === 'n') {
      this.onDayNightToggle?.();
    }

    // Toggle 1st / 3rd Person View Mode on 'V'
    if (code === 'KeyV' || keyLower === 'v') {
      this.onToggleViewMode?.();
    }

    // Toggle geminEyE Cyber-Optic HUD on 'O'
    if (code === 'KeyO' || keyLower === 'o') {
      this.onToggleGeminEye?.();
    }

    // Toggle C0D3X / Map on 'M'
    if (code === 'KeyM' || keyLower === 'm') {
      this.onToggleMap?.();
    }

    // Toggle Combo List on 'L'
    if (code === 'KeyL' || keyLower === 'l') {
      this.onToggleComboList?.();
    }

    // Dump World Event Log on 'K'
    if (code === 'KeyK' || keyLower === 'k') {
      this.onDumpEventLog?.();
    }

    // Combat Action Keys (Q, E, R, F, Z, C) — Execute whenever page has keyboard focus!
    const actionKeyMap: Record<string, string> = {
      KeyQ: 'Q',
      KeyE: 'E',
      KeyR: 'R',
      KeyF: 'F',
      KeyZ: 'Z',
      KeyC: 'C',
    };
    if (actionKeyMap[code]) {
      const shift = this.isDown('ShiftLeft') || this.isDown('ShiftRight');
      const dir = this.getHeldDirection();
      this.pendingActions.push({ actionKey: actionKeyMap[code], shift, direction: dir });
    }
  }

  private handleKeyUp(e: KeyboardEvent): void {
    this.keysDown.delete(e.code);
    if (e.key) {
      this.keysDown.delete(e.key.toLowerCase());
    }
  }

  private handleMouseDown(e: MouseEvent): void {
    this.onUserInteract?.();
    this.isMouseDown = true;
    this.lastMouseX = e.clientX;
    this.lastMouseY = e.clientY;

    const shift = this.isDown('ShiftLeft') || this.isDown('ShiftRight');
    const dir = this.getHeldDirection();
    if (e.button === 0) {
      this.pendingActions.push({ actionKey: 'LMB', shift, direction: dir });
    } else if (e.button === 2) {
      this.pendingActions.push({ actionKey: 'RMB', shift, direction: dir });
    }
  }

  private handleContextMenu(e: MouseEvent): void {
    e.preventDefault();
  }

  getHeldDirection(): string {
    if (this.isDown('KeyW') || this.isDown('w')) return 'W';
    if (this.isDown('KeyS') || this.isDown('s')) return 'S';
    if (this.isDown('KeyA') || this.isDown('a')) return 'A';
    if (this.isDown('KeyD') || this.isDown('d')) return 'D';
    return '';
  }

  consumePendingActions(): Array<{ actionKey: string; shift: boolean; direction: string }> {
    if (this.pendingActions.length === 0) return [];
    const actions = this.pendingActions;
    this.pendingActions = [];
    return actions;
  }

  private handleMouseUp(): void {
    this.isMouseDown = false;
  }

  private handleMouseMove(e: MouseEvent): void {
    if (!this.isControlActive) return;

    if (this.isPointerLocked) {
      this.mouseDeltaX += e.movementX || 0;
      this.mouseDeltaY += e.movementY || 0;
    } else if (this.isMouseDown) {
      const dx = e.clientX - this.lastMouseX;
      const dy = e.clientY - this.lastMouseY;
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;
      this.mouseDeltaX += dx;
      this.mouseDeltaY += dy;
    }
  }

  // --- Gamepad API Handlers ---
  private checkInitialGamepads(): void {
    if (!navigator.getGamepads) return;
    const gamepads = navigator.getGamepads();
    for (let i = 0; i < gamepads.length; i++) {
      const gp = gamepads[i];
      if (gp && gp.connected) {
        this.gamepadConnected = true;
        this.gamepadId = gp.id;
        this.onGamepadChange?.(true, gp.id);
        break;
      }
    }
  }

  private handleGamepadConnected(e: GamepadEvent): void {
    this.gamepadConnected = true;
    this.gamepadId = e.gamepad.id;
    this.onGamepadChange?.(true, e.gamepad.id);
  }

  private handleGamepadDisconnected(e: GamepadEvent): void {
    this.gamepadConnected = false;
    this.gamepadId = '';
    this.onGamepadChange?.(false, '');
  }

  pollGamepad(): {
    moveX: number;
    moveY: number;
    isSprinting: boolean;
  } {
    const result = { moveX: 0, moveY: 0, isSprinting: false };
    if (!navigator.getGamepads) return result;

    const gamepads = navigator.getGamepads();
    let activePad: Gamepad | null = null;
    for (let i = 0; i < gamepads.length; i++) {
      const gp = gamepads[i];
      if (gp && gp.connected) {
        activePad = gp;
        break;
      }
    }

    if (!activePad) return result;

    if (!this.gamepadConnected) {
      this.gamepadConnected = true;
      this.gamepadId = activePad.id;
      this.onGamepadChange?.(true, activePad.id);
    }

    // 1. Left Stick (Movement) - Axis 0: X (-1 left, +1 right), Axis 1: Y (-1 forward, +1 backward)
    let lx = activePad.axes[0] || 0;
    let ly = activePad.axes[1] || 0;

    if (Math.abs(lx) < this.gamepadDeadzone) lx = 0;
    if (Math.abs(ly) < this.gamepadDeadzone) ly = 0;

    result.moveX = lx;
    result.moveY = ly;

    // D-Pad buttons support (12: Up, 13: Down, 14: Left, 15: Right)
    if (activePad.buttons[12]?.pressed) result.moveY = -1;
    if (activePad.buttons[13]?.pressed) result.moveY = 1;
    if (activePad.buttons[14]?.pressed) result.moveX = -1;
    if (activePad.buttons[15]?.pressed) result.moveX = 1;

    // 2. Right Stick (Camera Look) - Axis 2: X, Axis 3: Y
    let rx = activePad.axes[2] || 0;
    let ry = activePad.axes[3] || 0;

    if (Math.abs(rx) < this.gamepadDeadzone) rx = 0;
    if (Math.abs(ry) < this.gamepadDeadzone) ry = 0;

    if (rx !== 0 || ry !== 0) {
      // Scale by sensitivity and apply to mouse delta
      this.mouseDeltaX += rx * this.gamepadSensitivity * 6.0;
      this.mouseDeltaY += ry * this.gamepadSensitivity * 6.0;
    }

    // 3. Buttons
    const buttons = activePad.buttons.map((b) => b.pressed);

    // Button 10: Left Stick Click (L3) or Trigger (Buttons 6, 7) = Sprint
    if (buttons[10] || buttons[6] || buttons[7]) {
      result.isSprinting = true;
    }

    // Detect button press transitions (was not pressed last frame, is pressed now)
    const wasPressed = (idx: number) => buttons[idx] && !this.prevGamepadButtons[idx];

    // Button 3: Y / Triangle -> Toggle Day/Night
    if (wasPressed(3)) {
      this.onDayNightToggle?.();
    }

    // Button 8: Select / Share / Back -> Toggle Map / Codex
    if (wasPressed(8)) {
      this.onToggleMap?.();
    }

    // Button 9: Start / Options / Menu -> Toggle Settings
    if (wasPressed(9)) {
      this.onToggleSettings?.();
    }

    // Button 11: Right Stick Click (R3) -> Toggle 1st / 3rd Person View
    if (wasPressed(11)) {
      this.onToggleViewMode?.();
    }

    this.prevGamepadButtons = buttons;
    return result;
  }

  isDown(code: string): boolean {
    return this.isControlActive && this.keysDown.has(code);
  }

  wasPressed(code: string): boolean {
    return this.isControlActive && this.keysPressed.has(code);
  }

  getPointerLocked(): boolean {
    return this.isPointerLocked;
  }

  getControlActive(): boolean {
    return this.isControlActive;
  }

  consumeMouseDelta(): { x: number; y: number } {
    const delta = {
      x: this.mouseDeltaX * this.mouseSensitivity,
      y: this.mouseDeltaY * this.mouseSensitivity,
    };
    this.mouseDeltaX = 0;
    this.mouseDeltaY = 0;
    return delta;
  }

  endFrame(): void {
    this.keysPressed.clear();
  }
}
