import React from "react";
import { Composition } from "remotion";
import { MainComposition } from "./Composition";
import { MainReelProps } from "./types";
import "./index.css";

const FPS = 30;

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="MainReel"
        component={MainComposition}
        fps={FPS}
        width={1080}
        height={1920}
        defaultProps={{
          videoUrl: "https://remotion-assets.s3.eu-central-1.amazonaws.com/BigBuckBunny.mp4",
          popups: [
            {
              headline: "Meeting a Professional",
              subtext: "Working since 1992 (১৯৯২ সাল থেকে জব করছেন)",
              position: "center",
              theme: "bold_clean",
              start_time: 0.5,
              end_time: 3.0,
            },
            {
              headline: "1992: The First Step",
              subtext: "Handwritten CV (হাতে লেখা সিভি)",
              position: "center",
              theme: "bold_clean",
              start_time: 7.5,
              end_time: 12.0,
            },
          ],
        }}
        calculateMetadata={async ({ props }) => ({
          durationInFrames: getDurationInFrames(props),
        })}
      />
    </>
  );
};

function getDurationInFrames(props: MainReelProps): number {
  const requestedFrames = Number(props.durationInFrames);
  if (Number.isFinite(requestedFrames) && requestedFrames > 0) {
    return Math.max(1, Math.ceil(requestedFrames));
  }

  const sourceDurationInSeconds = Number(props.sourceDurationInSeconds);
  if (Number.isFinite(sourceDurationInSeconds) && sourceDurationInSeconds > 0) {
    return Math.max(1, Math.ceil(sourceDurationInSeconds * FPS));
  }

  return 1;
}