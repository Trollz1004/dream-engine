/**
 * DREAM Engine — Stage 0: First Light
 * Client runtime with pure WebGPU / WebGL2 platform renderer.
 * Supports Mouse, Keyboard, and Hardware Gamepad Controller API.
 * Includes 1st Person Visor & 3rd Person Orbit, System Settings,
 * and DREAM Eye World Codex & Radar.
 */

import React, { useEffect, useRef, useState } from 'react';
import { DreamEngine } from './engine/engine.ts';
import { RenderMetrics } from './engine/renderer/types.ts';
import {
  Sun,
  Moon,
  MousePointer,
  AlertCircle,
  Sliders,
  Sparkles,
  Eye,
  BookOpen,
  Gamepad2,
  Swords,
  FileText,
} from 'lucide-react';
import { SettingsModal } from './ui/SettingsModal.tsx';
import { VisorOverlay } from './ui/VisorOverlay.tsx';
import { WorldCodexModal } from './ui/WorldCodexModal.tsx';
import { ComboListModal } from './ui/ComboListModal.tsx';
import { CombatHud } from './ui/CombatHud.tsx';
import { GeminEyeHud } from './ui/GeminEyeHud.tsx';
import { RadarMinimap } from './ui/RadarMinimap.tsx';

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<DreamEngine | null>(null);

  const [metrics, setMetrics] = useState<RenderMetrics>({
    fps: 60,
    frameTimeMs: 16.6,
    drawCalls: 9,
    triangles: 2500,
    backend: 'WebGL2',
    worldMode: 'day',
    activeFallbacks: ['contact_darkening', 'haze_cards'],
    luma: 0.48,
  });

  const [playerPos, setPlayerPos] = useState<[number, number, number]>([0, 0, 0]);
  const [cameraYaw, setCameraYaw] = useState(0);
  const [viewMode, setViewMode] = useState<'third-person' | 'first-person'>('third-person');
  const [isControlActive, setIsControlActive] = useState(false);
  const [isPointerLocked, setIsPointerLocked] = useState(false);
  const [isOverlayDismissed, setIsOverlayDismissed] = useState(false);
  const [refusedMessage, setRefusedMessage] = useState<string | null>(null);

  // Modals & Panels
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isCodexOpen, setIsCodexOpen] = useState(false);
  const [isComboListOpen, setIsComboListOpen] = useState(false);
  const [isGeminEyeOpen, setIsGeminEyeOpen] = useState(false);
  const [, setCombatTick] = useState(0);

  // Gamepad
  const [gamepadConnected, setGamepadConnected] = useState(false);
  const [gamepadName, setGamepadName] = useState('');

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const engine = new DreamEngine(canvas);
    engineRef.current = engine;

    engine.onMetricsUpdate = (newMetrics, pos, controlActive, locked, yaw, mode) => {
      setMetrics({ ...newMetrics });
      setPlayerPos([
        Number(pos.x.toFixed(2)),
        Number(pos.y.toFixed(2)),
        Number(pos.z.toFixed(2)),
      ]);
      setIsControlActive(controlActive);
      setIsPointerLocked(locked);
      setCameraYaw(yaw);
      setViewMode(mode);
      setCombatTick((t) => t + 1);
    };

    engine.onViewModeChange = (mode) => {
      setViewMode(mode);
    };

    engine.onToggleMap = () => {
      engine.releaseControl();
      setIsCodexOpen((prev) => !prev);
    };

    engine.onToggleComboList = () => {
      engine.releaseControl();
      setIsComboListOpen((prev) => !prev);
    };

    engine.onToggleGeminEye = () => {
      setIsGeminEyeOpen((prev) => !prev);
    };

    engine.onToggleSettings = () => {
      engine.releaseControl();
      setIsSettingsOpen((prev) => !prev);
    };

    engine.onGamepadChange = (connected, id) => {
      setGamepadConnected(connected);
      setGamepadName(id);
    };

    engine.onPointerLockRefused = (msg) => {
      setRefusedMessage(msg);
    };

    // Any interaction dismisses the overlay immediately
    if (engine.input) {
      engine.input.onUserInteract = () => {
        setIsOverlayDismissed(true);
      };
    }

    engine.start().catch((err) => {
      console.error('[DREAM] Failed to start engine:', err);
    });

    const updateDimensions = () => {
      if (!canvas) return;
      const w = Math.floor(window.innerWidth);
      const h = Math.floor(window.innerHeight);
      if (w > 0 && h > 0 && (canvas.width !== w || canvas.height !== h)) {
        canvas.width = w;
        canvas.height = h;
        engine.resize(w, h);
      }
    };

    updateDimensions();

    const resizeObserver = new ResizeObserver(() => {
      updateDimensions();
    });
    resizeObserver.observe(document.body);
    window.addEventListener('resize', updateDimensions);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateDimensions);
      engine.stop();
      engineRef.current = null;
    };
  }, []);

  const handleTakeControl = () => {
    setIsOverlayDismissed(true);
    if (isSettingsOpen || isCodexOpen || isComboListOpen) return;
    setRefusedMessage(null);
    engineRef.current?.requestControl();
  };

  const handleToggleDayNight = () => {
    engineRef.current?.toggleDayNight();
  };

  const handleToggleViewMode = () => {
    engineRef.current?.toggleViewMode();
  };

  const handleOpenCodex = () => {
    engineRef.current?.releaseControl();
    setIsCodexOpen(true);
  };

  const handleOpenComboList = () => {
    engineRef.current?.releaseControl();
    setIsComboListOpen(true);
  };

  const handleDumpEventLog = () => {
    engineRef.current?.dumpWorldEventLog();
  };

  const handleOpenSettings = () => {
    engineRef.current?.releaseControl();
    setIsSettingsOpen(true);
  };

  const isAnyModalOpen = isSettingsOpen || isCodexOpen || isComboListOpen;

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-neutral-950 text-neutral-100 select-none font-sans">
      {/* 3D Canvas Viewport */}
      <canvas
        ref={canvasRef}
        onClick={handleTakeControl}
        tabIndex={0}
        className="w-full h-full block cursor-crosshair outline-none"
      />

      {/* First-Person Visor / Goggles HUD Overlay */}
      <VisorOverlay viewMode={viewMode} cameraYaw={cameraYaw} />

      {/* Action Combat HUD: Prompt band, health/stamina, sentinel target bar & hotbar */}
      {engineRef.current && <CombatHud combat={engineRef.current.combat} />}

      {/* Real-time Circular Radar Minimap (Top Right) */}
      <RadarMinimap
        playerPos={playerPos}
        cameraYaw={cameraYaw}
        combat={engineRef.current?.combat}
      />

      {/* Top Bar — Calm, Dark, See-Through HUD */}
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none z-20">
        <div className="flex items-center space-x-3 bg-neutral-900/85 backdrop-blur-md border border-neutral-700/60 px-4 py-2 rounded-sm shadow-lg pointer-events-auto">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <div>
            <h1 className="text-sm font-semibold tracking-wider uppercase text-neutral-200">
              DREAM Engine
            </h1>
            <p className="text-[10px] tracking-wide text-neutral-400">
              Stage 1: Action Combat • Parity Slice
            </p>
          </div>
        </div>

        {/* Center / Controls Reminder */}
        <div className="hidden xl:flex items-center space-x-3 bg-neutral-900/75 backdrop-blur-md border border-neutral-800 px-3.5 py-1.5 rounded-sm text-xs text-neutral-300 pointer-events-auto">
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-neutral-800 border border-neutral-700 rounded text-[10px] font-mono">WASD</kbd>
            <span className="text-neutral-400">walk</span>
          </span>
          <span className="text-neutral-600">|</span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-neutral-800 border border-neutral-700 rounded text-[10px] font-mono">Shift+Dir+Key</kbd>
            <span className="text-amber-300 font-semibold">dash</span>
          </span>
          <span className="text-neutral-600">|</span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-neutral-800 border border-neutral-700 rounded text-[10px] font-mono">LMB / RMB</kbd>
            <span className="text-neutral-400">attack</span>
          </span>
          <span className="text-neutral-600">|</span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-neutral-800 border border-neutral-700 rounded text-[10px] font-mono">Q</kbd>
            <span className="text-neutral-400">guard</span>
          </span>
          <span className="text-neutral-600">|</span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-neutral-800 border border-neutral-700 rounded text-[10px] font-mono">W+F</kbd>
            <span className="text-neutral-400">lunge</span>
          </span>
          <span className="text-neutral-600">|</span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-neutral-800 border border-neutral-700 rounded text-[10px] font-mono">R</kbd>
            <span className="text-neutral-400">burst</span>
          </span>
          <span className="text-neutral-600">|</span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-neutral-800 border border-neutral-700 rounded text-[10px] font-mono">L</kbd>
            <span className="text-emerald-400">combos</span>
          </span>
          <span className="text-neutral-600">|</span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-neutral-800 border border-neutral-700 rounded text-[10px] font-mono">K</kbd>
            <span className="text-neutral-400">log</span>
          </span>
        </div>

        {/* Right Header Navigation Buttons */}
        <div className="flex items-center space-x-2 pointer-events-auto">
          {/* Gamepad Status Indicator */}
          {gamepadConnected && (
            <div
              className="flex items-center gap-1.5 bg-neutral-900/85 text-emerald-400 border border-emerald-500/40 px-2.5 py-1.5 rounded-sm text-xs"
              title={`Controller Active: ${gamepadName}`}
            >
              <Gamepad2 className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
              <span className="text-[11px] font-mono hidden md:inline">Controller Ready</span>
            </div>
          )}

          {/* 1st / 3rd Person View Toggle */}
          <button
            onClick={handleToggleViewMode}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-xs border transition duration-150 cursor-pointer ${
              viewMode === 'first-person'
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
                : 'bg-neutral-900/85 hover:bg-neutral-800/90 text-neutral-200 border-neutral-700/70'
            }`}
            title="Toggle 1st / 3rd Person View (V or R3)"
          >
            <Eye className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">
              {viewMode === 'first-person' ? '1st Person' : '3rd Person'} (V)
            </span>
          </button>

          {/* Combos Screen Button */}
          <button
            onClick={handleOpenComboList}
            className="flex items-center gap-1.5 bg-neutral-900/85 hover:bg-neutral-800/90 text-neutral-200 border border-neutral-700/70 px-3 py-1.5 rounded-sm text-xs transition duration-150 cursor-pointer"
            title="Open Combo List & Grammar Registry (L)"
          >
            <Swords className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Combos (L)</span>
          </button>

          {/* geminEyE Smart HUD Toggle */}
          <button
            onClick={() => setIsGeminEyeOpen((prev) => !prev)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-xs border transition duration-150 cursor-pointer ${
              isGeminEyeOpen
                ? 'bg-cyan-500/25 text-cyan-300 border-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.3)]'
                : 'bg-neutral-900/85 hover:bg-neutral-800/90 text-neutral-200 border-neutral-700/70'
            }`}
            title="Toggle geminEyE Cyber-Optic & Voice Assistant HUD (O)"
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">geminEyE (O)</span>
          </button>

          {/* World C0D3X & Radar Button */}
          <button
            onClick={handleOpenCodex}
            className="flex items-center gap-1.5 bg-neutral-900/85 hover:bg-neutral-800/90 text-neutral-200 border border-neutral-700/70 px-3 py-1.5 rounded-sm text-xs transition duration-150 cursor-pointer"
            title="Open DREAM Eye C0D3X, Radar & Gathering Guide (M or Select)"
          >
            <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">C0D3X (M)</span>
          </button>

          {/* Dump Event Log Button */}
          <button
            onClick={handleDumpEventLog}
            className="flex items-center gap-1.5 bg-neutral-900/85 hover:bg-neutral-800/90 text-neutral-200 border border-neutral-700/70 px-2.5 py-1.5 rounded-sm text-xs transition duration-150 cursor-pointer"
            title="Dump World Event Log to Console (K)"
          >
            <FileText className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden md:inline">Log (K)</span>
          </button>

          {/* Day / Night Dream Toggle */}
          <button
            onClick={handleToggleDayNight}
            className="flex items-center gap-1.5 bg-neutral-900/85 hover:bg-neutral-800/90 text-neutral-200 border border-neutral-700/70 px-3 py-1.5 rounded-sm text-xs transition duration-150 cursor-pointer"
            title="Toggle Day / Night (N or Y)"
          >
            {metrics.worldMode === 'day' ? (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden md:inline">Day Dream (N)</span>
              </>
            ) : (
              <>
                <Moon className="w-3.5 h-3.5 text-indigo-400" />
                <span className="hidden md:inline">Night Dream (N)</span>
              </>
            )}
          </button>

          {/* System Settings Button */}
          <button
            onClick={handleOpenSettings}
            className="flex items-center gap-1.5 bg-neutral-900/85 hover:bg-neutral-800/90 text-neutral-200 border border-neutral-700/70 px-3 py-1.5 rounded-sm text-xs transition duration-150 cursor-pointer"
            title="Open System Settings & Sliders (Start / Menu)"
          >
            <Sliders className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Settings</span>
          </button>
        </div>
      </div>

      {/* Pointer Lock Refused Plain Message Notification */}
      {refusedMessage && (
        <div className="absolute top-18 left-1/2 -translate-x-1/2 z-20 bg-neutral-900/95 border border-amber-500/50 text-neutral-200 text-xs px-4 py-2 rounded-sm shadow-xl flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
          <span>{refusedMessage}</span>
          <button
            onClick={() => setRefusedMessage(null)}
            className="ml-2 text-neutral-400 hover:text-white font-mono text-xs px-1 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Click-to-Control Overlay (Takes lock on first real click, hides itself, Esc frees mouse and restores it) */}
      {!isOverlayDismissed && !isAnyModalOpen && (
        <div
          onClick={handleTakeControl}
          className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[2px] cursor-pointer z-10"
        >
          <div className="bg-neutral-900/95 border border-neutral-700/80 p-6 rounded-sm shadow-2xl max-w-sm text-center">
            <div className="mx-auto w-10 h-10 rounded-full bg-neutral-800 flex items-center justify-center mb-3">
              <MousePointer className="w-5 h-5 text-neutral-300" />
            </div>
            <h2 className="text-sm font-semibold tracking-wider uppercase text-neutral-200 mb-1">
              Click to Control Avatar
            </h2>
            <p className="text-xs text-neutral-400 mb-4 leading-relaxed">
              Walk with <strong className="text-neutral-200 font-mono">W A S D</strong> or <strong className="text-neutral-200 font-mono">Gamepad Stick</strong>.<br/>
              Press <strong className="text-neutral-200 font-mono">O</strong> for geminEyE Smart HUD, <strong className="text-neutral-200 font-mono">V</strong> for 1st person, <strong className="text-neutral-200 font-mono">M</strong> for C0D3X, and <strong className="text-neutral-200 font-mono">Escape</strong> to free the mouse.
            </p>
            <div className="text-[11px] text-neutral-400 border-t border-neutral-800 pt-3">
              Gamepad auto-detected. Click anywhere to engage pointer lock.
            </div>
          </div>
        </div>
      )}

      {/* Avatar Coordinate & Provenance Pills (Bottom Left) */}
      <div className="absolute bottom-4 left-4 flex flex-col gap-2 pointer-events-none z-10">
        <div className="bg-neutral-900/85 backdrop-blur-md border border-neutral-800 px-3 py-1.5 rounded-sm text-xs font-mono text-neutral-300 flex items-center gap-2">
          <span className="text-neutral-500 uppercase tracking-widest text-[10px]">AVATAR</span>
          <span>X: {playerPos[0].toFixed(2)}</span>
          <span className="text-neutral-600">/</span>
          <span>Y: {playerPos[1].toFixed(2)}</span>
          <span className="text-neutral-600">/</span>
          <span>Z: {playerPos[2].toFixed(2)}</span>
          <span className="text-neutral-600">|</span>
          <span className="text-emerald-400 text-[10px] uppercase">{viewMode === 'first-person' ? '1st Person' : '3rd Person'}</span>
        </div>

        <div className="bg-neutral-900/75 backdrop-blur-md border border-neutral-800/80 px-2.5 py-1 rounded-sm text-[10px] text-neutral-400">
          <span>Built with Google Gemini</span>
        </div>
      </div>

      {/* geminEyE Cyber-Optic & Voice HUD */}
      <GeminEyeHud
        engine={engineRef.current}
        isOpen={isGeminEyeOpen}
        onClose={() => setIsGeminEyeOpen(false)}
        playerPos={playerPos}
        cameraYaw={cameraYaw}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        engine={engineRef.current}
        metrics={metrics}
      />

      {/* World C0D3X & Radar Modal */}
      <WorldCodexModal
        isOpen={isCodexOpen}
        onClose={() => setIsCodexOpen(false)}
        playerPos={playerPos}
        worldMode={metrics.worldMode}
      />

      {/* Action Combat Combo List Modal */}
      <ComboListModal
        isOpen={isComboListOpen}
        onClose={() => setIsComboListOpen(false)}
      />

      {/* Frame-Rate Pill at the Bottom Right */}
      <div className="absolute bottom-4 right-4 bg-neutral-900/90 backdrop-blur-md border border-neutral-700/70 px-3.5 py-2 rounded-sm shadow-xl font-mono text-xs text-neutral-200 flex flex-col gap-1 min-w-[210px] pointer-events-none z-10">
        <div className="flex items-center justify-between">
          <span className="font-bold text-emerald-400 tracking-wider">
            {metrics.fps} FPS
          </span>
          <span className="text-neutral-400 text-[11px]">
            {metrics.frameTimeMs} ms
          </span>
        </div>

        <div className="h-px bg-neutral-800 my-0.5" />

        <div className="flex items-center justify-between text-[11px]">
          <span className="text-neutral-400">Renderer:</span>
          <span className="text-neutral-200 font-semibold">{metrics.backend}</span>
        </div>

        <div className="flex items-center justify-between text-[11px]">
          <span className="text-neutral-400">Profile:</span>
          <span className="text-neutral-300 capitalize">{metrics.worldMode} Dream</span>
        </div>

        <div className="flex items-center justify-between text-[11px]">
          <span className="text-neutral-400">Luma (Avg):</span>
          <span className="text-amber-300">{metrics.luma.toFixed(3)}</span>
        </div>

        <div className="text-[10px] text-neutral-400 flex flex-col pt-0.5">
          <span className="text-neutral-500 uppercase tracking-wider text-[9px]">Active Fallbacks:</span>
          <span className="text-neutral-300 truncate font-sans text-[10px]">
            {metrics.activeFallbacks.length > 0 ? metrics.activeFallbacks.join(', ') : 'None'}
          </span>
        </div>
      </div>
    </div>
  );
}
