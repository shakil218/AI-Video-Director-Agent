'use client';

import React, { useState } from 'react';
import { EditPlan } from '@/types/videoAgent';
import { TimelineCutCard } from './TimelineCutCard';
import { BRollPromptCard } from './BRollPromptCard';
import { Badge } from '@/components/ui/Badge';
import { Sliders, Scissors, Image as ImageIcon, CheckCircle2, Play, Sparkles, FileText, Check, Download } from 'lucide-react';

interface EditPlanPanelProps {
  plan: EditPlan | null;
  onApproveAndRender: () => void;
  isProcessing: boolean;
  onSeekToTimecode?: (seconds: number) => void;
  renderedVideoUrl?: string | null;
}

export const EditPlanPanel: React.FC<EditPlanPanelProps> = ({
  plan,
  onApproveAndRender,
  isProcessing,
  onSeekToTimecode,
  renderedVideoUrl,
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'cuts' | 'broll'>('all');

  const getStatusBadgeVariant = (version: string) => {
    if (version === 'Approved') return 'emerald';
    if (version.includes('Revised')) return 'amber';
    return 'cyan';
  };

  return (
    <div className="flex flex-col h-full bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl backdrop-blur-sm">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Sliders className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              Edit Plan Review
            </h2>
            <p className="text-[11px] text-slate-400 font-medium">
              Gemini recommended timeline cuts & B-Roll prompts
            </p>
          </div>
        </div>

        {/* Plan Status Badge */}
        {plan ? (
          <Badge variant={getStatusBadgeVariant(plan.version)} pulse={plan.version !== 'Approved'}>
            {plan.version}
          </Badge>
        ) : (
          <Badge variant="slate">Awaiting Video</Badge>
        )}
      </div>

      {/* Main Content Area */}
      {!plan ? (
        <div className="flex-1 flex flex-col items-center justify-center py-16 text-center text-slate-500 space-y-3">
          <div className="w-12 h-12 rounded-full bg-slate-800/60 border border-slate-700 flex items-center justify-center text-slate-400">
            <FileText className="w-6 h-6 text-slate-500" />
          </div>
          <div className="max-w-xs space-y-1">
            <p className="text-xs font-semibold text-slate-300">No Active Edit Plan</p>
            <p className="text-[11px] text-slate-500">
              After video upload & analysis, Gemini will generate timeline cut cards and visual B-roll prompts here.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col min-h-[320px] max-h-[500px]">
          {/* Executive Summary */}
          <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3 mb-3 text-xs text-slate-300 space-y-1">
            <div className="flex items-center justify-between text-[11px] font-semibold text-emerald-400">
              <span className="flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-emerald-400" />
                Executive Plan Summary
              </span>
              <span className="font-mono text-slate-500 text-[10px]">{plan.version}</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
              {plan.summary}
            </p>
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-1 mb-3 bg-slate-950/80 p-1 rounded-xl border border-slate-800/80">
            <button
              onClick={() => setActiveTab('all')}
              className={`flex-1 py-1 px-2.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'all'
                  ? 'bg-emerald-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All ({plan.recommended_cuts.length + plan.b_roll_suggestions.length})
            </button>
            <button
              onClick={() => setActiveTab('cuts')}
              className={`flex-1 py-1 px-2.5 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'cuts'
                  ? 'bg-emerald-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Scissors className="w-3 h-3" />
              Cuts ({plan.recommended_cuts.length})
            </button>
            <button
              onClick={() => setActiveTab('broll')}
              className={`flex-1 py-1 px-2.5 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'broll'
                  ? 'bg-cyan-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ImageIcon className="w-3 h-3" />
              B-Roll ({plan.b_roll_suggestions.length})
            </button>
          </div>

          {/* Scrollable Cards Feed */}
          <div className="flex-1 overflow-y-auto pr-1 space-y-3 scrollbar-thin scrollbar-thumb-slate-800">
            {(activeTab === 'all' || activeTab === 'cuts') && (
              <div className="space-y-2">
                <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Scissors className="w-3.5 h-3.5 text-emerald-400" />
                  Timeline Cuts ({plan.recommended_cuts.length})
                </h3>
                {plan.recommended_cuts.map((cut, idx) => (
                  <TimelineCutCard
                    key={cut.id || idx}
                    cut={cut}
                    index={idx}
                    onSeekToCut={onSeekToTimecode}
                  />
                ))}
              </div>
            )}

            {(activeTab === 'all' || activeTab === 'broll') && (
              <div className="space-y-2 pt-2">
                <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-cyan-400" />
                  Visual B-Roll Prompts ({plan.b_roll_suggestions.length})
                </h3>
                {plan.b_roll_suggestions.map((suggestion, idx) => (
                  <BRollPromptCard
                    key={suggestion.id || idx}
                    suggestion={suggestion}
                    index={idx}
                    onSeekToTimecode={onSeekToTimecode}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Rendered Video Modal Notification if approved */}
      {renderedVideoUrl && (
        <div className="mt-3 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300 space-y-3 shadow-lg">
          <div className="flex items-center justify-between font-bold text-slate-100">
            <span className="flex items-center gap-1.5 text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
              Final Video Rendered Successfully!
            </span>
          </div>

          {/* Embedded Output Video Player */}
          <div className="rounded-lg overflow-hidden border border-slate-800 bg-black">
            <video
              src={renderedVideoUrl}
              controls
              className="w-full max-h-[220px] object-contain"
            />
          </div>

          <div className="flex items-center justify-between gap-2 pt-1">
            <a
              href={renderedVideoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 underline"
            >
              <Play className="w-3.5 h-3.5" />
              Open Video in New Tab
            </a>

            <a
              href={renderedVideoUrl}
              download="rendered_output.mp4"
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500 text-slate-950 hover:bg-emerald-400 font-bold text-[11px] transition-colors shadow-sm"
            >
              <Download className="w-3.5 h-3.5" />
              Download MP4
            </a>
          </div>
        </div>
      )}

      {/* Primary CTA Button: Approve & Render Video */}
      <div className="pt-3 border-t border-slate-800/80 mt-3">
        <button
          onClick={onApproveAndRender}
          disabled={!plan || isProcessing || plan.version === 'Approved'}
          className={`w-full relative flex items-center justify-center gap-2 py-3 px-5 rounded-xl font-bold text-sm transition-all duration-300 shadow-xl ${
            !plan || isProcessing
              ? 'bg-slate-800 text-slate-500 border border-slate-700/50 cursor-not-allowed'
              : plan.version === 'Approved'
              ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/40 cursor-default'
              : 'bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-400 text-slate-950 hover:brightness-110 shadow-emerald-500/25 active:scale-[0.99]'
          }`}
        >
          {isProcessing ? (
            <>
              <Sparkles className="w-4 h-4 animate-spin text-slate-950" />
              <span>Triggering FFmpeg Render in n8n...</span>
            </>
          ) : plan?.version === 'Approved' ? (
            <>
              <Check className="w-4 h-4 text-emerald-400" />
              <span>Edit Plan Approved & Rendered</span>
            </>
          ) : (
            <>
              <CheckCircle2 className="w-4 h-4" />
              <span>Approve & Render Video (FFmpeg n8n)</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
