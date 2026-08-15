'use client';

import React from 'react';
import { ChatMessage } from '@/types/videoAgent';
import { Bot, User, Sparkles, Clock } from 'lucide-react';

interface MessageItemProps {
  message: ChatMessage;
}

export const MessageItem: React.FC<MessageItemProps> = ({ message }) => {
  const isUser = message.sender === 'user';
  const isSystem = message.sender === 'system';

  if (isSystem) {
    return (
      <div className="flex justify-center my-2">
        <div className="text-[11px] font-mono text-slate-400 bg-slate-900/80 border border-slate-800 px-3 py-1 rounded-full shadow-inner">
          {message.text}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex items-start gap-3 my-3 transition-all duration-300 animate-fadeIn ${
        isUser ? 'flex-row-reverse' : 'flex-row'
      }`}
    >
      {/* Avatar */}
      <div
        className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md ${
          isUser
            ? 'bg-slate-800 border border-slate-700 text-slate-200'
            : 'bg-gradient-to-br from-emerald-500 to-teal-600 text-slate-950 shadow-emerald-500/20'
        }`}
      >
        {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
      </div>

      {/* Message Bubble */}
      <div
        className={`max-w-[85%] sm:max-w-[80%] rounded-2xl p-3.5 shadow-md ${
          isUser
            ? 'bg-emerald-600 text-slate-50 rounded-tr-none border border-emerald-500'
            : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-tl-none'
        }`}
      >
        <div className="flex items-center justify-between gap-4 mb-1">
          <span className={`text-[11px] font-semibold ${isUser ? 'text-emerald-100' : 'text-emerald-400 flex items-center gap-1'}`}>
            {!isUser && <Sparkles className="w-3 h-3 text-emerald-400" />}
            {isUser ? 'You (Video Editor)' : 'Gemini Video Director'}
          </span>
          <span className={`text-[10px] flex items-center gap-1 font-mono ${isUser ? 'text-emerald-200/80' : 'text-slate-500'}`}>
            <Clock className="w-3 h-3" />
            {message.timestamp}
          </span>
        </div>

        <p className="text-xs leading-relaxed whitespace-pre-wrap font-sans">
          {message.text}
        </p>

        {message.planSnapshot && (
          <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
            <span className="text-slate-400">Attached Edit Plan:</span>
            <span className="font-mono text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
              {message.planSnapshot.version}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
