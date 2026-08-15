'use client';

import React, { useRef, useEffect } from 'react';
import { ChatMessage } from '@/types/videoAgent';
import { MessageItem } from './MessageItem';
import { FeedbackInput } from './FeedbackInput';
import { MessageSquare, Sparkles, Bot, ShieldAlert } from 'lucide-react';

interface ChatPanelProps {
  messages: ChatMessage[];
  onSendFeedback: (text: string) => void;
  isProcessing: boolean;
  hasVideoLoaded: boolean;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({
  messages,
  onSendFeedback,
  isProcessing,
  hasVideoLoaded,
}) => {
  const chatBottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isProcessing]);

  return (
    <div className="flex flex-col h-full bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl backdrop-blur-sm">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <MessageSquare className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              Gemini Video Director Chat
            </h2>
            <p className="text-[11px] text-slate-400 font-medium">
              Interactive video editing dialogue & revision requests
            </p>
          </div>
        </div>

        {/* Gemini Active Indicator */}
        <div className="flex items-center gap-1.5 bg-slate-950/80 border border-slate-800 px-2.5 py-1 rounded-full">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="text-[10px] font-mono text-emerald-400 font-medium">Agent Active</span>
        </div>
      </div>

      {/* Chat Messages Feed Container */}
      <div className="flex-1 overflow-y-auto pr-1 space-y-2 min-h-[320px] max-h-[480px] scrollbar-thin scrollbar-thumb-slate-800">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-12 text-center text-slate-500 space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-800/60 border border-slate-700 flex items-center justify-center text-slate-400">
              <Bot className="w-6 h-6 text-emerald-400" />
            </div>
            <div className="max-w-xs space-y-1">
              <p className="text-xs font-semibold text-slate-300">No Dialogue Yet</p>
              <p className="text-[11px] text-slate-500">
                Upload your source MP4 video above and click <span className="text-emerald-400 font-medium">"Analyze Video"</span> to start working with the Gemini Director Agent.
              </p>
            </div>
          </div>
        ) : (
          messages.map((msg) => <MessageItem key={msg.id} message={msg} />)
        )}

        {/* Animated Loading Spinner Pulse when Gemini is thinking */}
        {isProcessing && (
          <div className="flex items-center gap-3 my-3 p-3 rounded-xl bg-slate-950/70 border border-emerald-500/30 animate-pulse">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Sparkles className="w-4 h-4 animate-spin text-emerald-400" />
            </div>
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-emerald-400">Gemini Agent is synthesizing edit plan...</span>
              </div>
              <p className="text-[11px] text-slate-400">Updating timeline cut cards and generating B-roll prompts</p>
            </div>
          </div>
        )}

        <div ref={chatBottomRef} />
      </div>

      {/* Input Box at Bottom */}
      <div className="pt-3 border-t border-slate-800/80 mt-3">
        <FeedbackInput
          onSendFeedback={onSendFeedback}
          isProcessing={isProcessing}
          disabled={!hasVideoLoaded}
        />
      </div>
    </div>
  );
};
