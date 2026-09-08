'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { VideoIngestion, EngineStatus } from '@/components/header/VideoIngestion';
import { 
  MessageSquare, ListVideo, Sparkles, RefreshCw, Radio, 
  CheckCircle2, Send, Clock, Film, Play, Loader2, Edit2, Save, X
} from 'lucide-react';

interface OverlayItem {
  id?: string;
  headline?: string;
  subtext?: string;
  position?: string;
  theme?: string;
  start_time?: number | string;
  end_time?: number | string;
  type?: 'cut' | 'broll' | 'popup';
}

interface ChatMessage {
  id: string;
  sender: 'bot' | 'user';
  time: string;
  text: string;
  badge?: string;
}

export default function Home() {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoDuration] = useState<string>('01:05');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [hasPlan, setHasPlan] = useState<boolean>(false);
  const [engineStatus, setEngineStatus] = useState<EngineStatus>('idle');
  const [sessionId, setSessionId] = useState<string>('');
  
  // Interactive UI States
  const [activeTab, setActiveTab] = useState<'all' | 'cuts' | 'broll' | 'popups'>('all');
  const [revisionInput, setRevisionInput] = useState<string>('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [overlays, setOverlays] = useState<OverlayItem[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editFormData, setEditFormData] = useState<OverlayItem>({});
  const [renderedVideoUrl, setRenderedVideoUrl] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    setSessionId(`session_${Date.now()}`);
  }, []);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const handleFileSelect = (file: File) => {
    if (videoUrl) {
      URL.revokeObjectURL(videoUrl);
    }
    setVideoFile(file);
    const url = URL.createObjectURL(file);
    setVideoUrl(url);
    setEngineStatus('ready' as EngineStatus);
  };

  const handleAnalyzeVideo = async () => {
    if (!videoFile) return;

    setIsProcessing(true);
    setEngineStatus('processing' as EngineStatus);

    try {
      const webhookUrl = process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL;
      if (!webhookUrl) throw new Error('N8N Webhook URL missing');

      const formData = new FormData();
      formData.append('file', videoFile);
      formData.append('sessionId', sessionId);
      formData.append('action', 'upload');

      const url = `${webhookUrl}${webhookUrl.includes('?') ? '&' : '?'}action=upload`;

      const response = await fetch(url, {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        const root = Array.isArray(data) ? data[0] : data;

        const rawOverlays: OverlayItem[] = 
          root?.props?.popups || 
          root?.popups || 
          root?.overlays || 
          root?.items || 
          [];

        const normalizedOverlays = rawOverlays.map((item, idx) => ({
          ...item,
          id: item.id || `overlay-${idx}-${Date.now()}`,
          type: item.type || 'popup'
        }));

        setOverlays(normalizedOverlays);
        setHasPlan(true);
        setEngineStatus('completed' as EngineStatus);

        const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        setChatMessages([
          {
            id: '1',
            sender: 'bot',
            time: now,
            text: `Analysis complete! Extracted ${normalizedOverlays.length} recommended overlay popups from transcript timing.`,
            badge: 'Plan V1'
          }
        ]);

        if (root?.renderedVideoUrl || root?.props?.videoUrl) {
          setRenderedVideoUrl(root.renderedVideoUrl || root.props.videoUrl);
        }
      }
    } catch (err) {
      console.error('Error analyzing video:', err);
      setEngineStatus('idle' as EngineStatus);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSendRevision = async (textToSend?: string) => {
    const query = textToSend || revisionInput;
    if (!query.trim() || isProcessing) return;

    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: 'user',
      time: now,
      text: query
    };

    setChatMessages((prev) => [...prev, userMsg]);
    setRevisionInput('');
    setIsProcessing(true);

    try {
      const webhookUrl = process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL;
      if (!webhookUrl) throw new Error('N8N Webhook URL missing');

      const formData = new FormData();
      formData.append('action', 'revision');
      formData.append('sessionId', sessionId);
      formData.append('prompt', query);
      formData.append('currentOverlays', JSON.stringify(overlays));

      const url = `${webhookUrl}${webhookUrl.includes('?') ? '&' : '?'}action=revision`;

      const response = await fetch(url, {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        const root = Array.isArray(data) ? data[0] : data;

        const rawOverlays: OverlayItem[] = 
          root?.props?.popups || 
          root?.popups || 
          root?.overlays || 
          root?.items || 
          [];

        if (rawOverlays.length > 0) {
          const normalizedOverlays = rawOverlays.map((item, idx) => ({
            ...item,
            id: item.id || `overlay-${idx}-${Date.now()}`,
            type: item.type || 'popup'
          }));
          setOverlays(normalizedOverlays);
        }

        const botMsg: ChatMessage = {
          id: (Date.now() + 1).toString(),
          sender: 'bot',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          text: root?.message || `Revision applied! Updated edit plan with ${rawOverlays.length} props.`,
          badge: 'Draft V2'
        };

        setChatMessages((prev) => [...prev, botMsg]);
      } else {
        throw new Error(`n8n webhook responded with status ${response.status}`);
      }
    } catch (err) {
      console.error('Error executing revision prompt:', err);
      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'bot',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        text: 'Failed to execute revision request. Ensure n8n workflow is active and accepting requests.',
        badge: 'Error'
      };
      setChatMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleNewSession = () => {
    if (videoUrl) {
      URL.revokeObjectURL(videoUrl);
    }
    setSessionId(`session_${Date.now()}`);
    setVideoFile(null);
    setVideoUrl(null);
    setHasPlan(false);
    setOverlays([]);
    setChatMessages([]);
    setRenderedVideoUrl(null);
    setEditingIndex(null);
    setEngineStatus('idle' as EngineStatus);
  };

  // Category counts
  const counts = useMemo(() => {
    return {
      all: overlays.length,
      cuts: overlays.filter((i) => i.type === 'cut').length,
      broll: overlays.filter((i) => i.type === 'broll').length,
      popups: overlays.filter((i) => i.type === 'popup' || !i.type).length,
    };
  }, [overlays]);

  // Tab Filtered Items
  const filteredOverlays = useMemo(() => {
    return overlays.filter((item: OverlayItem) => {
      if (activeTab === 'cuts') return item.type === 'cut';
      if (activeTab === 'broll') return item.type === 'broll';
      if (activeTab === 'popups') return item.type === 'popup' || !item.type;
      return true;
    });
  }, [overlays, activeTab]);

  // Editing Handlers
  const startEditing = (index: number, item: OverlayItem) => {
    setEditingIndex(index);
    setEditFormData({ ...item });
  };

  const cancelEditing = () => {
    setEditingIndex(null);
    setEditFormData({});
  };

  const saveEditing = (targetIndex: number) => {
    setOverlays((prev) => {
      const next = [...prev];
      next[targetIndex] = { ...editFormData };
      return next;
    });
    setEditingIndex(null);
    setEditFormData({});
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 lg:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Top Header */}
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
            <span className="font-mono text-xs text-emerald-400 bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              {sessionId || 'Initializing...'}
            </span>
            <button
              type="button"
              onClick={handleNewSession}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs text-slate-300 transition-colors"
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

        {/* Video Ingestion & Source Details */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
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
          </div>

          {/* Source Video Details Card */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 backdrop-blur-sm flex flex-col justify-between">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-800/80">
              <Film className="w-4 h-4 text-emerald-400" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300">Source Video Details</h2>
            </div>

            {videoFile ? (
              <div className="space-y-3 py-4 text-xs font-mono">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">File Name:</span>
                  <span className="text-slate-200 truncate max-w-45">{videoFile.name}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">File Size:</span>
                  <span className="text-slate-200">{formatFileSize(videoFile.size)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Duration:</span>
                  <span className="text-slate-200">{videoDuration}</span>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-4 text-slate-500 text-xs">
                <Film className="w-8 h-8 text-slate-700 mb-2" />
                <p>No video loaded</p>
              </div>
            )}

            <button
              type="button"
              onClick={handleAnalyzeVideo}
              disabled={!videoFile || isProcessing}
              className="w-full py-2.5 px-4 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 disabled:opacity-50 transition-colors cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              Re-Analyze Video Transcript
            </button>
          </div>
        </div>

        {/* Workspace Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Panel: Gemini Video Director Chat */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 flex flex-col h-130 justify-between backdrop-blur-sm">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-emerald-400" />
                <h2 className="text-sm font-semibold text-slate-200">Gemini Video Director Chat</h2>
              </div>
              <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-mono">
                Agent Active
              </span>
            </div>

            {/* Chat Stream Area */}
            <div className="flex-1 overflow-y-auto my-3 pr-2 space-y-3">
              {!hasPlan && chatMessages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500 space-y-2">
                  <Sparkles className="w-8 h-8 text-slate-700" />
                  <p className="text-xs font-medium text-slate-400">No Dialogue Yet</p>
                  <p className="text-[11px] max-w-xs text-slate-500">
                    Upload your source MP4 video above and click <strong className="text-emerald-400 font-normal">Analyze Video</strong> to start.
                  </p>
                </div>
              ) : (
                chatMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`p-3.5 rounded-xl border text-xs leading-relaxed space-y-1.5 ${
                      msg.sender === 'bot'
                        ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-200'
                        : 'bg-slate-800/80 border-slate-700 text-slate-200 ml-6'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[10px] opacity-75">
                      <span className="font-semibold flex items-center gap-1">
                        {msg.sender === 'bot' ? '✨ Gemini Video Director' : '👤 You'}
                      </span>
                      <span className="font-mono">{msg.time}</span>
                    </div>
                    <p className="whitespace-pre-wrap">{msg.text}</p>
                    {msg.badge && (
                      <span className="inline-block mt-1 text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        {msg.badge}
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Quick Revisions & Input Bar */}
            <div className="space-y-2 pt-2 border-t border-slate-800/80">
              <div className="flex items-center gap-2 overflow-x-auto pb-1 text-[10px]">
                <span className="text-slate-500 shrink-0 font-medium">Quick Revisions:</span>
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={() => handleSendRevision('Make cut #2 shorter by 3 seconds')}
                  className="px-2.5 py-1 rounded-lg bg-slate-800/90 hover:bg-slate-800 text-slate-300 border border-slate-700/80 shrink-0 transition-colors cursor-pointer disabled:opacity-50"
                >
                  Make cut #2 shorter by 3 seconds
                </button>
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={() => handleSendRevision('Add high-tech B-roll overlay at 00:15')}
                  className="px-2.5 py-1 rounded-lg bg-slate-800/90 hover:bg-slate-800 text-slate-300 border border-slate-700/80 shrink-0 transition-colors cursor-pointer disabled:opacity-50"
                >
                  Add high-tech B-roll overlay at 00:15
                </button>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={revisionInput}
                  disabled={isProcessing}
                  onChange={(e) => setRevisionInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendRevision()}
                  placeholder={isProcessing ? "n8n Processing Prompt..." : "Request an AI revision (e.g. 'Match 20 specific props')..."}
                  className="flex-1 bg-slate-950/80 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => handleSendRevision()}
                  disabled={isProcessing}
                  className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isProcessing ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5" />
                  )}
                  Send
                </button>
              </div>
            </div>
          </div>

          {/* Right Panel: Interactive Edit Plan Review */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 flex flex-col h-130 justify-between backdrop-blur-sm">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
              <div className="flex items-center gap-2">
                <ListVideo className="w-4 h-4 text-emerald-400" />
                <h2 className="text-sm font-semibold text-slate-200">Edit Plan Review</h2>
              </div>
              <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full font-mono">
                {hasPlan ? `Approved (${overlays.length} Props)` : 'Awaiting Ingestion'}
              </span>
            </div>

            {/* Filter Tabs */}
            {hasPlan && (
              <div className="flex items-center gap-1.5 py-2 text-xs font-mono border-b border-slate-800/60">
                {(['all', 'cuts', 'broll', 'popups'] as const).map((tab) => (
                  <button
                    type="button"
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-3 py-1 rounded-lg border transition-all text-[11px] capitalize cursor-pointer ${
                      activeTab === tab
                        ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-bold'
                        : 'bg-slate-950/60 text-slate-400 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    {tab === 'all' && `All (${counts.all})`}
                    {tab === 'cuts' && `Cuts (${counts.cuts})`}
                    {tab === 'broll' && `Broll (${counts.broll})`}
                    {tab === 'popups' && `Popups (${counts.popups})`}
                  </button>
                ))}
              </div>
            )}

            {/* Structured Card Items Container */}
            <div className="flex-1 overflow-y-auto my-3 pr-2 space-y-2.5">
              {!hasPlan ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500 space-y-2">
                  <ListVideo className="w-8 h-8 text-slate-700" />
                  <p className="text-xs font-medium text-slate-400">No Plan Generated</p>
                  <p className="text-[11px] max-w-xs text-slate-500">
                    Once video analysis completes, your structured cut list, popups, and visual recommendations will appear here.
                  </p>
                </div>
              ) : filteredOverlays.length === 0 ? (
                <div className="h-full flex items-center justify-center text-slate-500 text-xs">
                  No items found for this filter tab.
                </div>
              ) : (
                filteredOverlays.map((item: OverlayItem, index: number) => {
                  const isEditing = editingIndex === index;

                  if (isEditing) {
                    return (
                      <div
                        key={item.id || index}
                        className="p-3.5 rounded-xl bg-slate-950 border border-emerald-500/50 space-y-2 text-xs"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-emerald-400 text-[11px]">Editing Overlay #{index + 1}</span>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => saveEditing(index)}
                              className="p-1 rounded bg-emerald-500 text-slate-950 hover:bg-emerald-400 font-bold"
                            >
                              <Save className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={cancelEditing}
                              className="p-1 rounded bg-slate-800 text-slate-300 hover:bg-slate-700"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="text"
                            value={editFormData.headline || ''}
                            onChange={(e) => setEditFormData({ ...editFormData, headline: e.target.value })}
                            placeholder="Headline"
                            className="bg-slate-900 border border-slate-700 rounded p-1.5 text-xs text-white"
                          />
                          <input
                            type="text"
                            value={editFormData.subtext || ''}
                            onChange={(e) => setEditFormData({ ...editFormData, subtext: e.target.value })}
                            placeholder="Subtext"
                            className="bg-slate-900 border border-slate-700 rounded p-1.5 text-xs text-white"
                          />
                        </div>

                        <div className="grid grid-cols-4 gap-2 text-[10px]">
                          <input
                            type="text"
                            value={editFormData.position || ''}
                            onChange={(e) => setEditFormData({ ...editFormData, position: e.target.value })}
                            placeholder="Position (e.g. top-right)"
                            className="bg-slate-900 border border-slate-700 rounded p-1 text-white"
                          />
                          <input
                            type="text"
                            value={editFormData.theme || ''}
                            onChange={(e) => setEditFormData({ ...editFormData, theme: e.target.value })}
                            placeholder="Theme (e.g. bold_clean)"
                            className="bg-slate-900 border border-slate-700 rounded p-1 text-white"
                          />
                          <input
                            type="text"
                            value={editFormData.start_time ?? ''}
                            onChange={(e) => setEditFormData({ ...editFormData, start_time: e.target.value })}
                            placeholder="Start Time (s)"
                            className="bg-slate-900 border border-slate-700 rounded p-1 text-white"
                          />
                          <input
                            type="text"
                            value={editFormData.end_time ?? ''}
                            onChange={(e) => setEditFormData({ ...editFormData, end_time: e.target.value })}
                            placeholder="End Time (s)"
                            className="bg-slate-900 border border-slate-700 rounded p-1 text-white"
                          />
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={item.id || index}
                      className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/90 hover:border-emerald-500/30 transition-all flex items-start justify-between gap-3 group"
                    >
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-xs text-slate-100 uppercase tracking-wide">
                            {item.headline || 'OVERLAY PROMPT'}
                          </span>
                          {item.position && (
                            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                              {item.position}
                            </span>
                          )}
                          {item.theme && (
                            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800/60">
                              {item.theme}
                            </span>
                          )}
                        </div>
                        {item.subtext && (
                          <p className="text-[11px] text-slate-400 leading-snug">
                            {item.subtext}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-mono text-[10px] text-emerald-400 bg-emerald-950/50 border border-emerald-800/50 px-2 py-0.5 rounded-md flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {item.start_time ?? '0'}s - {item.end_time ?? '0'}s
                        </span>
                        <button
                          type="button"
                          onClick={() => startEditing(index, item)}
                          className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all cursor-pointer"
                          title="Edit Card"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Rendered Video Footer Box */}
            {renderedVideoUrl && (
              <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/30 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-emerald-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Final Video Rendered Successfully!</span>
                </div>
                <a
                  href={renderedVideoUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1 rounded-lg bg-emerald-500 text-slate-950 font-bold text-xs flex items-center gap-1 hover:bg-emerald-400 transition-colors"
                >
                  <Play className="w-3 h-3 fill-slate-950" />
                  Watch
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}