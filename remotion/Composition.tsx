import React from "react";
import { AbsoluteFill, Sequence, OffthreadVideo, useVideoConfig } from "remotion";
import { MainReelProps } from "./types";
import { PopupOverlay } from "./components/PopupOverlay";

function cleanUrl(rawUrl: unknown): string {
  if (!rawUrl || typeof rawUrl !== "string") return "";
  let url = rawUrl.trim();

  // Clean surrounding quotes or markdown formatting artifacts
  url = url.replace(/^['"]|['"]$/g, "");

  // Unwrap proxy URLs if passed from external API layers
  let prev = "";
  while (url !== prev) {
    prev = url;
    try {
      url = decodeURIComponent(url);
    } catch {
      // Ignore decoding errors
    }
    const match = url.match(/proxy-video\?url=(.+)$/i);
    if (match && match[1]) {
      url = match[1].trim();
    }
  }

  // Reject malformed placeholders like "=" or invalid non-HTTP strings
  if (url === "=" || (!url.startsWith("http://") && !url.startsWith("https://"))) {
    return "";
  }

  return url;
}

export const MainReel: React.FC<MainReelProps> = ({ videoUrl, popups = [] }) => {
  const { fps } = useVideoConfig();
  const safePopups = Array.isArray(popups) ? popups : [];

  let finalUrl = cleanUrl(videoUrl);

  // Fallback to active public sample video if no valid remote URL is provided
  if (!finalUrl) {
    finalUrl = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";
  }

  return (
    <AbsoluteFill style={{ backgroundColor: "black" }}>
      {/* Pass direct HTTPS URL; avoid relative /api/proxy-video routes in Remotion backend */}
      {finalUrl ? <OffthreadVideo src={finalUrl} /> : null}

      {safePopups.map((popup, i) => {
        const startSec = Number(popup.start_time);
        const endSec = Number(popup.end_time || startSec + 3);

        if (!Number.isFinite(startSec) || !Number.isFinite(endSec)) {
          return null;
        }

        const startFrame = Math.max(0, Math.round(startSec * fps));
        const endFrame = Math.round(endSec * fps);
        const durationInFrames = Math.max(1, endFrame - startFrame);

        return (
          <Sequence
            key={`${popup.headline || "popup"}-${startFrame}-${i}`}
            from={startFrame}
            durationInFrames={durationInFrames}
          >
            <PopupOverlay item={popup} durationInFrames={durationInFrames} />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};

export const MainComposition = MainReel;
export default MainReel;