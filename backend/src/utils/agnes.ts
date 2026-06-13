/**
 * Agnes AI image generation client.
 *
 * Uses the OpenAI-compatible endpoint:
 *   POST https://apihub.agnes-ai.com/v1/images/generations
 *
 * Model: agnes-image-2.0-flash (img2img mode for person-in-scene insertion)
 */

const AGNES_BASE = 'https://apihub.agnes-ai.com/v1';

interface AgnesImageResponse {
  data: Array<{ url: string }>;
  usage?: { generated_images: number };
}

/**
 * Generate an image using Agnes AI img2img mode.
 * Takes a reference image (user selfie) and an editing prompt,
 * returns the generated image URL.
 */
export async function generateImage(
  prompt: string,
  referenceImageUrl: string,
  apiKey: string,
  size = '1024x768'
): Promise<string> {
  const resp = await fetch(`${AGNES_BASE}/images/generations`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'agnes-image-2.0-flash',
      prompt,
      size,
      extra_body: {
        tags: ['img2img'],
        image: [referenceImageUrl],
        response_format: 'url',
      },
    }),
  });

  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`Agnes AI error (${resp.status}): ${errText}`);
  }

  const json = (await resp.json()) as AgnesImageResponse;
  const imageUrl = json.data?.[0]?.url;
  if (!imageUrl) {
    throw new Error('Agnes AI returned no image URL');
  }

  return imageUrl;
}
