'use client';

import React, { useState } from 'react';
import { Video, Sparkles, Copy, Check, Server, Zap, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';

interface TopHeaderProps {
  sessionId: string;
  isMockMode: boolean;
  onToggleMockMode: () => void;
  onResetSession: () => void;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  sessionId,
  isMockMode,
  onToggleMockMode,
  onResetSession,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopySession = () => {
    navigator.clipboard.writeText(sessionId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <header className="sticky top-0 z-30 w-full border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-md px-4 lg:px-8 py-3 transition-all shadow-lg shadow-black/40">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Left Branding */}
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 via-emerald-500 to-teal-400 p-0.5 shadow-lg shadow-emerald-500/20">
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
              <Video className="w-5 h-5 text-emerald-400" />
            </div>
            <Sparkles className="absolute -top-1 -right-1 w-4 h-4 text-emerald-300 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold tracking-tight text-slate-100 flex items-center gap-2">
                AI Video Director Agent
              </h1>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 uppercase tracking-wider">
                n8n + Gemini
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium">
              Autonomous Video Editing & Transcript Optimization Pipeline
            </p>
          </div>
        </div>

        {/* Right Controls & Session Badge */}
        <div className="flex items-center flex-wrap gap-2.5 sm:gap-3">
          {/* Active Session ID Badge */}
          <div className="flex items-center gap-1.5 bg-slate-900/90 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-300 shadow-inner">
            <span className="text-slate-500 font-medium hidden xs:inline">Session:</span>
            <code className="font-mono text-emerald-400 font-semibold">{sessionId}</code>
            <button
              onClick={handleCopySession}
              title="Copy Session ID"
              className="ml-1 text-slate-400 hover:text-emerald-400 transition-colors p-1 rounded hover:bg-slate-800"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* New Session Button */}
          <button
            onClick={onResetSession}
            title="Start New Session"
            className="flex items-center gap-1 text-xs font-medium text-slate-400 hover:text-slate-200 bg-slate-900 border border-slate-800 hover:border-slate-700 px-2.5 py-1 rounded-lg transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">New Session</span>
          </button>

          {/* n8n Webhook / Mock Mode Switch */}
          <button
            onClick={onToggleMockMode}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
              isMockMode
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20 shadow-amber-500/5'
                : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 shadow-emerald-500/10'
            }`}
          >
            {isMockMode ? (
              <>
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>Mock API</span>
              </>
            ) : (
              <>
                <Server className="w-3.5 h-3.5 text-emerald-400" />
                <span>n8n Webhook</span>
              </>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
