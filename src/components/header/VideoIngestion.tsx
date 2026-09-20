// src/components/header/VideoIngestion.tsx
'use client';

import React, { useRef, useState } from 'react';
import { UploadCloud, Film, Play, Pause, RotateCcw, Sparkles, CheckCircle2, FileVideo, AlertCircle, Loader2 } from 'lucide-react';
import { formatFileSize, formatSecondsToTimecode } from '@/utils/formatTime';

export type EngineStatus = 'idle' | 'starting' | 'ready';

export interface VideoIngestionProps {
  videoFile: File | null;
  videoUrl: string | null;
  onFileSelect: (file: File) => void;
  onAnalyzeVideo: () => void;
  isProcessing: boolean;
  hasPlan: boolean;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  engineStatus?: EngineStatus;
}

export const VideoIngestion: React.FC<VideoIngestionProps> = ({
  videoFile,
  videoUrl,
  onFileSelect,
  onAnalyzeVideo,
  isProcessing,
  hasPlan,
  videoRef,
  engineStatus = 'idle',
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.type.includes('video') || file.name.endsWith('.mp4')) {
        onFileSelect(file);
      } else {
        alert('Please select a valid .mp4 video file.');
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFileSelect(e.target.files[0]);
    }
  };

  const togglePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const handleVideoError = (e: React.SyntheticEvent<HTMLVideoElement, Event>) => {
    if (videoFile) {
      const fallbackUrl = URL.createObjectURL(videoFile);
      e.currentTarget.src = fallbackUrl;
    }
  };

  const isEngineStarting = engineStatus === 'starting';
  const isButtonDisabled = !videoFile || isProcessing || isEngineStarting;

  return (
    <div className="w-full rounded-2xl border border-white/10 bg-black/20 p-4 backdrop-blur-sm transition-colors hover:border-white/20 sm:p-5">
      <div className="flex flex-col items-center justify-between gap-6 lg:flex-row">
        <div className="flex w-full flex-col gap-3 lg:w-3/5">
          {!videoUrl ? (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`relative flex min-h-50 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 text-center transition-all duration-300 sm:min-h-55 ${
                isDragOver
                  ? 'scale-[1.01] border-purple-300/70 bg-purple-400/10'
                  : 'border-white/15 bg-white/2.5 hover:border-purple-300/40 hover:bg-purple-400/5'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="video/mp4,video/*"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-purple-400/25 bg-purple-400/10 text-purple-200">
                <UploadCloud className="h-6 w-6" />
              </div>
              <h3 className="text-base font-semibold text-white">
                Drop your local source <span className="font-mono text-purple-200">.mp4</span> file here
              </h3>
              <p className="mt-1 max-w-sm text-xs leading-5 text-white/40">
                or click to browse your computer. Supports MP4 video files for AI speech transcript & cut analysis.
              </p>
              <div className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-medium text-white/65">
                <FileVideo className="h-3.5 w-3.5 text-purple-200" />
                Select .mp4 File
              </div>
            </div>
          ) : (
            <div className="group relative w-full overflow-hidden rounded-xl border border-white/10 bg-black shadow-2xl shadow-black/40">
              <video
                ref={videoRef}
                src={videoUrl}
                onError={handleVideoError}
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                className="max-h-75 w-full bg-black object-contain"
              />

              <div className="absolute bottom-0 left-0 right-0 flex flex-col gap-2 bg-linear-to-t from-black via-black/80 to-transparent p-3 opacity-90 transition-opacity group-hover:opacity-100">
                <div className="flex items-center gap-2">
                  <span className="w-12 text-right font-mono text-[11px] text-purple-200">
                    {formatSecondsToTimecode(currentTime)}
                  </span>
                  <input
                    type="range"
                    min={0}
                    max={duration || 100}
                    step={0.1}
                    value={currentTime}
                    onChange={handleSeek}
                    className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-white/10 accent-purple-300"
                  />
                  <span className="w-12 font-mono text-[11px] text-white/40">
                    {formatSecondsToTimecode(duration)}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={togglePlayPause}
                      className="cursor-pointer rounded-lg bg-white p-1.5 text-black transition hover:bg-white/90"
                    >
                      {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="ml-0.5 h-4 w-4" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (videoRef.current) {
                          videoRef.current.currentTime = 0;
                        }
                      }}
                      className="cursor-pointer rounded-lg border border-white/10 bg-white/5 p-1.5 text-white/65 transition hover:bg-white/10 hover:text-white"
                      title="Reset to beginning"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="cursor-pointer text-xs font-medium text-white/45 underline transition hover:text-white"
                  >
                    Change Video
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="video/mp4,video/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex h-full w-full flex-col justify-between gap-4 lg:w-2/5">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <Film className="h-4 w-4 text-purple-200" />
              <h2 className="text-sm font-semibold uppercase tracking-wider text-white/80">
                Source Video Details
              </h2>
            </div>

            {videoFile ? (
              <div className="space-y-2 rounded-xl border border-white/10 bg-black/20 p-3.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-white/40">File Name:</span>
                  <span className="max-w-45 truncate font-mono font-medium text-white/80">
                    {videoFile.name}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-white/40">File Size:</span>
                  <span className="font-mono text-white/70">{formatFileSize(videoFile.size)}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-white/40">Duration:</span>
                  <span className="font-mono text-purple-200">
                    {duration ? formatSecondsToTimecode(duration) : 'Loading...'}
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/20 p-3.5 text-xs text-white/35">
                <AlertCircle className="h-4 w-4 shrink-0 text-white/30" />
                <span>No video file loaded yet. Drop an .mp4 file to preview & analyze.</span>
              </div>
            )}
          </div>

          <div className="pt-2">
            <button
              type="button"
              onClick={onAnalyzeVideo}
              disabled={isButtonDisabled}
              className={`relative flex w-full items-center justify-center gap-2.5 rounded-xl px-5 py-3 text-sm font-semibold transition-all duration-300 ${
                isButtonDisabled
                  ? 'cursor-not-allowed border border-white/10 bg-white/5 text-white/30'
                  : hasPlan
                  ? 'cursor-pointer border border-purple-300/30 bg-purple-400/10 text-purple-100 hover:bg-purple-400/20'
                  : 'cursor-pointer bg-white text-black hover:bg-white/90 active:scale-[0.99]'
              }`}
            >
              {isEngineStarting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-amber-300" />
                  <span>Starting Engine (Render Cold Start)...</span>
                </>
              ) : isProcessing ? (
                <>
                  <Sparkles className="h-4 w-4 animate-spin text-purple-200" />
                  <span>Gemini Analyzing Audio & Speech...</span>
                </>
              ) : hasPlan ? (
                <>
                  <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                  <span>Re-Analyze Video Transcript</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  <span>Analyze Video (Extract Audio & Cuts)</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
