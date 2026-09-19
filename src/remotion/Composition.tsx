// src/remotion/Composition.tsx
import React from "react";
import {
  AbsoluteFill,
  Sequence,
  OffthreadVideo,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
} from "remotion";

export type PopupTheme =
  | "bold_clean"
  | "youtube_shorts"
  | "bangla_reel"
  | "modern"
  | "minimal"
  | "news"
  | string;

export type HighlightColor =
  | "green"
  | "red"
  | "blue"
  | "yellow"
  | string;

export type PopupPosition =
  | "top"
  | "top-left"
  | "top-right"
  | "center"
  | "center-left"
  | "center-right"
  | "bottom"
  | "bottom-left"
  | "bottom-right"
  | "lower_third"
  | "bottom_third"
  | string;

export interface PopupData {
  [key: string]: unknown;
  headline: string;
  position?: PopupPosition;
  theme?: PopupTheme;
  fontFamily?: string;
  highlightColor?: HighlightColor;
  highlightText?: string;
  textColor?: string;
  bgColor?: string;
  borderColor?: string;
  start_time: number | string;
  end_time: number | string;
  start_frame?: number;
  end_frame?: number;
  duration_in_frames?: number;
}

export interface MainReelProps extends Record<string, unknown> {
  videoUrl: string;
  popups: PopupData[];
}

export type MainCompositionProps = MainReelProps;

const HIGHLIGHT_COLORS: Record<string, string> = {
  green: "#B7F000",
  red: "#FF3B30",
  blue: "#28A9FF",
  yellow: "#FFD60A",
};

const POSITION_STYLES: Record<string, React.CSSProperties> = {
  top: {
    position: "absolute",
    top: 192,
    left: 60,
    right: 60,
    alignItems: "center",
  },
  "top-left": {
    position: "absolute",
    top: 192,
    left: 60,
    right: 60,
    alignItems: "flex-start",
  },
  "top-right": {
    position: "absolute",
    top: 192,
    left: 60,
    right: 60,
    alignItems: "flex-end",
  },
  // Face-safe center: deliberately lower than mathematical center.
  center: {
    position: "absolute",
    top: 960,
    left: 60,
    right: 60,
    transform: "translateY(-50%)",
    alignItems: "center",
  },
  "center-left": {
    position: "absolute",
    top: 960,
    left: 60,
    right: 60,
    transform: "translateY(-50%)",
    alignItems: "flex-start",
  },
  "center-right": {
    position: "absolute",
    top: 960,
    left: 60,
    right: 60,
    transform: "translateY(-50%)",
    alignItems: "flex-end",
  },
  bottom: {
    position: "absolute",
    bottom: 154,
    left: 60,
    right: 60,
    alignItems: "center",
  },
  "bottom-left": {
    position: "absolute",
    bottom: 154,
    left: 60,
    right: 60,
    alignItems: "flex-start",
  },
  "bottom-right": {
    position: "absolute",
    bottom: 154,
    left: 60,
    right: 60,
    alignItems: "flex-end",
  },
  // Aliases used by some older/generated plans.
  lower_third: {
    position: "absolute",
    top: 1229,
    left: 60,
    right: 60,
    alignItems: "center",
  },
  bottom_third: {
    position: "absolute",
    top: 1229,
    left: 60,
    right: 60,
    alignItems: "center",
  },
};

const BASE_TEXT_STYLE: React.CSSProperties = {
  fontFamily: '"Hind Siliguri", "Noto Sans Bengali", "Anek Bangla", sans-serif',
  fontWeight: 800,
  textAlign: "center",
  whiteSpace: "pre-wrap",
  wordBreak: "normal",
  overflowWrap: "break-word",
};

const Popup: React.FC<{
  popup: PopupData;
  durationInFrames: number;
}> = ({ popup, durationInFrames }) => {
  const frame = useCurrentFrame();

  const safeDuration = Math.max(1, durationInFrames);
  const fadeFrames = Math.max(1, Math.min(6, Math.floor(safeDuration / 4)));
  const fadeOutStart = Math.max(fadeFrames, safeDuration - fadeFrames);

  const opacity = interpolate(
    frame,
    [0, fadeFrames, fadeOutStart, safeDuration],
    [0, 1, 1, 0],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }
  );

  const scale = interpolate(
    frame,
    [0, fadeFrames],
    [0.92, 1],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }
  );

  const rawPosition = popup.position || "center";
  const positionStyle =
    POSITION_STYLES[rawPosition] || POSITION_STYLES.center;

  const theme = popup.theme || "bold_clean";
  const highlightColor =
    HIGHLIGHT_COLORS[String(popup.highlightColor || "green").toLowerCase()] ||
    popup.highlightColor ||
    HIGHLIGHT_COLORS.green;

  const fontFamily =
    popup.fontFamily ||
    '"Hind Siliguri", "Noto Sans Bengali", "Anek Bangla", sans-serif';

  const isBanglaReel = theme === "bangla_reel";
  const isMinimal = theme === "minimal";
  const isModern = theme === "modern";
  const isNews = theme === "news";
  const isYoutube = theme === "youtube_shorts";

  const containerStyle: React.CSSProperties = isBanglaReel
    ? {
        backgroundColor: "transparent",
        border: "none",
        borderRadius: 0,
        padding: "0 18px",
        boxShadow: "none",
        maxWidth: "92%",
        boxSizing: "border-box",
      }
    : isMinimal
      ? {
          backgroundColor: "transparent",
          border: "none",
          borderRadius: 0,
          padding: "0 16px",
          boxShadow: "none",
          maxWidth: "90%",
          boxSizing: "border-box",
        }
      : isModern
        ? {
            backgroundColor: "rgba(15, 23, 42, 0.76)",
            border: "1px solid rgba(255,255,255,0.14)",
            borderRadius: 18,
            padding: "16px 26px",
            boxShadow: "0 18px 40px rgba(0,0,0,0.35)",
            maxWidth: "88%",
            boxSizing: "border-box",
          }
        : isNews
          ? {
              backgroundColor: "rgba(0,0,0,0.78)",
              borderLeft: `8px solid ${highlightColor}`,
              borderRadius: 8,
              padding: "14px 22px",
              boxShadow: "0 14px 28px rgba(0,0,0,0.35)",
              maxWidth: "90%",
              boxSizing: "border-box",
            }
          : isYoutube
            ? {
                backgroundColor: "rgba(0,0,0,0.72)",
                borderRadius: 16,
                padding: "16px 26px",
                border: "1px solid rgba(255,255,255,0.18)",
                maxWidth: "88%",
                boxSizing: "border-box",
              }
            : {
                backgroundColor: popup.bgColor || "rgba(15, 23, 42, 0.85)",
                border: `2px solid ${popup.borderColor || "rgba(16, 185, 129, 0.6)"}`,
                borderRadius: 22,
                padding: "18px 30px",
                boxShadow: "0 20px 30px rgba(0,0,0,0.45)",
                maxWidth: "88%",
                boxSizing: "border-box",
              };

  const headlineStyle: React.CSSProperties = isBanglaReel
    ? {
        ...BASE_TEXT_STYLE,
        fontFamily,
        fontSize: 62,
        lineHeight: 0.98,
        letterSpacing: "-0.015em",
        color: popup.textColor || "#FFFFFF",
        textShadow:
          "-3px -3px 0 #000, 3px -3px 0 #000, -3px 3px 0 #000, 3px 3px 0 #000, 0 6px 16px rgba(0,0,0,0.65)",
      }
    : isMinimal
      ? {
          ...BASE_TEXT_STYLE,
          fontFamily,
          fontSize: 50,
          lineHeight: 1.04,
          color: popup.textColor || "#FFFFFF",
          textShadow: "0 4px 12px rgba(0,0,0,0.85)",
        }
      : isModern
        ? {
            ...BASE_TEXT_STYLE,
            fontFamily,
            fontSize: 48,
            lineHeight: 1.08,
            color: popup.textColor || "#FFFFFF",
          }
        : isNews
          ? {
              ...BASE_TEXT_STYLE,
              fontFamily,
              fontSize: 44,
              lineHeight: 1.08,
              color: popup.textColor || "#FFFFFF",
            }
          : isYoutube
            ? {
                ...BASE_TEXT_STYLE,
                fontFamily,
                fontSize: 58,
                lineHeight: 1.04,
                color: popup.textColor || "#FFFFFF",
                textShadow:
                  "-3px 3px 0 #000, 3px 3px 0 #000, 3px -3px 0 #000, -3px -3px 0 #000",
              }
            : {
                ...BASE_TEXT_STYLE,
                fontFamily,
                fontSize: 52,
                lineHeight: 1.08,
                color: popup.textColor || "#FFFFFF",
                letterSpacing: "0.01em",
              };

  const renderBanglaReelText = () => {
    const headline = String(popup.headline || "");
    const requestedHighlight = String(popup.highlightText || "").trim();

    let highlight = requestedHighlight;
    if (!highlight) {
      // Emphasize the final word by default; this keeps the theme useful
      // without forcing the LLM to rewrite or annotate the spoken sentence.
      const words = headline.split(/\s+/).filter(Boolean);
      highlight = words.length > 0 ? words[words.length - 1] : "";
    }

    if (!highlight) {
      return headline;
    }

    const index = headline.lastIndexOf(highlight);
    if (index < 0) {
      return headline;
    }

    const before = headline.slice(0, index);
    const after = headline.slice(index + highlight.length);

    return (
      <>
        {before}
        <span
          style={{
            color: highlightColor,
            fontWeight: 900,
            fontSize: "1.17em",
            textShadow:
              "-3px -3px 0 #000, 3px -3px 0 #000, -3px 3px 0 #000, 3px 3px 0 #000, 0 6px 18px rgba(0,0,0,0.72)",
          }}
        >
          {highlight}
        </span>
        {after}
      </>
    );
  };

  return (
    <AbsoluteFill
      style={{
        pointerEvents: "none",
        ...positionStyle,
      }}
    >
      <div
        style={{
          opacity,
          transform: `scale(${scale})`,
          maxWidth: "100%",
          overflow: "hidden",
          ...containerStyle,
        }}
      >
        <div style={headlineStyle}>
          {isBanglaReel ? renderBanglaReelText() : popup.headline}
        </div>
      </div>
    </AbsoluteFill>
  );
};

export const MainReel: React.FC<MainReelProps> = ({ videoUrl, popups }) => {
  const { fps } = useVideoConfig();
  const safePopups = Array.isArray(popups) ? popups : [];

  const cleanUrl = String(videoUrl || "").trim();

  return (
    <div
      style={{
        position: "relative",
        width: 1080,
        height: 1920,
        backgroundColor: "black",
        overflow: "hidden",
      }}
    >
      {cleanUrl ? (
        <OffthreadVideo
          src={cleanUrl}
          onError={(err) => console.warn("Video stream load warning:", err)}
          style={{
            position: "absolute",
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: "50% 50%",
            display: "block",
          }}
        />
      ) : null}

      {safePopups.map((popup, i) => {
        const startSec = Number(popup.start_time);
        const endSec = Number(popup.end_time);

        const hasSecs =
          Number.isFinite(startSec) && Number.isFinite(endSec) && endSec > startSec;
        const hasFrames =
          Number.isFinite(popup.start_frame) &&
          Number.isFinite(popup.end_frame) &&
          Number(popup.end_frame) > Number(popup.start_frame);

        if (!hasSecs && !hasFrames) {
          return null;
        }

        const startFrame =
          popup.start_frame ?? Math.max(0, Math.round(startSec * fps));
        const endFrame =
          popup.end_frame ?? Math.round(endSec * fps);
        const durationInFrames =
          popup.duration_in_frames ?? Math.max(1, endFrame - startFrame);

        return (
          <Sequence
            key={`${popup.headline}-${startFrame}-${i}`}
            from={startFrame}
            durationInFrames={durationInFrames}
          >
            <Popup popup={popup} durationInFrames={durationInFrames} />
          </Sequence>
        );
      })}
    </div>
  );
};

export const MainComposition = MainReel;
export default MainReel;
