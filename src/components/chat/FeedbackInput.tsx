'use client';

import React, { useState } from 'react';
import { Send, Sparkles, Wand2 } from 'lucide-react';

interface FeedbackInputProps {
  onSendFeedback: (text: string) => void;
  isProcessing: boolean;
  disabled: boolean;
}

const QUICK_SUGGESTIONS = [
  'Make cut #2 shorter by 3 seconds',
  'Add high-tech B-roll overlay at 00:15',
  'Keep the opening warm-up intro',
  'Remove all filler words (uh/um)',
];

export const FeedbackInput: React.FC<FeedbackInputProps> = ({
  onSendFeedback,
  isProcessing,
  disabled,
}) => {
  const [text, setText] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || isProcessing || disabled) return;
    onSendFeedback(text.trim());
    setText('');
  };

  const handleSuggestionClick = (suggestion: string) => {
    if (isProcessing || disabled) return;
    onSendFeedback(suggestion);
  };

  return (
    <div className="w-full flex flex-col gap-3">
      {/* Quick Prompt Pill Suggestions */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-slate-800">
        <span className="text-[11px] font-medium text-slate-500 flex items-center gap-1 whitespace-nowrap mr-1">
          <Wand2 className="w-3 h-3 text-purple-400" />
          Quick Revisions:
        </span>
        {QUICK_SUGGESTIONS.map((suggestion, idx) => (
          <button
            key={idx}
            type="button"
            disabled={disabled || isProcessing}
            onClick={() => handleSuggestionClick(suggestion)}
            className="text-[11px] whitespace-nowrap px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 text-slate-300 hover:text-purple-400 hover:border-purple-500/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {suggestion}
          </button>
        ))}
      </div>

      {/* Main Textarea Form */}
      <form onSubmit={handleSubmit} className="relative w-full">
        <div className="relative rounded-2xl border border-slate-800 bg-slate-950/80 shadow-lg focus-within:border-purple-500/60 focus-within:ring-1 focus-within:ring-purple-500/30 transition-all duration-300">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
            placeholder={
              disabled
                ? 'Upload and analyze a video first to request revisions...'
                : 'Request an AI revision (e.g. "Make cut #2 shorter", "Add B-roll to intro")...'
            }
            disabled={disabled || isProcessing}
            rows={3}
            className="w-full bg-transparent px-4 py-3 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none resize-none disabled:opacity-50"
          />

          <div className="flex items-center justify-between px-3 py-2 border-t border-slate-800/80 bg-slate-950/90 rounded-b-2xl">
            <span className="text-[10px] text-slate-500 font-mono">
              Press Enter to send revision
            </span>

            <button
              type="submit"
              disabled={!text.trim() || isProcessing || disabled}
              className={`relative group inline-flex items-center justify-center gap-2 rounded-xl px-5 py-1.5 text-xs font-bold transition-all duration-300 overflow-hidden border ${
                !text.trim() || isProcessing || disabled
                  ? 'bg-slate-800 text-slate-500 border-slate-700/50 cursor-not-allowed'
                  : 'text-white border-white/15 shadow-lg shadow-purple-950/50 hover:shadow-purple-500/30 active:scale-95 bg-linear-to-r from-purple-600 via-indigo-600 to-pink-600'
              }`}
            >
              {/* Shimmer overlay - ONLY show if the button is active */}
              {!(!text.trim() || isProcessing || disabled) && (
                <span className="absolute inset-0 bg-linear-to-r from-pink-600 via-purple-600 to-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              )}

              <span className="relative z-10 flex items-center gap-1.5">
                {isProcessing ? (
                  <>
                    <Sparkles className="w-3.5 h-3.5 animate-spin" />
                    <span>Updating Plan...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                    <span>Send Revision</span>
                  </>
                )}
              </span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};