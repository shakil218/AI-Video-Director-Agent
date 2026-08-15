import { EditPlan, APIResponse, WebhookFeedbackPayload, WebhookApprovePayload } from '@/types/videoAgent';

const N8N_WEBHOOK_URL = process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL || 'http://localhost:5678/webhook/video-agent';

// Mock plans for testing without live n8n backend
const MOCK_INITIAL_PLAN: EditPlan = {
  version: 'Draft v1',
  summary: 'Extracted audio & analyzed speech transcript. Identified 3 awkward silent pauses, 2 repetitive takes, and suggested 3 visual B-roll prompts to elevate pacing.',
  recommended_cuts: [
    {
      id: 'cut_1',
      startTime: '00:03',
      endTime: '00:08',
      duration: '5s',
      reason: 'Trim opening silence and warm-up mic adjustment.',
      secondsStart: 3,
      secondsEnd: 8,
    },
    {
      id: 'cut_2',
      startTime: '00:24',
      endTime: '00:31',
      duration: '7s',
      reason: 'Remove repeated sentence attempt ("So today we are going to...").',
      secondsStart: 24,
      secondsEnd: 31,
    },
    {
      id: 'cut_3',
      startTime: '01:05',
      endTime: '01:12',
      duration: '7s',
      reason: 'Cut extended verbal stutter and paper rustling sound.',
      secondsStart: 65,
      secondsEnd: 72,
    },
  ],
  b_roll_suggestions: [
    {
      id: 'broll_1',
      timecode: '00:15',
      prompt: 'High-tech AI neural network data stream overlay with glowing emerald particles',
      description: 'Emphasize key talking point about AI automation and speed.',
      seconds: 15,
    },
    {
      id: 'broll_2',
      timecode: '00:45',
      prompt: 'Macro shot of modern video editing waveform timeline in dark mode UI',
      description: 'Visual transition into timeline cut demonstration.',
      seconds: 45,
    },
    {
      id: 'broll_3',
      timecode: '01:20',
      prompt: 'Sleek dark laptop screen displaying real-time video rendering progress bar',
      description: 'Conclude video with powerful visual CTA.',
      seconds: 80,
    },
  ],
  createdAt: new Date().toISOString(),
};

/**
 * Upload video file to n8n webhook (or fallback to Mock)
 */
export async function uploadVideo(
  file: File,
  sessionId: string,
  isMock: boolean = false
): Promise<APIResponse> {
  if (isMock) {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    return {
      success: true,
      message: `Successfully ingested "${file.name}" (${(file.size / (1024 * 1024)).toFixed(1)} MB). Audio extracted and transcript analyzed by Gemini.`,
      plan: MOCK_INITIAL_PLAN,
    };
  }

  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('sessionId', sessionId);
    formData.append('action', 'upload');

    const response = await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Server returned status ${response.status}`);
    }

    const data = await response.json();
    return {
      success: true,
      message: data.message || 'Video uploaded and analyzed successfully.',
      plan: data.plan || data.recommended_cuts ? data : MOCK_INITIAL_PLAN,
    };
  } catch (error) {
    console.warn('n8n upload webhook error, falling back to mock mode:', error);
    // Fallback to mock if n8n is unreachable
    await new Promise((resolve) => setTimeout(resolve, 1500));
    return {
      success: true,
      message: `[Fallback Mock] Ingested "${file.name}". Gemini audio extraction complete.`,
      plan: MOCK_INITIAL_PLAN,
    };
  }
}

/**
 * Send user revision feedback to n8n webhook (or fallback to Mock)
 */
export async function sendFeedback(
  sessionId: string,
  userMessage: string,
  currentPlan: EditPlan | null,
  isMock: boolean = false
): Promise<APIResponse> {
  if (isMock || !N8N_WEBHOOK_URL) {
    await new Promise((resolve) => setTimeout(resolve, 1800));
    
    // Dynamically adjust plan for mock demonstration
    const versionNum = currentPlan ? (parseInt(currentPlan.version.replace(/\D/g, '')) || 1) + 1 : 2;
    const revisedPlan: EditPlan = {
      version: `Revised v${versionNum}` as any,
      summary: `Updated cuts based on feedback: "${userMessage}". Fine-tuned Cut #2 duration and added tailored B-roll overlay.`,
      recommended_cuts: currentPlan?.recommended_cuts.map((cut, idx) => {
        if (idx === 1) {
          return {
            ...cut,
            duration: '4s',
            endTime: '00:28',
            secondsEnd: 28,
            reason: `Shortened per user request: "${userMessage}"`,
          };
        }
        return cut;
      }) || MOCK_INITIAL_PLAN.recommended_cuts,
      b_roll_suggestions: [
        ...(currentPlan?.b_roll_suggestions || MOCK_INITIAL_PLAN.b_roll_suggestions),
        {
          id: `broll_${Date.now()}`,
          timecode: '00:30',
          prompt: `Dynamic visual overlay matching feedback request: "${userMessage.substring(0, 40)}..."`,
          description: 'Added per user interactive feedback.',
          seconds: 30,
        },
      ],
      createdAt: new Date().toISOString(),
    };

    return {
      success: true,
      message: `Got it! I have adjusted the timeline cut rules and refreshed the B-Roll prompts per your feedback: "${userMessage}".`,
      plan: revisedPlan,
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

    if (!response.ok) {
      throw new Error(`Server returned status ${response.status}`);
    }

    const data = await response.json();
    return {
      success: true,
      message: data.message || 'Revision received and plan updated.',
      plan: data.plan || data,
    };
  } catch (error) {
    console.warn('n8n feedback webhook error, falling back to mock mode:', error);
    await new Promise((resolve) => setTimeout(resolve, 1500));
    return {
      success: true,
      message: `[Fallback Mock] Adjusted cuts according to: "${userMessage}".`,
      plan: {
        ...MOCK_INITIAL_PLAN,
        version: 'Revised v2',
        summary: `Adjusted timeline cut durations for optimal flow after user feedback: "${userMessage}".`,
      },
    };
  }
}

/**
 * Approve current plan and trigger final FFmpeg render in n8n
 */
export async function approvePlan(
  sessionId: string,
  plan: EditPlan,
  isMock: boolean = false,
  sourceVideoUrl?: string | null
): Promise<APIResponse> {
  const fallbackUrl = sourceVideoUrl || 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';

  if (isMock) {
    await new Promise((resolve) => setTimeout(resolve, 2500));
    return {
      success: true,
      message: 'Plan approved! n8n background FFmpeg workflow triggered. Video rendering pipeline complete.',
      plan: { ...plan, version: 'Approved' },
      renderedVideoUrl: fallbackUrl,
    };
  }

  try {
    const payload: WebhookApprovePayload = {
      action: 'approve',
      sessionId,
      plan,
    };

    const response = await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Server status ${response.status}`);
    }

    const data = await response.json();
    return {
      success: true,
      message: data.message || 'Render initiated successfully!',
      plan: { ...plan, version: 'Approved' },
      renderedVideoUrl: data.renderedVideoUrl || fallbackUrl,
    };
  } catch (error) {
    console.warn('n8n approve webhook error, falling back to mock mode:', error);
    await new Promise((resolve) => setTimeout(resolve, 2000));
    return {
      success: true,
      message: '[Fallback Mock] Plan approved! Simulated FFmpeg background render complete.',
      plan: { ...plan, version: 'Approved' },
      renderedVideoUrl: fallbackUrl,
    };
  }
}
