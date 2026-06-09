import { fal } from "@fal-ai/client";
import { DEFAULT_RESOLUTION } from '../shared';

export async function submitSwapJob(
  apiKey: string,
  videoUrl: string,
  imageUrl: string,
  resolution: string = DEFAULT_RESOLUTION
): Promise<string> {
  fal.config({ credentials: apiKey });

  const result = await fal.queue.submit("fal-ai/pixverse/swap", {
    input: {
      video_url: videoUrl,
      image_url: imageUrl,
      mode: "person",
      keyframe_id: 1,
      resolution,
    },
  });

  return result.requestId;
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

  const s = statusResp as { status: string; response_url?: string };

  let videoUrl: string | undefined;
  if (s.status === 'COMPLETED') {
    try {
      const result = await fal.queue.result("fal-ai/pixverse/swap", { requestId });
      const r = result as { data?: { video?: { url: string } } };
      videoUrl = r.data?.video?.url;
    } catch {
      // fallback: try response_url
      if (s.response_url) {
        try {
          const res = await fetch(s.response_url);
          const d = await res.json() as { video?: { url: string } };
          videoUrl = d.video?.url;
        } catch {}
      }
    }
  }

  return { status: s.status, videoUrl };
}
