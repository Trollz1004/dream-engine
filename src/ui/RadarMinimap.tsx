/**
 * DREAM Engine — Circular Tactical Radar Minimap
 * Conforms strictly to DREAM Space design system:
 * - Ink (#0A0B0D) ground, Hull (#3A3F45) borders, Porcelain (#F4F1EA) / Fog (#C9CBCE) text
 * - Signal Yellow (#FFD21E) for active player chevron & focal target ("the one accent")
 * - Status indicators: green (#58D68D), amber (#F5B041), red (#FF6B6B), slate (#9DA3AA)
 * - Real-time position tracking, heading/north-up rotation, interactive zoom, POI tooltips
 */

import React, { useState, useMemo } from 'react';
import {
  Compass,
  Maximize2,
  Minimize2,
  Plus,
  Minus,
  Navigation,
  Crosshair,
  Layers,
  MapPin,
  Sparkles,
} from 'lucide-react';
import { CombatManager } from '../engine/combat/combat-manager';
import codexData from '../game/data/codex.json';

export interface PointOfInterest {
  id: string;
  name: string;
  category: 'boss' | 'landmark' | 'waypoint' | 'foraging' | 'mining' | 'woodcraft';
  x: number;
  z: number;
  desc: string;
  color?: string;
  danger?: boolean;
}

// Fixed world landmarks & points of interest in DREAM first-gate arena
const STATIC_POIS: PointOfInterest[] = [
  // Boss Combat Target
  {
    id: 'sentinel-001',
    name: 'Hollow Sentinel',
    category: 'boss',
    x: 0,
    z: -10,
    desc: 'Automaton • Focus Beam 4.2s Cycle',
    color: '#FF6B6B',
    danger: true,
  },
  // Sanctuary / Spawn
  {
    id: 'first-gate-001',
    name: 'First Gate',
    category: 'waypoint',
    x: 0,
    z: 3.5,
    desc: 'Sanctuary & World Spawning Arch',
    color: '#58D68D',
  },
  // Monoliths from codex
  ...codexData.landmarks.map((m) => ({
    id: `monolith-${m.id}`,
    name: m.name,
    category: 'landmark' as const,
    x: m.x,
    z: m.z,
    desc: m.desc,
    color: '#9DA3AA',
  })),
  // Gathering & Resource Nodes
  {
    id: 'gather-clover',
    name: 'Sun-Clover Meadows',
    category: 'foraging',
    x: 12,
    z: -4,
    desc: 'Botanical Herb • Stamina tonic base',
    color: '#58D68D',
  },
  {
    id: 'gather-iron',
    name: 'Star-Iron Deposit',
    category: 'mining',
    x: -14,
    z: 12,
    desc: 'Meteoric Ore • Weapon & Visor core',
    color: '#38BDF8',
  },
  {
    id: 'gather-quartz',
    name: 'Amber Quartz Shard',
    category: 'mining',
    x: 10,
    z: -22,
    desc: 'Optical Crystal • HUD lens upgrade',
    color: '#F5B041',
  },
  {
    id: 'gather-spore',
    name: 'Nocturnal Spore-Bulb',
    category: 'foraging',
    x: -8,
    z: -20,
    desc: 'Bioluminescent Flora • Night vision tincture',
    color: '#C084FC',
  },
  {
    id: 'gather-birch',
    name: 'Whispering Birch Grove',
    category: 'woodcraft',
    x: -6,
    z: 22,
    desc: 'Silvery Timber • Framecraft & handles',
    color: '#34D399',
  },
];

interface RadarMinimapProps {
  playerPos: [number, number, number];
  cameraYaw: number;
  combat?: CombatManager | null;
  className?: string;
}

export interface RadarPoiBlip extends PointOfInterest {
  dist: number;
  sx: number;
  sy: number;
  isOutOfRange: boolean;
  dotColor: string;
  isAlert: boolean;
  pulseRing: boolean;
}

export const RadarMinimap: React.FC<RadarMinimapProps> = ({
  playerPos,
  cameraYaw,
  combat,
  className = '',
}) => {
  // Radar Settings State
  const [radarRange, setRadarRange] = useState<number>(45); // in meters
  const [orientationMode, setOrientationMode] = useState<'heading' | 'north'>('heading');
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const [activeCategory, setActiveCategory] = useState<'all' | 'combat' | 'landmarks' | 'resources'>('all');
  const [selectedPoiId, setSelectedPoiId] = useState<string | null>('sentinel-001'); // default lock to Sentinel
  const [hoveredPoi, setHoveredPoi] = useState<RadarPoiBlip | null>(null);

  // Minimap Dimensions
  const size = isExpanded ? 260 : 176;
  const radius = size / 2;
  const innerRadius = radius - 14;

  const [px, , pz] = playerPos;

  // Real-time Sentinel Combat State
  const sentinelState = useMemo(() => {
    if (!combat) return null;
    const s = combat.sentinel;
    return {
      health: s.health,
      isFiring: s.isFiring(),
      isTelegraphing: s.isTelegraphing(),
      isDown: s.isDown(),
      telegraphProgress: s.telegraphProgress(),
    };
  }, [combat, combat?.sentinel.health]);

  // Filtered POIs
  const visiblePois = useMemo(() => {
    return STATIC_POIS.filter((poi) => {
      if (activeCategory === 'all') return true;
      if (activeCategory === 'combat') return poi.category === 'boss';
      if (activeCategory === 'landmarks') return poi.category === 'landmark' || poi.category === 'waypoint';
      if (activeCategory === 'resources') return poi.category === 'foraging' || poi.category === 'mining' || poi.category === 'woodcraft';
      return true;
    });
  }, [activeCategory]);

  // Selected Target POI details
  const selectedPoi = useMemo(() => {
    return STATIC_POIS.find((p) => p.id === selectedPoiId) || null;
  }, [selectedPoiId]);

  const selectedDistance = useMemo(() => {
    if (!selectedPoi) return 0;
    const dx = selectedPoi.x - px;
    const dz = selectedPoi.z - pz;
    return Math.sqrt(dx * dx + dz * dz);
  }, [selectedPoi, px, pz]);

  // Zoom handlers
  const handleZoomIn = (e: React.MouseEvent) => {
    e.stopPropagation();
    setRadarRange((prev) => Math.max(20, prev - 15));
  };

  const handleZoomOut = (e: React.MouseEvent) => {
    e.stopPropagation();
    setRadarRange((prev) => Math.min(120, prev + 15));
  };

  const toggleOrientation = (e: React.MouseEvent) => {
    e.stopPropagation();
    setOrientationMode((prev) => (prev === 'heading' ? 'north' : 'heading'));
  };

  // Convert cameraYaw to compass degrees for bearing readouts
  const compassHeadingDeg = useMemo(() => {
    // cameraYaw = 0 faces -Z (North = 0°)
    let deg = Math.round((-cameraYaw * 180) / Math.PI) % 360;
    if (deg < 0) deg += 360;
    if (deg === 0) deg = 0;
    return deg;
  }, [cameraYaw]);

  // Cardinal direction label
  const cardinalText = useMemo(() => {
    const deg = compassHeadingDeg;
    if (deg >= 337.5 || deg < 22.5) return 'N';
    if (deg >= 22.5 && deg < 67.5) return 'NE';
    if (deg >= 67.5 && deg < 112.5) return 'E';
    if (deg >= 112.5 && deg < 157.5) return 'SE';
    if (deg >= 157.5 && deg < 202.5) return 'S';
    if (deg >= 202.5 && deg < 247.5) return 'SW';
    if (deg >= 247.5 && deg < 292.5) return 'W';
    return 'NW';
  }, [compassHeadingDeg]);

  // Calculation for plotting each POI onto the circular radar
  const poiBlips = useMemo(() => {
    const cosY = Math.cos(cameraYaw);
    const sinY = Math.sin(cameraYaw);

    return visiblePois.map((poi) => {
      const dx = poi.x - px;
      const dz = poi.z - pz;
      const dist = Math.sqrt(dx * dx + dz * dz);

      let relX = dx;
      let relZ = dz;

      if (orientationMode === 'heading') {
        // Rotate world vector so player forward (-Z) is UP on radar (-relZ)
        relX = dx * cosY - dz * sinY;
        relZ = dx * sinY + dz * cosY;
      }

      // Normalized coordinates within radar radius
      const scale = innerRadius / radarRange;
      let sx = radius + relX * scale;
      let sy = radius + relZ * scale; // in SVG, +Y is downward, matching +Z south

      // Clamp to radar circumference if out of range, showing boundary bearing
      const isOutOfRange = dist > radarRange;
      if (isOutOfRange) {
        const angle = Math.atan2(relZ, relX);
        sx = radius + Math.cos(angle) * (innerRadius - 4);
        sy = radius + Math.sin(angle) * (innerRadius - 4);
      }

      // Dynamic color & alert state for Sentinel
      let dotColor = poi.color || '#9DA3AA';
      let isAlert = false;
      let pulseRing = false;

      if (poi.category === 'boss' && sentinelState) {
        if (sentinelState.isFiring) {
          dotColor = '#FF6B6B';
          isAlert = true;
          pulseRing = true;
        } else if (sentinelState.isTelegraphing) {
          dotColor = '#F5B041';
          isAlert = true;
          pulseRing = true;
        } else if (sentinelState.isDown) {
          dotColor = '#7A6A1E';
        }
      }

      if (poi.id === selectedPoiId) {
        dotColor = '#FFD21E'; // Signal Yellow for locked focal target
      }

      return {
        ...poi,
        dist,
        sx,
        sy,
        isOutOfRange,
        dotColor,
        isAlert,
        pulseRing,
      };
    });
  }, [visiblePois, px, pz, cameraYaw, orientationMode, innerRadius, radarRange, radius, sentinelState, selectedPoiId]);

  if (isCollapsed) {
    return (
      <div className={`fixed top-18 right-4 z-20 select-none ${className}`}>
        <button
          onClick={() => setIsCollapsed(false)}
          className="flex items-center gap-2 bg-[#0A0B0D]/90 hover:bg-[#0A0B0D] text-[#F4F1EA] border border-[#3A3F45] px-3 py-2 rounded-full shadow-2xl backdrop-blur-md text-xs font-mono transition duration-150 cursor-pointer group"
          title="Expand Tactical Radar Minimap"
        >
          <div className="w-2.5 h-2.5 rounded-full bg-[#FFD21E] animate-pulse" />
          <Compass className="w-3.5 h-3.5 text-[#FFD21E]" />
          <span className="font-semibold text-[11px]">{cardinalText} {compassHeadingDeg}°</span>
          <span className="text-[10px] text-[#9DA3AA]">|</span>
          <span className="text-[10px] text-[#C9CBCE]">{radarRange}m</span>
        </button>
      </div>
    );
  }

  return (
    <div className={`fixed top-18 right-4 z-20 select-none flex flex-col items-end gap-1.5 ${className}`}>
      {/* Target Lock Readout Banner */}
      {selectedPoi && (
        <div className="bg-[#0A0B0D]/85 backdrop-blur-md border border-[#3A3F45] px-2.5 py-1 rounded-sm text-[10px] font-mono text-[#C9CBCE] flex items-center gap-1.5 shadow-lg max-w-[260px] truncate">
          <span className="w-1.5 h-1.5 rounded-full bg-[#FFD21E] flex-shrink-0 animate-ping" />
          <span className="text-[#9DA3AA] uppercase tracking-wider text-[9px]">LOCK:</span>
          <span className="text-[#F4F1EA] font-semibold truncate">{selectedPoi.name}</span>
          <span className="text-[#FFD21E] font-bold ml-auto">{selectedDistance.toFixed(1)}m</span>
        </div>
      )}

      {/* Main Circular Radar Frame */}
      <div
        className="relative rounded-full border border-[#3A3F45] bg-[#0A0B0D]/90 backdrop-blur-md shadow-2xl overflow-hidden flex items-center justify-center transition-all duration-200"
        style={{ width: size, height: size }}
      >
        {/* Radar Background Reticle & Concentric Rings (SVG) */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          viewBox={`0 0 ${size} ${size}`}
        >
          <defs>
            {/* Subtle radar sweep gradient wedge */}
            <linearGradient id="dreamRadarSweep" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FFD21E" stopOpacity="0.22" />
              <stop offset="70%" stopColor="#FFD21E" stopOpacity="0.04" />
              <stop offset="100%" stopColor="#FFD21E" stopOpacity="0" />
            </linearGradient>
            <radialGradient id="dreamCenterGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#FFD21E" stopOpacity="0.16" />
              <stop offset="100%" stopColor="#FFD21E" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Central Area Glow */}
          <circle cx={radius} cy={radius} r={innerRadius * 0.45} fill="url(#dreamCenterGlow)" />

          {/* Concentric Range Circles */}
          <circle
            cx={radius}
            cy={radius}
            r={innerRadius}
            fill="none"
            stroke="#3A3F45"
            strokeWidth="1"
            strokeDasharray="4 3"
          />
          <circle
            cx={radius}
            cy={radius}
            r={innerRadius * 0.66}
            fill="none"
            stroke="#3A3F45"
            strokeWidth="0.8"
            strokeOpacity="0.8"
          />
          <circle
            cx={radius}
            cy={radius}
            r={innerRadius * 0.33}
            fill="none"
            stroke="#3A3F45"
            strokeWidth="0.75"
            strokeOpacity="0.6"
          />

          {/* Crosshair Axes */}
          <line
            x1={radius}
            y1={14}
            x2={radius}
            y2={size - 14}
            stroke="#3A3F45"
            strokeWidth="0.8"
            strokeOpacity="0.7"
          />
          <line
            x1={14}
            y1={radius}
            x2={size - 14}
            y2={radius}
            stroke="#3A3F45"
            strokeWidth="0.8"
            strokeOpacity="0.7"
          />

          {/* Diagonal Tick Guides */}
          <line
            x1={radius - innerRadius * 0.707}
            y1={radius - innerRadius * 0.707}
            x2={radius + innerRadius * 0.707}
            y2={radius + innerRadius * 0.707}
            stroke="#3A3F45"
            strokeWidth="0.5"
            strokeOpacity="0.35"
            strokeDasharray="2 4"
          />
          <line
            x1={radius - innerRadius * 0.707}
            y1={radius + innerRadius * 0.707}
            x2={radius + innerRadius * 0.707}
            y2={radius - innerRadius * 0.707}
            stroke="#3A3F45"
            strokeWidth="0.5"
            strokeOpacity="0.35"
            strokeDasharray="2 4"
          />

          {/* Continuous Rotating Radar Sweep Beam */}
          <g
            style={{
              transformOrigin: `${radius}px ${radius}px`,
              animation: 'spin 4s linear infinite',
            }}
          >
            <path
              d={`M ${radius} ${radius} L ${radius} ${radius - innerRadius} A ${innerRadius} ${innerRadius} 0 0 1 ${radius + innerRadius * 0.6} ${radius - innerRadius * 0.8} Z`}
              fill="url(#dreamRadarSweep)"
            />
          </g>

          {/* Selected Target Guide Line */}
          {selectedPoi && (
            (() => {
              const blip = poiBlips.find((b) => b.id === selectedPoi.id);
              if (!blip) return null;
              return (
                <line
                  x1={radius}
                  y1={radius}
                  x2={blip.sx}
                  y2={blip.sy}
                  stroke="#FFD21E"
                  strokeWidth="1"
                  strokeDasharray="3 3"
                  strokeOpacity="0.75"
                />
              );
            })()
          )}
        </svg>

        {/* Outer Rotating Compass Bezel (Cardinal Markers N, E, S, W) */}
        <div
          className="absolute inset-0 pointer-events-none transition-transform duration-100"
          style={{
            transform: orientationMode === 'heading' ? `rotate(${(cameraYaw * 180) / Math.PI}deg)` : 'none',
          }}
        >
          {/* North Marker (Signal Yellow highlight) */}
          <div className="absolute top-1 left-1/2 -translate-x-1/2 flex flex-col items-center">
            <div className="w-1 h-1.5 bg-[#FFD21E] rounded-xs" />
            <span className="text-[9px] font-mono font-bold text-[#FFD21E] leading-none mt-0.5">N</span>
          </div>

          {/* East Marker */}
          <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center">
            <span className="text-[9px] font-mono font-medium text-[#9DA3AA] leading-none mr-0.5">E</span>
            <div className="w-1.5 h-1 bg-[#3A3F45] rounded-xs" />
          </div>

          {/* South Marker */}
          <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex flex-col items-center">
            <span className="text-[9px] font-mono font-medium text-[#9DA3AA] leading-none mb-0.5">S</span>
            <div className="w-1 h-1.5 bg-[#3A3F45] rounded-xs" />
          </div>

          {/* West Marker */}
          <div className="absolute left-1 top-1/2 -translate-y-1/2 flex items-center">
            <div className="w-1.5 h-1 bg-[#3A3F45] rounded-xs" />
            <span className="text-[9px] font-mono font-medium text-[#9DA3AA] leading-none ml-0.5">W</span>
          </div>
        </div>

        {/* Interactive Point of Interest Blips */}
        <div className="absolute inset-0 pointer-events-auto">
          {poiBlips.map((blip) => {
            const isSelected = blip.id === selectedPoiId;
            return (
              <div
                key={blip.id}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedPoiId((prev) => (prev === blip.id ? null : blip.id));
                }}
                onMouseEnter={() => setHoveredPoi(blip)}
                onMouseLeave={() => setHoveredPoi(null)}
                style={{
                  left: `${blip.sx}px`,
                  top: `${blip.sy}px`,
                  transform: 'translate(-50%, -50%)',
                }}
                className={`absolute cursor-pointer transition-transform duration-100 group ${
                  blip.isOutOfRange ? 'opacity-80' : 'opacity-100'
                }`}
              >
                {/* Pulsing Alert Ring for Hostile Attacks or Target Lock */}
                {(blip.pulseRing || isSelected) && (
                  <div
                    className="absolute -inset-2 rounded-full animate-ping pointer-events-none"
                    style={{
                      backgroundColor: isSelected ? 'rgba(255, 210, 30, 0.4)' : 'rgba(255, 107, 107, 0.4)',
                    }}
                  />
                )}

                {/* Blip Glyph */}
                <div
                  className={`relative flex items-center justify-center transition-all ${
                    blip.category === 'boss'
                      ? 'w-3.5 h-3.5 rotate-45 border'
                      : isSelected
                      ? 'w-3 h-3 rounded-full border-2'
                      : 'w-2 h-2 rounded-full'
                  }`}
                  style={{
                    backgroundColor: blip.dotColor,
                    borderColor: isSelected ? '#FFFFFF' : '#0A0B0D',
                    boxShadow: isSelected
                      ? '0 0 10px #FFD21E'
                      : blip.isAlert
                      ? '0 0 8px #FF6B6B'
                      : '0 0 4px rgba(0,0,0,0.8)',
                  }}
                >
                  {blip.category === 'boss' && (
                    <div className="w-1 h-1 bg-[#0A0B0D] rounded-full" />
                  )}
                </div>

                {/* Cardinal Edge Arrow if Out of Range */}
                {blip.isOutOfRange && (
                  <div
                    className="absolute -top-1 -right-1 w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: blip.dotColor }}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Player Center Beacon & FOV Cone */}
        <div
          className="relative z-10 flex items-center justify-center pointer-events-none"
          style={{
            transform: orientationMode === 'north' ? `rotate(${(-cameraYaw * 180) / Math.PI}deg)` : 'none',
          }}
        >
          {/* Subtle Directional Camera FOV Wedge */}
          <div
            className="absolute -top-11 w-14 h-11 pointer-events-none"
            style={{
              background: 'radial-gradient(ellipse at 50% 100%, rgba(255, 210, 30, 0.3) 0%, rgba(255, 210, 30, 0) 70%)',
              clipPath: 'polygon(50% 100%, 0% 0%, 100% 0%)',
            }}
          />

          {/* Player Chevron (Signal Yellow, crisp geometric arrow) */}
          <div className="relative flex items-center justify-center">
            <Navigation
              className="w-4 h-4 text-[#FFD21E] drop-shadow-[0_0_6px_rgba(255,210,30,0.8)] fill-[#FFD21E]"
              style={{ transform: 'translateY(-1px)' }}
            />
          </div>
        </div>

        {/* Range Label (Bottom Center of Circular Reticle) */}
        <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 text-[9px] font-mono font-semibold text-[#9DA3AA] bg-[#0A0B0D]/75 px-1.5 py-0.5 rounded-xs border border-[#3A3F45]/60 pointer-events-none">
          {radarRange}m
        </div>
      </div>

      {/* Hovered POI Tooltip Overlay */}
      {hoveredPoi && (
        <div className="bg-[#0A0B0D]/95 border border-[#3A3F45] p-2 rounded-sm shadow-xl text-left text-[11px] font-sans text-[#F4F1EA] max-w-[200px] z-30 pointer-events-none">
          <div className="flex items-center justify-between gap-2 border-b border-[#3A3F45] pb-1 mb-1">
            <span className="font-semibold truncate text-[#F4F1EA]">{hoveredPoi.name}</span>
            <span className="font-mono text-[#FFD21E] font-bold text-[10px]">
              {hoveredPoi.dist.toFixed(1)}m
            </span>
          </div>
          <div className="text-[10px] text-[#C9CBCE] leading-tight mb-1">{hoveredPoi.desc}</div>
          <div className="flex items-center justify-between text-[9px] font-mono text-[#9DA3AA]">
            <span className="capitalize">{hoveredPoi.category}</span>
            <span>X:{hoveredPoi.x} Z:{hoveredPoi.z}</span>
          </div>
        </div>
      )}

      {/* Compact Tactical Control Buttons Toolbar */}
      <div className="flex items-center gap-1 bg-[#0A0B0D]/85 border border-[#3A3F45] p-1 rounded-sm shadow-md text-xs font-mono">
        {/* Zoom In */}
        <button
          onClick={handleZoomIn}
          disabled={radarRange <= 20}
          className="w-6 h-6 flex items-center justify-center rounded-xs bg-[#0A0B0D] hover:bg-[#3A3F45] text-[#F4F1EA] disabled:opacity-40 disabled:hover:bg-transparent transition cursor-pointer"
          title="Zoom Radar In (+)"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>

        {/* Zoom Out */}
        <button
          onClick={handleZoomOut}
          disabled={radarRange >= 120}
          className="w-6 h-6 flex items-center justify-center rounded-xs bg-[#0A0B0D] hover:bg-[#3A3F45] text-[#F4F1EA] disabled:opacity-40 disabled:hover:bg-transparent transition cursor-pointer"
          title="Zoom Radar Out (-)"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>

        <div className="w-px h-3.5 bg-[#3A3F45] mx-0.5" />

        {/* Orientation Mode Toggle (Heading vs North Up) */}
        <button
          onClick={toggleOrientation}
          className={`px-1.5 h-6 flex items-center gap-1 rounded-xs transition text-[10px] cursor-pointer ${
            orientationMode === 'heading'
              ? 'bg-[#3A3F45] text-[#FFD21E] font-bold'
              : 'bg-[#0A0B0D] hover:bg-[#3A3F45] text-[#C9CBCE]'
          }`}
          title={orientationMode === 'heading' ? 'Heading Up (Camera-Oriented)' : 'North Up (Fixed Compass)'}
        >
          <Compass className="w-3 h-3 text-[#FFD21E]" />
          <span>{orientationMode === 'heading' ? 'HDG' : 'N-UP'}</span>
        </button>

        {/* Filter Category Toggle */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            const order: Array<typeof activeCategory> = ['all', 'combat', 'landmarks', 'resources'];
            const nextIdx = (order.indexOf(activeCategory) + 1) % order.length;
            setActiveCategory(order[nextIdx]);
          }}
          className="px-1.5 h-6 flex items-center gap-1 rounded-xs bg-[#0A0B0D] hover:bg-[#3A3F45] text-[#C9CBCE] transition text-[10px] cursor-pointer"
          title={`Filter POIs: Current [${activeCategory.toUpperCase()}]`}
        >
          <Layers className="w-3 h-3 text-[#58D68D]" />
          <span className="capitalize">{activeCategory}</span>
        </button>

        {/* Expand / Shrink */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsExpanded((prev) => !prev);
          }}
          className="w-6 h-6 flex items-center justify-center rounded-xs bg-[#0A0B0D] hover:bg-[#3A3F45] text-[#F4F1EA] transition cursor-pointer"
          title={isExpanded ? 'Compact Size' : 'Enlarge Radar View'}
        >
          {isExpanded ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
        </button>

        {/* Collapse into Pill */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsCollapsed(true);
          }}
          className="w-5 h-6 flex items-center justify-center rounded-xs text-[#9DA3AA] hover:text-[#F4F1EA] transition cursor-pointer text-xs"
          title="Minimize Minimap"
        >
          ✕
        </button>
      </div>

      {/* Coordinate & Heading Telemetry Footnote */}
      <div className="text-[10px] font-mono text-[#9DA3AA] flex items-center gap-2 pr-1">
        <span>X: <strong className="text-[#F4F1EA]">{px.toFixed(1)}</strong></span>
        <span>Z: <strong className="text-[#F4F1EA]">{pz.toFixed(1)}</strong></span>
        <span className="text-[#FFD21E] font-bold">{compassHeadingDeg}° {cardinalText}</span>
      </div>
    </div>
  );
};
