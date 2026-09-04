'use client';

import React, { useState, useEffect } from 'react';
import { EditPlan } from '@/types/videoAgent';
import { TimelineCutCard } from './TimelineCutCard';
import { BRollPromptCard } from './BRollPromptCard';
import PopupCard from './PopupCard';
import { Badge } from '@/components/ui/Badge';
import { Sliders, Scissors, Image as ImageIcon, CheckCircle2, Play, Sparkles, FileText, Check, Download, Layers } from 'lucide-react';

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
  const [activeTab, setActiveTab] = useState<'all' | 'cuts' | 'broll' | 'popups'>('all');
  const [popups, setPopups] = useState<any[]>([]);

  // Helper: Converts internal Docker or local file paths into playable HTTP URLs
  const getPlayableVideoUrl = (rawUrl?: string | null): string | null => {
    if (!rawUrl) return null;

    let cleanUrl = rawUrl.trim();

    // Direct HTTP/HTTPS link is ready to stream
    if (cleanUrl.startsWith('http://') || cleanUrl.startsWith('https://')) {
      return cleanUrl;
    }

    // Extract filename from Docker container paths (/home/node/.n8n-files/renders/filename.mp4) or Windows paths
    const filename = cleanUrl.split(/[/\\]/).pop();
    if (filename) {
      return `http://localhost:5000/media/${filename}`;
    }

    return cleanUrl;
  };

  const playableUrl = getPlayableVideoUrl(renderedVideoUrl);

  // Safely extract active plan payload regardless of n8n nesting structure
  const getUnwrappedPlan = (rawPlan: any): any => {
    if (!rawPlan) return null;
    if (rawPlan.output) return getUnwrappedPlan(rawPlan.output);
    if (rawPlan.edit_plan) return getUnwrappedPlan(rawPlan.edit_plan);
    if (rawPlan.data) return getUnwrappedPlan(rawPlan.data);
    if (rawPlan.json) return getUnwrappedPlan(rawPlan.json);
    return rawPlan;
  };

  const unwrappedPlan = getUnwrappedPlan(plan);

  // Safely resolve arrays across different JSON key formats
  const cuts: any[] =
    unwrappedPlan?.recommended_cuts ||
    unwrappedPlan?.cuts ||
    unwrappedPlan?.timeline_cuts ||
    unwrappedPlan?.recommendedCuts ||
    [];

  const brolls: any[] =
    unwrappedPlan?.b_roll_suggestions ||
    unwrappedPlan?.b_roll ||
    unwrappedPlan?.broll ||
    unwrappedPlan?.bRollSuggestions ||
    [];

  // Sync popups state safely with multi-key support
  useEffect(() => {
    const extractedPopups =
      unwrappedPlan?.popups ||
      unwrappedPlan?.matched_popups ||
      unwrappedPlan?.props ||
      unwrappedPlan?.overlays ||
      unwrappedPlan?.matchedPopups ||
      [];
    setPopups(extractedPopups);
  }, [plan]);

  const getStatusBadgeVariant = (version: string) => {
    if (!version) return 'cyan';
    if (version === 'Approved') return 'emerald';
    if (version.includes('Revised')) return 'amber';
    return 'cyan';
  };

  const totalItems = cuts.length + brolls.length + popups.length;

  const handleUpdatePopup = (updatedPopup: any, index: number) => {
    const updatedList = [...popups];
    updatedList[index] = updatedPopup;
    setPopups(updatedList);

    // Mutate back into unwrappedPlan & plan reference
    if (unwrappedPlan) {
      if (unwrappedPlan.popups) unwrappedPlan.popups[index] = updatedPopup;
      if (unwrappedPlan.matched_popups) unwrappedPlan.matched_popups[index] = updatedPopup;
      if (unwrappedPlan.props) unwrappedPlan.props[index] = updatedPopup;
    }
  };

  const planVersion = plan?.version || unwrappedPlan?.version || 'v1.0';
  const planSummary =
    plan?.summary ||
    unwrappedPlan?.summary ||
    unwrappedPlan?.message ||
    'Edited props overlay rendered successfully.';

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
              Gemini recommended timeline cuts, B-Roll & visual popups
            </p>
          </div>
        </div>

        {/* Plan Status Badge */}
        {plan ? (
          <Badge variant={getStatusBadgeVariant(planVersion)} pulse={planVersion !== 'Approved'}>
            {planVersion}
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
              After video upload & analysis, Gemini will generate timeline cut cards, visual B-roll prompts, and popup overlays here.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col min-h-80 max-h-125">
          {/* Executive Summary */}
          <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3 mb-3 text-xs text-slate-300 space-y-1">
            <div className="flex items-center justify-between text-[11px] font-semibold text-emerald-400">
              <span className="flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-emerald-400" />
                Executive Plan Summary
              </span>
              <span className="font-mono text-slate-500 text-[10px]">{planVersion}</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
              {planSummary}
            </p>
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-1 mb-3 bg-slate-950/80 p-1 rounded-xl border border-slate-800/80">
            <button
              onClick={() => setActiveTab('all')}
              className={`flex-1 py-1 px-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'all'
                  ? 'bg-emerald-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All ({totalItems})
            </button>
            <button
              onClick={() => setActiveTab('cuts')}
              className={`flex-1 py-1 px-2 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1 ${
                activeTab === 'cuts'
                  ? 'bg-emerald-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Scissors className="w-3 h-3" />
              Cuts ({cuts.length})
            </button>
            <button
              onClick={() => setActiveTab('broll')}
              className={`flex-1 py-1 px-2 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1 ${
                activeTab === 'broll'
                  ? 'bg-cyan-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ImageIcon className="w-3 h-3" />
              B-Roll ({brolls.length})
            </button>
            <button
              onClick={() => setActiveTab('popups')}
              className={`flex-1 py-1 px-2 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1 ${
                activeTab === 'popups'
                  ? 'bg-purple-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layers className="w-3 h-3" />
              Popups ({popups.length})
            </button>
          </div>

          {/* Scrollable Cards Feed */}
          <div className="flex-1 overflow-y-auto pr-1 space-y-3 scrollbar-thin scrollbar-thumb-slate-800">
            {/* Timeline Cuts Section */}
            {(activeTab === 'all' || activeTab === 'cuts') && cuts.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Scissors className="w-3.5 h-3.5 text-emerald-400" />
                  Timeline Cuts ({cuts.length})
                </h3>
                {cuts.map((cut: any, idx: number) => (
                  <TimelineCutCard
                    key={cut.id || idx}
                    cut={cut}
                    index={idx}
                    onSeekToCut={onSeekToTimecode}
                  />
                ))}
              </div>
            )}

            {/* B-Roll Prompts Section */}
            {(activeTab === 'all' || activeTab === 'broll') && brolls.length > 0 && (
              <div className="space-y-2 pt-2">
                <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-cyan-400" />
                  Visual B-Roll Prompts ({brolls.length})
                </h3>
                {brolls.map((suggestion: any, idx: number) => (
                  <BRollPromptCard
                    key={suggestion.id || idx}
                    suggestion={suggestion}
                    index={idx}
                    onSeekToTimecode={onSeekToTimecode}
                  />
                ))}
              </div>
            )}

            {/* Popup Props Section */}
            {(activeTab === 'all' || activeTab === 'popups') && popups.length > 0 && (
              <div className="space-y-2 pt-2">
                <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-purple-400" />
                  Popup Overlays & Props ({popups.length})
                </h3>
                {popups.map((popup: any, idx: number) => (
                  <PopupCard
                    key={idx}
                    propItem={popup}
                    index={idx}
                    onSeekToTimecode={onSeekToTimecode}
                    onUpdate={(updatedItem) => handleUpdatePopup(updatedItem, idx)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Rendered Video Notification & Player */}
      {playableUrl && (
        <div className="mt-3 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300 space-y-3 shadow-lg">
          <div className="flex items-center justify-between font-bold text-slate-100">
            <span className="flex items-center gap-1.5 text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
              Final Video Rendered Successfully!
            </span>
          </div>

          <div className="rounded-lg overflow-hidden border border-slate-800 bg-black">
            <video
              src={playableUrl}
              controls
              className="w-full max-h-55 object-contain"
            />
          </div>

          <div className="flex items-center justify-between gap-2 pt-1">
            <a
              href={playableUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 underline"
            >
              <Play className="w-3.5 h-3.5" />
              Open Video in New Tab
            </a>

            <a
              href={playableUrl}
              download="rendered_output.mp4"
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500 text-slate-950 hover:bg-emerald-400 font-bold text-[11px] transition-colors shadow-sm"
            >
              <Download className="w-3.5 h-3.5" />
              Download MP4
            </a>
          </div>
        </div>
      )}

      {/* Primary CTA Button */}
      <div className="pt-3 border-t border-slate-800/80 mt-3">
        <button
          onClick={onApproveAndRender}
          disabled={!plan || isProcessing || planVersion === 'Approved'}
          className={`w-full relative flex items-center justify-center gap-2 py-3 px-5 rounded-xl font-bold text-sm transition-all duration-300 shadow-xl ${
            !plan || isProcessing
              ? 'bg-slate-800 text-slate-500 border border-slate-700/50 cursor-not-allowed'
              : planVersion === 'Approved'
              ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/40 cursor-default'
              : 'bg-linear-to-r from-emerald-500 via-teal-500 to-emerald-400 text-slate-950 hover:brightness-110 shadow-emerald-500/25 active:scale-[0.99]'
          }`}
        >
          {isProcessing ? (
            <>
              <Sparkles className="w-4 h-4 animate-spin text-slate-950" />
              <span>Triggering FFmpeg Render in n8n...</span>
            </>
          ) : planVersion === 'Approved' ? (
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