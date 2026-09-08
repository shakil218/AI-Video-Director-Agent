import React from "react";
import { useCurrentFrame, useVideoConfig, spring, interpolate, AbsoluteFill } from "remotion";
import { PopupItem } from "../types";

const POSITION_STYLES: Record<string, React.CSSProperties> = {
  top: { justifyContent: "flex-start", alignItems: "center", paddingTop: "10vh" },
  "top-left": { justifyContent: "flex-start", alignItems: "flex-start", paddingTop: "10vh", paddingLeft: "30px" },
  "top-right": { justifyContent: "flex-start", alignItems: "flex-end", paddingTop: "10vh", paddingRight: "30px" },
  center: { justifyContent: "center", alignItems: "center" },
  "center-left": { justifyContent: "center", alignItems: "flex-start", paddingLeft: "30px" },
  "center-right": { justifyContent: "center", alignItems: "flex-end", paddingRight: "30px" },
  bottom: { justifyContent: "flex-end", alignItems: "center", paddingBottom: "10vh" },
  "bottom-left": { justifyContent: "flex-end", alignItems: "flex-start", paddingBottom: "10vh", paddingLeft: "30px" },
  "bottom-right": { justifyContent: "flex-end", alignItems: "flex-end", paddingBottom: "10vh", paddingRight: "30px" },
};

const THEME_STYLES: Record<
  string,
  {
    container: React.CSSProperties;
    headline: React.CSSProperties;
    subtext: React.CSSProperties;
  }
> = {
  bold_clean: {
    container: {
      backgroundColor: "rgba(15, 23, 42, 0.90)",
      border: "2px solid rgba(74, 222, 128, 0.8)",
      borderRadius: 20,
      padding: "20px 32px",
      boxShadow: "0 20px 30px rgba(0, 0, 0, 0.6)",
      backdropFilter: "blur(10px)",
      maxWidth: "85%",
    },
    headline: {
      fontSize: 48,
      fontWeight: 900,
      color: "#FFFFFF",
      textAlign: "center",
      textTransform: "uppercase",
      letterSpacing: "0.02em",
    },
    subtext: {
      fontSize: 28,
      fontWeight: 700,
      color: "#4ADE80",
      textAlign: "center",
      marginTop: 8,
      textTransform: "uppercase",
    },
  },
  youtube_shorts: {
    container: {
      backgroundColor: "rgba(0, 0, 0, 0.80)",
      borderRadius: 16,
      padding: "18px 28px",
      border: "2px solid rgba(255, 255, 255, 0.3)",
      maxWidth: "90%",
    },
    headline: {
      fontSize: 54,
      fontWeight: 900,
      color: "#FACC15",
      textAlign: "center",
      lineHeight: 1.1,
      textShadow: "-3px 3px 0 #000, 3px 3px 0 #000, 3px -3px 0 #000, -3px -3px 0 #000",
    },
    subtext: {
      fontSize: 30,
      fontWeight: 800,
      color: "#FFFFFF",
      textAlign: "center",
      marginTop: 8,
      textShadow: "-2px 2px 0 #000, 2px 2px 0 #000, 2px -2px 0 #000, -2px -2px 0 #000",
    },
  },
};

export const PopupOverlay: React.FC<{ item: PopupItem; durationInFrames: number }> = ({
  item,
  durationInFrames,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Entrance animation
  const springVal = spring({
    frame,
    fps,
    config: { damping: 12, stiffness: 100 },
  });

  // Fade out transition
  const fadeFrames = Math.max(1, Math.min(5, Math.floor(durationInFrames / 3)));
  const opacity = interpolate(
    frame,
    [0, fadeFrames, Math.max(fadeFrames, durationInFrames - fadeFrames), durationInFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  let transformStyle = `scale(${springVal})`;
  if (item.animationType === "slide") {
    const slideX = interpolate(springVal, [0, 1], [-100, 0]);
    transformStyle = `translateX(${slideX}px)`;
  } else if (item.animationType === "zoom-out") {
    const scale = interpolate(springVal, [0, 1], [1.3, 1]);
    transformStyle = `scale(${scale})`;
  }

  const positionStyle = POSITION_STYLES[item.position || "center"] || POSITION_STYLES.center;
  const activeTheme = THEME_STYLES[item.theme || "bold_clean"] || THEME_STYLES.bold_clean;

  return (
    <AbsoluteFill
      style={{
        display: "flex",
        flexDirection: "column",
        pointerEvents: "none",
        paddingLeft: "20px",
        paddingRight: "20px",
        ...positionStyle,
      }}
    >
      <div
        style={{
          opacity,
          transform: transformStyle,
          ...activeTheme.container,
          ...(item.bgColor ? { backgroundColor: item.bgColor } : {}),
          ...(item.borderColor ? { borderColor: item.borderColor } : {}),
        }}
      >
        {item.badgeText && (
          <span
            style={{
              fontSize: "14px",
              fontWeight: "bold",
              color: item.borderColor || "#4ADE80",
              textTransform: "uppercase",
              letterSpacing: "1px",
              display: "block",
              textAlign: "center",
              marginBottom: "4px",
            }}
          >
            {item.badgeText}
          </span>
        )}
        <h2
          style={{
            margin: "0",
            ...activeTheme.headline,
            ...(item.textColor ? { color: item.textColor } : {}),
          }}
        >
          {item.headline}
        </h2>
        {item.subtext && (
          <p
            style={{
              margin: "0",
              ...activeTheme.subtext,
              ...(item.subtextColor ? { color: item.subtextColor } : {}),
            }}
          >
            {item.subtext}
          </p>
        )}
      </div>
    </AbsoluteFill>
  );
};