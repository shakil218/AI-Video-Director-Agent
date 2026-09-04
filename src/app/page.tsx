'use client';

import React, { useState, useEffect, useRef } from 'react';
import { TopHeader } from '@/components/header/TopHeader';
import { VideoIngestion } from '@/components/header/VideoIngestion';
import { ChatPanel } from '@/components/chat/ChatPanel';
import { EditPlanPanel } from '@/components/plan/EditPlanPanel';
import { ChatMessage, EditPlan } from '@/types/videoAgent';
import { generateSessionId } from '@/utils/formatTime';
import { uploadVideo, sendFeedback, approvePlan } from '@/services/api';
import { Sparkles, Info, CheckCircle2, AlertTriangle, ExternalLink } from 'lucide-react';

export default function VideoDirectorDashboard() {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string>('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentPlan, setCurrentPlan] = useState<EditPlan | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isMockMode, setIsMockMode] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);
  const [renderedVideoUrl, setRenderedVideoUrl] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    setSessionId(generateSessionId());
  }, []);

  const showToast = (text: string, type: 'success' | 'info' | 'error' = 'info') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4500);
  };

  const handleFileSelect = (file: File) => {
    setVideoFile(file);
    const localBlobUrl = URL.createObjectURL(file);
    setVideoUrl(localBlobUrl);
    showToast(`Loaded "${file.name}". Click "Analyze Video" to process.`, 'success');
  };

  const handleAnalyzeVideo = async () => {
    if (!videoFile) return;

    setIsProcessing(true);
    showToast('Uploading video to n8n pipeline...', 'info');

    try {
      const res = await uploadVideo(videoFile, sessionId, isMockMode);

      if (res.success) {
        if (res.videoUrl && res.videoUrl.startsWith('http')) {
          setVideoUrl(res.videoUrl);
        }

        if (res.plan) {
          setCurrentPlan(res.plan);
        }

        setMessages((prev) => [
          ...prev,
          {
            id: `msg_ai_${Date.now()}`,
            sender: 'ai',
            text: res.message,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            planSnapshot: res.plan,
          },
        ]);

        showToast('Video analyzed successfully!', 'success');
      } else {
        showToast('Failed to analyze video. Check n8n webhook connection.', 'error');
      }
    } catch (err) {
      console.error('Analyze Video Error:', err);
      showToast('Error communicating with n8n webhook.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSendFeedback = async (userText: string) => {
    if (!userText.trim()) return;

    const userMsgId = `msg_user_${Date.now()}`;
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    setMessages((prev) => [
      ...prev,
      {
        id: userMsgId,
        sender: 'user',
        text: userText,
        timestamp,
      },
    ]);

    setIsProcessing(true);

    try {
      const res = await sendFeedback(sessionId, userText, currentPlan, isMockMode);

      if (res.success) {
        if (res.plan) {
          setCurrentPlan(res.plan);
        }

        setMessages((prev) => [
          ...prev,
          {
            id: `msg_ai_${Date.now()}`,
            sender: 'ai',
            text: res.message,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            planSnapshot: res.plan,
          },
        ]);
        showToast('Feedback processed by AI agent!', 'success');
      } else {
        showToast('Unable to process revision.', 'error');
      }
    } catch (err) {
      console.error('Feedback Error:', err);
      showToast('Error communicating with n8n feedback webhook.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApproveAndRender = async () => {
    if (!currentPlan) return;

    setIsProcessing(true);
    showToast('Plan approved! Triggering Remotion render...', 'info');

    try {
      const res = await approvePlan(sessionId, currentPlan, isMockMode, videoUrl);

      if (res.success) {
        setCurrentPlan((prev) => (prev ? { ...prev, version: 'Approved' } : null));
        if (res.renderedVideoUrl) {
          setRenderedVideoUrl(res.renderedVideoUrl);
        }

        setMessages((prev) => [
          ...prev,
          {
            id: `msg_ai_approved_${Date.now()}`,
            sender: 'ai',
            text: res.message,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
        showToast('Video render completed!', 'success');
      } else {
        showToast('Approve signal failed to process.', 'error');
      }
    } catch (err) {
      console.error('Render Error:', err);
      showToast('Error connecting to approval webhook.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSeekToTimecode = (seconds: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = seconds;
      videoRef.current.play().catch(() => {});
      showToast(`Jumped to timecode ${seconds}s`, 'info');
    }
  };

  const handleResetSession = () => {
    setSessionId(generateSessionId());
    setVideoFile(null);
    setVideoUrl(null);
    setMessages([]);
    setCurrentPlan(null);
    setRenderedVideoUrl(null);
    showToast('Initialized new video editing session.', 'info');
  };

  const remotionStudioUrl = videoUrl && videoUrl.startsWith('http') && !videoUrl.includes('localhost') && !videoUrl.startsWith('blob:')
    ? `https://reel-engine-web-studio.vercel.app/MainReel?props=${encodeURIComponent(
        JSON.stringify({
          videoUrl,
          popups: currentPlan?.popups || [],
        })
      )}`
    : null;

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 selection:bg-emerald-500 selection:text-slate-950">
      <TopHeader
        isMockMode={isMockMode}
        onToggleMockMode={() => {
          setIsMockMode(!isMockMode);
          showToast(
            `Switched to ${!isMockMode ? 'Mock API mode' : 'n8n Live Webhook mode'}`,
            'info'
          );
        }}
        sessionId={sessionId}
        onResetSession={handleResetSession}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {toastMessage && (
          <div
            className={`flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl border text-xs font-semibold shadow-lg backdrop-blur-md transition-all animate-fadeIn ${
              toastMessage.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : toastMessage.type === 'error'
                ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                : 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300'
            }`}
          >
            <div className="flex items-center gap-2">
              {toastMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              ) : toastMessage.type === 'error' ? (
                <AlertTriangle className="w-4 h-4 text-rose-400" />
              ) : (
                <Info className="w-4 h-4 text-cyan-400" />
              )}
              <span>{toastMessage.text}</span>
            </div>
            <button
              onClick={() => setToastMessage(null)}
              className="text-slate-400 hover:text-slate-200 text-xs font-bold"
            >
              ✕
            </button>
          </div>
        )}

        {remotionStudioUrl && (
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
            <span className="text-xs text-slate-300 font-medium">
              Live Remotion Studio Sync Active
            </span>
            <a
              href={remotionStudioUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold hover:bg-emerald-500/20 transition-all"
            >
              Open Remotion Studio <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        )}

        <section>
          <VideoIngestion
            hasPlan={!!currentPlan}
            isProcessing={isProcessing}
            onAnalyzeVideo={handleAnalyzeVideo}
            onFileSelect={handleFileSelect}
            videoFile={videoFile}
            videoRef={videoRef}
            videoUrl={videoUrl}
          />
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-6 xl:col-span-6 h-full">
            <ChatPanel
              hasVideoLoaded={!!videoFile}
              isProcessing={isProcessing}
              messages={messages}
              onSendFeedback={handleSendFeedback}
            />
          </div>

          <div className="lg:col-span-6 xl:col-span-6 h-full">
            <EditPlanPanel
              isProcessing={isProcessing}
              onApproveAndRender={handleApproveAndRender}
              onSeekToTimecode={handleSeekToTimecode}
              plan={currentPlan}
              renderedVideoUrl={renderedVideoUrl}
            />
          </div>
        </section>
      </main>

      <footer className="w-full border-t border-slate-800/80 bg-slate-950 py-4 px-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="flex items-center gap-1.5 font-medium">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            AI Video Director Agent • Powered by Next.js, Tailwind CSS & n8n Automation
          </p>
          <span className="font-mono text-[11px] text-slate-600">
            Endpoint: {process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL || 'http://localhost:5678/webhook/video-agent'}
          </span>
        </div>
      </footer>
    </div>
  );
}