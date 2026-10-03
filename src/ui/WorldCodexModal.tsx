/**
 * DREAM Engine — World Codex & DREAM Eye Map
 * In-game compendium for World Navigation, Gathering Nodes,
 * Life Skill Recipes, and Searchable Lore.
 */

import React, { useState, useMemo } from 'react';
import {
  Compass,
  MapPin,
  Search,
  Pickaxe,
  Flame,
  Leaf,
  Axe,
  X,
  Target,
  Eye,
  Sparkles,
} from 'lucide-react';

interface WorldCodexModalProps {
  isOpen: boolean;
  onClose: () => void;
  playerPos: [number, number, number];
  worldMode: 'day' | 'night';
}

interface LifeSkillEntry {
  id: string;
  name: string;
  category: 'foraging' | 'mining' | 'woodcraft' | 'cooking';
  rarity: 'Common' | 'Uncommon' | 'Rare' | 'Celestial';
  location: string;
  description: string;
  materials?: string[];
  effect?: string;
}

import codexData from '../game/data/codex.json';

const LIFE_SKILL_DATABASE: LifeSkillEntry[] = codexData.lifeSkills as LifeSkillEntry[];
const MONOLITHS = codexData.landmarks;

export const WorldCodexModal: React.FC<WorldCodexModalProps> = ({
  isOpen,
  onClose,
  playerPos,
  worldMode,
}) => {
  const [activeTab, setActiveTab] = useState<'map' | 'foraging' | 'mining' | 'cooking'>('map');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredEntries = useMemo(() => {
    let list = LIFE_SKILL_DATABASE;
    if (activeTab !== 'map') {
      list = list.filter((item) => item.category === activeTab);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (item) =>
          item.name.toLowerCase().includes(q) ||
          item.description.toLowerCase().includes(q) ||
          item.location.toLowerCase().includes(q) ||
          (item.effect && item.effect.toLowerCase().includes(q))
      );
    }
    return list;
  }, [activeTab, searchQuery]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-sm p-4 select-none">
      <div className="relative w-full max-w-3xl bg-neutral-900/95 border border-neutral-700/80 rounded-sm shadow-2xl overflow-hidden flex flex-col text-neutral-100 max-h-[88vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-3.5 border-b border-neutral-800 bg-neutral-950/70">
          <div className="flex items-center space-x-2.5">
            <div className="w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center">
              <Eye className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div>
              <span className="font-semibold text-sm tracking-wider uppercase">DREAM Eye • C0D3X</span>
              <span className="text-[10px] text-neutral-400 block -mt-0.5">
                Cartography Radar, Gathering Nodes & Life Skill Blueprints
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* Live Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search resources, recipes, lore..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1 bg-neutral-950 border border-neutral-700 rounded text-xs text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-emerald-400 w-48 transition"
              />
            </div>

            <button
              onClick={onClose}
              className="p-1 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 rounded transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tab Buttons */}
        <div className="flex border-b border-neutral-800 bg-neutral-950/50 px-6 pt-2 space-x-2">
          {[
            { id: 'map', label: 'World Radar', icon: Compass },
            { id: 'foraging', label: 'Foraging & Botany', icon: Leaf },
            { id: 'mining', label: 'Mining & Ores', icon: Pickaxe },
            { id: 'cooking', label: 'Campfire Cooking', icon: Flame },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`flex items-center space-x-1.5 px-3.5 py-2 text-xs font-medium border-b-2 transition cursor-pointer ${
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

        {/* Content Area */}
        <div className="p-6 overflow-y-auto flex-1 text-xs space-y-4">
          {activeTab === 'map' ? (
            <div className="space-y-4">
              {/* Tactical Radar Display */}
              <div className="relative w-full h-64 bg-neutral-950 border border-neutral-800 rounded-sm overflow-hidden flex items-center justify-center">
                {/* Radar Grid Circles */}
                <div className="absolute w-52 h-52 rounded-full border border-neutral-800/80" />
                <div className="absolute w-36 h-36 rounded-full border border-neutral-800/60" />
                <div className="absolute w-20 h-20 rounded-full border border-emerald-500/20" />
                <div className="absolute w-full h-px bg-neutral-800/60" />
                <div className="absolute h-full w-px bg-neutral-800/60" />

                {/* Compass Cardinal Points */}
                <span className="absolute top-2 text-[10px] font-mono text-neutral-500">N</span>
                <span className="absolute bottom-2 text-[10px] font-mono text-neutral-500">S</span>
                <span className="absolute left-2 text-[10px] font-mono text-neutral-500">W</span>
                <span className="absolute right-2 text-[10px] font-mono text-neutral-500">E</span>

                {/* Center Player Beacon */}
                <div className="relative z-10 flex flex-col items-center">
                  <div className="w-3 h-3 rounded-full bg-emerald-400 border border-emerald-200 animate-pulse shadow-lg shadow-emerald-500/50" />
                  <span className="text-[9px] font-mono text-emerald-300 mt-1">YOU</span>
                </div>

                {/* Monolith Markers on Radar */}
                {MONOLITHS.map((m) => {
                  // Project relative to player pos
                  const dx = m.x - playerPos[0];
                  const dz = m.z - playerPos[2];
                  // Scale: 1 meter = 3 pixels on radar
                  const px = dx * 3;
                  const py = dz * 3;
                  const dist = Math.sqrt(dx * dx + dz * dz);

                  // Keep inside radar bounds
                  if (Math.abs(px) > 120 || Math.abs(py) > 120) return null;

                  return (
                    <div
                      key={m.id}
                      style={{
                        transform: `translate(${px}px, ${py}px)`,
                      }}
                      className="absolute z-10 flex flex-col items-center group cursor-pointer"
                      title={`${m.name} (${dist.toFixed(1)}m)`}
                    >
                      <div className="w-2 h-2 rounded-xs bg-amber-400 border border-amber-200 shadow-sm" />
                      <span className="text-[8px] font-mono text-neutral-400 opacity-80 group-hover:opacity-100 group-hover:text-amber-300 whitespace-nowrap">
                        M{m.id}
                      </span>
                    </div>
                  );
                })}

                {/* Radar Sweep Animation Effect */}
                <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-emerald-500/5 to-transparent pointer-events-none" />
              </div>

              {/* Landmark Index */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5 pt-1">
                {MONOLITHS.map((m) => {
                  const dx = m.x - playerPos[0];
                  const dz = m.z - playerPos[2];
                  const dist = Math.sqrt(dx * dx + dz * dz);
                  return (
                    <div
                      key={m.id}
                      className="p-2.5 bg-neutral-950/70 border border-neutral-800 rounded-sm flex flex-col justify-between"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-neutral-200 text-xs">{m.name}</span>
                        <span className="text-[10px] font-mono text-amber-400">{dist.toFixed(1)}m</span>
                      </div>
                      <p className="text-[10px] text-neutral-400 mt-1">{m.desc}</p>
                      <div className="text-[9px] font-mono text-neutral-500 mt-1">
                        X: {m.x} | Z: {m.z}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="text-[11px] text-neutral-400 flex items-center justify-between pb-1">
                <span>
                  Showing {filteredEntries.length} {activeTab} discoveries & blueprints
                </span>
                <span className="text-emerald-400 flex items-center gap-1 font-mono text-[10px]">
                  <Sparkles className="w-3 h-3" /> Life Skills Engine Ready
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filteredEntries.map((item) => (
                  <div
                    key={item.id}
                    className="p-3.5 bg-neutral-950/70 border border-neutral-800 rounded-sm flex flex-col justify-between space-y-2 hover:border-neutral-700 transition"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-neutral-200 text-xs">{item.name}</span>
                        <span
                          className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${
                            item.rarity === 'Celestial'
                              ? 'bg-purple-500/10 text-purple-400 border-purple-500/30'
                              : item.rarity === 'Rare'
                              ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                              : item.rarity === 'Uncommon'
                              ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
                              : 'bg-neutral-800 text-neutral-400 border-neutral-700'
                          }`}
                        >
                          {item.rarity}
                        </span>
                      </div>
                      <div className="text-[10px] text-neutral-500 mt-0.5 flex items-center gap-1">
                        <MapPin className="w-2.5 h-2.5" />
                        <span>{item.location}</span>
                      </div>
                      <p className="text-[11px] text-neutral-300 mt-2 leading-relaxed">
                        {item.description}
                      </p>
                    </div>

                    <div className="space-y-1 pt-1 border-t border-neutral-900">
                      {item.materials && (
                        <div className="text-[10px] text-neutral-400">
                          <span className="text-neutral-500">Recipe: </span>
                          <span className="text-emerald-300 font-mono">{item.materials.join(' + ')}</span>
                        </div>
                      )}
                      {item.effect && (
                        <div className="text-[10px] text-neutral-400">
                          <span className="text-neutral-500">Buff: </span>
                          <span className="text-amber-300">{item.effect}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-2.5 border-t border-neutral-800 bg-neutral-950/70 text-[11px] text-neutral-400">
          <span>Press M or Select on Gamepad to toggle C0D3X</span>
          <button
            onClick={onClose}
            className="px-3 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-sm text-xs transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
