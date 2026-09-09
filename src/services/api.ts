import { 
  EditPlan, 
  APIResponse as BaseAPIResponse, 
  WebhookFeedbackPayload, 
  WebhookApprovePayload, 
  WantedProp,
  MatchedPopup,
  BRollSuggestion
} from '@/types/videoAgent';

// Extend base APIResponse to guarantee videoUrl and renderedVideoUrl exist on returned types
export interface APIResponse extends BaseAPIResponse {
  videoUrl?: string;
  renderedVideoUrl?: string;
}

const N8N_WEBHOOK_URL = process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL || 'http://localhost:5678/webhook/d74024e6-ba1f-4b16-9ae5-40dd6c32dbca';

/**
 * Utility to strip local proxy wrappers (e.g. /api/proxy-video?url=...) 
 * to send direct public HTTP/S3 URLs to Remotion render engine.
 */
function unwrapProxyUrl(rawUrl?: string | null): string {
  if (!rawUrl || typeof rawUrl !== 'string') return '';
  let url = rawUrl.trim();
  let prev = '';
  
  while (url !== prev) {
    prev = url;
    try {
      url = decodeURIComponent(url);
    } catch {
      // Continue if string is already decoded
    }
    const match = url.match(/(?:proxy-video\?url=|proxy\?src=)(https?:\/\/[^\s&]+)/i);
    if (match && match[1]) {
      url = match[1].trim();
    }
  }
  return url;
}

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
 */
function normalizePlanPayload(data: any, fallbackPlan: EditPlan | null = null): EditPlan {
  let sourceData = data || {};

  // If sourceData is stringified or contains stringified output from Gemini/n8n
  if (typeof sourceData === 'string') {
    const parsed = parsePlanFromText(sourceData);
    if (parsed) sourceData = parsed;
  } else if (typeof sourceData === 'object') {
    const candidateText = sourceData.output || sourceData.text || sourceData.response || sourceData.result;
    if (typeof candidateText === 'string') {
      const parsed = parsePlanFromText(candidateText);
      if (parsed) {
        sourceData = { ...sourceData, ...parsed };
      }
    }
  }

  const rawPlan = sourceData?.plan || sourceData?.output || (
    sourceData?.recommended_cuts || sourceData?.b_roll_suggestions || sourceData?.popups || sourceData?.matched_popups || sourceData?.props 
      ? sourceData 
      : {}
  );

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
    start_time: typeof p.start_time === 'number' ? p.start_time : parseFloat(p.start_time || p.startTime || 0) || 0,
    end_time: typeof p.end_time === 'number' ? p.end_time : parseFloat(p.end_time || p.endTime || 0) || 0,
  }));

  const b_roll_suggestions: BRollSuggestion[] = rawBRoll.map((b: any, idx: number) => ({
    id: b.id || `broll_${Date.now()}_${idx}`,
    timecode: b.timecode || (b.seconds ? `${b.seconds}s` : '00:00'),
    prompt: b.prompt || b.description || b.text || '',
    description: b.description || b.subtext || '',
    seconds: typeof b.seconds === 'number' ? b.seconds : parseFloat(b.seconds || 0) || 0,
  }));

  return {
    version: rawPlan.version || sourceData?.version || fallbackPlan?.version || 'Draft v1',
    summary: rawPlan.summary || sourceData?.summary || sourceData?.message || fallbackPlan?.summary || 'AI Video Analysis Complete.',
    transcript: sourceData?.transcript || rawPlan.transcript || fallbackPlan?.transcript || '',
    recommended_cuts: rawCuts,
    b_roll_suggestions,
    popups,
    createdAt: rawPlan.createdAt || sourceData?.createdAt || fallbackPlan?.createdAt || new Date().toISOString(),
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
      videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
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
      throw new Error(`n8n returned an empty 0-byte response (HTTP ${response.status}). Ensure "Respond to Webhook" node is executed.`);
    }

    if (!response.ok) {
      throw new Error(`n8n Webhook returned HTTP ${response.status}`);
    }

    const normalizedPlan = normalizePlanPayload(data);
    const rawUrl = data.videoUrl || data.mediaUrl || data.url || data.publicUrl || data.fileUrl || undefined;
    const uploadedVideoUrl = unwrapProxyUrl(rawUrl);

    return {
      success: true,
      message: data.message || `Successfully ingested "${file.name}".`,
      plan: normalizedPlan,
      transcript: data.transcript || normalizedPlan.transcript || '',
      videoUrl: uploadedVideoUrl,
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
    const payload = {
      action: 'revision',
      sessionId,
      prompt: userMessage, // Enables {{ $json.body.prompt }} in n8n
      message: userMessage, // Preserves backward compatibility
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
        data = extracted || { message: responseText };
      }
    }

    if (!response.ok) {
      throw new Error(`n8n Webhook returned HTTP ${response.status}`);
    }

    const normalizedPlan = normalizePlanPayload(data, currentPlan);

    return {
      success: true,
      message: data.message || 'Revision received and plan updated.',
      plan: normalizedPlan,
    };
  } catch (error: any) {
    console.error('n8n feedback webhook error:', error);
    return {
      success: false,
      message: `n8n Feedback Error: ${error.message}`,
    };
  }
}

export async function approvePlan(
  sessionId: string,
  plan: EditPlan,
  isMock: boolean = false,
  sourceVideoUrl?: string | null,
  wantedProps: WantedProp[] = []
): Promise<APIResponse> {
  const cleanVideoUrl = unwrapProxyUrl(sourceVideoUrl);

  if (isMock) {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    return {
      success: true,
      message: '[Mock Mode] Simulated render complete.',
      plan: { ...plan, version: 'Approved' },
      renderedVideoUrl: cleanVideoUrl || '',
    };
  }

  try {
    const payload = {
      action: 'render',
      sessionId,
      plan,
      wantedProps,
      overlays: plan?.popups || [],
      videoUrl: cleanVideoUrl,
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
        data = extracted || { message: responseText };
      }
    }

    if (!response.ok) {
      throw new Error(`n8n Webhook returned HTTP ${response.status}`);
    }

    const approvedPlan = normalizePlanPayload(data, { ...plan, version: 'Approved' });
    const renderedUrl = unwrapProxyUrl(data.renderedVideoUrl || data.mediaUrl || data.url || data.videoUrl);

    return {
      success: true,
      message: data.message || 'Render initiated successfully!',
      plan: approvedPlan,
      renderedVideoUrl: renderedUrl || '',
    };
  } catch (error: any) {
    console.error('n8n approve webhook error:', error);
    return {
      success: false,
      message: `n8n Approve Error: ${error.message}`,
    };
  }
}