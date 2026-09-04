'use client';

import React from 'react';
import { Player } from '@remotion/player';
import { MainComposition, PopupData } from '@/remotion/Composition';

interface VideoPreviewPlayerProps {
  videoUrl: string;
  popups: PopupData[];
  durationInSeconds?: number;
}

export const VideoPreviewPlayer: React.FC<VideoPreviewPlayerProps> = ({
  videoUrl,
  popups,
  durationInSeconds = 30,
}) => {
  const fps = 30;
  const durationInFrames = Math.max(30, Math.round(durationInSeconds * fps));

  return (
    <div className="w-full max-w-sm mx-auto overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 shadow-2xl">
      <Player
        component={MainComposition}
        inputProps={{
          videoUrl,
          popups,
        }}
        durationInFrames={durationInFrames}
        fps={fps}
        compositionWidth={1080}
        compositionHeight={1920}
        style={{
          width: '100%',
          aspectRatio: '9/16',
        }}
        controls
      />
    </div>
  );
};

export default VideoPreviewPlayer;