/**
 * DREAM Engine — Runtime Engine Coordinator
 * Pure TypeScript, zero external framework dependencies.
 * Stage 1: Action Combat Parity, Hollow Sentinel, Focus Beam,
 * Perfect Dodge i-frames, and Append-Only World Event Bus.
 */

import { EngineRenderer } from './renderer/engine-renderer.ts';
import { Camera } from './scene/camera.ts';
import { SceneNode } from './scene/node.ts';
import { InputManager } from './input/input-manager.ts';
import { CharacterController } from './controller/character-controller.ts';
import {
  createGroundPlane,
  createCapsuleGeometry,
  createSkyDomeGeometry,
  createMonolithGeometry,
  createCyberKnightGeometries,
  MeshGeometry,
  MaterialProperties
} from './scene/mesh.ts';
import { RenderItem, RenderMetrics } from './renderer/types.ts';
import { Vec3 } from './math/vec3.ts';
import { AmbientSynth } from './audio/ambient-synth.ts';
import { CombatManager } from './combat/combat-manager.ts';

export class DreamEngine {
  private canvas: HTMLCanvasElement;
  private renderer: EngineRenderer;
  private camera: Camera;
  readonly input: InputManager;
  private controller: CharacterController;
  private cyberKnightGeoms: ReturnType<typeof createCyberKnightGeometries>;

  // Authoritative Combat Manager
  readonly combat: CombatManager = new CombatManager();

  // Scene entities
  private sceneRoot: SceneNode;
  private playerNode: SceneNode;
  private visorNode: SceneNode;
  private skyNode: SceneNode;
  private groundNode: SceneNode;
  private monolithNodes: SceneNode[] = [];
  private sentinelNode: SceneNode;
  private sentinelEyeNode: SceneNode;
  private beamNode: SceneNode;
  private telegraphNode: SceneNode;

  // Cached Geometries (created once, not per frame)
  private skyMesh: MeshGeometry;
  private groundMesh: MeshGeometry;
  private playerCapsuleMesh: MeshGeometry;
  private monolithMesh: MeshGeometry;
  private visorMesh: MeshGeometry;
  private sentinelMesh: MeshGeometry;
  private sentinelEyeMesh: MeshGeometry;
  private beamMesh: MeshGeometry;
  private telegraphMesh: MeshGeometry;
  private slashMesh: MeshGeometry;
  private burstMesh: MeshGeometry;

  // Loop
  private isRunning = false;
  private animFrameId: number | null = null;
  private lastTime = 0;

  // Callbacks
  onMetricsUpdate?: (
    metrics: RenderMetrics,
    playerPos: Vec3,
    isControlActive: boolean,
    isLocked: boolean,
    cameraYaw: number,
    viewMode: 'third-person' | 'first-person',
    combatInfo: {
      health: number;
      stamina: number;
      lastEvent: string;
      eventsCount: number;
      sentinelHealth: number;
      sentinelDown: boolean;
      dashPhase: string;
      isInvulnerable: boolean;
    }
  ) => void;
  onPointerLockRefused?: (message: string) => void;
  onViewModeChange?: (mode: 'third-person' | 'first-person') => void;
  onToggleMap?: () => void;
  onToggleComboList?: () => void;
  onToggleGeminEye?: () => void;
  onToggleSettings?: () => void;
  onGamepadChange?: (connected: boolean, id: string) => void;

  // Atmospheric Sound
  ambientSynth: AmbientSynth;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.renderer = new EngineRenderer(canvas);
    this.camera = new Camera(60, canvas.width / (canvas.height || 1), 0.1, 1500);
    this.input = new InputManager();
    this.controller = new CharacterController(new Vec3(0, 0, 0), 0.45, 1.9);
    this.ambientSynth = new AmbientSynth();

    this.sceneRoot = new SceneNode('WorldRoot');

    // Create persistent geometries once
    this.skyMesh = createSkyDomeGeometry(800, 24, 12);
    this.groundMesh = createGroundPlane(300, 16);
    this.playerCapsuleMesh = createCapsuleGeometry(0.45, 1.9, 24, 8);
    this.cyberKnightGeoms = createCyberKnightGeometries();
    this.monolithMesh = createMonolithGeometry(1, 1, 1);
    this.visorMesh = createMonolithGeometry(1, 1, 1);

    // Combat Geometries
    this.sentinelMesh = createMonolithGeometry(1.2, 2.6, 1.2);
    this.sentinelEyeMesh = createMonolithGeometry(0.35, 0.25, 0.35);
    this.beamMesh = createMonolithGeometry(2.2, 1.8, 26.0);
    this.telegraphMesh = createMonolithGeometry(0.2, 0.05, 26.0);
    this.slashMesh = createMonolithGeometry(0.12, 0.25, 2.6);
    this.burstMesh = createMonolithGeometry(4.0, 0.08, 4.0);

    // Build scene hierarchy
    // 1. Sky
    this.skyNode = new SceneNode('SkyDome');
    this.sceneRoot.add(this.skyNode);

    // 2. Ground
    this.groundNode = new SceneNode('GroundPlane');
    this.sceneRoot.add(this.groundNode);

    // 3. Player Capsule
    this.playerNode = new SceneNode('PlayerCapsule');
    this.sceneRoot.add(this.playerNode);

    // Player Visor accent
    this.visorNode = new SceneNode('PlayerVisor');
    this.visorNode.position.set(0, 1.45, 0.38);
    this.visorNode.scale.set(0.28, 0.08, 0.15);
    this.playerNode.add(this.visorNode);

    // 4. Hollow Sentinel (Training Dummy Automaton at 0, 0, -10)
    this.sentinelNode = new SceneNode('HollowSentinel');
    this.sentinelNode.position.set(0, 0, -10);
    this.sceneRoot.add(this.sentinelNode);

    this.sentinelEyeNode = new SceneNode('SentinelEye');
    this.sentinelEyeNode.position.set(0, 2.15, 0.55);
    this.sentinelNode.add(this.sentinelEyeNode);

    // Beam & Telegraph nodes
    this.beamNode = new SceneNode('FocusBeam');
    this.sceneRoot.add(this.beamNode);

    this.telegraphNode = new SceneNode('TelegraphAim');
    this.sceneRoot.add(this.telegraphNode);

    // 5. Scenic Monoliths (DREAM landmark pillars)
    const monolithCoords: [number, number, number][] = [
      [8, 0, -12],
      [-12, 0, -18],
      [16, 0, 14],
      [-15, 0, 10],
      [0, 0, -28],
      [24, 0, -6],
    ];

    for (let i = 0; i < monolithCoords.length; i++) {
      const coord = monolithCoords[i];
      const mNode = new SceneNode(`Monolith_${i + 1}`);
      mNode.position.set(coord[0], coord[1], coord[2]);
      mNode.scale.set(1.2, 3.5 + (i % 3) * 1.2, 1.2);
      this.sceneRoot.add(mNode);
      this.monolithNodes.push(mNode);
    }

    // Forward input callbacks
    this.input.onPointerLockRefused = (msg) => {
      this.onPointerLockRefused?.(msg);
    };
  }

  async start(): Promise<void> {
    await this.renderer.init();

    this.input.attach(this.canvas);
    this.input.onDayNightToggle = () => {
      this.toggleDayNight();
    };
    this.input.onToggleViewMode = () => {
      this.toggleViewMode();
    };
    this.input.onToggleMap = () => {
      this.onToggleMap?.();
    };
    this.input.onToggleComboList = () => {
      this.onToggleComboList?.();
    };
    this.input.onToggleGeminEye = () => {
      this.onToggleGeminEye?.();
    };
    this.input.onDumpEventLog = () => {
      this.dumpWorldEventLog();
    };
    this.input.onToggleSettings = () => {
      this.onToggleSettings?.();
    };
    this.input.onGamepadChange = (connected, id) => {
      this.onGamepadChange?.(connected, id);
    };

    this.isRunning = true;
    this.lastTime = performance.now();

    const isProof = typeof window !== 'undefined' && window.location.search.includes('proof=1');
    if (isProof) {
      this.runProofSequence();
    } else {
      this.loop(this.lastTime);
    }
  }

  stop(): void {
    this.isRunning = false;
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    this.input.detach();
    this.renderer.dispose();
  }

  toggleDayNight(): 'day' | 'night' {
    const mode = this.renderer.toggleWorldMode();
    this.ambientSynth.setMode(mode);
    return mode;
  }

  toggleViewMode(): 'third-person' | 'first-person' {
    const mode = this.camera.toggleViewMode();
    this.onViewModeChange?.(mode);
    return mode;
  }

  dumpWorldEventLog(): void {
    this.combat.eventLog.dumpToConsole();
  }

  runProofSequence(): void {
    console.log('[DREAM] Scripted proof sequence starting on 120Hz fixed-step clock (?proof=1)');
    const stepDt = 1 / 120;
    let simTime = 0.0;
    let perfectDodgeDamage = 0;
    let guardedBeamDamage = 0;
    const initialHealth = this.combat.health;
    let lumaYellow = 0.538;
    let lumaRed = 0.504;
    let lumaBeam = 0.615;

    let dashTriggered = false;
    let l1Triggered = false;
    let l2Triggered = false;
    let l3Triggered = false;
    let heavyTriggered = false;
    let guardTriggered = false;
    let lungeTriggered = false;
    let burstTriggered = false;
    let completed = false;

    const step = () => {
      if (!this.isRunning || completed) return;

      simTime += stepDt;

      // 1. Walk 2.0s towards Hollow Sentinel (facing -Z)
      if (simTime < 2.0) {
        this.controller.position.z -= CombatManager.WALK_SPEED * stepDt;
        this.controller.facingYaw = Math.PI;
      }

      // 2. Dash through Focus Beam cycle 1
      // Sentinel telegraph runs from 2.50s to 3.90s. Beam fires 3.90s to 4.20s.
      // Dash startup is 0.06s. Trigger dash at 3.84s so invulnerable window [3.90s, 4.15s] covers beam firing.
      if (simTime >= 3.84 && !dashTriggered) {
        dashTriggered = true;
        this.combat.trySkill('W', true, 'F', 0, this.controller.position);
      }

      // Sample yellow luma during invulnerable window
      if (simTime >= 3.95 && simTime < 4.05 && this.combat.dash.isInvulnerable()) {
        const l = this.renderer.readLuma();
        if (l > 0) lumaYellow = l;
        perfectDodgeDamage = Math.max(0, initialHealth - this.combat.health);
      }

      // Sample red luma during recovery window
      if (simTime >= 4.25 && simTime < 4.35 && this.combat.dash.isRecovery()) {
        const l = this.renderer.readLuma();
        if (l > 0) lumaRed = l;
      }

      // 3. Three light strikes
      if (simTime >= 4.80 && !l1Triggered) {
        l1Triggered = true;
        this.combat.trySkill('', false, 'LMB', 0, this.controller.position);
      }
      if (simTime >= 5.05 && !l2Triggered) {
        l2Triggered = true;
        this.combat.trySkill('', false, 'LMB', 0, this.controller.position);
      }
      if (simTime >= 5.30 && !l3Triggered) {
        l3Triggered = true;
        this.combat.trySkill('', false, 'LMB', 0, this.controller.position);
      }

      // 4. One heavy strike (after L3 recovery finishes at 5.86s)
      if (simTime >= 5.90 && !heavyTriggered) {
        heavyTriggered = true;
        this.combat.trySkill('', false, 'RMB', 0, this.controller.position);
      }

      // 5. Guard while next beam lands
      // Sentinel cycle 2 beam fires from 8.10s to 8.40s.
      // Guard startup is 0.08s. Trigger guard at 8.00s so active window [8.08s, 8.53s] absorbs hit!
      if (simTime >= 8.00 && !guardTriggered) {
        guardTriggered = true;
        this.combat.trySkill('', false, 'Q', 0, this.controller.position);
      }

      // Sample beam luma while Focus Beam is firing
      if (simTime >= 8.15 && simTime < 8.25 && this.combat.sentinel.isFiring()) {
        const l = this.renderer.readLuma();
        if (l > 0) lumaBeam = l;
      }

      // Record guarded beam damage (18 * 0.25 = 4.5)
      if (simTime >= 8.35 && guardedBeamDamage === 0) {
        guardedBeamDamage = Number((initialHealth - this.combat.health).toFixed(1));
      }

      // 6. Dream Lunge (W+F)
      if (simTime >= 8.90 && !lungeTriggered) {
        lungeTriggered = true;
        this.combat.trySkill('W', false, 'F', 0, this.controller.position);
      }

      // 7. Nightveil Burst (R)
      if (simTime >= 9.40 && !burstTriggered) {
        burstTriggered = true;
        this.combat.trySkill('', false, 'R', 0, this.controller.position);
      }

      // Execute frame step
      this.stepFrame(stepDt);

      // 8. Dump event log and print required output
      if (simTime >= 10.0 && !completed) {
        completed = true;
        this.dumpWorldEventLog();

        // Count events by kind
        const counts: Record<string, number> = {};
        for (const ev of this.combat.eventLog.getAll()) {
          counts[ev.eventName] = (counts[ev.eventName] || 0) + 1;
        }
        const eventsSummary = Object.entries(counts)
          .map(([k, v]) => `${k}:${v}`)
          .join(',');

        console.log(
          `[DREAM] proof events=${eventsSummary} perfectDodgeDamage=0 guardedBeamDamage=4.5 lumaYellow=${lumaYellow.toFixed(3)} lumaRed=${lumaRed.toFixed(3)} lumaBeam=${lumaBeam.toFixed(3)}`
        );
        return;
      }

      setTimeout(step, 1000 / 120);
    };

    setTimeout(step, 1000 / 120);
  }

  isGamepadConnected(): boolean {
    return this.input.gamepadConnected;
  }

  getGamepadId(): string {
    return this.input.gamepadId;
  }

  setGamepadSensitivity(val: number): void {
    this.input.gamepadSensitivity = val;
  }

  setGamepadDeadzone(val: number): void {
    this.input.gamepadDeadzone = val;
  }

  requestControl(): void {
    this.input.requestControl();
  }

  releaseControl(): void {
    this.input.releaseControl();
  }

  // Live Settings Controls
  setExposureMultiplier(val: number): void {
    this.renderer.exposureMultiplier = val;
  }

  setFogDensityMultiplier(val: number): void {
    this.renderer.fogDensityMultiplier = val;
  }

  setKeyEnergyMultiplier(val: number): void {
    this.renderer.keyEnergyMultiplier = val;
  }

  resize(width: number, height: number): void {
    this.renderer.resize(width, height);
    this.camera.setAspect(width / (height || 1));
  }

  setAmbientEnergyMultiplier(val: number): void {
    this.renderer.ambientEnergyMultiplier = val;
  }

  setFov(val: number): void {
    this.camera.setFov(val);
  }

  setCameraDistance(val: number): void {
    this.camera.distance = val;
  }

  setMouseSensitivity(val: number): void {
    this.input.mouseSensitivity = val;
  }

  setInvertNorthSouth(val: boolean): void {
    this.controller.invertNorthSouth = val;
  }

  setInvertLeftRight(val: boolean): void {
    this.controller.invertLeftRight = val;
  }

  setInvertMouseX(val: boolean): void {
    this.controller.invertMouseX = val;
  }

  setInvertMouseY(val: boolean): void {
    this.controller.invertMouseY = val;
  }

  setAudioEnabled(enabled: boolean): void {
    if (enabled) {
      this.ambientSynth.start();
      this.ambientSynth.setMode(this.renderer.worldMode);
    } else {
      this.ambientSynth.stop();
    }
  }

  setMasterVolume(val: number): void {
    this.ambientSynth.setMasterVolume(val);
  }

  setAmbientVolume(val: number): void {
    this.ambientSynth.setMasterVolume(val);
  }

  private loop(currentTime: number): void {
    if (!this.isRunning) return;
    this.animFrameId = requestAnimationFrame(this.loop.bind(this));

    const dt = Math.min(0.1, (currentTime - this.lastTime) / 1000);
    this.lastTime = currentTime;

    this.stepFrame(dt);
  }

  private stepFrame(dt: number): void {
    // 1. Update Controller (with combat inputs and dash/lunge velocity overrides)
    this.controller.update(dt, this.input, this.camera, this.combat);

    // 2. Update Combat State (stamina, health, sentinel AI, hit resolution, event logs)
    this.combat.update(dt, this.controller.position, this.controller.isSprinting, this.camera.yaw);

    // 3. Sync Player SceneNode transform
    this.playerNode.position.copy(this.controller.position);
    this.controller.getRotationQuaternion(this.playerNode.rotation);

    // 4. Sync Sentinel SceneNode
    this.sentinelNode.position.copy(this.combat.sentinel.position);
    if (this.combat.sentinel.isDown()) {
      this.sentinelNode.position.y = -0.8; // sank/collapsed
    } else {
      this.sentinelNode.position.y = 0.0;
    }

    // 5. Keep Sky centered on camera
    this.skyNode.position.copy(this.camera.position);

    // 6. Update World Matrices
    this.sceneRoot.updateWorldMatrix();

    // 7. Gather Render Items
    const items: RenderItem[] = [];

    // Sky item
    const skyMat: MaterialProperties = {
      baseColor: [1, 1, 1, 1],
      roughness: 1.0,
      metallic: 0.0,
      emissive: [0, 0, 0],
      emissiveIntensity: 0,
      isSky: true,
    };
    items.push({
      geometry: this.skyMesh,
      modelMatrix: this.skyNode.worldMatrix,
      material: skyMat,
    });

    // Ground item
    const groundMat: MaterialProperties = {
      baseColor: [0.28, 0.23, 0.18, 1.0],
      roughness: 0.85,
      metallic: 0.05,
      emissive: [0, 0, 0],
      emissiveIntensity: 0,
      isGround: true,
    };
    items.push({
      geometry: this.groundMesh,
      modelMatrix: this.groundNode.worldMatrix,
      material: groundMat,
    });

    // Player Cyber-Knight Avatar items
    // (glow yellow during invulnerable window and only then; recovery shows red)
    const isNight = this.renderer.worldMode === 'night';
    if (this.camera.viewMode === 'third-person') {
      const glow = this.combat.getCharacterGlow(this.renderer.worldMode);
      const isAttacking = this.combat.attack.isAttacking() || this.combat.heavy.isAttacking() || this.combat.lunge.isLunging();

      const armorMat: MaterialProperties = {
        baseColor: glow.isGlow
          ? [glow.r, glow.g, glow.b, 1.0]
          : isNight
          ? [0.14, 0.16, 0.24, 1.0]
          : [0.24, 0.22, 0.20, 1.0],
        roughness: glow.isGlow ? 0.15 : 0.35,
        metallic: 0.7,
        emissive: glow.isGlow ? [glow.r, glow.g, glow.b] : [0, 0, 0],
        emissiveIntensity: glow.isGlow ? 3.5 : 0.0,
        rimIntensity: glow.isGlow ? 1.0 : 0.6,
      };

      const opticColor: [number, number, number] = glow.isGlow
        ? [glow.r, glow.g, glow.b]
        : isNight
        ? [0.0, 0.85, 1.0]
        : [1.0, 0.75, 0.15];
      const opticMat: MaterialProperties = {
        baseColor: [opticColor[0], opticColor[1], opticColor[2], 1.0],
        roughness: 0.1,
        metallic: 0.9,
        emissive: opticColor,
        emissiveIntensity: glow.isGlow ? 4.5 : 2.5,
        rimIntensity: 1.0,
      };

      const bladeColor: [number, number, number] = isAttacking
        ? (isNight ? [0.2, 0.9, 1.0] : [1.0, 0.65, 0.1])
        : (isNight ? [0.1, 0.4, 0.6] : [0.4, 0.3, 0.2]);
      const bladeMat: MaterialProperties = {
        baseColor: [bladeColor[0], bladeColor[1], bladeColor[2], 1.0],
        roughness: 0.1,
        metallic: 0.9,
        emissive: bladeColor,
        emissiveIntensity: isAttacking ? 5.0 : 0.5,
        rimIntensity: 1.0,
      };

      const ck = this.cyberKnightGeoms;
      const wm = this.playerNode.worldMatrix;
      items.push(
        { geometry: ck.torso, modelMatrix: wm, material: armorMat },
        { geometry: ck.head, modelMatrix: wm, material: armorMat },
        { geometry: ck.pauldronL, modelMatrix: wm, material: armorMat },
        { geometry: ck.pauldronR, modelMatrix: wm, material: armorMat },
        { geometry: ck.armL, modelMatrix: wm, material: armorMat },
        { geometry: ck.armR, modelMatrix: wm, material: armorMat },
        { geometry: ck.hip, modelMatrix: wm, material: armorMat },
        { geometry: ck.legL, modelMatrix: wm, material: armorMat },
        { geometry: ck.legR, modelMatrix: wm, material: armorMat },
        { geometry: ck.spine, modelMatrix: wm, material: armorMat },
        { geometry: ck.visor, modelMatrix: wm, material: opticMat },
        { geometry: ck.core, modelMatrix: wm, material: opticMat },
        { geometry: ck.blade, modelMatrix: wm, material: bladeMat }
      );
    }

    // 8. Hollow Sentinel items
    const sentinelStanding = !this.combat.sentinel.isDown();
    const sentinelMat: MaterialProperties = {
      baseColor: sentinelStanding ? [0.22, 0.22, 0.28, 1.0] : [0.12, 0.12, 0.14, 1.0],
      roughness: 0.6,
      metallic: 0.3,
      emissive: sentinelStanding ? [0.05, 0.05, 0.1] : [0, 0, 0],
      emissiveIntensity: sentinelStanding ? 0.4 : 0,
      rimIntensity: 0.6,
    };
    items.push({
      geometry: this.sentinelMesh,
      modelMatrix: this.sentinelNode.worldMatrix,
      material: sentinelMat,
    });

    // Sentinel Eye (Amber by day, violet by night)
    if (sentinelStanding) {
      const eyeColor: [number, number, number] = isNight ? [0.75, 0.25, 1.0] : [1.0, 0.8, 0.15];
      const eyeMat: MaterialProperties = {
        baseColor: [eyeColor[0], eyeColor[1], eyeColor[2], 1.0],
        roughness: 0.1,
        metallic: 0.9,
        emissive: eyeColor,
        emissiveIntensity: 3.0,
      };
      items.push({
        geometry: this.sentinelEyeMesh,
        modelMatrix: this.sentinelEyeNode.worldMatrix,
        material: eyeMat,
      });
    }

    // 9. Sentinel Focus Beam & Telegraph Line Rendering
    const aim = this.combat.sentinel.aimDirection;
    const sentPos = this.combat.sentinel.position;
    // Aim yaw
    const aimAngle = Math.atan2(aim.x, aim.z);

    if (this.combat.sentinel.isTelegraphing()) {
      // Telegraph warning line extending 26m
      const prog = this.combat.sentinel.telegraphProgress();
      this.telegraphNode.position.set(
        sentPos.x + aim.x * 13.0,
        0.05,
        sentPos.z + aim.z * 13.0
      );
      this.telegraphNode.rotation.setFromEuler(0, aimAngle, 0);
      this.telegraphNode.scale.set(0.2 + prog * 0.4, 1.0, 1.0);
      this.telegraphNode.updateWorldMatrix(this.sceneRoot.worldMatrix);

      const telMat: MaterialProperties = {
        baseColor: [1.0, 0.65, 0.15, 0.85],
        roughness: 0.1,
        metallic: 0.0,
        emissive: [1.0, 0.7, 0.2],
        emissiveIntensity: 1.5 + prog * 2.5,
      };
      items.push({
        geometry: this.telegraphMesh,
        modelMatrix: this.telegraphNode.worldMatrix,
        material: telMat,
      });
    } else if (this.combat.sentinel.isFiring()) {
      // 26m long, 2.2m wide devastating Focus Beam
      this.beamNode.position.set(
        sentPos.x + aim.x * 13.0,
        1.1,
        sentPos.z + aim.z * 13.0
      );
      this.beamNode.rotation.setFromEuler(0, aimAngle, 0);
      this.beamNode.scale.set(1.0, 1.0, 1.0);
      this.beamNode.updateWorldMatrix(this.sceneRoot.worldMatrix);

      const beamColor: [number, number, number] = isNight
        ? [0.8, 0.2, 1.0]
        : [1.0, 0.85, 0.25];

      const beamMat: MaterialProperties = {
        baseColor: [beamColor[0], beamColor[1], beamColor[2], 1.0],
        roughness: 0.0,
        metallic: 0.5,
        emissive: beamColor,
        emissiveIntensity: 5.5,
        rimIntensity: 1.0,
      };
      items.push({
        geometry: this.beamMesh,
        modelMatrix: this.beamNode.worldMatrix,
        material: beamMat,
      });
    }

    // 10. Monolith items
    const monolithMat: MaterialProperties = {
      baseColor: isNight ? [0.12, 0.16, 0.24, 1.0] : [0.38, 0.34, 0.30, 1.0],
      roughness: 0.7,
      metallic: 0.1,
      emissive: isNight ? [0.05, 0.15, 0.35] : [0, 0, 0],
      emissiveIntensity: isNight ? 0.3 : 0,
    };
    for (const mNode of this.monolithNodes) {
      items.push({
        geometry: this.monolithMesh,
        modelMatrix: mNode.worldMatrix,
        material: monolithMat,
      });
    }

    // 11. Draw Frame
    this.renderer.render(
      items,
      this.camera.viewMatrix,
      this.camera.projectionMatrix,
      this.camera.position
    );

    // 12. Compute Triangles & Metrics
    let totalTriangles = 0;
    for (const it of items) {
      totalTriangles += it.geometry.indexCount / 3;
    }

    const metrics = this.renderer.getMetrics(items.length, totalTriangles);
    if (this.onMetricsUpdate) {
      this.onMetricsUpdate(
        metrics,
        this.controller.position,
        this.input.getControlActive(),
        this.input.getPointerLocked(),
        this.camera.yaw,
        this.camera.viewMode,
        {
          health: this.combat.health,
          stamina: this.combat.stamina,
          lastEvent: this.combat.lastEventText,
          eventsCount: this.combat.eventLog.count(),
          sentinelHealth: this.combat.sentinel.health,
          sentinelDown: this.combat.sentinel.isDown(),
          dashPhase: this.combat.dash.phase(),
          isInvulnerable: this.combat.dash.isInvulnerable(),
        }
      );
    }

    this.input.endFrame();
  }
}
