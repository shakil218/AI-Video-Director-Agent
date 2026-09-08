'use client';

import React, { useState, useRef, useEffect } from 'react';
import { VideoIngestion, EngineStatus } from '@/components/header/VideoIngestion';
import { MessageSquare, ListVideo, Sparkles, RefreshCw, Radio } from 'lucide-react';

export default function Home() {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [hasPlan, setHasPlan] = useState<boolean>(false);
  const [engineStatus, setEngineStatus] = useState<EngineStatus>('idle');
  const [sessionId, setSessionId] = useState<string>('');

  // Declare video ref
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Generate session ID on client mount to prevent SSR hydration mismatch
  useEffect(() => {
    setSessionId(`session_${Date.now()}`);
  }, []);

  const handleFileSelect = async (file: File) => {
    setVideoFile(file);
    setVideoUrl(URL.createObjectURL(file));

    setEngineStatus('starting');
    try {
      const serverUrl = process.env.NEXT_PUBLIC_REMOTION_SERVER_URL;
      if (serverUrl) {
        await fetch(`${serverUrl}/health`);
      }
    } catch (error) {
      console.warn('Render engine warm-up ping failed:', error);
    } finally {
      setEngineStatus('ready');
    }
  };

  const handleAnalyzeVideo = async () => {
    if (!videoFile) return;

    setIsProcessing(true);
    try {
      const webhookUrl = process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL;
      if (!webhookUrl) {
        throw new Error('N8N Webhook URL is missing in environment variables.');
      }

      const formData = new FormData();
      formData.append('file', videoFile);
      formData.append('sessionId', sessionId);
      formData.append('action', 'upload'); // Explicit action parameter to prevent fallback node execution

      const response = await fetch(webhookUrl, {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        setHasPlan(true);
      }
    } catch (err) {
      console.error('Error analyzing video:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleNewSession = () => {
    setSessionId(`session_${Date.now()}`);
    setVideoFile(null);
    setVideoUrl(null);
    setHasPlan(false);
    setEngineStatus('idle');
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 lg:p-8 font-sans selection:bg-emerald-500 selection:text-slate-950">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                <Sparkles className="w-5 h-5" />
              </div>
              <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                AI Video Director Agent
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 uppercase">
                  N8N + GEMINI
                </span>
              </h1>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Autonomous Video Editing & Transcript Optimization Pipeline
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="font-mono text-xs text-emerald-400 bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800 flex items-center gap-2 min-w-36 justify-center">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              {sessionId || 'Initializing...'}
            </span>
            <button
              onClick={handleNewSession}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-medium text-slate-300 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              New Session
            </button>
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-950/40 border border-emerald-800/50 text-xs text-emerald-400 font-mono">
              <Radio className="w-3.5 h-3.5 animate-pulse" />
              n8n Webhook
            </span>
          </div>
        </header>

        {/* Video Ingestion Component */}
        <VideoIngestion
          videoFile={videoFile}
          videoUrl={videoUrl}
          onFileSelect={handleFileSelect}
          onAnalyzeVideo={handleAnalyzeVideo}
          isProcessing={isProcessing}
          hasPlan={hasPlan}
          videoRef={videoRef}
          engineStatus={engineStatus}
        />

        {/* Bottom Workspace Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Chat Panel */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 flex flex-col h-112 justify-between backdrop-blur-sm">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-emerald-400" />
                <h2 className="text-sm font-semibold text-slate-200">Gemini Video Director Chat</h2>
              </div>
              <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-mono">
                Agent Active
              </span>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-slate-500 space-y-2">
              <Sparkles className="w-8 h-8 text-slate-700" />
              <p className="text-xs font-medium text-slate-400">No Dialogue Yet</p>
              <p className="text-[11px] max-w-xs text-slate-500">
                Upload your source MP4 video above and click <strong className="text-emerald-400 font-normal">Analyze Video</strong> to start working with the Gemini Director Agent.
              </p>
            </div>
          </div>

          {/* Right: Edit Plan Review */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 flex flex-col h-112 justify-between backdrop-blur-sm">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
              <div className="flex items-center gap-2">
                <ListVideo className="w-4 h-4 text-emerald-400" />
                <h2 className="text-sm font-semibold text-slate-200">Edit Plan Review</h2>
              </div>
              <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full font-mono">
                {hasPlan ? 'Plan Ready' : 'Awaiting Ingestion'}
              </span>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-slate-500 space-y-2">
              <ListVideo className="w-8 h-8 text-slate-700" />
              <p className="text-xs font-medium text-slate-400">No Plan Generated</p>
              <p className="text-[11px] max-w-xs text-slate-500">
                Once the video analysis completes, your structured cut list, popups, and visual recommendations will appear here.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}