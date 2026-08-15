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
          <Wand2 className="w-3 h-3 text-emerald-400" />
          Quick Revisions:
        </span>
        {QUICK_SUGGESTIONS.map((suggestion, idx) => (
          <button
            key={idx}
            type="button"
            disabled={disabled || isProcessing}
            onClick={() => handleSuggestionClick(suggestion)}
            className="text-[11px] whitespace-nowrap px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 text-slate-300 hover:text-emerald-400 hover:border-emerald-500/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {suggestion}
          </button>
        ))}
      </div>

      {/* Main Textarea Form */}
      <form onSubmit={handleSubmit} className="relative w-full">
        <div className="relative rounded-2xl border border-slate-800 bg-slate-950/80 shadow-lg focus-within:border-emerald-500/60 focus-within:ring-1 focus-within:ring-emerald-500/30 transition-all">
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
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-xl font-bold text-xs transition-all shadow-md ${
                !text.trim() || isProcessing || disabled
                  ? 'bg-slate-800 text-slate-500 border border-slate-700/50 cursor-not-allowed'
                  : 'bg-emerald-500 text-slate-950 hover:bg-emerald-400 shadow-emerald-500/20 active:scale-95'
              }`}
            >
              {isProcessing ? (
                <>
                  <Sparkles className="w-3.5 h-3.5 animate-spin" />
                  <span>Updating Plan...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Send Revision</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
