// Type Definitions
export interface MatchedPopup {
  headline: string;
  subtext: string;
  position: string;
  theme: string;
  start_time: number;
  end_time: number;
}

export interface BRollSuggestion {
  id: string;
  timecode: string;
  prompt: string;
  description: string;
  seconds: number;
}

export interface RecommendedCut {
  id: string;
  startTime: number | string;
  endTime: number | string;
  start_time?: number;
  end_time?: number;
  secondsStart?: number;
  secondsEnd?: number;
  duration?: string | number;
  reason?: string;
  headline?: string;
  subtext?: string;
  label?: string;
  action?: 'keep' | 'cut' | 'trim' | string;
}

export interface EditPlan {
  version: string;
  summary: string;
  recommended_cuts: RecommendedCut[];
  b_roll_suggestions: BRollSuggestion[];
  popups: MatchedPopup[];
  createdAt: string;
  transcript?: string;
}

export interface APIResponse {
  success: boolean;
  message: string;
  plan?: EditPlan;
  transcript?: string;
  renderedVideoUrl?: string | null;
}

export interface WebhookFeedbackPayload {
  action: string;
  sessionId: string;
  message: string;
  currentPlan: EditPlan | null;
}

export interface WebhookApprovePayload {
  action: string;
  sessionId: string;
  plan: EditPlan;
  videoUrl?: string;
}

export interface WantedProp {
  [key: string]: any;
}

export interface ChatMessage {
  id: string;
  sender: 'system' | 'ai' | 'user';
  text: string;
  timestamp: string;
  planSnapshot?: EditPlan;
}

const N8N_WEBHOOK_URL =
  process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL ||
  'http://localhost:5678/webhook/d74024e6-ba1f-4b16-9ae5-40dd6c32dbca';

/**
 * Fallback parser to extract JSON objects from plain text or Markdown blocks (```json ... ```)
 * Includes regex parsing for plain text lines (Headline: "..." | Subtext: "..." | Position: ...).
 */
export function parsePlanFromText(responseText: string): any | null {
  if (!responseText || typeof responseText !== 'string') return null;

  // 1. Try direct JSON parse
  try {
    return JSON.parse(responseText);
  } catch {
    // 2. Extract JSON block inside markdown ```json ... ``` or plain { ... }
    const jsonMatch =
      responseText.match(/```json\s*([\s\S]*?)\s*```/) ||
      responseText.match(/\{[\s\S]*\}/);

    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[1] || jsonMatch[0]);
      } catch (err) {
        console.error('Failed to parse extracted JSON block:', err);
      }
    }
  }

  // 3. Line-by-Line Regex Fallback for plain text format (Headline: "..." | Subtext: "...")
  const lineMatches = responseText.matchAll(
    /(?:Headline:\s*"([^"]+)")\s*\|\s*(?:Subtext:\s*"([^"]+)")\s*\|\s*(?:Position:\s*([^\n|]+))/gi
  );

  const fallbackPopups: MatchedPopup[] = [];
  for (const match of lineMatches) {
    fallbackPopups.push({
      headline: match[1] || '',
      subtext: match[2] || '',
      position: (match[3] || 'bottom').trim(),
      theme: 'youtube_shorts',
      start_time: 0,
      end_time: 3,
    });
  }

  if (fallbackPopups.length > 0) {
    return { popups: fallbackPopups };
  }

  return null;
}

/**
 * Normalizes raw payload from n8n into a strict EditPlan object.
 * Fixes key mismatches, un-wraps embedded JSON text from Gemini, 
 * and retains existing items from fallbackPlan if n8n returns a status-only response.
 */
function normalizePlanPayload(data: any, fallbackPlan: EditPlan | null = null): EditPlan {
  let sourceData = data || {};

  // If sourceData is stringified or contains stringified output from Gemini/n8n
  if (typeof sourceData === 'string') {
    const parsed = parsePlanFromText(sourceData);
    if (parsed) sourceData = parsed;
  } else if (typeof sourceData === 'object') {
    const candidateText =
      sourceData.output || sourceData.text || sourceData.response || sourceData.result;
    if (typeof candidateText === 'string') {
      const parsed = parsePlanFromText(candidateText);
      if (parsed) {
        sourceData = { ...sourceData, ...parsed };
      }
    }
  }

  const rawPlan =
    sourceData?.plan ||
    sourceData?.output ||
    (sourceData?.recommended_cuts ||
    sourceData?.b_roll_suggestions ||
    sourceData?.popups ||
    sourceData?.matched_popups ||
    sourceData?.props
      ? sourceData
      : {});

  let rawPopups: any[] =
    rawPlan.popups ||
    rawPlan.matched_popups ||
    rawPlan.props ||
    sourceData?.popups ||
    sourceData?.matched_popups ||
    sourceData?.props ||
    (fallbackPlan?.popups?.length ? fallbackPlan.popups : []);

  let rawBRoll: any[] =
    rawPlan.b_roll_suggestions ||
    rawPlan.broll ||
    sourceData?.b_roll_suggestions ||
    sourceData?.broll ||
    (fallbackPlan?.b_roll_suggestions?.length ? fallbackPlan.b_roll_suggestions : []);

  let rawCuts: any[] =
    rawPlan.recommended_cuts ||
    rawPlan.cuts ||
    rawPlan.timeline_cuts ||
    sourceData?.recommended_cuts ||
    sourceData?.cuts ||
    (fallbackPlan?.recommended_cuts?.length ? fallbackPlan.recommended_cuts : []);

  // Auto-detect misplaced popups residing in b_roll_suggestions array
  const misplacedPopups = rawBRoll.filter((item: any) => item && (item.headline || item.subtext));
  if (misplacedPopups.length > 0) {
    rawPopups = [...rawPopups, ...misplacedPopups];
    rawBRoll = rawBRoll.filter((item: any) => !item.headline && !item.subtext);
  }

  const popups: MatchedPopup[] = rawPopups.map((p: any) => ({
    headline: p.headline || p.prompt || p.text || '',
    subtext: p.subtext || p.description || '',
    position: p.position || 'bottom',
    theme: p.theme || 'youtube_shorts',
    start_time:
      typeof p.start_time === 'number'
        ? p.start_time
        : parseFloat(p.start_time || p.startTime || 0) || 0,
    end_time:
      typeof p.end_time === 'number'
        ? p.end_time
        : parseFloat(p.end_time || p.endTime || 0) || 0,
  }));

  const b_roll_suggestions: BRollSuggestion[] = rawBRoll.map((b: any, idx: number) => ({
    id: b.id || `broll_${Date.now()}_${idx}`,
    timecode: b.timecode || (b.seconds ? `${b.seconds}s` : '00:00'),
    prompt: b.prompt || b.description || b.text || '',
    description: b.description || b.subtext || '',
    seconds: typeof b.seconds === 'number' ? b.seconds : parseFloat(b.seconds || 0) || 0,
  }));

  const recommended_cuts: RecommendedCut[] = rawCuts.map((c: any, idx: number) => {
    const startVal = c.startTime ?? c.start_time ?? c.secondsStart ?? 0;
    const endVal = c.endTime ?? c.end_time ?? c.secondsEnd ?? 0;
    const numStart = typeof startVal === 'number' ? startVal : parseFloat(startVal) || 0;
    const numEnd = typeof endVal === 'number' ? endVal : parseFloat(endVal) || 0;
    const computedDuration = c.duration || `${Math.max(0, numEnd - numStart).toFixed(1)}s`;

    return {
      id: c.id || `cut_${Date.now()}_${idx}`,
      startTime: startVal,
      endTime: endVal,
      start_time: numStart,
      end_time: numEnd,
      secondsStart: numStart,
      secondsEnd: numEnd,
      duration: computedDuration,
      reason: c.reason || c.description || '',
      label: c.label || c.headline || '',
      action: c.action || 'cut',
    };
  });

  return {
    version: rawPlan.version || sourceData?.version || fallbackPlan?.version || 'Draft v1',
    summary:
      rawPlan.summary ||
      sourceData?.summary ||
      sourceData?.message ||
      fallbackPlan?.summary ||
      'AI Video Analysis Complete.',
    transcript: sourceData?.transcript || rawPlan.transcript || fallbackPlan?.transcript || '',
    recommended_cuts,
    b_roll_suggestions,
    popups,
    createdAt:
      rawPlan.createdAt || sourceData?.createdAt || fallbackPlan?.createdAt || new Date().toISOString(),
  };
}

const MOCK_INITIAL_PLAN: EditPlan = {
  version: 'Draft v1',
  summary: 'Extracted audio & analyzed speech transcript.',
  recommended_cuts: [],
  b_roll_suggestions: [],
  popups: [],
  createdAt: new Date().toISOString(),
};

export async function uploadVideo(
  file: File,
  sessionId: string,
  isMock: boolean = false,
  wantedProps: WantedProp[] = []
): Promise<APIResponse> {
  if (isMock) {
    await new Promise((resolve) => setTimeout(resolve, 1500));
    return {
      success: true,
      message: `[Mock Mode] Ingested "${file.name}".`,
      plan: MOCK_INITIAL_PLAN,
      transcript: 'This is a sample mock transcript for testing visual layout.',
    };
  }

  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('sessionId', sessionId);
    formData.append('action', 'upload');
    if (wantedProps.length > 0) {
      formData.append('wantedProps', JSON.stringify(wantedProps));
    }

    const response = await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      body: formData,
    });

    const responseText = await response.text();
    let data: any = {};

    if (responseText.trim()) {
      try {
        data = JSON.parse(responseText);
      } catch (parseErr) {
        const extracted = parsePlanFromText(responseText);
        if (extracted) {
          data = extracted;
        } else {
          data = { message: responseText };
        }
      }
    } else {
      throw new Error(
        `n8n returned an empty 0-byte response (HTTP ${response.status}). Ensure "Respond to Webhook" node is executed.`
      );
    }

    if (!response.ok) {
      throw new Error(`n8n Webhook returned HTTP ${response.status}`);
    }

    const normalizedPlan = normalizePlanPayload(data);

    return {
      success: true,
      message: data.message || `Successfully ingested "${file.name}".`,
      plan: normalizedPlan,
      transcript: data.transcript || normalizedPlan.transcript || '',
    };
  } catch (error: any) {
    console.error('n8n upload webhook error:', error);
    return {
      success: false,
      message: `n8n Webhook Error: ${error.message || 'Unknown network error'}`,
    };
  }
}

export async function sendFeedback(
  sessionId: string,
  userMessage: string,
  currentPlan: EditPlan | null,
  isMock: boolean = false
): Promise<APIResponse> {
  if (isMock) {
    await new Promise((resolve) => setTimeout(resolve, 1500));
    return {
      success: true,
      message: `[Mock Mode] Revision noted: "${userMessage}".`,
      plan: currentPlan || MOCK_INITIAL_PLAN,
    };
  }

  try {
    const payload: WebhookFeedbackPayload = {
      action: 'feedback',
      sessionId,
      message: userMessage,
      currentPlan,
    };

    const response = await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const responseText = await response.text();
    let data: any = {};

    if (responseText.trim()) {
      try {
        data = JSON.parse(responseText);
      } catch (parseErr) {
        const extracted = parsePlanFromText(responseText);
        if (extracted) {
          data = extracted;
        } else {
          data = { message: responseText };
        }
      }
    } else {
      throw new Error(
        `n8n returned an empty 0-byte response (HTTP ${response.status}). Ensure "Respond to Webhook" node is executed.`
      );
    }

    if (!response.ok) {
      throw new Error(`n8n Webhook returned HTTP ${response.status}`);
    }

    const normalizedPlan = normalizePlanPayload(data, currentPlan);

    return {
      success: true,
      message: data.message || `Feedback processed: "${userMessage}".`,
      plan: normalizedPlan,
    };
  } catch (error: any) {
    console.error('n8n feedback webhook error:', error);
    return {
      success: false,
      message: `n8n Feedback Error: ${error.message || 'Unknown network error'}`,
    };
  }
}

export async function approvePlan(
  sessionId: string,
  plan: EditPlan,
  isMock: boolean = false,
  videoUrl?: string | null
): Promise<APIResponse> {
  if (isMock) {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    return {
      success: true,
      message: '[Mock Mode] Plan approved! Simulated rendering completed.',
      plan: { ...plan, version: 'Approved' },
      renderedVideoUrl:
        videoUrl ||
        'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    };
  }

  try {
    const payload: WebhookApprovePayload = {
      action: 'approve',
      sessionId,
      plan,
      videoUrl: videoUrl || undefined,
    };

    const response = await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const responseText = await response.text();
    let data: any = {};

    if (responseText.trim()) {
      try {
        data = JSON.parse(responseText);
      } catch (parseErr) {
        const extracted = parsePlanFromText(responseText);
        if (extracted) {
          data = extracted;
        } else {
          data = { message: responseText };
        }
      }
    } else {
      throw new Error(
        `n8n returned an empty 0-byte response (HTTP ${response.status}). Ensure "Respond to Webhook" node is executed.`
      );
    }

    if (!response.ok) {
      throw new Error(`n8n Webhook returned HTTP ${response.status}`);
    }

    const approvedPlan: EditPlan = {
      ...plan,
      version: 'Approved',
    };

    return {
      success: true,
      message: data.message || 'Edit plan approved and rendering triggered successfully!',
      plan: approvedPlan,
      renderedVideoUrl: data.renderedVideoUrl || data.output_video_url || data.url || null,
    };
  } catch (error: any) {
    console.error('n8n approve webhook error:', error);
    return {
      success: false,
      message: `n8n Approve Error: ${error.message || 'Unknown network error'}`,
    };
  }
}