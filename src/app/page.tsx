'use client';

import React, { useState, useRef, useEffect, useMemo, useId } from 'react';
import { Player } from '@remotion/player';
import Composition, { PopupData } from '@/remotion/Composition';
import { HeroSection } from '@/components/ui/hero-section-dark';
import { VideoIngestion, EngineStatus } from '@/components/header/VideoIngestion';
import { 
  MessageSquare, ListVideo, Sparkles, RefreshCw, Radio, 
  CheckCircle2, Send, Clock, Loader2, Edit2, Save, X, Film, Download,
  Plus, Trash2, Copy, Check
} from 'lucide-react';

interface OverlayItem {
  id?: string;
  headline?: string;
  position?: string;
  theme?: string;
  highlightColor?: 'green' | 'red' | 'blue' | 'yellow' | string;
  highlightText?: string;
  fontFamily?: string;
  start_time?: number | string;
  end_time?: number | string;
  type?: 'cut' | 'broll' | 'popup';
}

const THEME_OPTIONS = [
  { value: 'bold_clean', label: 'Bold Clean' },
  { value: 'bangla_reel', label: 'Bangla Reel' },
];

const FONT_OPTIONS = [
  { value: 'Hind Siliguri', label: 'Hind Siliguri' },
  { value: 'Noto Sans Bengali', label: 'Noto Sans Bengali' },
  { value: 'Anek Bangla', label: 'Anek Bangla' },
];

const HIGHLIGHT_COLORS = [
  { value: 'green', label: 'Green', swatch: '#B7F000' },
  { value: 'red', label: 'Red', swatch: '#FF3B30' },
  { value: 'blue', label: 'Blue', swatch: '#28A9FF' },
  { value: 'yellow', label: 'Yellow', swatch: '#FFD60A' },
];

const DEFAULT_THEME = 'bangla_reel';
const DEFAULT_FONT_FAMILY = 'Hind Siliguri';
const DEFAULT_HIGHLIGHT_COLOR = 'green';

// Reel format (Instagram / TikTok style vertical video).
// These MUST match the Remotion <Composition> registered for the final render.
const REEL_WIDTH = 1080;
const REEL_HEIGHT = 1920;
const REEL_FPS = 30;
// Used only until the real video duration is known from the video metadata.
const FALLBACK_DURATION_IN_FRAMES = 1800;
// Max on-screen width of the phone-shaped preview frames (CSS px).
const PREVIEW_MAX_WIDTH_PX = 360;

const normalizeOverlayItem = (
  item: Partial<OverlayItem> | null | undefined,
  fallback?: Partial<OverlayItem>
): OverlayItem => {
  const source = item || {};
  const previous = fallback || {};

  return {
    id: source.id || previous.id,
    headline: typeof source.headline === 'string'
      ? source.headline
      : (previous.headline || ''),
    position: source.position || previous.position || 'center',
    theme: source.theme || previous.theme || DEFAULT_THEME,
    highlightColor:
      source.highlightColor ||
      previous.highlightColor ||
      DEFAULT_HIGHLIGHT_COLOR,
    highlightText:
      typeof source.highlightText === 'string'
        ? source.highlightText
        : (previous.highlightText || ''),
    fontFamily:
      source.fontFamily ||
      previous.fontFamily ||
      DEFAULT_FONT_FAMILY,
    start_time: source.start_time ?? previous.start_time ?? 0,
    end_time: source.end_time ?? previous.end_time ?? 5,
    type: source.type || previous.type || 'popup',
  };
};

interface ChatMessage {
  id: string;
  sender: 'bot' | 'user';
  time: string;
  text: string;
  badge?: string;
}

export default function Home() {
  const reactSessionId = useId();
  const idSequenceRef = useRef(0);
  const createStableId = (prefix: string) => {
    idSequenceRef.current += 1;
    return `${prefix}-${idSequenceRef.current}`;
  };

  const [showStudio, setShowStudio] = useState<boolean>(false);
  const studioRef = useRef<HTMLDivElement | null>(null);

  const openStudio = () => {
    setShowStudio(true);
    window.setTimeout(() => {
      studioRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  };

  const [videoFile, setVideoFile] = useState<File | null>(null);
  // videoUrl is the URL used by the preview/player. After upload it becomes
  // the permanent public R2/S3 URL returned by n8n.
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  // previewUrl is only a browser-local blob URL. It must NEVER be sent to n8n/Remotion.
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  // mediaUrl is the permanent server-renderable URL returned by the upload workflow.
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isRendering, setIsRendering] = useState<boolean>(false);
  const [hasPlan, setHasPlan] = useState<boolean>(false);
  const [engineStatus, setEngineStatus] = useState<EngineStatus>('idle');
  const [sessionId, setSessionId] = useState<string>(
    () => `session_${reactSessionId.replace(/:/g, '')}`
  );
  
  // Interactive UI States
  const [activeTab, setActiveTab] = useState<'all' | 'cuts' | 'broll' | 'popups'>('all');
  const [revisionInput, setRevisionInput] = useState<string>('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [overlays, setOverlays] = useState<OverlayItem[]>([]);
  // Keep a synchronous reference to the latest edit plan so actions such as
  // Render and Revision never read a stale React state value.
  const overlaysRef = useRef<OverlayItem[]>([]);

  const updateOverlays = (
    next: OverlayItem[] | ((prev: OverlayItem[]) => OverlayItem[])
  ) => {
    const resolved = typeof next === 'function'
      ? next(overlaysRef.current)
      : next;

    overlaysRef.current = resolved;
    setOverlays(resolved);
  };
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<OverlayItem>({});
  const [renderedVideoUrl, setRenderedVideoUrl] = useState<string | null>(null);
  const [renderProgress, setRenderProgress] = useState<number>(0);
  const [renderStatus, setRenderStatus] = useState<'idle' | 'rendering' | 'completed' | 'error'>('idle');

  // Active Time Tracking & Manual Overlay Creation States
  const [currentTime, setCurrentTime] = useState<number>(0);
  // Real duration (seconds) of the uploaded video, used to size the Player timeline.
  const [videoDuration, setVideoDuration] = useState<number>(0);
  const [isAddingNew, setIsAddingNew] = useState<boolean>(false);
  const [newFormData, setNewFormData] = useState<OverlayItem>({
    headline: '',
    position: 'center',
    theme: DEFAULT_THEME,
    highlightColor: DEFAULT_HIGHLIGHT_COLOR,
    highlightText: '',
    fontFamily: DEFAULT_FONT_FAMILY,
    start_time: 0,
    end_time: 5,
    type: 'popup'
  });
  const [copied, setCopied] = useState<boolean>(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const renderEngineUrl =
    process.env.NEXT_PUBLIC_RENDER_ENGINE_URL || 'http://localhost:5000';

  useEffect(() => {
    if (!isRendering || !sessionId) return;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const pollProgress = async () => {
      try {
        const response = await fetch(
          `${renderEngineUrl}/render-progress/${encodeURIComponent(sessionId)}`,
          { cache: 'no-store' }
        );

        if (response.ok) {
          const data = await response.json();
          const percent = Math.max(0, Math.min(100, Number(data?.progress) || 0));

          if (!cancelled) {
            setRenderProgress(percent);

            if (data?.status === 'completed') {
              setRenderStatus('completed');
              if (data?.mediaUrl) setRenderedVideoUrl(data.mediaUrl);
            } else if (data?.status === 'error') {
              setRenderStatus('error');
            } else {
              setRenderStatus('rendering');
            }
          }
        }
      } catch (error) {
        console.warn('[Render Progress] Poll failed:', error);
      }

      if (!cancelled) {
        timer = setTimeout(pollProgress, 1000);
      }
    };

    void pollProgress();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [isRendering, sessionId, renderEngineUrl]);

  // Video Time Update Listener for Sync & Highlight
  useEffect(() => {
    const videoEl = videoRef.current;
    if (!videoEl) return;

    const handleTimeUpdate = () => {
      setCurrentTime(videoEl.currentTime);
    };

    const handleMetadata = () => {
      if (Number.isFinite(videoEl.duration) && videoEl.duration > 0) {
        setVideoDuration(videoEl.duration);
      }
    };

    videoEl.addEventListener('timeupdate', handleTimeUpdate);
    videoEl.addEventListener('loadedmetadata', handleMetadata);
    videoEl.addEventListener('durationchange', handleMetadata);

    // Metadata may already be loaded before this effect attached its listeners.
    if (videoEl.readyState >= 1) handleMetadata();

    return () => {
      videoEl.removeEventListener('timeupdate', handleTimeUpdate);
      videoEl.removeEventListener('loadedmetadata', handleMetadata);
      videoEl.removeEventListener('durationchange', handleMetadata);
    };
  }, [videoUrl]);

  const handleFileSelect = (file: File) => {
    // Only revoke the browser-created preview URL.
    if (previewUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
    }

    const localPreviewUrl = URL.createObjectURL(file);

    setVideoFile(file);
    setPreviewUrl(localPreviewUrl);
    setMediaUrl(null);
    setVideoUrl(localPreviewUrl);
    setVideoDuration(0);
    setRenderedVideoUrl(null);
    setRenderProgress(0);
    setRenderStatus('idle');
    setEngineStatus('ready');
  };

  const handleAnalyzeVideo = async () => {
    if (!videoFile) return;

    setIsProcessing(true);

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

        const normalizedOverlays = rawOverlays.map((item, idx) =>
          normalizeOverlayItem(item, {
            id: createStableId(`overlay-${idx}`),
          })
        );

        updateOverlays(normalizedOverlays);
        setHasPlan(true);

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

        // IMPORTANT:
        // A browser blob: URL only exists inside the browser and cannot be rendered
        // by the n8n/Remotion server. Store the permanent public R2/S3 URL separately.
        const incomingVideoUrl =
          root?.mediaUrl ||
          root?.videoUrl ||
          root?.url ||
          root?.publicUrl ||
          root?.fileUrl ||
          root?.props?.mediaUrl ||
          root?.props?.videoUrl ||
          '';

        if (typeof incomingVideoUrl === 'string' && /^https?:\/\//i.test(incomingVideoUrl.trim())) {
          const permanentUrl = incomingVideoUrl.trim();
          setMediaUrl(permanentUrl);
          setVideoUrl(permanentUrl);
        } else {
          console.warn(
            'n8n upload completed but did not return a permanent HTTP/HTTPS mediaUrl. ' +
            'The browser preview will remain local and must not be used for rendering.'
          );
        }

        const incomingRenderedUrl = root?.renderedVideoUrl;
        if (incomingRenderedUrl) {
          setRenderedVideoUrl(incomingRenderedUrl);
        }
      }
    } catch (err) {
      console.error('Error analyzing video:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSendRevision = async (textToSend?: string) => {
    const query = textToSend || revisionInput;
    if (!query.trim() || isProcessing) return;

    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const userMsg: ChatMessage = {
      id: createStableId('message-user'),
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
      const revisionVideoUrl = mediaUrl || (videoUrl?.startsWith('http') ? videoUrl : '');
      if (revisionVideoUrl) {
        formData.append('videoUrl', revisionVideoUrl);
        formData.append('mediaUrl', revisionVideoUrl);
      }
      // Send the latest plan, not a potentially stale React state snapshot.
      formData.append('currentOverlays', JSON.stringify(overlaysRef.current));

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

        const previousOverlays = overlaysRef.current;
        const normalizedOverlays = rawOverlays.map((item, idx) =>
          normalizeOverlayItem(item, {
            ...(previousOverlays[idx] || {}),
            id: previousOverlays[idx]?.id || createStableId(`overlay-${idx}`),
          })
        );

        // A successful revision always becomes the new authoritative plan.
        // Do not keep the old plan merely because the response contains zero
        // overlays; replacing the state avoids rendering stale V1 data.
        updateOverlays(normalizedOverlays);
        setHasPlan(normalizedOverlays.length > 0);

        const botMsg: ChatMessage = {
          id: createStableId('message-bot'),
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
        id: createStableId('message-error'),
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

  const handleRenderVideo = async () => {
    const latestOverlays = overlaysRef.current;

    if (latestOverlays.length === 0 || isRendering) return;

    // Render MUST use the permanent uploaded media URL.
    // Never send a browser blob: URL to n8n/Remotion.
    const renderVideoUrl = mediaUrl || (videoUrl?.startsWith('http') ? videoUrl : null);

    if (!renderVideoUrl || !/^https?:\/\//i.test(renderVideoUrl)) {
      const message =
        'The uploaded video does not have a permanent public media URL yet. ' +
        'Please click Analyze Video first so n8n uploads the MP4 to R2/S3, then render again.';
      console.error(message);
      setChatMessages((prev) => [
        ...prev,
        {
          id: createStableId('message-render-error'),
          sender: 'bot',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          text: message,
          badge: 'Render Error'
        }
      ]);
      return;
    }

    setIsRendering(true);
    setRenderProgress(0);
    setRenderStatus('rendering');

    try {
      const webhookUrl = process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL;
      if (!webhookUrl) throw new Error('N8N Webhook URL missing');

      const formData = new FormData();
      formData.append('action', 'render');
      formData.append('sessionId', sessionId);
      formData.append('videoUrl', renderVideoUrl);
      formData.append('mediaUrl', renderVideoUrl);
      if (videoDuration > 0) {
        formData.append('durationInFrames', String(durationInFrames));
        formData.append('sourceDurationInSeconds', String(videoDuration));
      }
      console.log('[FRONTEND RENDER DIAGNOSTIC]', {
        count: latestOverlays.length,
        first: latestOverlays[0],
        last: latestOverlays[latestOverlays.length - 1],
      });

      formData.append('overlays', JSON.stringify(latestOverlays));

      const url = `${webhookUrl}${webhookUrl.includes('?') ? '&' : '?'}action=render`;

      const response = await fetch(url, {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        const root = Array.isArray(data) ? data[0] : data;

        const incomingUrl = root?.renderedVideoUrl || root?.props?.videoUrl || root?.videoUrl;
        if (incomingUrl) {
          setRenderedVideoUrl(incomingUrl);
        }

        setRenderProgress(100);
        setRenderStatus('completed');

        const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        setChatMessages((prev) => [
          ...prev,
          {
            id: createStableId('message-render-complete'),
            sender: 'bot',
            time: now,
            text: root?.message || 'Video rendering complete! You can watch or download the rendered output directly below.',
            badge: 'Render Complete'
          }
        ]);
      } else {
        throw new Error(`Render pipeline returned status ${response.status}`);
      }
    } catch (err) {
      console.error('Error triggering video render:', err);
      setRenderStatus('error');
    } finally {
      setIsRendering(false);
    }
  };

  const handleNewSession = () => {
    if (previewUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
    }
    setSessionId(createStableId('session'));
    setVideoFile(null);
    setPreviewUrl(null);
    setMediaUrl(null);
    setVideoUrl(null);
    setVideoDuration(0);
    setHasPlan(false);
    updateOverlays([]);
    setChatMessages([]);
    setRenderedVideoUrl(null);
    setRenderProgress(0);
    setRenderStatus('idle');
    setEditingId(null);
    setEngineStatus('idle');
    setIsAddingNew(false);
  };

  const counts = useMemo(() => {
    return {
      all: overlays.length,
      cuts: overlays.filter((i) => i.type === 'cut').length,
      broll: overlays.filter((i) => i.type === 'broll').length,
      popups: overlays.filter((i) => i.type === 'popup' || !i.type).length,
    };
  }, [overlays]);

  const filteredOverlays = useMemo(() => {
    return overlays.filter((item: OverlayItem) => {
      if (activeTab === 'cuts') return item.type === 'cut';
      if (activeTab === 'broll') return item.type === 'broll';
      if (activeTab === 'popups') return item.type === 'popup' || !item.type;
      return true;
    });
  }, [overlays, activeTab]);

  // Player timeline length follows the real uploaded video (falls back to 60s).
  const durationInFrames = useMemo(() => {
    if (videoDuration > 0) {
      return Math.max(1, Math.ceil(videoDuration * REEL_FPS));
    }
    return FALLBACK_DURATION_IN_FRAMES;
  }, [videoDuration]);

  // Props consumed by Composition.tsx. Theme / font / highlight color live on
  // each overlay item (theme, fontFamily, highlightColor), so they are already
  // included in `popups` and are not stripped here.
  const playerInputProps = useMemo(
    () => ({
      videoUrl: videoUrl ?? '',
      popups: overlays.map((item) => ({ ...item })) as unknown as PopupData[],
      durationInFrames,
      sourceDurationInSeconds: videoDuration > 0 ? videoDuration : undefined,
    }),
    [videoUrl, overlays, durationInFrames, videoDuration]
  );

  const startEditing = (item: OverlayItem) => {
    if (!item.id) return;
    setEditingId(item.id);
    setEditFormData({ ...item });
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditFormData({});
  };

  const saveEditing = (targetId: string) => {
    updateOverlays((prev) =>
      prev.map((item) =>
        item.id === targetId
          ? normalizeOverlayItem({ ...item, ...editFormData }, item)
          : item
      )
    );
    setEditingId(null);
    setEditFormData({});
  };

  const handleDeleteOverlay = (targetId: string) => {
    updateOverlays((prev) => prev.filter((item) => item.id !== targetId));
  };

  const handleAddNewOverlay = () => {
    const newItem = normalizeOverlayItem(
      {
        ...newFormData,
        id: createStableId('overlay-manual'),
        type: newFormData.type || 'popup',
      }
    );
    updateOverlays((prev) => [...prev, newItem]);
    setIsAddingNew(false);
    setNewFormData({
      headline: '',
      position: 'center',
      theme: DEFAULT_THEME,
      highlightColor: DEFAULT_HIGHLIGHT_COLOR,
      highlightText: '',
      fontFamily: DEFAULT_FONT_FAMILY,
      start_time: Math.floor(currentTime),
      end_time: Math.floor(currentTime) + 5,
      type: 'popup'
    });
    if (!hasPlan) setHasPlan(true);
  };

  const handleCopyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(overlays, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSeekToTime = (startTime?: number | string) => {
    if (!videoRef.current || startTime === undefined || startTime === null) return;

    const seconds = typeof startTime === 'string' ? parseFloat(startTime) : startTime;
    if (!isNaN(seconds)) {
      videoRef.current.currentTime = seconds;
      videoRef.current.play().catch((err) => console.error('Auto-play blocked or failed:', err));
    }
  };

  const isItemActive = (item: OverlayItem) => {
    if (item.start_time === undefined || item.end_time === undefined) return false;
    const start = typeof item.start_time === 'string' ? parseFloat(item.start_time) : item.start_time;
    const end = typeof item.end_time === 'string' ? parseFloat(item.end_time) : item.end_time;
    if (isNaN(start) || isNaN(end)) return false;
    return currentTime >= start && currentTime <= end;
  };

  return (
    <main className="min-h-screen bg-[#050507] text-white font-sans selection:bg-purple-500/30">
      {!showStudio ? (
        <div className="min-h-screen overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(124,58,237,0.18),transparent_34%),radial-gradient(circle_at_80%_20%,rgba(236,72,153,0.10),transparent_30%)] pointer-events-none" />

          <header className="relative z-30 mx-auto flex max-w-7xl items-center justify-between px-6 py-6 lg:px-8">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 shadow-2xl shadow-purple-950/30">
                <Sparkles className="h-5 w-5 text-purple-300" />
              </div>
              <div>
                <div className="text-sm font-semibold tracking-tight text-white">AI Video Director</div>
                <div className="text-[10px] uppercase tracking-[0.22em] text-white/40">Autonomous editing agent</div>
              </div>
            </div>

            <button
              type="button"
              onClick={openStudio}
              className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-medium text-white/80 backdrop-blur transition hover:border-white/20 hover:bg-white/10 hover:text-white"
            >
              Open Studio
            </button>
          </header>

          <div className="relative z-10">
            <HeroSection
              title="AI Video Director Agent"
              subtitle={{
                regular: "Turn raw footage into ",
                gradient: "reel-ready stories.",
              }}
              description="Upload one video and let the agent analyze the transcript, build an edit plan, place overlays, and prepare a polished 9:16 export."
              ctaText="Get Started"
              ctaHref="#studio"
              onCtaClick={openStudio}
              bottomImage={{
                light:
                  "https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?auto=format&fit=crop&w=1800&q=85",
                dark:
                  "https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?auto=format&fit=crop&w=1800&q=85",
              }}
              gridOptions={{
                angle: 65,
                opacity: 0.28,
                cellSize: 60,
                lightLineColor: "#5b4b8a",
                darkLineColor: "#35255f",
              }}
            />
          </div>

          <div className="relative z-20 mx-auto -mt-20 max-w-5xl px-6 pb-20 lg:px-8">
            <div className="grid gap-3 md:grid-cols-3">
              {[
                {
                  icon: Radio,
                  label: "AI Analysis",
                  text: "Transcript-aware edit planning with Gemini + n8n.",
                },
                {
                  icon: Film,
                  label: "Reel Canvas",
                  text: "Native 1080 × 1920 preview for vertical social video.",
                },
                {
                  icon: CheckCircle2,
                  label: "Render Ready",
                  text: "Push the approved plan to Remotion for final export.",
                },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.label}
                    className="rounded-2xl border border-white/10 bg-white/[0.035] p-5 backdrop-blur-xl"
                  >
                    <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-xl border border-purple-400/20 bg-purple-400/10 text-purple-200">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="text-sm font-semibold text-white">{item.label}</div>
                    <p className="mt-1.5 text-xs leading-5 text-white/45">{item.text}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        <div ref={studioRef} id="studio" className="scroll-mt-6">
          <div className="relative overflow-hidden border-b border-white/10 bg-[#07070b]">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_-10%,rgba(124,58,237,0.24),transparent_30%),radial-gradient(circle_at_85%_0%,rgba(236,72,153,0.10),transparent_26%)]" />

            <div className="relative mx-auto flex max-w-7xl flex-col gap-5 px-6 py-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-purple-400/20 bg-purple-400/10">
                  <Sparkles className="h-5 w-5 text-purple-200" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-lg font-semibold tracking-tight text-white">AI Video Director Agent</h1>
                    <span className="rounded-full border border-purple-400/20 bg-purple-400/10 px-2.5 py-1 text-[9px] font-mono uppercase tracking-wider text-purple-200">
                      N8N + GEMINI
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-white/40">
                    Autonomous video editing, transcript optimization, and 9:16 reel rendering.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                {overlays.length > 0 && (
                  <button
                    type="button"
                    onClick={handleCopyJson}
                    className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/65 transition hover:bg-white/10 hover:text-white"
                    title="Copy Edit Plan JSON"
                  >
                    {copied ? (
                      <Check className="h-3.5 w-3.5 text-emerald-300" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                    {copied ? 'Copied' : 'Export JSON'}
                  </button>
                )}

                <span className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 font-mono text-[10px] text-purple-200">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 shadow-[0_0_10px_rgba(110,231,183,0.85)] animate-pulse" />
                  {sessionId || 'Initializing...'}
                </span>

                <button
                  type="button"
                  onClick={handleNewSession}
                  className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/65 transition hover:bg-white/10 hover:text-white"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  New Session
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowStudio(false);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/50 transition hover:bg-white/10 hover:text-white"
                >
                  Back to Home
                </button>
              </div>
            </div>
          </div>

          <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
            <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/2.5 p-4 shadow-2xl shadow-black/20 sm:p-5">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,rgba(124,58,237,0.12),transparent_40%)]" />
              <div className="relative">
                <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <div className="text-[10px] font-mono uppercase tracking-[0.25em] text-purple-200/70">01 · Source</div>
                    <h2 className="mt-1 text-base font-semibold tracking-tight text-white">Bring in your footage</h2>
                  </div>
                  <span className="text-[11px] text-white/35">MP4 · browser upload · R2/S3 backed</span>
                </div>

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
            </section>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.02fr_0.98fr]">
              <section className="flex min-h-150 flex-col overflow-hidden rounded-3xl border border-white/10 bg-white/2.5 shadow-2xl shadow-black/20">
                <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-purple-400/20 bg-purple-400/10">
                      <MessageSquare className="h-4 w-4 text-purple-200" />
                    </div>
                    <div>
                      <h2 className="text-sm font-semibold text-white">Gemini Video Director Chat</h2>
                      <p className="text-[10px] text-white/35">Refine the edit using plain language.</p>
                    </div>
                  </div>
                  <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 text-[9px] font-mono uppercase tracking-wider text-emerald-200">
                    Agent Active
                  </span>
                </div>

                <div className="flex flex-1 flex-col px-5 pb-5 pt-4">
                  <div className="flex-1 overflow-y-auto pr-1">
                    {!hasPlan && chatMessages.length === 0 ? (
                      <div className="flex h-full min-h-90 flex-col items-center justify-center text-center">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
                          <Sparkles className="h-5 w-5 text-white/25" />
                        </div>
                        <p className="mt-4 text-sm font-medium text-white/70">Your director is ready.</p>
                        <p className="mt-2 max-w-sm text-xs leading-5 text-white/35">
                          Analyze a source video to create the first edit plan, then ask for timing,
                          B-roll, popup, or cut changes here.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {chatMessages.map((msg) => (
                          <div
                            key={msg.id}
                            className={`rounded-2xl border p-4 text-xs leading-relaxed ${
                              msg.sender === 'bot'
                                ? 'border-purple-400/20 bg-purple-400/[0.07] text-purple-100'
                                : 'ml-8 border-white/10 bg-white/[0.035] text-white/75'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-3 text-[10px] text-white/35">
                              <span className="font-semibold text-white/55">
                                {msg.sender === 'bot' ? 'Gemini Video Director' : 'You'}
                              </span>
                              <span className="font-mono">{msg.time}</span>
                            </div>
                            <p className="mt-2 whitespace-pre-wrap">{msg.text}</p>
                            {msg.badge && (
                              <span className="mt-2 inline-flex rounded-full border border-purple-400/20 bg-purple-400/10 px-2 py-1 text-[9px] font-mono text-purple-200">
                                {msg.badge}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    <div ref={chatEndRef} />
                  </div>

                  <div className="mt-4 border-t border-white/10 pt-4">
                    <div className="flex items-center gap-2 overflow-x-auto pb-2 text-[10px]">
                      <span className="shrink-0 font-medium text-white/30">Quick revisions</span>
                      <button
                        type="button"
                        disabled={isProcessing}
                        onClick={() => handleSendRevision('Make cut #2 shorter by 3 seconds')}
                        className="shrink-0 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-white/60 transition hover:bg-white/10 hover:text-white disabled:opacity-40"
                      >
                        Shorten cut #2
                      </button>
                      <button
                        type="button"
                        disabled={isProcessing}
                        onClick={() => handleSendRevision('Add high-tech B-roll overlay at 00:15')}
                        className="shrink-0 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-white/60 transition hover:bg-white/10 hover:text-white disabled:opacity-40"
                      >
                        Add B-roll at 00:15
                      </button>
                    </div>

                    <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-black/20 p-1.5">
                      <input
                        type="text"
                        value={revisionInput}
                        disabled={isProcessing}
                        onChange={(e) => setRevisionInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSendRevision()}
                        placeholder={
                          isProcessing
                            ? 'n8n is processing your revision...'
                            : "Ask for an edit change, e.g. “Make the opening faster”"
                        }
                        className="min-w-0 flex-1 bg-transparent px-3 py-2.5 text-xs text-white outline-none placeholder:text-white/25 disabled:opacity-50"
                      />
                      <button
                        type="button"
                        onClick={() => handleSendRevision()}
                        disabled={isProcessing}
                        className="flex shrink-0 items-center gap-1.5 rounded-xl bg-white px-4 py-2.5 text-xs font-semibold text-black transition hover:bg-white/90 disabled:opacity-40"
                      >
                        {isProcessing ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Send className="h-3.5 w-3.5" />
                        )}
                        Send
                      </button>
                    </div>
                  </div>
                </div>
              </section>

              <section className="flex min-h-150 flex-col overflow-hidden rounded-3xl border border-white/10 bg-white/2.5 shadow-2xl shadow-black/20">
                <div className="flex items-center justify-between gap-3 border-b border-white/10 px-5 py-4">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-purple-400/20 bg-purple-400/10">
                      <ListVideo className="h-4 w-4 text-purple-200" />
                    </div>
                    <div>
                      <h2 className="text-sm font-semibold text-white">Edit Plan Review</h2>
                      <p className="text-[10px] text-white/35">Approve and tune the generated structure.</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsAddingNew(!isAddingNew)}
                      className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[11px] font-medium text-white/65 transition hover:bg-white/10 hover:text-white"
                    >
                      <Plus className="h-3.5 w-3.5 text-purple-200" />
                      Add
                    </button>

                    {hasPlan && (
                      <button
                        type="button"
                        onClick={handleRenderVideo}
                        disabled={isRendering || isProcessing}
                        className="flex items-center gap-1.5 rounded-xl bg-white px-3 py-2 text-[11px] font-semibold text-black transition hover:bg-white/90 disabled:opacity-40"
                      >
                        {isRendering ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Film className="h-3.5 w-3.5" />
                        )}
                        Render
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex-1 px-5 pb-5 pt-4">
                  {(isRendering || renderProgress > 0) && (
                    <div className="mb-3 rounded-2xl border border-purple-400/20 bg-purple-400/5 p-3.5">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          {isRendering ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin text-purple-200" />
                          ) : renderStatus === 'completed' ? (
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-300" />
                          ) : (
                            <Film className="h-3.5 w-3.5 text-purple-200" />
                          )}
                          <span className="text-[11px] font-semibold text-white/75">
                            {renderStatus === 'completed'
                              ? 'Render complete'
                              : renderStatus === 'error'
                                ? 'Render error'
                                : 'Rendering video'}
                          </span>
                        </div>
                        <span className="font-mono text-[11px] text-purple-200">{renderProgress}%</span>
                      </div>

                      <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-white/10">
                        <div
                          className="h-full rounded-full bg-linear-to-r from-purple-500 via-fuchsia-500 to-pink-500 transition-all duration-300"
                          style={{ width: `${renderProgress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {hasPlan && (
                    <div className="mb-3 flex items-center justify-between gap-3 border-b border-white/10 pb-3">
                      <div className="flex items-center gap-1.5 overflow-x-auto">
                        {(['all', 'cuts', 'broll', 'popups'] as const).map((tab) => (
                          <button
                            type="button"
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`shrink-0 rounded-full border px-3 py-1.5 text-[10px] font-mono capitalize transition ${
                              activeTab === tab
                                ? 'border-purple-300/30 bg-purple-300/15 text-purple-100'
                                : 'border-white/10 bg-white/2.5 text-white/35 hover:bg-white/5 hover:text-white/65'
                            }`}
                          >
                            {tab === 'all' && `All (${counts.all})`}
                            {tab === 'cuts' && `Cuts (${counts.cuts})`}
                            {tab === 'broll' && `B-roll (${counts.broll})`}
                            {tab === 'popups' && `Popups (${counts.popups})`}
                          </button>
                        ))}
                      </div>

                      {currentTime > 0 && (
                        <span className="shrink-0 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 font-mono text-[10px] text-emerald-200">
                          {currentTime.toFixed(1)}s
                        </span>
                      )}
                    </div>
                  )}

                  {isAddingNew && (
                    <div className="mb-3 rounded-2xl border border-purple-400/20 bg-black/20 p-4">
                      <div className="mb-3 flex items-center justify-between">
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-purple-200">
                          Create overlay
                        </span>
                        <button
                          type="button"
                          onClick={() => setIsAddingNew(false)}
                          className="text-white/35 transition hover:text-white"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                        <input
                          type="text"
                          value={newFormData.headline || ''}
                          onChange={(e) => setNewFormData({ ...newFormData, headline: e.target.value })}
                          placeholder="Spoken line"
                          className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white outline-none placeholder:text-white/20 focus:border-purple-400/30 sm:col-span-2"
                        />
                        <select
                          value={newFormData.type || 'popup'}
                          onChange={(e) =>
                            setNewFormData({
                              ...newFormData,
                              type: e.target.value as OverlayItem['type'],
                            })
                          }
                          className="rounded-xl border border-white/10 bg-[#0b0b10] px-3 py-2 text-xs text-white outline-none"
                        >
                          <option value="popup">Popup</option>
                          <option value="broll">B-roll</option>
                          <option value="cut">Cut</option>
                        </select>
                        <select
                          value={newFormData.theme || 'bangla_reel'}
                          onChange={(e) => setNewFormData({ ...newFormData, theme: e.target.value })}
                          className="rounded-xl border border-white/10 bg-[#0b0b10] px-3 py-2 text-xs text-white outline-none"
                        >
                          {THEME_OPTIONS.map((theme) => (
                            <option key={theme.value} value={theme.value}>
                              {theme.label}
                            </option>
                          ))}
                        </select>
                        <select
                          value={newFormData.fontFamily || 'Hind Siliguri'}
                          onChange={(e) => setNewFormData({ ...newFormData, fontFamily: e.target.value })}
                          className="rounded-xl border border-white/10 bg-[#0b0b10] px-3 py-2 text-xs text-white outline-none"
                        >
                          {FONT_OPTIONS.map((font) => (
                            <option key={font.value} value={font.value}>
                              {font.label}
                            </option>
                          ))}
                        </select>
                        <select
                          value={newFormData.highlightColor || 'green'}
                          onChange={(e) => setNewFormData({ ...newFormData, highlightColor: e.target.value })}
                          className="rounded-xl border border-white/10 bg-[#0b0b10] px-3 py-2 text-xs text-white outline-none"
                        >
                          {HIGHLIGHT_COLORS.map((color) => (
                            <option key={color.value} value={color.value}>
                              {color.label}
                            </option>
                          ))}
                        </select>
                        <input
                          type="text"
                          value={newFormData.highlightText || ''}
                          onChange={(e) => setNewFormData({ ...newFormData, highlightText: e.target.value })}
                          placeholder="Highlight word or phrase"
                          className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white outline-none placeholder:text-white/20 sm:col-span-2"
                        />
                        <input
                          type="text"
                          value={newFormData.position || ''}
                          onChange={(e) => setNewFormData({ ...newFormData, position: e.target.value })}
                          placeholder="Position"
                          className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white outline-none placeholder:text-white/20"
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="text"
                            value={newFormData.start_time ?? ''}
                            onChange={(e) => setNewFormData({ ...newFormData, start_time: e.target.value })}
                            placeholder="Start (s)"
                            className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white outline-none placeholder:text-white/20"
                          />
                          <input
                            type="text"
                            value={newFormData.end_time ?? ''}
                            onChange={(e) => setNewFormData({ ...newFormData, end_time: e.target.value })}
                            placeholder="End (s)"
                            className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white outline-none placeholder:text-white/20"
                          />
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={handleAddNewOverlay}
                        className="mt-3 w-full rounded-xl bg-white py-2.5 text-xs font-semibold text-black transition hover:bg-white/90"
                      >
                        Save Card
                      </button>
                    </div>
                  )}

                  <div className="max-h-125 space-y-2.5 overflow-y-auto pr-1">
                    {!hasPlan ? (
                      <div className="flex min-h-82.5 flex-col items-center justify-center text-center">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
                          <ListVideo className="h-5 w-5 text-white/25" />
                        </div>
                        <p className="mt-4 text-sm font-medium text-white/60">No plan generated yet</p>
                        <p className="mt-2 max-w-sm text-xs leading-5 text-white/30">
                          Your cuts, B-roll, and popup recommendations will appear here after analysis.
                        </p>
                      </div>
                    ) : filteredOverlays.length === 0 ? (
                      <div className="flex min-h-82.5 items-center justify-center text-xs text-white/30">
                        No items found for this filter.
                      </div>
                    ) : (
                      filteredOverlays.map((item: OverlayItem, index: number) => {
                        const itemKey = item.id || `overlay-${index}`;
                        const isEditing = editingId === itemKey;
                        const active = isItemActive(item);

                        if (isEditing) {
                          return (
                            <div
                              key={itemKey}
                              className="rounded-2xl border border-purple-400/30 bg-purple-400/4 p-4"
                            >
                              <div className="mb-3 flex items-center justify-between gap-2">
                                <span className="text-[11px] font-semibold uppercase tracking-wider text-purple-200">
                                  Editing overlay
                                </span>
                                <div className="flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => saveEditing(itemKey)}
                                    className="rounded-lg bg-white p-1.5 text-black transition hover:bg-white/90"
                                  >
                                    <Save className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={cancelEditing}
                                    className="rounded-lg border border-white/10 bg-white/5 p-1.5 text-white/55 transition hover:text-white"
                                  >
                                    <X className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </div>

                              <div className="grid grid-cols-1 gap-2">
                                <input
                                  type="text"
                                  value={editFormData.headline || ''}
                                  onChange={(e) => setEditFormData({ ...editFormData, headline: e.target.value })}
                                  placeholder="Spoken line"
                                  className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white outline-none placeholder:text-white/20"
                                />
                              </div>

                              <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                                <select
                                  value={editFormData.type || 'popup'}
                                  onChange={(e) =>
                                    setEditFormData({
                                      ...editFormData,
                                      type: e.target.value as OverlayItem['type'],
                                    })
                                  }
                                  className="rounded-xl border border-white/10 bg-[#0b0b10] px-3 py-2 text-xs text-white outline-none"
                                >
                                  <option value="popup">Popup</option>
                                  <option value="broll">B-roll</option>
                                  <option value="cut">Cut</option>
                                </select>
                                <select
                                  value={editFormData.theme || 'bangla_reel'}
                                  onChange={(e) => setEditFormData({ ...editFormData, theme: e.target.value })}
                                  className="rounded-xl border border-white/10 bg-[#0b0b10] px-3 py-2 text-xs text-white outline-none"
                                >
                                  {THEME_OPTIONS.map((theme) => (
                                    <option key={theme.value} value={theme.value}>
                                      {theme.label}
                                    </option>
                                  ))}
                                </select>
                                <select
                                  value={editFormData.fontFamily || 'Hind Siliguri'}
                                  onChange={(e) => setEditFormData({ ...editFormData, fontFamily: e.target.value })}
                                  className="rounded-xl border border-white/10 bg-[#0b0b10] px-3 py-2 text-xs text-white outline-none"
                                >
                                  {FONT_OPTIONS.map((font) => (
                                    <option key={font.value} value={font.value}>
                                      {font.label}
                                    </option>
                                  ))}
                                </select>
                                <select
                                  value={editFormData.highlightColor || 'green'}
                                  onChange={(e) =>
                                    setEditFormData({
                                      ...editFormData,
                                      highlightColor: e.target.value,
                                    })
                                  }
                                  className="rounded-xl border border-white/10 bg-[#0b0b10] px-3 py-2 text-xs text-white outline-none"
                                >
                                  {HIGHLIGHT_COLORS.map((color) => (
                                    <option key={color.value} value={color.value}>
                                      {color.label}
                                    </option>
                                  ))}
                                </select>
                                <input
                                  type="text"
                                  value={editFormData.highlightText || ''}
                                  onChange={(e) =>
                                    setEditFormData({
                                      ...editFormData,
                                      highlightText: e.target.value,
                                    })
                                  }
                                  placeholder="Highlight word or phrase"
                                  className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white outline-none placeholder:text-white/20 sm:col-span-2"
                                />
                                <input
                                  type="text"
                                  value={editFormData.position || ''}
                                  onChange={(e) =>
                                    setEditFormData({
                                      ...editFormData,
                                      position: e.target.value,
                                    })
                                  }
                                  placeholder="Position"
                                  className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white outline-none placeholder:text-white/20"
                                />
                                <div className="grid grid-cols-2 gap-2">
                                  <input
                                    type="text"
                                    value={editFormData.start_time ?? ''}
                                    onChange={(e) =>
                                      setEditFormData({
                                        ...editFormData,
                                        start_time: e.target.value,
                                      })
                                    }
                                    placeholder="Start (s)"
                                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white outline-none placeholder:text-white/20"
                                  />
                                  <input
                                    type="text"
                                    value={editFormData.end_time ?? ''}
                                    onChange={(e) =>
                                      setEditFormData({
                                        ...editFormData,
                                        end_time: e.target.value,
                                      })
                                    }
                                    placeholder="End (s)"
                                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white outline-none placeholder:text-white/20"
                                  />
                                </div>
                              </div>
                            </div>
                          );
                        }

                        return (
                          <div
                            key={itemKey}
                            className={`rounded-2xl border p-4 transition ${
                              active
                                ? 'border-purple-300/40 bg-purple-400/8 shadow-lg shadow-purple-950/25'
                                : 'border-white/10 bg-white/2.5 hover:bg-white/4'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <span
                                  className={`rounded-full border px-2 py-1 text-[9px] font-mono font-semibold uppercase ${
                                    item.type === 'cut'
                                      ? 'border-rose-400/20 bg-rose-400/10 text-rose-200'
                                      : item.type === 'broll'
                                        ? 'border-amber-400/20 bg-amber-400/10 text-amber-200'
                                        : 'border-emerald-400/20 bg-emerald-400/10 text-emerald-200'
                                  }`}
                                >
                                  {item.type || 'popup'}
                                </span>

                                <button
                                  type="button"
                                  onClick={() => handleSeekToTime(item.start_time)}
                                  className="flex items-center gap-1 rounded-full border border-white/10 bg-black/20 px-2.5 py-1 font-mono text-[10px] text-white/45 transition hover:text-purple-200"
                                >
                                  <Clock className="h-2.5 w-2.5" />
                                  {item.start_time ?? 0}s – {item.end_time ?? 0}s
                                </button>
                              </div>

                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => startEditing(item)}
                                  className="rounded-lg p-1.5 text-white/35 transition hover:bg-white/5 hover:text-white"
                                  title="Edit Overlay"
                                >
                                  <Edit2 className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteOverlay(itemKey)}
                                  className="rounded-lg p-1.5 text-white/35 transition hover:bg-white/5 hover:text-rose-300"
                                  title="Delete Overlay"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>

                            {item.headline && (
                              <h3 className="mt-3 text-sm font-semibold leading-6 text-white">{item.headline}</h3>
                            )}

                            <div className="mt-3 grid grid-cols-2 gap-2 border-t border-white/10 pt-3 text-[10px] font-mono text-white/25">
                              <span>Pos: {item.position || 'bottom-center'}</span>
                              <span className="text-right">Theme: {item.theme || 'bold_clean'}</span>
                              <span>Font: {item.fontFamily || DEFAULT_FONT_FAMILY}</span>
                              <span className="text-right">
                                {item.theme === 'bangla_reel'
                                  ? `Accent: ${item.highlightColor || DEFAULT_HIGHLIGHT_COLOR}`
                                  : 'Accent: —'}
                              </span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </section>
            </div>

            {hasPlan && videoUrl && (
              <section className="rounded-3xl border border-white/10 bg-white/2.5 p-5 shadow-2xl shadow-black/20">
                <div className="flex flex-col gap-3 border-b border-white/10 pb-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="text-[10px] font-mono uppercase tracking-[0.25em] text-purple-200/70">03 · Preview</div>
                    <h2 className="mt-1 text-base font-semibold text-white">Live 9:16 composition</h2>
                    <p className="mt-1 text-xs text-white/35">
                      Preview the exact vertical canvas used by the Remotion composition.
                    </p>
                  </div>

                  <a
                    href={videoUrl}
                    download="source-video.mp4"
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-white/65 transition hover:bg-white/10 hover:text-white"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Download Source
                  </a>
                </div>

                <div className="mt-5 rounded-3xl border border-white/10 bg-black/30 p-3">
                  <div
                    className="relative mx-auto w-full overflow-hidden rounded-2xl border border-white/10 bg-black shadow-2xl shadow-black/40"
                    style={{ maxWidth: `${PREVIEW_MAX_WIDTH_PX}px` }}
                  >
                    <Player
                      component={Composition}
                      inputProps={playerInputProps}
                      durationInFrames={durationInFrames}
                      fps={REEL_FPS}
                      compositionWidth={REEL_WIDTH}
                      compositionHeight={REEL_HEIGHT}
                      style={{
                        width: '100%',
                        aspectRatio: '9 / 16',
                        margin: '0 auto',
                        overflow: 'hidden',
                      }}
                      controls
                    />
                  </div>
                </div>
              </section>
            )}

            {renderedVideoUrl && (
              <section className="rounded-3xl border border-emerald-400/20 bg-emerald-400/[0.035] p-5 shadow-2xl shadow-black/20">
                <div className="flex flex-col gap-3 border-b border-emerald-400/10 pb-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="text-[10px] font-mono uppercase tracking-[0.25em] text-emerald-200/70">04 · Export</div>
                    <h2 className="mt-1 text-base font-semibold text-white">Final rendered output</h2>
                    <p className="mt-1 text-xs text-white/35">
                      Your finished reel is ready to review and download.
                    </p>
                  </div>

                  <a
                    href={renderedVideoUrl}
                    download
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-white px-4 py-2.5 text-xs font-semibold text-black transition hover:bg-white/90"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Download Export
                  </a>
                </div>

                <div className="mt-5 flex justify-center rounded-3xl border border-white/10 bg-black/30 p-3">
                  <div
                    className="relative w-full overflow-hidden rounded-2xl border border-white/10 bg-black"
                    style={{ maxWidth: `${PREVIEW_MAX_WIDTH_PX}px`, aspectRatio: '9 / 16' }}
                  >
                    <video
                      src={renderedVideoUrl}
                      controls
                      playsInline
                      className="h-full w-full object-contain"
                    />
                  </div>
                </div>
              </section>
            )}

            <footer className="pb-4 pt-2 text-center text-[10px] uppercase tracking-[0.22em] text-white/20">
              AI Video Director Agent · n8n · Gemini · Remotion
            </footer>
          </div>
        </div>
      )}
    </main>
  );
}
