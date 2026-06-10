import { fal } from "@fal-ai/client";
import { DEFAULT_RESOLUTION } from '../shared';

export async function submitSwapJob(
  apiKey: string,
  videoUrl: string,
  imageUrl: string,
  keyframeId: number,
  seed: number,
  resolution: string = DEFAULT_RESOLUTION
): Promise<string> {
  fal.config({ credentials: apiKey });

  const result = await fal.queue.submit("fal-ai/pixverse/swap", {
    input: {
      video_url: videoUrl,
      image_url: imageUrl,
      mode: "person",
      keyframe_id: keyframeId,
      seed,
      resolution: resolution as "720p" | "540p" | "360p" | undefined,
    },
  });

  console.log(`fal.submit raw: ${JSON.stringify(result)}`);

  // Try all possible paths for request_id
  const r = result as unknown as Record<string, unknown>;
  const requestId =
    (r.requestId as string) ??
    (r.request_id as string) ??
    (r.data as Record<string, unknown> | undefined)?.request_id as string ??
    (r.data as Record<string, unknown> | undefined)?.requestId as string;

  if (!requestId) {
    throw new Error(`Could not extract requestId from fal response: ${JSON.stringify(result)}`);
  }

  return requestId;
}

export async function pollSwapStatus(
  apiKey: string,
  requestId: string
): Promise<{ status: string; videoUrl?: string }> {
  fal.config({ credentials: apiKey });

  const statusResp = await fal.queue.status("fal-ai/pixverse/swap", {
    requestId,
    logs: true,
  });

  // Log raw response for debugging
  console.log(`fal.status raw: ${JSON.stringify(statusResp)}`);

  // Try multiple paths for status
  const raw = statusResp as unknown as Record<string, unknown>;
  const status: string =
    (raw.status as string) ??
    (raw.data as Record<string, unknown> | undefined)?.status as string ??
    'UNKNOWN';

  let videoUrl: string | undefined;
  if (status === 'COMPLETED') {
    try {
      const result = await fal.queue.result("fal-ai/pixverse/swap", { requestId });
      console.log(`fal.result raw: ${JSON.stringify(result)}`);

      const r = result as unknown as Record<string, unknown>;

      // Try multiple paths for video URL (always extract .url from nested objects)
      const videoObj = (r.video as { url?: string } | undefined) ??
        (r.data as Record<string, unknown> | undefined)?.video as { url?: string } | undefined;
      if (videoObj && typeof videoObj === 'object' && 'url' in videoObj) {
        videoUrl = videoObj.url as string;
      }
      // Also try direct string paths
      if (!videoUrl) {
        videoUrl = (r.data as Record<string, unknown> | undefined)?.video_url as string | undefined;
      }

      // Fallback: try response_url
      if (!videoUrl) {
        const responseUrl = (raw.response_url as string) ?? (r.response_url as string);
        if (responseUrl) {
          try {
            const res = await fetch(responseUrl);
            const d = await res.json() as Record<string, unknown>;
            const vObj = (d.video as { url?: string } | undefined) ??
              (d.data as Record<string, unknown> | undefined)?.video as { url?: string } | undefined;
            if (vObj && typeof vObj === 'object') {
              videoUrl = (vObj as { url: string }).url;
            }
          } catch {}
        }
      }
    } catch (err) {
      console.error('fal.result error:', err);
    }
  }

  return { status, videoUrl };
}
