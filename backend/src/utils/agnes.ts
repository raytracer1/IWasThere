/**
 * Agnes AI image generation client.
 * POST https://apihub.agnes-ai.com/v1/images/generations
 */

const AGNES_BASE = 'https://apihub.agnes-ai.com/v1';

interface AgnesImageResponse {
  data: Array<{ url: string }>;
}

export async function generateImage(
  prompt: string,
  imageBase64: string,
  apiKey: string,
  size = '576x1024'
): Promise<string> {
  const resp = await fetch(`${AGNES_BASE}/images/generations`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'agnes-image-2.1-flash',
      prompt,
      size,
      extra_body: {
        image: [imageBase64],
        response_format: 'url',
      },
    }),
  });

  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`Agnes AI ${resp.status}: ${errText.slice(0, 200)}`);
  }

  const json = (await resp.json()) as AgnesImageResponse;
  const imageUrl = json.data?.[0]?.url;
  if (!imageUrl) {
    throw new Error('Agnes AI returned no image URL');
  }

  return imageUrl;
}
