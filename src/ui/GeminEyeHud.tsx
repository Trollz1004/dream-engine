/**
 * DREAM Engine — geminEyE Cyber-Optic & Smart HUD
 * Designed per the Founder's vision:
 * "geminEyE's EYE patch / smart glasses HUD that stays up as a personal feature,
 * unique music style synth, location & voice-driven assistant simulation,
 * live Web Audio spectrum analyzer, tactical memory feed, and Gemini's signature
 * electric cyan, deep celestial indigo, and amber gold palette."
 */

import React, { useEffect, useState, useRef } from 'react';
import { DreamEngine } from '../engine/engine';
import {
  Mic,
  MicOff,
  Radio,
  Sparkles,
  Compass,
  Cpu,
  Layers,
  Activity,
  Volume2,
  ExternalLink,
  Mail,
  Zap,
  CheckCircle,
  Eye,
  X,
} from 'lucide-react';

interface GeminEyeHudProps {
  engine: DreamEngine | null;
  isOpen: boolean;
  onClose: () => void;
  playerPos: [number, number, number];
  cameraYaw: number;
}

export const GeminEyeHud: React.FC<GeminEyeHudProps> = ({
  engine,
  isOpen,
  onClose,
  playerPos,
  cameraYaw,
}) => {
  const [isListening, setIsListening] = useState(false);
  const [voiceQuery, setVoiceQuery] = useState('');
  const [voiceResponse, setVoiceResponse] = useState<string | null>(null);
  const [activePreset, setActivePreset] = useState<'neo_tokyo' | 'starlight_city' | 'cyber_dawn' | 'lofi_nightfall'>('neo_tokyo');
  const [audioBars, setAudioBars] = useState<number[]>(new Array(16).fill(10));
  const [memoryLogs, setMemoryLogs] = useState<Array<{ id: string; time: string; text: string; tag: string }>>([
    { id: '1', time: '04:02:18', text: 'Optic HUD calibrated. Biometric resonance locked at 100%.', tag: 'SYS' },
    { id: '2', time: '04:04:45', text: 'Hollow Sentinel automaton scanned at (0, 0, -10). Focus Beam locked.', tag: 'TARGET' },
    { id: '3', time: '04:05:01', text: 'Mireth World Lore node active in Old-World Valley perimeter.', tag: 'WORLD' },
  ]);

  const animFrameRef = useRef<number | null>(null);

  // Live Web Audio frequency analysis for visualizer
  useEffect(() => {
    if (!isOpen || !engine) return;

    const dataArray = new Uint8Array(32);
    const updateSpectrum = () => {
      if (engine.ambientSynth) {
        engine.ambientSynth.getFrequencyData(dataArray);
        const sampled = [];
        for (let i = 0; i < 16; i++) {
          const val = dataArray[i * 2] || 0;
          sampled.push(Math.max(8, Math.round((val / 255) * 100)));
        }
        setAudioBars(sampled);
      }
      animFrameRef.current = requestAnimationFrame(updateSpectrum);
    };

    animFrameRef.current = requestAnimationFrame(updateSpectrum);
    return () => {
      if (animFrameRef.current !== null) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [isOpen, engine]);

  // Voice speech-to-text handler
  const handleStartSpeech = () => {
    // Check for native browser SpeechRecognition API
    const SpeechRecognition =
      (window as unknown as { SpeechRecognition?: any; webkitSpeechRecognition?: any }).SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: any }).webkitSpeechRecognition;

    if (SpeechRecognition) {
      try {
        const recognition = new SpeechRecognition();
        recognition.lang = 'en-US';
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        setIsListening(true);
        setVoiceQuery('Listening for voice command...');

        recognition.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          setVoiceQuery(`"${transcript}"`);
          processVoiceCommand(transcript);
          setIsListening(false);
        };

        recognition.onerror = () => {
          setIsListening(false);
          setVoiceQuery('Microphone unavailable. Use quick commands below.');
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognition.start();
      } catch {
        simulateVoiceDemo('hey gemini change music to starlight city');
      }
    } else {
      simulateVoiceDemo('hey gemini change music to starlight city');
    }
  };

  const simulateVoiceDemo = (cmd: string) => {
    setIsListening(true);
    setVoiceQuery('Processing voice intent...');
    setTimeout(() => {
      setIsListening(false);
      setVoiceQuery(`"${cmd}"`);
      processVoiceCommand(cmd);
    }, 450);
  };

  const processVoiceCommand = (raw: string) => {
    const text = raw.toLowerCase();
    const time = new Date().toLocaleTimeString('en-US', { hour12: false });

    if (text.includes('music') || text.includes('song') || text.includes('starlight')) {
      handleSetAtmosphere('starlight_city');
      setVoiceResponse('Atmosphere shifted to Starlight City. High-altitude celestial pads active.');
      addMemory(time, 'Voice cmd: Music shifted to Starlight City preset.', 'AUDIO');
    } else if (text.includes('domino') || text.includes('pizza') || text.includes('order')) {
      setVoiceResponse('Domino\'s order interface initialized via voice bridge: Browser Pizza link armed at dominos.com.');
      addMemory(time, 'Voice order bridge: Domino\'s Pizza voice tracker armed.', 'WEB');
    } else if (text.includes('email') || text.includes('shriners') || text.includes('ryan')) {
      setVoiceResponse('Comms inbox verified: Shriners Children\'s update confirmed; Ryan electrical review: pending final blueprint.');
      addMemory(time, 'Inbox check: Shriners & Ryan comms status verified.', 'COMMS');
    } else if (text.includes('sentinel') || text.includes('memory') || text.includes('mireth')) {
      setVoiceResponse('Memory query resolved: Hollow Sentinel cycle is 4.2s (1.4s wind-up, 0.3s beam). Mireth memory record synced.');
      addMemory(time, 'World memory query: Hollow Sentinel tactical specs loaded.', 'MEMORY');
    } else {
      setVoiceResponse(`geminEyE processed: "${raw}". Action executed.`);
      addMemory(time, `Executed custom voice prompt: ${raw}`, 'AI');
    }
  };

  const addMemory = (time: string, text: string, tag: string) => {
    setMemoryLogs((prev) => [{ id: Date.now().toString(), time, text, tag }, ...prev.slice(0, 5)]);
  };

  const handleSetAtmosphere = (preset: 'neo_tokyo' | 'starlight_city' | 'cyber_dawn' | 'lofi_nightfall') => {
    setActivePreset(preset);
    if (engine?.ambientSynth) {
      engine.ambientSynth.start();
      engine.ambientSynth.setAtmospherePreset(preset);
    }
  };

  if (!isOpen) return null;

  // Degrees heading
  const deg = ((-cameraYaw * 180) / Math.PI + 360) % 360;
  const heading = Math.round(deg);

  return (
    <div className="fixed inset-0 pointer-events-none z-30 flex flex-col justify-between p-4 sm:p-6 select-none">
      {/* 1. Top Cyber-Optic Reticle Bar */}
      <div className="flex items-start justify-between w-full">
        {/* Top-Left: geminEyE Brand & Status */}
        <div className="bg-slate-950/85 backdrop-blur-md border border-cyan-500/50 shadow-[0_0_20px_rgba(6,182,212,0.25)] p-3 rounded-sm text-xs pointer-events-auto flex items-center space-x-3">
          <div className="relative flex items-center justify-center">
            <div className="w-8 h-8 rounded-full border border-cyan-400/80 animate-ping absolute opacity-40" />
            <div className="w-8 h-8 rounded-full border border-indigo-400 bg-cyan-950/60 flex items-center justify-center">
              <Eye className="w-4 h-4 text-cyan-300" />
            </div>
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold tracking-wider uppercase text-cyan-300 font-mono text-sm">
                geminEyE • SMART OPTIC
              </span>
              <span className="px-1.5 py-0.5 rounded text-[9px] bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-mono">
                LIVE
              </span>
            </div>
            <p className="text-[10px] text-slate-400">
              Cybernetic Glasses HUD • Press <strong className="text-cyan-300 font-mono">O</strong> to Toggle
            </p>
          </div>
        </div>

        {/* Center: Bearing & Heading Compass Tape */}
        <div className="hidden md:flex flex-col items-center">
          <div className="bg-slate-950/85 backdrop-blur-md border border-cyan-500/40 px-5 py-1.5 rounded-sm text-xs font-mono text-cyan-300 flex items-center space-x-3 shadow-lg">
            <Compass className="w-4 h-4 text-cyan-400 animate-spin-slow" />
            <span>OPTIC HEADING {heading.toString().padStart(3, '0')}°</span>
            <span className="text-slate-600">|</span>
            <span className="text-amber-300">
              X:{playerPos[0].toFixed(1)} Y:{playerPos[1].toFixed(1)} Z:{playerPos[2].toFixed(1)}
            </span>
          </div>
        </div>

        {/* Top-Right: Close Button & HUD Presets */}
        <div className="pointer-events-auto flex items-center space-x-2">
          <button
            onClick={onClose}
            className="p-2 bg-slate-950/85 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/80 rounded-sm transition cursor-pointer shadow-lg"
            title="Close geminEyE HUD (O)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. Middle Center: Sci-Fi Crosshair & Optic Targeting Rings */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="relative flex items-center justify-center">
          {/* Outer Segmented Reticle */}
          <div className="w-36 h-36 rounded-full border border-cyan-500/30 border-dashed animate-spin-slow opacity-60" />
          {/* Inner Reticle */}
          <div className="w-20 h-20 rounded-full border border-indigo-500/40 flex items-center justify-center">
            <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_#22d3ee]" />
          </div>
          {/* Cyber Ticks */}
          <div className="w-10 h-[1px] bg-cyan-400/60 absolute -left-14" />
          <div className="w-10 h-[1px] bg-cyan-400/60 absolute -right-14" />
          <div className="h-10 w-[1px] bg-cyan-400/60 absolute -top-14" />
          <div className="h-10 w-[1px] bg-cyan-400/60 absolute -bottom-14" />

          {/* Sentinel Target Lock Box indicator */}
          <div className="absolute top-20 text-[10px] font-mono text-cyan-300/80 bg-slate-950/80 px-2 py-0.5 border border-cyan-500/30 rounded-sm flex items-center gap-1">
            <Radio className="w-3 h-3 text-amber-400 animate-pulse" />
            <span>SENTINEL LOCK: 10.0m [AIM TRACKING]</span>
          </div>
        </div>
      </div>

      {/* 3. Bottom Panels: Voice Command & Music Synthesizer & Memory Ledger */}
      <div className="flex flex-col md:flex-row items-end justify-between gap-4 w-full">
        {/* Left: Voice Assistant & Speech-to-Text Controller */}
        <div className="bg-slate-950/90 backdrop-blur-md border border-cyan-500/40 shadow-xl p-3.5 rounded-sm max-w-sm w-full pointer-events-auto">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2.5">
            <div className="flex items-center space-x-2">
              <Mic className={`w-4 h-4 ${isListening ? 'text-red-400 animate-pulse' : 'text-cyan-400'}`} />
              <span className="font-mono text-xs font-semibold uppercase text-cyan-200">
                Voice Link & Web Assistant
              </span>
            </div>
            <button
              onClick={handleStartSpeech}
              className={`px-2 py-1 rounded text-[10px] font-mono border transition cursor-pointer flex items-center gap-1 ${
                isListening
                  ? 'bg-red-500/20 text-red-300 border-red-500/50'
                  : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 hover:bg-cyan-500/30'
              }`}
            >
              {isListening ? <MicOff className="w-3 h-3" /> : <Mic className="w-3 h-3" />}
              <span>{isListening ? 'Listening...' : 'Push to Talk'}</span>
            </button>
          </div>

          {/* Voice Prompt Status */}
          <div className="bg-slate-900/80 border border-slate-800 p-2 rounded-sm text-[11px] mb-2 font-mono">
            <span className="text-slate-500">Query: </span>
            <span className="text-cyan-300">{voiceQuery || 'Click "Push to Talk" or select below'}</span>
            {voiceResponse && (
              <div className="mt-1 text-amber-300 text-[10px] border-t border-slate-800 pt-1">
                ▸ {voiceResponse}
              </div>
            )}
          </div>

          {/* Quick Voice Intent Presets */}
          <div className="space-y-1">
            <span className="text-[9px] uppercase tracking-wider text-slate-500 block">
              Quick Voice Triggers (Founder Presets):
            </span>
            <div className="grid grid-cols-2 gap-1.5 text-[10px]">
              <button
                onClick={() => simulateVoiceDemo('hey gemini change music to starlight city')}
                className="p-1.5 bg-slate-900/90 hover:bg-cyan-950/60 border border-slate-800 hover:border-cyan-500/50 rounded text-left text-slate-300 transition cursor-pointer truncate"
                title="Change music preset to Starlight City"
              >
                🎵 Change Music
              </button>
              <button
                onClick={() => simulateVoiceDemo('order dominos pizza')}
                className="p-1.5 bg-slate-900/90 hover:bg-cyan-950/60 border border-slate-800 hover:border-cyan-500/50 rounded text-left text-slate-300 transition cursor-pointer truncate"
                title="Order Domino's Pizza voice link"
              >
                🍕 Order Domino's
              </button>
              <button
                onClick={() => simulateVoiceDemo('check email from shriners and ryan')}
                className="p-1.5 bg-slate-900/90 hover:bg-cyan-950/60 border border-slate-800 hover:border-cyan-500/50 rounded text-left text-slate-300 transition cursor-pointer truncate"
                title="Check Shriners & Ryan email replies"
              >
                ✉️ Shriners & Ryan
              </button>
              <button
                onClick={() => simulateVoiceDemo('query memory on hollow sentinel')}
                className="p-1.5 bg-slate-900/90 hover:bg-cyan-950/60 border border-slate-800 hover:border-cyan-500/50 rounded text-left text-slate-300 transition cursor-pointer truncate"
                title="Query Sentinel world lore"
              >
                🧠 World Memory
              </button>
            </div>
          </div>
        </div>

        {/* Right: Audio Atmosphere Synthesizer & Spectrum Visualizer */}
        <div className="bg-slate-950/90 backdrop-blur-md border border-cyan-500/40 shadow-xl p-3.5 rounded-sm max-w-sm w-full pointer-events-auto">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2">
            <div className="flex items-center space-x-2">
              <Volume2 className="w-4 h-4 text-cyan-400" />
              <span className="font-mono text-xs font-semibold uppercase text-cyan-200">
                Atmosphere Synth & Spectrum
              </span>
            </div>
            <span className="text-[10px] font-mono text-amber-300 uppercase">
              {activePreset.replace('_', ' ')}
            </span>
          </div>

          {/* Live Web Audio Frequency Bars */}
          <div className="h-10 bg-slate-900/80 border border-slate-800 rounded-sm px-2 flex items-end justify-between gap-1 mb-2.5">
            {audioBars.map((height, i) => (
              <div
                key={i}
                className="w-full bg-gradient-to-t from-indigo-500 to-cyan-400 rounded-t-sm transition-all duration-75"
                style={{ height: `${height}%` }}
              />
            ))}
          </div>

          {/* Preset Buttons */}
          <div className="grid grid-cols-2 gap-1.5 text-[10px] font-mono">
            <button
              onClick={() => handleSetAtmosphere('neo_tokyo')}
              className={`p-1.5 rounded border text-center transition cursor-pointer ${
                activePreset === 'neo_tokyo'
                  ? 'bg-cyan-500/30 text-cyan-200 border-cyan-400 font-bold'
                  : 'bg-slate-900 hover:bg-slate-800 text-slate-400 border-slate-800'
              }`}
            >
              Neo-Tokyo Dream
            </button>
            <button
              onClick={() => handleSetAtmosphere('starlight_city')}
              className={`p-1.5 rounded border text-center transition cursor-pointer ${
                activePreset === 'starlight_city'
                  ? 'bg-cyan-500/30 text-cyan-200 border-cyan-400 font-bold'
                  : 'bg-slate-900 hover:bg-slate-800 text-slate-400 border-slate-800'
              }`}
            >
              Starlight City
            </button>
            <button
              onClick={() => handleSetAtmosphere('cyber_dawn')}
              className={`p-1.5 rounded border text-center transition cursor-pointer ${
                activePreset === 'cyber_dawn'
                  ? 'bg-cyan-500/30 text-cyan-200 border-cyan-400 font-bold'
                  : 'bg-slate-900 hover:bg-slate-800 text-slate-400 border-slate-800'
              }`}
            >
              Cybernetic Dawn
            </button>
            <button
              onClick={() => handleSetAtmosphere('lofi_nightfall')}
              className={`p-1.5 rounded border text-center transition cursor-pointer ${
                activePreset === 'lofi_nightfall'
                  ? 'bg-cyan-500/30 text-cyan-200 border-cyan-400 font-bold'
                  : 'bg-slate-900 hover:bg-slate-800 text-slate-400 border-slate-800'
              }`}
            >
              Low-Fi Nightfall
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
