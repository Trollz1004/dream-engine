/**
 * DREAM Engine — System & World Settings Modal
 * Calm, dark, see-through HUD interface with sliders for every category.
 */

import React, { useState } from 'react';
import {
  Sliders,
  Sun,
  Eye,
  Volume2,
  VolumeX,
  Compass,
  Cpu,
  X,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { DreamEngine } from '../engine/engine.ts';
import { RenderMetrics } from '../engine/renderer/types.ts';

export interface SettingsState {
  // Graphics
  exposure: number;
  fogDensity: number;
  sunIntensity: number;
  ambientIntensity: number;
  // Camera
  fov: number;
  cameraDistance: number;
  // Controls
  invertNorthSouth: boolean;
  invertLeftRight: boolean;
  invertMouseX: boolean;
  invertMouseY: boolean;
  mouseSensitivity: number;
  gamepadSensitivity: number;
  gamepadDeadzone: number;
  // Audio
  audioEnabled: boolean;
  masterVolume: number;
  ambientVolume: number;
}

export const DEFAULT_SETTINGS: SettingsState = {
  exposure: 1.0,
  fogDensity: 1.0,
  sunIntensity: 1.0,
  ambientIntensity: 1.0,
  fov: 60,
  cameraDistance: 5.0,
  invertNorthSouth: false,
  invertLeftRight: false,
  invertMouseX: false,
  invertMouseY: false,
  mouseSensitivity: 0.0022,
  gamepadSensitivity: 2.2,
  gamepadDeadzone: 0.15,
  audioEnabled: false,
  masterVolume: 0.6,
  ambientVolume: 0.7,
};

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  engine: DreamEngine | null;
  metrics: RenderMetrics;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  engine,
  metrics,
}) => {
  const [activeTab, setActiveTab] = useState<'graphics' | 'camera' | 'controls' | 'audio' | 'system'>('graphics');
  const [settings, setSettings] = useState<SettingsState>(DEFAULT_SETTINGS);

  if (!isOpen) return null;

  const updateSetting = <K extends keyof SettingsState>(key: K, value: SettingsState[K]) => {
    const updated = { ...settings, [key]: value };
    setSettings(updated);

    if (!engine) return;

    switch (key) {
      case 'exposure':
        engine.setExposureMultiplier(value as number);
        break;
      case 'fogDensity':
        engine.setFogDensityMultiplier(value as number);
        break;
      case 'sunIntensity':
        engine.setKeyEnergyMultiplier(value as number);
        break;
      case 'ambientIntensity':
        engine.setAmbientEnergyMultiplier(value as number);
        break;
      case 'fov':
        engine.setFov(value as number);
        break;
      case 'cameraDistance':
        engine.setCameraDistance(value as number);
        break;
      case 'mouseSensitivity':
        engine.setMouseSensitivity(value as number);
        break;
      case 'gamepadSensitivity':
        engine.setGamepadSensitivity(value as number);
        break;
      case 'gamepadDeadzone':
        engine.setGamepadDeadzone(value as number);
        break;
      case 'invertNorthSouth':
        engine.setInvertNorthSouth(value as boolean);
        break;
      case 'invertLeftRight':
        engine.setInvertLeftRight(value as boolean);
        break;
      case 'invertMouseX':
        engine.setInvertMouseX(value as boolean);
        break;
      case 'invertMouseY':
        engine.setInvertMouseY(value as boolean);
        break;
      case 'audioEnabled':
        engine.setAudioEnabled(value as boolean);
        break;
      case 'masterVolume':
        engine.setMasterVolume(value as number);
        break;
      case 'ambientVolume':
        engine.setAmbientVolume(value as number);
        break;
    }
  };

  const handleReset = () => {
    setSettings(DEFAULT_SETTINGS);
    if (!engine) return;
    engine.setExposureMultiplier(DEFAULT_SETTINGS.exposure);
    engine.setFogDensityMultiplier(DEFAULT_SETTINGS.fogDensity);
    engine.setKeyEnergyMultiplier(DEFAULT_SETTINGS.sunIntensity);
    engine.setAmbientEnergyMultiplier(DEFAULT_SETTINGS.ambientIntensity);
    engine.setFov(DEFAULT_SETTINGS.fov);
    engine.setCameraDistance(DEFAULT_SETTINGS.cameraDistance);
    engine.setMouseSensitivity(DEFAULT_SETTINGS.mouseSensitivity);
    engine.setGamepadSensitivity(DEFAULT_SETTINGS.gamepadSensitivity);
    engine.setGamepadDeadzone(DEFAULT_SETTINGS.gamepadDeadzone);
    engine.setInvertNorthSouth(DEFAULT_SETTINGS.invertNorthSouth);
    engine.setInvertLeftRight(DEFAULT_SETTINGS.invertLeftRight);
    engine.setInvertMouseX(DEFAULT_SETTINGS.invertMouseX);
    engine.setInvertMouseY(DEFAULT_SETTINGS.invertMouseY);
    engine.setAudioEnabled(DEFAULT_SETTINGS.audioEnabled);
    engine.setMasterVolume(DEFAULT_SETTINGS.masterVolume);
    engine.setAmbientVolume(DEFAULT_SETTINGS.ambientVolume);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 select-none">
      <div className="relative w-full max-w-2xl bg-neutral-900/95 border border-neutral-700/80 rounded-sm shadow-2xl overflow-hidden flex flex-col text-neutral-100 max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-950/60">
          <div className="flex items-center space-x-2.5">
            <Sliders className="w-4 h-4 text-emerald-400" />
            <span className="font-semibold text-sm tracking-wider uppercase">DREAM System Settings</span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleReset}
              className="flex items-center space-x-1 px-2.5 py-1 text-xs text-neutral-400 hover:text-neutral-200 bg-neutral-800/80 hover:bg-neutral-800 border border-neutral-700 rounded-sm transition cursor-pointer"
              title="Reset all settings to default"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
            <button
              onClick={onClose}
              className="p-1 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 rounded-sm transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-neutral-800 bg-neutral-950/40 px-6 pt-2 space-x-1">
          {[
            { id: 'graphics', label: 'Graphics', icon: Sun },
            { id: 'camera', label: 'Camera', icon: Eye },
            { id: 'controls', label: 'Controls', icon: Compass },
            { id: 'audio', label: 'Atmosphere', icon: Volume2 },
            { id: 'system', label: 'System', icon: Cpu },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`flex items-center space-x-1.5 px-4 py-2 text-xs font-medium border-b-2 transition cursor-pointer ${
                  isActive
                    ? 'border-emerald-400 text-emerald-400 bg-neutral-800/40'
                    : 'border-transparent text-neutral-400 hover:text-neutral-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Body Area */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          {/* Graphics Tab */}
          {activeTab === 'graphics' && (
            <div className="space-y-5">
              <div>
                <div className="flex justify-between mb-1.5 text-neutral-300">
                  <span>Brightness / Exposure</span>
                  <span className="font-mono text-emerald-400">{settings.exposure.toFixed(2)}x</span>
                </div>
                <input
                  type="range"
                  min="0.4"
                  max="2.2"
                  step="0.05"
                  value={settings.exposure}
                  onChange={(e) => updateSetting('exposure', parseFloat(e.target.value))}
                  className="w-full accent-emerald-400 bg-neutral-800 rounded h-1 cursor-pointer"
                />
                <p className="text-[10px] text-neutral-400 mt-1">
                  Adjusts overall scene luminance and exposure compensation in real time.
                </p>
              </div>

              <div>
                <div className="flex justify-between mb-1.5 text-neutral-300">
                  <span>Atmospheric Fog Density</span>
                  <span className="font-mono text-emerald-400">{settings.fogDensity.toFixed(2)}x</span>
                </div>
                <input
                  type="range"
                  min="0.0"
                  max="2.5"
                  step="0.05"
                  value={settings.fogDensity}
                  onChange={(e) => updateSetting('fogDensity', parseFloat(e.target.value))}
                  className="w-full accent-emerald-400 bg-neutral-800 rounded h-1 cursor-pointer"
                />
                <p className="text-[10px] text-neutral-400 mt-1">
                  Controls horizon distance falloff and atmospheric haze thickness.
                </p>
              </div>

              <div>
                <div className="flex justify-between mb-1.5 text-neutral-300">
                  <span>Sun / Key Light Energy</span>
                  <span className="font-mono text-emerald-400">{settings.sunIntensity.toFixed(2)}x</span>
                </div>
                <input
                  type="range"
                  min="0.2"
                  max="2.5"
                  step="0.05"
                  value={settings.sunIntensity}
                  onChange={(e) => updateSetting('sunIntensity', parseFloat(e.target.value))}
                  className="w-full accent-emerald-400 bg-neutral-800 rounded h-1 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between mb-1.5 text-neutral-300">
                  <span>Hemisphere Ambient Energy</span>
                  <span className="font-mono text-emerald-400">{settings.ambientIntensity.toFixed(2)}x</span>
                </div>
                <input
                  type="range"
                  min="0.2"
                  max="2.5"
                  step="0.05"
                  value={settings.ambientIntensity}
                  onChange={(e) => updateSetting('ambientIntensity', parseFloat(e.target.value))}
                  className="w-full accent-emerald-400 bg-neutral-800 rounded h-1 cursor-pointer"
                />
              </div>

              {/* Motion Blur (Permanent Zero Blur Policy) */}
              <div className="flex items-center justify-between p-3 bg-neutral-950/70 border border-neutral-800 rounded-sm">
                <div>
                  <div className="font-medium text-neutral-200 flex items-center gap-2">
                    <span>Motion Blur</span>
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                      GAMER STANDARD
                    </span>
                  </div>
                  <div className="text-[10px] text-neutral-400 mt-0.5">
                    Permanently banished. 100% crystal-clear raw pixel fidelity, zero smearing, zero nausea.
                  </div>
                </div>
                <div className="px-3 py-1 bg-neutral-900 border border-emerald-500/40 text-emerald-400 rounded text-xs font-mono font-semibold tracking-wider">
                  OFF
                </div>
              </div>
            </div>
          )}

          {/* Camera Tab */}
          {activeTab === 'camera' && (
            <div className="space-y-5">
              <div>
                <div className="flex justify-between mb-1.5 text-neutral-300">
                  <span>Field of View (FOV)</span>
                  <span className="font-mono text-emerald-400">{settings.fov}°</span>
                </div>
                <input
                  type="range"
                  min="45"
                  max="95"
                  step="1"
                  value={settings.fov}
                  onChange={(e) => updateSetting('fov', parseInt(e.target.value, 10))}
                  className="w-full accent-emerald-400 bg-neutral-800 rounded h-1 cursor-pointer"
                />
                <p className="text-[10px] text-neutral-400 mt-1">
                  Horizontal angle of perspective. Higher values widen peripheral sight.
                </p>
              </div>

              <div>
                <div className="flex justify-between mb-1.5 text-neutral-300">
                  <span>Follow Distance</span>
                  <span className="font-mono text-emerald-400">{settings.cameraDistance.toFixed(1)}m</span>
                </div>
                <input
                  type="range"
                  min="2.5"
                  max="12.0"
                  step="0.5"
                  value={settings.cameraDistance}
                  onChange={(e) => updateSetting('cameraDistance', parseFloat(e.target.value))}
                  className="w-full accent-emerald-400 bg-neutral-800 rounded h-1 cursor-pointer"
                />
              </div>
            </div>
          )}

          {/* Controls Tab */}
          {activeTab === 'controls' && (
            <div className="space-y-5">
              <div>
                <div className="flex justify-between mb-1.5 text-neutral-300">
                  <span>Mouse Look Sensitivity</span>
                  <span className="font-mono text-emerald-400">{(settings.mouseSensitivity * 1000).toFixed(1)}</span>
                </div>
                <input
                  type="range"
                  min="0.0008"
                  max="0.0055"
                  step="0.0002"
                  value={settings.mouseSensitivity}
                  onChange={(e) => updateSetting('mouseSensitivity', parseFloat(e.target.value))}
                  className="w-full accent-emerald-400 bg-neutral-800 rounded h-1 cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-neutral-950/60 border border-neutral-800 rounded-sm">
                <div>
                  <div className="font-medium text-neutral-200">Invert North / South (W / S)</div>
                  <div className="text-[10px] text-neutral-400">Flips forward and backward movement direction.</div>
                </div>
                <button
                  onClick={() => updateSetting('invertNorthSouth', !settings.invertNorthSouth)}
                  className={`px-3 py-1 rounded text-xs font-mono transition cursor-pointer ${
                    settings.invertNorthSouth ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'bg-neutral-800 text-neutral-400'
                  }`}
                >
                  {settings.invertNorthSouth ? 'REVERSED' : 'STANDARD'}
                </button>
              </div>

              <div className="flex items-center justify-between p-3 bg-neutral-950/60 border border-neutral-800 rounded-sm">
                <div>
                  <div className="font-medium text-neutral-200">Invert Left / Right (A / D)</div>
                  <div className="text-[10px] text-neutral-400">Flips strafe direction relative to camera angle.</div>
                </div>
                <button
                  onClick={() => updateSetting('invertLeftRight', !settings.invertLeftRight)}
                  className={`px-3 py-1 rounded text-xs font-mono transition cursor-pointer ${
                    settings.invertLeftRight ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'bg-neutral-800 text-neutral-400'
                  }`}
                >
                  {settings.invertLeftRight ? 'REVERSED' : 'STANDARD'}
                </button>
              </div>

              <div className="flex items-center justify-between p-3 bg-neutral-950/60 border border-neutral-800 rounded-sm">
                <div>
                  <div className="font-medium text-neutral-200">Invert Mouse Look (Horizontal Left / Right)</div>
                  <div className="text-[10px] text-neutral-400">Standard: Moving mouse right turns view right.</div>
                </div>
                <button
                  onClick={() => updateSetting('invertMouseX', !settings.invertMouseX)}
                  className={`px-3 py-1 rounded text-xs font-mono transition cursor-pointer ${
                    settings.invertMouseX ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'bg-neutral-800 text-neutral-400'
                  }`}
                >
                  {settings.invertMouseX ? 'INVERTED' : 'STANDARD'}
                </button>
              </div>

              <div className="flex items-center justify-between p-3 bg-neutral-950/60 border border-neutral-800 rounded-sm">
                <div>
                  <div className="font-medium text-neutral-200">Invert Mouse Pitch (Vertical Up / Down)</div>
                  <div className="text-[10px] text-neutral-400">Standard: Moving mouse forward looks up.</div>
                </div>
                <button
                  onClick={() => updateSetting('invertMouseY', !settings.invertMouseY)}
                  className={`px-3 py-1 rounded text-xs font-mono transition cursor-pointer ${
                    settings.invertMouseY ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'bg-neutral-800 text-neutral-400'
                  }`}
                >
                  {settings.invertMouseY ? 'INVERTED' : 'STANDARD'}
                </button>
              </div>

              {/* Gamepad / Controller API Section */}
              <div className="pt-3 border-t border-neutral-800 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-neutral-200 flex items-center gap-2">
                    <Compass className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Hardware Gamepad / Controller</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div
                      className={`w-2 h-2 rounded-full ${
                        engine?.isGamepadConnected() ? 'bg-emerald-400 animate-pulse' : 'bg-neutral-600'
                      }`}
                    />
                    <span className="text-[10px] font-mono text-neutral-400">
                      {engine?.isGamepadConnected()
                        ? `Connected (${engine.getGamepadId().slice(0, 24)}...)`
                        : 'No Gamepad Detected (Plug in USB/BT Controller)'}
                    </span>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between mb-1.5 text-neutral-300">
                    <span>Gamepad Look Sensitivity</span>
                    <span className="font-mono text-emerald-400">{settings.gamepadSensitivity.toFixed(1)}x</span>
                  </div>
                  <input
                    type="range"
                    min="1.0"
                    max="5.0"
                    step="0.2"
                    value={settings.gamepadSensitivity}
                    onChange={(e) => updateSetting('gamepadSensitivity', parseFloat(e.target.value))}
                    className="w-full accent-emerald-400 bg-neutral-800 rounded h-1 cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between mb-1.5 text-neutral-300">
                    <span>Stick Deadzone (prevents drift)</span>
                    <span className="font-mono text-emerald-400">{Math.round(settings.gamepadDeadzone * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.05"
                    max="0.35"
                    step="0.05"
                    value={settings.gamepadDeadzone}
                    onChange={(e) => updateSetting('gamepadDeadzone', parseFloat(e.target.value))}
                    className="w-full accent-emerald-400 bg-neutral-800 rounded h-1 cursor-pointer"
                  />
                </div>

                {/* Controller Button Map Reference */}
                <div className="grid grid-cols-2 gap-2 p-3 bg-neutral-950/70 border border-neutral-800 rounded text-[10px] text-neutral-300 font-mono">
                  <div><span className="text-emerald-400">Left Stick:</span> Walk & Strafe</div>
                  <div><span className="text-emerald-400">Right Stick:</span> 360° Camera Look</div>
                  <div><span className="text-emerald-400">L3 / Triggers:</span> Sprint / Dash</div>
                  <div><span className="text-emerald-400">R3 Click:</span> Toggle 1st/3rd View</div>
                  <div><span className="text-emerald-400">Y / Triangle:</span> Day / Night</div>
                  <div><span className="text-emerald-400">Select / Share:</span> C0D3X & Radar</div>
                  <div><span className="text-emerald-400">Start / Menu:</span> System Settings</div>
                  <div><span className="text-emerald-400">B / Circle:</span> Close / Free Pointer</div>
                </div>
              </div>
            </div>
          )}

          {/* Atmosphere / Audio Tab */}
          {activeTab === 'audio' && (
            <div className="space-y-5">
              <div className="flex items-center justify-between p-3 bg-neutral-950/60 border border-neutral-800 rounded-sm">
                <div className="flex items-center space-x-2.5">
                  {settings.audioEnabled ? (
                    <Volume2 className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <VolumeX className="w-4 h-4 text-neutral-400" />
                  )}
                  <div>
                    <div className="font-medium text-neutral-200">Procedural Atmosphere Sound</div>
                    <div className="text-[10px] text-neutral-400">Pure Web Audio synthesizer wind and nocturnal resonance.</div>
                  </div>
                </div>
                <button
                  onClick={() => updateSetting('audioEnabled', !settings.audioEnabled)}
                  className={`px-3 py-1 rounded text-xs font-mono transition cursor-pointer ${
                    settings.audioEnabled ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'bg-neutral-800 text-neutral-400'
                  }`}
                >
                  {settings.audioEnabled ? 'ACTIVE' : 'MUTED'}
                </button>
              </div>

              <div>
                <div className="flex justify-between mb-1.5 text-neutral-300">
                  <span>Master Volume</span>
                  <span className="font-mono text-emerald-400">{Math.round(settings.masterVolume * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={settings.masterVolume}
                  onChange={(e) => updateSetting('masterVolume', parseFloat(e.target.value))}
                  disabled={!settings.audioEnabled}
                  className="w-full accent-emerald-400 bg-neutral-800 rounded h-1 cursor-pointer disabled:opacity-40"
                />
              </div>

              <div>
                <div className="flex justify-between mb-1.5 text-neutral-300">
                  <span>Ambient Wind & Tone</span>
                  <span className="font-mono text-emerald-400">{Math.round(settings.ambientVolume * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={settings.ambientVolume}
                  onChange={(e) => updateSetting('ambientVolume', parseFloat(e.target.value))}
                  disabled={!settings.audioEnabled}
                  className="w-full accent-emerald-400 bg-neutral-800 rounded h-1 cursor-pointer disabled:opacity-40"
                />
              </div>
            </div>
          )}

          {/* System Tab */}
          {activeTab === 'system' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-neutral-950/60 border border-neutral-800 rounded-sm">
                  <div className="text-[10px] text-neutral-400 uppercase tracking-wider">Active Renderer</div>
                  <div className="text-sm font-semibold text-neutral-200 mt-0.5">{metrics.backend}</div>
                  <div className="text-[10px] text-neutral-400 mt-1">Direct hardware pipeline</div>
                </div>

                <div className="p-3 bg-neutral-950/60 border border-neutral-800 rounded-sm">
                  <div className="text-[10px] text-neutral-400 uppercase tracking-wider">Render Profile</div>
                  <div className="text-sm font-semibold text-neutral-200 capitalize mt-0.5">{metrics.worldMode} Dream</div>
                  <div className="text-[10px] text-neutral-400 mt-1">Press N in-game to switch</div>
                </div>

                <div className="p-3 bg-neutral-950/60 border border-neutral-800 rounded-sm">
                  <div className="text-[10px] text-neutral-400 uppercase tracking-wider">Performance</div>
                  <div className="text-sm font-semibold text-emerald-400 mt-0.5">{metrics.fps} FPS</div>
                  <div className="text-[10px] text-neutral-400 mt-1">{metrics.frameTimeMs} ms frame time</div>
                </div>

                <div className="p-3 bg-neutral-950/60 border border-neutral-800 rounded-sm">
                  <div className="text-[10px] text-neutral-400 uppercase tracking-wider">Average Luma</div>
                  <div className="text-sm font-semibold text-amber-300 mt-0.5">{metrics.luma.toFixed(3)}</div>
                  <div className="text-[10px] text-neutral-400 mt-1">Real-time pixel readback</div>
                </div>
              </div>

              {/* Attribution & Provenance Badge */}
              <div className="p-3 bg-neutral-950/80 border border-neutral-700/60 rounded-sm flex items-center justify-between">
                <div>
                  <div className="text-xs font-medium text-neutral-200">Built with Google Gemini</div>
                  <div className="text-[10px] text-neutral-400">Zero-cost preview prototype • 0 runtime engine dependencies</div>
                </div>
                <div className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 border border-emerald-500/30 rounded">
                  v0.1.0-stage1
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-neutral-800 bg-neutral-950/60 text-[11px] text-neutral-400">
          <span>Settings persist for current session</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-sm font-medium transition cursor-pointer"
          >
            Apply & Close
          </button>
        </div>
      </div>
    </div>
  );
};
