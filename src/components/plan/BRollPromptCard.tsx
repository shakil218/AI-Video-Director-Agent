'use client';

import React, { useState } from 'react';
import { BRollSuggestion } from '@/types/videoAgent';
import { Sparkles, Copy, Check, Image as ImageIcon } from 'lucide-react';
import { parseTimecodeToSeconds } from '@/utils/formatTime';

interface BRollPromptCardProps {
  suggestion: BRollSuggestion;
  index: number;
  onSeekToTimecode?: (seconds: number) => void;
}

export const BRollPromptCard: React.FC<BRollPromptCardProps> = ({
  suggestion,
  index,
  onSeekToTimecode,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopyPrompt = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(suggestion.prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCardClick = () => {
    if (onSeekToTimecode) {
      const seconds = suggestion.seconds ?? parseTimecodeToSeconds(suggestion.timecode);
      onSeekToTimecode(seconds);
    }
  };

  return (
    <div
      onClick={handleCardClick}
      className="group relative rounded-xl bg-slate-950/80 border border-slate-800 p-3.5 hover:border-cyan-500/50 hover:bg-slate-900/90 transition-all duration-200 cursor-pointer shadow-md"
    >
      <div className="flex items-center justify-between gap-3 mb-2">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 font-mono text-xs font-bold">
            <ImageIcon className="w-3.5 h-3.5" />
          </div>
          <span className="text-xs font-bold text-slate-200 group-hover:text-cyan-300 transition-colors">
            B-Roll Suggestion #{index + 1}
          </span>
        </div>

        <div className="flex items-center gap-1 text-[11px] font-mono font-semibold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
          <span>@{suggestion.timecode}</span>
        </div>
      </div>

      {/* Prompt Box */}
      <div className="relative bg-slate-900/90 border border-slate-800 rounded-lg p-2.5 mb-2 font-mono text-[11px] text-cyan-200 flex items-start justify-between gap-2">
        <span className="line-clamp-2 italic">"{suggestion.prompt}"</span>
        <button
          onClick={handleCopyPrompt}
          title="Copy AI Prompt"
          className="text-slate-400 hover:text-cyan-400 transition-colors p-1 rounded hover:bg-slate-800 flex-shrink-0"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-cyan-400" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
      </div>

      {suggestion.description && (
        <p className="text-[11px] text-slate-400 font-sans">
          <span className="text-slate-300 font-medium">Context: </span>
          {suggestion.description}
        </p>
      )}
    </div>
  );
};
