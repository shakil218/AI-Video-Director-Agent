'use client';

import React, { useState, useEffect } from 'react';
import { MatchedPopup } from '@/types/videoAgent';
import { Play, Edit3, Check, X, Clock } from 'lucide-react';

interface PopupCardProps {
  propItem: MatchedPopup;
  index: number;
  onSeekToTimecode?: (seconds: number) => void;
  onUpdate: (updatedItem: MatchedPopup) => void;
}

export const PopupCard: React.FC<PopupCardProps> = ({
  propItem,
  index,
  onSeekToTimecode,
  onUpdate,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editItem, setEditItem] = useState<MatchedPopup>({ ...propItem });

  useEffect(() => {
    setEditItem({ ...propItem });
  }, [propItem]);

  const nudgeTime = (field: 'start_time' | 'end_time', delta: number) => {
    setEditItem((prev) => {
      const currentVal = prev[field] ?? 0;
      const updated = Math.max(0, Math.round((currentVal + delta) * 100) / 100);

      if (field === 'start_time') {
        return {
          ...prev,
          start_time: updated,
          end_time: Math.max(prev.end_time || 0, Math.round((updated + 0.5) * 100) / 100),
        };
      } else {
        return {
          ...prev,
          end_time: Math.max(prev.start_time || 0, updated),
        };
      }
    });
  };

  const handleSave = () => {
    onUpdate(editItem);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditItem({ ...propItem });
    setIsEditing(false);
  };

  const startTime = propItem.start_time ?? 0;
  const endTime = propItem.end_time ?? 0;

  return (
    <div
      onDoubleClick={() => !isEditing && setIsEditing(true)}
      className={`p-3.5 rounded-xl border transition-all duration-200 ${
        isEditing
          ? 'bg-slate-950/90 border-purple-500/60 shadow-lg shadow-purple-950/30 ring-1 ring-purple-500/30'
          : 'bg-slate-950/50 border-slate-800/80 hover:border-slate-700 hover:bg-slate-950/80'
      }`}
    >
      {isEditing ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <span className="text-xs font-bold text-purple-400 flex items-center gap-1.5">
              <Edit3 className="w-3.5 h-3.5" />
              Editing Overlay #{index + 1}
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleCancel}
                className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition"
                title="Cancel"
              >
                <X className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="px-2.5 py-1 rounded-lg bg-purple-500 hover:bg-purple-400 text-slate-950 font-bold text-xs flex items-center gap-1 transition shadow-sm"
              >
                <Check className="w-3.5 h-3.5" />
                Save
              </button>
            </div>
          </div>

          {/* Text Inputs */}
          <div className="space-y-2">
            <div>
              <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                Headline
              </label>
              <input
                type="text"
                value={editItem.headline}
                onChange={(e) => setEditItem({ ...editItem, headline: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 font-medium focus:outline-none focus:border-purple-500"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                Subtext
              </label>
              <input
                type="text"
                value={editItem.subtext || ''}
                onChange={(e) => setEditItem({ ...editItem, subtext: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 font-medium focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>

          {/* Timing Nudge Controls (-1s, -0.1s, +0.1s, +1s) */}
          <div className="pt-2 border-t border-slate-800/80 space-y-2.5">
            {/* Start Time Control */}
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
                <Clock className="w-3 h-3 text-emerald-400" /> Start:
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => nudgeTime('start_time', -1.0)}
                  className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-red-400 rounded border border-slate-700 font-mono text-[10px] transition"
                  title="Shift earlier by 1s"
                >
                  -1s
                </button>
                <button
                  type="button"
                  onClick={() => nudgeTime('start_time', -0.1)}
                  className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-red-300 rounded border border-slate-700 font-mono text-[10px] transition"
                  title="Shift earlier by 0.1s"
                >
                  -0.1s
                </button>
                <input
                  type="number"
                  step="0.01"
                  min={0}
                  value={editItem.start_time ?? 0}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value) || 0;
                    nudgeTime('start_time', val - (editItem.start_time || 0));
                  }}
                  className="w-16 bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-center font-mono text-emerald-400 text-xs focus:outline-none focus:border-purple-500"
                />
                <button
                  type="button"
                  onClick={() => nudgeTime('start_time', 0.1)}
                  className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-emerald-300 rounded border border-slate-700 font-mono text-[10px] transition"
                  title="Shift later by 0.1s"
                >
                  +0.1s
                </button>
                <button
                  type="button"
                  onClick={() => nudgeTime('start_time', 1.0)}
                  className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-emerald-400 rounded border border-slate-700 font-mono text-[10px] transition"
                  title="Shift later by 1s"
                >
                  +1s
                </button>
              </div>
            </div>

            {/* End Time Control */}
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
                <Clock className="w-3 h-3 text-red-400" /> End:
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => nudgeTime('end_time', -1.0)}
                  className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-red-400 rounded border border-slate-700 font-mono text-[10px] transition"
                  title="Shift earlier by 1s"
                >
                  -1s
                </button>
                <button
                  type="button"
                  onClick={() => nudgeTime('end_time', -0.1)}
                  className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-red-300 rounded border border-slate-700 font-mono text-[10px] transition"
                  title="Shift earlier by 0.1s"
                >
                  -0.1s
                </button>
                <input
                  type="number"
                  step="0.01"
                  min={0}
                  value={editItem.end_time ?? 0}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value) || 0;
                    nudgeTime('end_time', val - (editItem.end_time || 0));
                  }}
                  className="w-16 bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-center font-mono text-red-400 text-xs focus:outline-none focus:border-purple-500"
                />
                <button
                  type="button"
                  onClick={() => nudgeTime('end_time', 0.1)}
                  className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-emerald-300 rounded border border-slate-700 font-mono text-[10px] transition"
                  title="Shift later by 0.1s"
                >
                  +0.1s
                </button>
                <button
                  type="button"
                  onClick={() => nudgeTime('end_time', 1.0)}
                  className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-emerald-400 rounded border border-slate-700 font-mono text-[10px] transition"
                  title="Shift later by 1s"
                >
                  +1s
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div>
          <div className="flex items-start justify-between gap-2">
            <div className="space-y-1 flex-1">
              <div className="flex items-center gap-2">
                <h4 className="text-xs font-bold text-slate-100">{propItem.headline}</h4>
                {propItem.position && (
                  <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono text-[10px]">
                    {propItem.position}
                  </span>
                )}
              </div>
              {propItem.subtext && (
                <p className="text-[11px] text-slate-400 font-medium">{propItem.subtext}</p>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onSeekToTimecode?.(startTime)}
                className="px-2 py-1 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-purple-400 hover:text-purple-300 font-mono text-[11px] flex items-center gap-1 transition"
              >
                <Play className="w-3 h-3 fill-purple-400" />
                <span>{startTime}s - {endTime}s</span>
              </button>
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="p-1 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition"
                title="Edit Overlay"
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          <p className="text-[10px] text-slate-600 italic mt-1.5">
            Double-click card to edit overlay text & adjust timings
          </p>
        </div>
      )}
    </div>
  );
};

export default PopupCard;