import fs from 'node:fs';
import type { VideoItem } from './types';

export interface UploadResult {
  success: boolean;
  eventId?: string;
  error?: string;
}

/**
 * Upload a video event to the Worker API.
 * Uses multipart form data matching the POST /admin/events endpoint.
 */
export async function uploadEvent(
  workerUrl: string,
  token: string,
  item: VideoItem,
  videoPath: string,
  thumbnailPath?: string
): Promise<UploadResult> {
  const formData = new FormData();

  formData.append('title', item.title);
  formData.append('category', item.category);
  if (item.description) formData.append('description', item.description);
  if (item.duration) formData.append('duration', String(item.duration));
  formData.append('status', 'draft');

  // Attach video file
  const videoBuffer = fs.readFileSync(videoPath);
  const videoBlob = new Blob([videoBuffer], { type: 'video/mp4' });
  formData.append('video', videoBlob, `${item.id}.mp4`);

  // Attach thumbnail if available
  if (thumbnailPath && fs.existsSync(thumbnailPath)) {
    const imgBuffer = fs.readFileSync(thumbnailPath);
    const imgBlob = new Blob([imgBuffer], { type: 'image/jpeg' });
    formData.append('thumbnail', imgBlob, `${item.id}.jpg`);
  }

  try {
    const response = await fetch(`${workerUrl}/admin/events`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
      signal: AbortSignal.timeout(180_000),
    });

    const data = await response.json() as { success: boolean; error?: string; data?: { id: string } };

    if (!response.ok || !data.success) {
      return { success: false, error: data.error ?? `HTTP ${response.status}` };
    }

    return { success: true, eventId: data.data?.id };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Upload failed' };
  }
}
