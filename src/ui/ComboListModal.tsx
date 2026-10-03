/**
 * DREAM Engine — Combo List Screen
 * Strict conformance to combo_list.gd and Stage 1 prompt:
 * "a dark see-through three-column screen listing every combination the build
 * resolves, in plain words, with its defensive tag, marking stubs honestly."
 */

import React from 'react';
import { X, Shield, Zap, Sparkles, AlertCircle, Swords, Footprints, Keyboard } from 'lucide-react';
import {
  getAllComboRows,
  SECTION_MOVING,
  SECTION_FIGHTING,
  SECTION_OTHER,
  SECTION_NOT_YET,
  TAG_IFRAMES,
  TAG_GUARD,
  TAG_NONE,
  NOT_YET,
  ComboRow,
} from '../engine/combat/combo-list';

interface ComboListModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ComboListModal: React.FC<ComboListModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const allRows = getAllComboRows();

  const movingRows = allRows.filter((r) => r.section === SECTION_MOVING);
  const otherRows = allRows.filter((r) => r.section === SECTION_OTHER);
  const fightingRows = allRows.filter((r) => r.section === SECTION_FIGHTING);
  const stubRows = allRows.filter((r) => r.section === SECTION_NOT_YET);

  const renderTagBadge = (tag: string) => {
    switch (tag) {
      case TAG_IFRAMES:
        return (
          <span className="px-1.5 py-0.5 rounded text-[9px] font-mono uppercase tracking-wide bg-amber-500/20 text-amber-300 border border-amber-500/40">
            {tag}
          </span>
        );
      case TAG_GUARD:
        return (
          <span className="px-1.5 py-0.5 rounded text-[9px] font-mono uppercase tracking-wide bg-sky-500/20 text-sky-300 border border-sky-500/40">
            {tag}
          </span>
        );
      case NOT_YET:
        return (
          <span className="px-1.5 py-0.5 rounded text-[9px] font-mono uppercase tracking-wide bg-neutral-800 text-neutral-400 border border-neutral-700">
            {tag}
          </span>
        );
      case TAG_NONE:
      default:
        return (
          <span className="px-1.5 py-0.5 rounded text-[9px] font-mono uppercase tracking-wide bg-neutral-900/60 text-neutral-500">
            {tag}
          </span>
        );
    }
  };

  const renderRowCard = (row: ComboRow) => (
    <div
      key={row.id}
      className={`p-3 rounded-sm border transition ${
        row.stub
          ? 'bg-neutral-950/40 border-neutral-800/60 text-neutral-400'
          : 'bg-neutral-950/70 border-neutral-800 hover:border-neutral-700 text-neutral-200'
      }`}
    >
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <div>
          <span className="font-semibold text-xs text-neutral-100">{row.name}</span>
          <div className="text-[11px] font-mono text-emerald-400 mt-0.5">{row.keys}</div>
        </div>
        <div>{renderTagBadge(row.tag)}</div>
      </div>
      <p className="text-[11px] text-neutral-400 leading-relaxed">{row.sentence}</p>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 select-none">
      <div className="relative w-full max-w-6xl bg-neutral-900/90 border border-neutral-700/80 rounded-sm shadow-2xl overflow-hidden flex flex-col text-neutral-100 max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-950/80">
          <div className="flex items-center space-x-3">
            <div className="w-7 h-7 rounded-sm bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center">
              <Swords className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <h2 className="font-semibold text-sm tracking-wider uppercase text-neutral-100">
                Action Combat Combo Registry
              </h2>
              <p className="text-[10px] text-neutral-400">
                Grammar resolution, defensive window tags & stub status
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <span className="text-[11px] font-mono text-neutral-400 hidden sm:inline">
              Press <kbd className="px-1.5 py-0.5 bg-neutral-800 border border-neutral-700 rounded text-neutral-200">L</kbd> or <kbd className="px-1.5 py-0.5 bg-neutral-800 border border-neutral-700 rounded text-neutral-200">Esc</kbd> to close
            </span>
            <button
              onClick={onClose}
              className="p-1 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 rounded transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 3-Column Body */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 p-6 overflow-y-auto flex-1">
          {/* Column 1: Movement & Utility */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2 border-b border-neutral-800 pb-2">
              <Footprints className="w-4 h-4 text-neutral-400" />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-300">
                Movement & Systems
              </h3>
            </div>
            <div className="space-y-2.5">
              {movingRows.map(renderRowCard)}
              {otherRows.map(renderRowCard)}
            </div>
          </div>

          {/* Column 2: Fighting Moves (Working combat skills) */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2 border-b border-neutral-800 pb-2">
              <Shield className="w-4 h-4 text-emerald-400" />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-emerald-300">
                Fighting (Fully Active)
              </h3>
            </div>
            <div className="space-y-2.5">
              {fightingRows.map(renderRowCard)}
            </div>
          </div>

          {/* Column 3: Not Yet in this Build (Honest stubs) */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2 border-b border-neutral-800 pb-2">
              <AlertCircle className="w-4 h-4 text-neutral-500" />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
                Not Yet In This Build
              </h3>
            </div>
            <div className="space-y-2.5">
              {stubRows.map(renderRowCard)}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-2.5 border-t border-neutral-800 bg-neutral-950/80 text-[11px] text-neutral-400">
          <span>Direction + Shift is movement. Shift + Direction + Action Key is Dash.</span>
          <button
            onClick={onClose}
            className="px-4 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-sm text-xs transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
