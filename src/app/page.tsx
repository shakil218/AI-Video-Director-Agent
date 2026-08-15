'use client';

import React, { useState, useEffect, useRef } from 'react';
import { TopHeader } from '@/components/header/TopHeader';
import { VideoIngestion } from '@/components/header/VideoIngestion';
import { ChatPanel } from '@/components/chat/ChatPanel';
import { EditPlanPanel } from '@/components/plan/EditPlanPanel';
import { ChatMessage, EditPlan } from '@/types/videoAgent';
import { generateSessionId } from '@/utils/formatTime';
import { uploadVideo, sendFeedback, approvePlan } from '@/services/api';
import { Sparkles, Info, CheckCircle2, AlertTriangle } from 'lucide-react';

export default function VideoDirectorDashboard() {
  // Required React States
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string>('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentPlan, setCurrentPlan] = useState<EditPlan | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  
  // App & UX states
  const [isMockMode, setIsMockMode] = useState<boolean>(true);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);
  const [renderedVideoUrl, setRenderedVideoUrl] = useState<string | null>(null);

  // Video Ref for seek controls from cut card clicks
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Initialize session ID on client mount
  useEffect(() => {
    setSessionId(generateSessionId());
  }, []);

  // Cleanup Blob URL when file changes
  useEffect(() => {
    return () => {
      if (videoUrl) {
        URL.revokeObjectURL(videoUrl);
      }
    };
  }, [videoUrl]);

  // Show auto-expiring toast notifications
  const showToast = (text: string, type: 'success' | 'info' | 'error' = 'info') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4500);
  };

  // Handle local video file selection
  const handleFileSelect = (file: File) => {
    setVideoFile(file);
    if (videoUrl) {
      URL.revokeObjectURL(videoUrl);
    }
    const newUrl = URL.createObjectURL(file);
    setVideoUrl(newUrl);
    
    // Add system notification message in chat
    setMessages((prev) => [
      ...prev,
      {
        id: `msg_${Date.now()}`,
        sender: 'system',
        text: `Source video file "${file.name}" loaded into player. Click "Analyze Video" to extract audio transcript.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);

    showToast(`Loaded ${file.name}. Ready for AI video analysis.`, 'info');
  };

  // Trigger Action 1: "upload"
  const handleAnalyzeVideo = async () => {
    if (!videoFile) return;

    setIsProcessing(true);
    showToast('Uploading video and analyzing audio transcript...', 'info');

    try {
      const res = await uploadVideo(videoFile, sessionId, isMockMode);

      if (res.success && res.plan) {
        setCurrentPlan(res.plan);
        setMessages((prev) => [
          ...prev,
          {
            id: `msg_${Date.now()}`,
            sender: 'ai',
            text: res.message,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            planSnapshot: res.plan,
          },
        ]);
        showToast('Video analyzed! Edit plan draft generated.', 'success');
      } else {
        showToast('Failed to analyze video. Please check your connection.', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error sending upload request to n8n webhook.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // Trigger Action 2: "feedback"
  const handleSendFeedback = async (userText: string) => {
    if (!userText.trim()) return;

    const userMsgId = `msg_user_${Date.now()}`;
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // Append user message immediately to chat feed
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

      if (res.success && res.plan) {
        setCurrentPlan(res.plan);
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
        showToast(`Edit plan updated to ${res.plan.version}!`, 'success');
      } else {
        showToast('Unable to process revision.', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error communicating with n8n feedback webhook.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // Trigger Action 3: "approve"
  const handleApproveAndRender = async () => {
    if (!currentPlan) return;

    setIsProcessing(true);
    showToast('Plan approved! Triggering FFmpeg background video render in n8n...', 'info');

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
            text: `🎉 ${res.message}`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
        showToast('Video render completed successfully!', 'success');
      } else {
        showToast('Approve signal failed to process.', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error connecting to n8n approval webhook.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // Seek video preview player to specific timecode when clicking cut card
  const handleSeekToTimecode = (seconds: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = seconds;
      videoRef.current.play().catch(() => {});
      showToast(`Jumped to timecode ${seconds}s`, 'info');
    }
  };

  // Reset Session
  const handleResetSession = () => {
    setSessionId(generateSessionId());
    setVideoFile(null);
    if (videoUrl) {
      URL.revokeObjectURL(videoUrl);
      setVideoUrl(null);
    }
    setMessages([]);
    setCurrentPlan(null);
    setRenderedVideoUrl(null);
    showToast('Initialized new video editing session.', 'info');
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 selection:bg-emerald-500 selection:text-slate-950">
      {/* Top Header Bar */}
      <TopHeader
        sessionId={sessionId}
        isMockMode={isMockMode}
        onToggleMockMode={() => {
          setIsMockMode(!isMockMode);
          showToast(
            `Switched to ${!isMockMode ? 'Mock API mode' : 'n8n Webhook mode (http://localhost:5678/webhook/video-agent)'}`,
            'info'
          );
        }}
        onResetSession={handleResetSession}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Toast Notification Alert Banner */}
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

        {/* Section A: Top Bar / Video Ingestion Header */}
        <section>
          <VideoIngestion
            videoFile={videoFile}
            videoUrl={videoUrl}
            onFileSelect={handleFileSelect}
            onAnalyzeVideo={handleAnalyzeVideo}
            isProcessing={isProcessing}
            hasPlan={!!currentPlan}
            videoRef={videoRef}
          />
        </section>

        {/* 2-Column Grid Layout for Left & Right Panels */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Section B: Left Panel (Interactive Chat & Revisions) */}
          <div className="lg:col-span-6 xl:col-span-6 h-full">
            <ChatPanel
              messages={messages}
              onSendFeedback={handleSendFeedback}
              isProcessing={isProcessing}
              hasVideoLoaded={!!videoFile}
            />
          </div>

          {/* Section C: Right Panel (Edit Plan Review) */}
          <div className="lg:col-span-6 xl:col-span-6 h-full">
            <EditPlanPanel
              plan={currentPlan}
              onApproveAndRender={handleApproveAndRender}
              isProcessing={isProcessing}
              onSeekToTimecode={handleSeekToTimecode}
              renderedVideoUrl={renderedVideoUrl}
            />
          </div>
        </section>
      </main>

      {/* Sleek Footer */}
      <footer className="w-full border-t border-slate-800/80 bg-slate-950 py-4 px-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="flex items-center gap-1.5 font-medium">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            AI Video Director Agent • Powered by Next.js, Tailwind CSS & n8n Automation
          </p>
          <span className="font-mono text-[11px] text-slate-600">
            Endpoint: http://localhost:5678/webhook/video-agent
          </span>
        </div>
      </footer>
    </div>
  );
}
