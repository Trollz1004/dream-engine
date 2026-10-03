/**
 * DREAM Engine — Atmospheric Ambient Synthesizer
 * Pure Web Audio API implementation.
 * Zero external libraries or audio files.
 * Procedurally generates subtle wind, warm air and night hum.
 */

export class AmbientSynth {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private filterNode: BiquadFilterNode | null = null;
  private noiseNode: AudioBufferSourceNode | null = null;
  private subOsc: OscillatorNode | null = null;
  private subGain: GainNode | null = null;

  private isPlaying = false;
  private masterVolume = 0.5;
  private ambientVolume = 0.5;
  private analyserNode: AnalyserNode | null = null;
  private currentPreset: 'neo_tokyo' | 'starlight_city' | 'cyber_dawn' | 'lofi_nightfall' = 'neo_tokyo';

  constructor() {
    // AudioContext will be initialized on first user interaction to comply with browser autoplay policies
  }

  private initContext(): void {
    if (this.ctx) return;
    try {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) return;

      this.ctx = new AudioContextClass();

      // Master Gain
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.masterVolume * this.ambientVolume, this.ctx.currentTime);

      // Web Audio Analyser for live cybernetic visualizer
      this.analyserNode = this.ctx.createAnalyser();
      this.analyserNode.fftSize = 64;
      this.masterGain.connect(this.analyserNode);
      this.analyserNode.connect(this.ctx.destination);

      // Filtered Atmospheric Noise
      const bufferSize = this.ctx.sampleRate * 4;
      const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.04;
        b6 = white * 0.115926;
      }

      this.filterNode = this.ctx.createBiquadFilter();
      this.filterNode.type = 'lowpass';
      this.filterNode.frequency.setValueAtTime(320, this.ctx.currentTime);
      this.filterNode.Q.setValueAtTime(1.8, this.ctx.currentTime);

      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0.35, this.ctx.currentTime);

      this.noiseNode = this.ctx.createBufferSource();
      this.noiseNode.buffer = noiseBuffer;
      this.noiseNode.loop = true;
      this.noiseNode.connect(this.filterNode);
      this.filterNode.connect(noiseGain);
      noiseGain.connect(this.masterGain);

      // Deep Sub Hum (55Hz)
      this.subOsc = this.ctx.createOscillator();
      this.subOsc.type = 'sine';
      this.subOsc.frequency.setValueAtTime(55, this.ctx.currentTime);

      this.subGain = this.ctx.createGain();
      this.subGain.gain.setValueAtTime(0.08, this.ctx.currentTime);

      this.subOsc.connect(this.subGain);
      this.subGain.connect(this.masterGain);

      this.noiseNode.start();
      this.subOsc.start();
      this.isPlaying = true;
    } catch {
      // Graceful fallback if audio context cannot be initialized
    }
  }

  start(): void {
    try {
      if (!this.ctx) {
        this.initContext();
      } else if (this.ctx.state === 'suspended') {
        const p = this.ctx.resume();
        if (p && typeof p.catch === 'function') {
          p.catch(() => {});
        }
        this.isPlaying = true;
      }
    } catch {
      // AudioContext policy catch
    }
  }

  stop(): void {
    try {
      if (this.ctx && this.ctx.state === 'running') {
        const p = this.ctx.suspend();
        if (p && typeof p.catch === 'function') {
          p.catch(() => {});
        }
        this.isPlaying = false;
      }
    } catch {
      // Ignore suspend errors
    }
  }

  setMode(mode: 'day' | 'night'): void {
    if (!this.ctx || !this.filterNode || !this.subOsc) return;
    const now = this.ctx.currentTime;
    if (mode === 'day') {
      // Warm open breeze
      this.filterNode.frequency.setTargetAtTime(380, now, 1.2);
      this.subOsc.frequency.setTargetAtTime(55, now, 1.2);
    } else {
      // Deep nocturnal resonance
      this.filterNode.frequency.setTargetAtTime(160, now, 1.2);
      this.subOsc.frequency.setTargetAtTime(42, now, 1.2);
    }
  }

  setAtmospherePreset(preset: 'neo_tokyo' | 'starlight_city' | 'cyber_dawn' | 'lofi_nightfall'): void {
    this.currentPreset = preset;
    if (!this.ctx || !this.filterNode || !this.subOsc) return;
    const now = this.ctx.currentTime;
    switch (preset) {
      case 'starlight_city':
        this.filterNode.frequency.setTargetAtTime(520, now, 0.8);
        this.subOsc.frequency.setTargetAtTime(65, now, 0.8);
        break;
      case 'cyber_dawn':
        this.filterNode.frequency.setTargetAtTime(420, now, 0.8);
        this.subOsc.frequency.setTargetAtTime(55, now, 0.8);
        break;
      case 'lofi_nightfall':
        this.filterNode.frequency.setTargetAtTime(180, now, 0.8);
        this.subOsc.frequency.setTargetAtTime(38, now, 0.8);
        break;
      case 'neo_tokyo':
      default:
        this.filterNode.frequency.setTargetAtTime(280, now, 0.8);
        this.subOsc.frequency.setTargetAtTime(48, now, 0.8);
        break;
    }
  }

  getAtmospherePreset(): 'neo_tokyo' | 'starlight_city' | 'cyber_dawn' | 'lofi_nightfall' {
    return this.currentPreset;
  }

  getFrequencyData(targetArray?: Uint8Array): Uint8Array {
    if (!this.analyserNode) return targetArray || new Uint8Array(32);
    const data = targetArray || new Uint8Array(this.analyserNode.frequencyBinCount);
    this.analyserNode.getByteFrequencyData(data as any);
    return data;
  }

  setMasterVolume(vol: number): void {
    this.masterVolume = Math.max(0, Math.min(1, vol));
    this.updateGain();
  }

  setAmbientVolume(vol: number): void {
    this.ambientVolume = Math.max(0, Math.min(1, vol));
    this.updateGain();
  }

  private updateGain(): void {
    if (!this.ctx || !this.masterGain) return;
    this.masterGain.gain.setTargetAtTime(this.masterVolume * this.ambientVolume, this.ctx.currentTime, 0.05);
  }

  getIsPlaying(): boolean {
    return this.isPlaying;
  }
}
