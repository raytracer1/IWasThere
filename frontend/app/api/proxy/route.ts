/**
 * Proxy external video URLs to bypass CORS for client-side watermarking.
 */
export async function GET(req: Request) {
  const url = new URL(req.url).searchParams.get('url');
  if (!url) return new Response('url required', { status: 400 });

  const resp = await fetch(url);
  if (!resp.ok) return new Response('fetch failed', { status: 502 });

  return new Response(resp.body, {
    headers: {
      'Content-Type': resp.headers.get('Content-Type') || 'video/mp4',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
