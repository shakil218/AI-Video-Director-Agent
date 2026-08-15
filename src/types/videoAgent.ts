export type PlanStatus = 'Draft v1' | 'Revised v2' | 'Revised v3' | 'Approved' | 'Rendering' | 'Rendered';

export interface RecommendedCut {
  id: string;
  startTime: string; // e.g. "00:04" or "00:04.500"
  endTime: string;   // e.g. "00:18"
  duration: string;  // e.g. "14s"
  reason: string;    // e.g. "Remove pause and filler words 'uh'/'um'"
  secondsStart?: number;
  secondsEnd?: number;
}

export interface BRollSuggestion {
  id: string;
  timecode: string;    // e.g. "00:12"
  prompt: string;      // e.g. "Cinematic drone shot of futuristic tech city skyline"
  description?: string;// e.g. "Visual overlay to emphasize AI innovation"
  seconds?: number;
}

export interface EditPlan {
  version: PlanStatus;
  summary: string;
  recommended_cuts: RecommendedCut[];
  b_roll_suggestions: BRollSuggestion[];
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'ai' | 'system';
  text: string;
  timestamp: string;
  planSnapshot?: EditPlan;
}

export interface WebhookUploadPayload {
  action: 'upload';
  sessionId: string;
  fileName: string;
  fileSize: number;
}

export interface WebhookFeedbackPayload {
  action: 'feedback';
  sessionId: string;
  message: string;
  currentPlan: EditPlan | null;
}

export interface WebhookApprovePayload {
  action: 'approve';
  sessionId: string;
  plan: EditPlan;
}

export interface APIResponse {
  success: boolean;
  message: string;
  plan?: EditPlan;
  renderedVideoUrl?: string;
}
