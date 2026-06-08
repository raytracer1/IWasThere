import { DEFAULT_RESOLUTION } from '../shared';

const FAL_API_BASE = 'https://queue.fal.run/fal-ai/pixverse/swap';

interface FalSubmitResponse {
  request_id: string;
  status: string;
}

interface FalStatusResponse {
  request_id: string;
  status: 'IN_QUEUE' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  video?: {
    url: string;
    content_type?: string;
    file_name?: string;
    file_size?: number;
  };
  error?: string;
}

/**
 * Submit a swap job to fal.ai.
 * Returns the request_id for polling.
 */
export async function submitSwapJob(
  apiKey: string,
  videoUrl: string,
  imageUrl: string,
  resolution: string = DEFAULT_RESOLUTION
): Promise<string> {
  const response = await fetch(FAL_API_BASE, {
    method: 'POST',
    headers: {
      'Authorization': `Key ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      video_url: videoUrl,
      image_url: imageUrl,
      mode: 'person',
      keyframe_id: 1,
      resolution,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`fal.ai submit failed: ${response.status} ${errorText}`);
  }

  const data = (await response.json()) as FalSubmitResponse;
  return data.request_id;
}

/**
 * Poll the status of a fal.ai swap job.
 */
export async function pollSwapStatus(
  apiKey: string,
  requestId: string
): Promise<FalStatusResponse> {
  const response = await fetch(`${FAL_API_BASE}/requests/${requestId}/status`, {
    method: 'GET',
    headers: {
      'Authorization': `Key ${apiKey}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`fal.ai poll failed: ${response.status} ${errorText}`);
  }

  const data = (await response.json()) as FalStatusResponse;
  return data;
}

/**
 * Get the result of a completed fal.ai job.
 */
export async function getSwapResult(
  apiKey: string,
  requestId: string
): Promise<FalStatusResponse> {
  const response = await fetch(`${FAL_API_BASE}/requests/${requestId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Key ${apiKey}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`fal.ai result fetch failed: ${response.status} ${errorText}`);
  }

  return (await response.json()) as FalStatusResponse;
}
