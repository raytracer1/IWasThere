/**
 * Agnes AI client — image & video generation.
 */

const AGNES_BASE = 'https://apihub.agnes-ai.com/v1';

async function agnesPost(path: string, body: Record<string, unknown>, apiKey: string): Promise<Record<string, unknown>> {
  const resp = await fetch(`${AGNES_BASE}${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`Agnes AI ${resp.status}: ${errText.slice(0, 200)}`);
  }
  return resp.json() as Promise<Record<string, unknown>>;
}

/** Generate image from base64 (reliable, no URL download needed). */
export async function generateImage(
  prompt: string,
  imageBase64: string,
  apiKey: string,
  size = '576x1024',
): Promise<string> {
  const body = {
    model: 'agnes-image-2.1-flash',
    prompt,
    size,
    extra_body: {
      image: [imageBase64],
      response_format: 'url',
    },
  };
  console.log(`[agnes] Image request:`, JSON.stringify({ ...body, extra_body: { image: [`[${imageBase64.length} chars]`], response_format: 'url' } }));
  const json = await agnesPost('/images/generations', body, apiKey);

  const url = (json.data as Array<{ url: string }>)?.[0]?.url;
  if (!url) throw new Error('Agnes AI returned no image URL');
  return url;
}

/** Submit video generation task. Returns task_id. */
export async function submitVideo(
  prompt: string,
  imageUrl: string,
  apiKey: string,
  numFrames = 121,
  frameRate = 24,
  width = 576,
  height = 1024,
): Promise<string> {
  const json = await agnesPost('/videos', {
    model: 'agnes-video-v2.0',
    prompt,
    image: imageUrl,
    width,
    height,
    num_frames: numFrames,
    frame_rate: frameRate,
  }, apiKey);

  const taskId = (json.task_id as string) || (json.id as string);
  if (!taskId) throw new Error('Agnes AI returned no task_id');
  return taskId;
}

/** Poll video task. Returns video URL if completed, null if still processing. */
export async function pollVideo(taskId: string, apiKey: string): Promise<string | null> {
  const resp = await fetch(`${AGNES_BASE}/videos/${taskId}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
    signal: AbortSignal.timeout(10_000),
  });
  if (!resp.ok) return null;
  const json = await resp.json() as Record<string, unknown>;
  const status = json.status as string;

  if (status === 'failed' || status === 'error') {
    const err = json.error;
    const msg = typeof err === 'object' && err !== null
      ? `${(err as Record<string, unknown>).code}: ${(err as Record<string, unknown>).message}`
      : String(err);
    throw new Error(`Agnes video failed: ${msg}`);
  }
  if (status !== 'completed') return null;

  return (json.remixed_from_video_id as string)
    || (json.url as string)
    || (json.video_url as string)
    || (((json.data as Array<Record<string, unknown>>)?.[0]?.url) as string)
    || null;
}
