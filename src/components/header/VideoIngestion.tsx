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
    <div className="w-full bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl backdrop-blur-sm transition-all hover:border-slate-700/80">
      <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
        <div className="w-full lg:w-3/5 flex flex-col gap-3">
          {!videoUrl ? (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`relative flex flex-col items-center justify-center min-h-50 sm:min-h-55 rounded-xl border-2 border-dashed p-6 text-center cursor-pointer transition-all duration-300 ${
                isDragOver
                  ? 'border-emerald-400 bg-emerald-500/10 scale-[1.01]'
                  : 'border-slate-700/80 bg-slate-950/60 hover:border-emerald-500/50 hover:bg-slate-900/90'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="video/mp4,video/*"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-3 shadow-lg shadow-emerald-500/10">
                <UploadCloud className="w-6 h-6 animate-bounce" />
              </div>
              <h3 className="text-base font-semibold text-slate-200">
                Drop your local source <span className="text-emerald-400 font-mono">.mp4</span> file here
              </h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm">
                or click to browse your computer. Supports MP4 video files for AI speech transcript & cut analysis.
              </p>
              <div className="mt-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800 text-[11px] text-slate-300 border border-slate-700 font-medium">
                <FileVideo className="w-3.5 h-3.5 text-emerald-400" />
                Select .mp4 File
              </div>
            </div>
          ) : (
            <div className="relative w-full rounded-xl overflow-hidden bg-slate-950 border border-slate-800 shadow-2xl group">
              <video
                ref={videoRef}
                src={videoUrl}
                onError={handleVideoError}
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                className="w-full max-h-75 object-contain bg-black"
              />

              <div className="absolute bottom-0 left-0 right-0 bg-linear-to-t from-slate-950 via-slate-950/90 to-transparent p-3 flex flex-col gap-2 transition-opacity opacity-90 group-hover:opacity-100">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono text-emerald-400 w-12 text-right">
                    {formatSecondsToTimecode(currentTime)}
                  </span>
                  <input
                    type="range"
                    min={0}
                    max={duration || 100}
                    step={0.1}
                    value={currentTime}
                    onChange={handleSeek}
                    className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-400"
                  />
                  <span className="text-[11px] font-mono text-slate-400 w-12">
                    {formatSecondsToTimecode(duration)}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={togglePlayPause}
                      className="p-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-colors shadow-md shadow-emerald-500/20 cursor-pointer"
                    >
                      {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                    </button>
                    <button
                      onClick={() => {
                        if (videoRef.current) {
                          videoRef.current.currentTime = 0;
                        }
                      }}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
                      title="Reset to beginning"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="text-xs text-slate-400 hover:text-slate-200 underline font-medium cursor-pointer"
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

        <div className="w-full lg:w-2/5 flex flex-col justify-between h-full gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Film className="w-4 h-4 text-emerald-400" />
              <h2 className="text-sm font-semibold text-slate-200 uppercase tracking-wider">
                Source Video Details
              </h2>
            </div>

            {videoFile ? (
              <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">File Name:</span>
                  <span className="font-mono text-slate-200 font-medium truncate max-w-45">
                    {videoFile.name}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">File Size:</span>
                  <span className="font-mono text-slate-300">{formatFileSize(videoFile.size)}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Duration:</span>
                  <span className="font-mono text-emerald-400">
                    {duration ? formatSecondsToTimecode(duration) : 'Loading...'}
                  </span>
                </div>
              </div>
            ) : (
              <div className="p-3.5 rounded-xl bg-slate-950/40 border border-slate-800/60 text-xs text-slate-500 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-slate-600 shrink-0" />
                <span>No video file loaded yet. Drop an .mp4 file to preview & analyze.</span>
              </div>
            )}
          </div>

          <div className="pt-2">
            <button
              onClick={onAnalyzeVideo}
              disabled={isButtonDisabled}
              className={`w-full relative flex items-center justify-center gap-2.5 py-3 px-5 rounded-xl font-bold text-sm transition-all duration-300 shadow-lg ${
                isButtonDisabled
                  ? 'bg-slate-800 text-slate-500 border border-slate-700/50 cursor-not-allowed'
                  : hasPlan
                  ? 'bg-emerald-600/20 border border-emerald-500/50 text-emerald-300 hover:bg-emerald-600/30 shadow-emerald-500/10 cursor-pointer'
                  : 'bg-linear-to-r from-emerald-500 via-teal-500 to-emerald-400 text-slate-950 hover:brightness-110 shadow-emerald-500/25 active:scale-[0.99] cursor-pointer'
              }`}
            >
              {isEngineStarting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                  <span>Starting Engine (Render Cold Start)...</span>
                </>
              ) : isProcessing ? (
                <>
                  <Sparkles className="w-4 h-4 animate-spin text-emerald-400" />
                  <span>Gemini Analyzing Audio & Speech...</span>
                </>
              ) : hasPlan ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Re-Analyze Video Transcript</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
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