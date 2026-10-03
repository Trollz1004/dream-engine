/**
 * DREAM Engine — Action Combat HUD
 * Conformance to Stage 1 prompt:
 * - Prompt band under character shows at most two lines and no help block
 * - Stamina and cooldowns gate everything and hotbar shows cooldowns
 * - Target health bar for Hollow Sentinel (120 HP)
 */

import React from 'react';
import { CombatManager } from '../engine/combat/combat-manager';
import { Shield, Zap, Sparkles, Flame, Swords, Wind } from 'lucide-react';

interface CombatHudProps {
  combat: CombatManager;
}

export const CombatHud: React.FC<CombatHudProps> = ({ combat }) => {
  const sentinel = combat.sentinel;
  const isDown = sentinel.isDown();
  const isFiring = sentinel.isFiring();
  const isTelegraphing = sentinel.isTelegraphing();

  // Cooldowns
  const heavyCooldown = combat.heavy.cooldownLeft();
  const guardCooldown = combat.guard.cooldownLeft();
  const lungeCooldown = combat.lunge.cooldownLeft();
  const burstCooldown = combat.burst.cooldownLeft();
  const dashCooldown = combat.dash.cooldownLeft();

  // Sentinel status line
  let sentinelStatus = 'Idle (4.2s cycle)';
  let sentinelStatusColor = 'text-neutral-400';
  if (isDown) {
    sentinelStatus = 'DOWN • Re-assembling in 4.0s';
    sentinelStatusColor = 'text-amber-400 font-semibold animate-pulse';
  } else if (isFiring) {
    sentinelStatus = 'FOCUS BEAM FIRING (0.30s) • 26m lethal beam!';
    sentinelStatusColor = 'text-red-400 font-bold tracking-wide animate-pulse';
  } else if (isTelegraphing) {
    const p = Math.round(sentinel.telegraphProgress() * 100);
    sentinelStatus = `FOCUS BEAM WIND-UP (${p}%) • Aim Locked!`;
    sentinelStatusColor = 'text-amber-300 font-semibold';
  }

  const renderCooldownOverlay = (left: number, total: number) => {
    if (left <= 0) return null;
    const pct = Math.min(100, Math.round((left / total) * 100));
    return (
      <div className="absolute inset-0 bg-black/75 flex items-center justify-center rounded-sm">
        <span className="font-mono text-[10px] text-amber-300 font-bold">
          {left.toFixed(1)}s
        </span>
        <div
          className="absolute bottom-0 left-0 right-0 bg-amber-500/30"
          style={{ height: `${pct}%` }}
        />
      </div>
    );
  };

  return (
    <div className="pointer-events-none select-none">
      {/* 1. Top Center: Hollow Sentinel Target Health Bar */}
      <div className="absolute top-16 left-1/2 -translate-x-1/2 flex flex-col items-center z-10 w-80 sm:w-96">
        <div className="flex justify-between items-center w-full px-1 mb-1 text-xs">
          <span className="font-semibold tracking-wider uppercase text-neutral-200">
            Hollow Sentinel
          </span>
          <span className="font-mono text-neutral-400 text-[11px]">
            {Math.round(sentinel.health)} / 120 HP
          </span>
        </div>
        <div className="w-full h-2 bg-neutral-950/80 border border-neutral-700/80 rounded-sm overflow-hidden p-[1px]">
          <div
            className={`h-full transition-all duration-150 rounded-sm ${
              isDown ? 'bg-amber-600' : isFiring ? 'bg-red-500' : 'bg-red-600'
            }`}
            style={{ width: `${Math.max(0, (sentinel.health / 120) * 100)}%` }}
          />
        </div>
        <div className={`text-[10px] font-mono mt-1 ${sentinelStatusColor}`}>
          {sentinelStatus}
        </div>
      </div>

      {/* 2. Bottom Center: Prompt Band & Hotbar */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center z-20 w-full max-w-xl px-4">
        {/* Prompt Band (Strictly at most 2 lines, no help block) */}
        <div className="bg-neutral-900/85 backdrop-blur-md border border-neutral-700/60 px-5 py-2 rounded-sm shadow-xl text-center mb-3 min-w-[280px] max-w-md">
          {/* Line 1: Action / Combat Outcome Readout */}
          <div className="text-xs font-semibold tracking-wide text-neutral-100 uppercase">
            {combat.lastEventText === 'PERFECT DODGE' ? (
              <span className="text-amber-300 font-bold text-sm tracking-wider animate-pulse flex items-center justify-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-300" />
                PERFECT DODGE (i-Frame)
              </span>
            ) : (
              combat.lastEventText
            )}
          </div>
          {/* Line 2: Subtle Tactical Status */}
          <div className="text-[10px] font-mono text-neutral-400 mt-0.5">
            {combat.dash.isInvulnerable() ? (
              <span className="text-amber-300 font-bold">INVULNERABLE (Yellow Flash)</span>
            ) : combat.dash.isRecovery() ? (
              <span className="text-red-400 font-bold">RECOVERY OPEN (Red Flash)</span>
            ) : combat.guard.isActive() ? (
              <span className="text-sky-300 font-bold">GUARD ACTIVE (75% Absorption)</span>
            ) : (
              `Stamina: ${Math.round(combat.stamina)}/100 • HP: ${Math.round(combat.health)}/100`
            )}
          </div>
        </div>

        {/* Player Bars: Health & Stamina */}
        <div className="w-full max-w-sm mb-3 space-y-1">
          {/* Health Bar */}
          <div className="relative w-full h-2.5 bg-neutral-950/80 border border-neutral-800 rounded-sm overflow-hidden p-[1px]">
            <div
              className={`h-full transition-all duration-150 rounded-sm ${
                combat.hitFlashTime > 0 ? 'bg-white' : 'bg-emerald-500'
              }`}
              style={{ width: `${Math.max(0, (combat.health / 100) * 100)}%` }}
            />
          </div>
          {/* Stamina Bar */}
          <div className="relative w-full h-2 bg-neutral-950/80 border border-neutral-800 rounded-sm overflow-hidden p-[1px]">
            <div
              className="h-full bg-amber-400 transition-all duration-75 rounded-sm"
              style={{ width: `${Math.max(0, (combat.stamina / 100) * 100)}%` }}
            />
          </div>
        </div>

        {/* Hotbar Showing Cooldowns and Energy Gating */}
        <div className="flex items-center space-x-2">
          {/* LMB: Light Chain */}
          <div className="relative w-12 h-12 bg-neutral-900/90 border border-neutral-700/80 rounded-sm flex flex-col items-center justify-center shadow-lg">
            <span className="text-[11px] font-bold text-neutral-200">LMB</span>
            <span className="text-[8px] font-mono text-neutral-400">8 STAM</span>
            {combat.attack.isAttacking() && (
              <div className="absolute top-0 right-0 w-2 h-2 rounded-full bg-emerald-400 animate-pulse m-0.5" />
            )}
          </div>

          {/* RMB: Heavy Swing */}
          <div className="relative w-12 h-12 bg-neutral-900/90 border border-neutral-700/80 rounded-sm flex flex-col items-center justify-center shadow-lg overflow-hidden">
            <span className="text-[11px] font-bold text-neutral-200">RMB</span>
            <span className="text-[8px] font-mono text-neutral-400">18 STAM</span>
            {renderCooldownOverlay(heavyCooldown, 1.2)}
          </div>

          {/* Q: Guard */}
          <div className="relative w-12 h-12 bg-neutral-900/90 border border-neutral-700/80 rounded-sm flex flex-col items-center justify-center shadow-lg overflow-hidden">
            <span className="text-[11px] font-bold text-neutral-200">Q</span>
            <span className="text-[8px] font-mono text-neutral-400">GUARD</span>
            {renderCooldownOverlay(guardCooldown, 1.1)}
          </div>

          {/* W+F: Dream Lunge */}
          <div className="relative w-12 h-12 bg-neutral-900/90 border border-neutral-700/80 rounded-sm flex flex-col items-center justify-center shadow-lg overflow-hidden">
            <span className="text-[11px] font-bold text-neutral-200">W+F</span>
            <span className="text-[8px] font-mono text-neutral-400">LUNGE</span>
            {renderCooldownOverlay(lungeCooldown, 4.0)}
          </div>

          {/* R: Nightveil Burst */}
          <div className="relative w-12 h-12 bg-neutral-900/90 border border-neutral-700/80 rounded-sm flex flex-col items-center justify-center shadow-lg overflow-hidden">
            <span className="text-[11px] font-bold text-neutral-200">R</span>
            <span className="text-[8px] font-mono text-neutral-400">BURST</span>
            {renderCooldownOverlay(burstCooldown, 8.0)}
          </div>

          {/* Dash: Shift+Dir+Action */}
          <div className="relative w-12 h-12 bg-neutral-900/90 border border-neutral-700/80 rounded-sm flex flex-col items-center justify-center shadow-lg overflow-hidden">
            <span className="text-[10px] font-bold text-amber-300">DASH</span>
            <span className="text-[8px] font-mono text-neutral-400">i-FRAME</span>
            {renderCooldownOverlay(dashCooldown, 0.9)}
          </div>
        </div>
      </div>
    </div>
  );
};
