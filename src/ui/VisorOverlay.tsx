/**
 * DREAM Engine — First-Person Visor / Goggles HUD Overlay
 * Cybernetic / Dream-tech HUD rendered when in 1st Person view mode.
 */

import React from 'react';
import { Target, Compass } from 'lucide-react';

interface VisorOverlayProps {
  viewMode: 'third-person' | 'first-person';
  cameraYaw: number;
}

export const VisorOverlay: React.FC<VisorOverlayProps> = ({ viewMode, cameraYaw }) => {
  if (viewMode !== 'first-person') return null;

  // Convert yaw into compass degrees (0-360)
  const deg = ((-cameraYaw * 180) / Math.PI + 360) % 360;
  const heading = Math.round(deg);

  return (
    <div className="absolute inset-0 pointer-events-none z-15 overflow-hidden flex flex-col justify-between p-6">
      {/* Top Heading Tape */}
      <div className="flex flex-col items-center">
        <div className="bg-neutral-950/80 backdrop-blur-md border border-emerald-500/30 px-4 py-1 rounded-sm text-xs font-mono text-emerald-400 flex items-center space-x-2 shadow-lg">
          <Compass className="w-3.5 h-3.5 text-emerald-400 animate-spin-slow" />
          <span>BEARING {heading.toString().padStart(3, '0')}°</span>
          <span className="text-neutral-500">|</span>
          <span className="text-[10px] text-neutral-300">
            {heading >= 338 || heading < 23
              ? 'NORTH'
              : heading < 68
              ? 'NORTHEAST'
              : heading < 113
              ? 'EAST'
              : heading < 158
              ? 'SOUTHEAST'
              : heading < 203
              ? 'SOUTH'
              : heading < 248
              ? 'SOUTHWEST'
              : heading < 293
              ? 'WEST'
              : 'NORTHWEST'}
          </span>
        </div>
        <div className="text-[9px] font-mono text-emerald-500/80 tracking-widest mt-1 uppercase">
          Visor HUD • 1st Person Active (Press V to return to 3rd Person)
        </div>
      </div>

      {/* Center Tactical Crosshair */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="relative flex items-center justify-center">
          {/* Subtle Outer Ring */}
          <div className="w-16 h-16 rounded-full border border-emerald-500/20" />
          {/* Center Point */}
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400/80 absolute" />
          {/* Reticle Ticks */}
          <div className="w-6 h-px bg-emerald-500/40 absolute -left-8" />
          <div className="w-6 h-px bg-emerald-500/40 absolute -right-8" />
          <div className="h-6 w-px bg-emerald-500/40 absolute -top-8" />
          <div className="h-6 w-px bg-emerald-500/40 absolute -bottom-8" />
        </div>
      </div>

      {/* Visor Corner Framing Brackets */}
      <div className="absolute top-4 left-4 w-12 h-12 border-t-2 border-l-2 border-emerald-500/40" />
      <div className="absolute top-4 right-4 w-12 h-12 border-t-2 border-r-2 border-emerald-500/40" />
      <div className="absolute bottom-4 left-4 w-12 h-12 border-b-2 border-l-2 border-emerald-500/40" />
      <div className="absolute bottom-4 right-4 w-12 h-12 border-b-2 border-r-2 border-emerald-500/40" />

      {/* Bottom Status Ticker */}
      <div className="flex items-center justify-between text-[9px] font-mono text-emerald-400/70 px-2">
        <span>SYS: OPTICAL SENSORS NOMINAL</span>
        <span>ATMOSPHERE SCAN: ACTIVE</span>
      </div>
    </div>
  );
};
