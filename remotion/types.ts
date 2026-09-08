export interface PopupItem {
  headline: string;
  subtext?: string;
  badgeText?: string;
  position?:
    | "top"
    | "top-left"
    | "top-right"
    | "center"
    | "center-left"
    | "center-right"
    | "bottom"
    | "bottom-left"
    | "bottom-right"
    | string;
  theme?: "bold_clean" | "youtube_shorts" | string;
  animationType?: "bounce" | "slide" | "zoom-out" | "spring";
  start_time: number;
  end_time?: number;
  start_frame?: number;
  duration_in_frames?: number;
  textColor?: string;
  subtextColor?: string;
  bgColor?: string;
  borderColor?: string;
}

export interface LowerThirdItem {
  name: string;
  title: string;
  position?: string;
  start_time: number;
  end_time?: number;
  start_frame?: number;
  duration_in_frames?: number;
}

export interface MainReelProps extends Record<string, unknown> {
  videoUrl: string;
  popups?: PopupItem[];
  lower_thirds?: LowerThirdItem[];
}