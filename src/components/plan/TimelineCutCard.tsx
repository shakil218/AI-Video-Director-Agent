'use client';

import React from 'react';
import { RecommendedCut } from '@/types/videoAgent';
import { Scissors, Clock, PlayCircle, ArrowRight } from 'lucide-react';
import { parseTimecodeToSeconds } from '@/utils/formatTime';

interface TimelineCutCardProps {
  cut: RecommendedCut;
  index: number;
  onSeekToCut?: (seconds: number) => void;
}

export const TimelineCutCard: React.FC<TimelineCutCardProps> = ({
  cut,
  index,
  onSeekToCut,
}) => {
  const handleCardClick = () => {
    if (onSeekToCut) {
      const seconds =
        cut.secondsStart ??
        parseTimecodeToSeconds(String(cut.startTime ?? 0));
      onSeekToCut(seconds);
    }
  };

  return (
    <div
      onClick={handleCardClick}
      className="group relative rounded-xl bg-slate-950/80 border border-slate-800 p-3.5 hover:border-emerald-500/50 hover:bg-slate-900/90 transition-all duration-200 cursor-pointer shadow-md"
    >
      <div className="flex items-center justify-between gap-3 mb-2">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-mono text-xs font-bold">
            #{index + 1}
          </div>
          <span className="text-xs font-bold text-slate-200 group-hover:text-emerald-300 transition-colors">
            Cut Interval #{index + 1}
          </span>
        </div>

        {/* Duration Badge */}
        <div className="flex items-center gap-1 text-[11px] font-mono font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
          <Clock className="w-3 h-3 text-emerald-400" />
          <span>{cut.duration ?? '0s'}</span>
        </div>
      </div>

      {/* Timecodes */}
      <div className="flex items-center gap-2 mb-2 bg-slate-900/90 border border-slate-800/80 rounded-lg px-2.5 py-1.5 text-xs font-mono">
        <div className="flex items-center gap-1 text-emerald-400 font-semibold">
          <Scissors className="w-3.5 h-3.5" />
          <span>{cut.startTime}</span>
        </div>
        <ArrowRight className="w-3.5 h-3.5 text-slate-600" />
        <div className="flex items-center gap-1 text-slate-300 font-semibold">
          <span>{cut.endTime}</span>
        </div>

        <button
          type="button"
          className="ml-auto text-[10px] text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-sans font-medium opacity-80 group-hover:opacity-100 transition-opacity"
        >
          <PlayCircle className="w-3.5 h-3.5" />
          <span>Preview</span>
        </button>
      </div>

      {/* AI Reasoning */}
      <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
        <span className="text-slate-300 font-medium">AI Reason: </span>
        {cut.reason}
      </p>
    </div>
  );
};