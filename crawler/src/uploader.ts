import fs from 'node:fs';
import { randomUUID } from 'node:crypto';
import type { VideoItem } from './types';

export interface UploadResult {
  success: boolean;
  eventId?: string;
  error?: string;
}

/**
 * Upload a file to the admin upload endpoint.
 */
async function uploadFile(
  workerUrl: string,
  token: string,
  eventId: string,
  name: string,
  filePath: string,
  contentType: string
): Promise<string> {
  const buffer = fs.readFileSync(filePath);
  const blob = new Blob([buffer], { type: contentType });
  const ext = filePath.split('.').pop() || 'bin';
  const formData = new FormData();
  formData.append('file', blob, `${name}.${ext}`);

  const resp = await fetch(`${workerUrl}/admin/upload?eventId=${eventId}&name=${name}`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
    body: formData,
    signal: AbortSignal.timeout(180_000),
  });

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ error: 'Upload failed' }));
    throw new Error(err.error ?? `HTTP ${resp.status}`);
  }

  return `events/${eventId}/${name}.${ext}`;
}

/**
 * Create an event via the admin API.
 * Files are uploaded first, then the event record is posted as JSON.
 */
export async function uploadEvent(
  workerUrl: string,
  token: string,
  item: VideoItem,
  videoPath: string,
  thumbnailPath?: string
): Promise<UploadResult> {
  try {
    const eventId = randomUUID();

    // Step 1: Upload files in parallel
    const uploads: Promise<string>[] = [];

    // Thumbnail
    if (thumbnailPath && fs.existsSync(thumbnailPath)) {
      uploads.push(uploadFile(workerUrl, token, eventId, 'thumbnail', thumbnailPath, 'image/jpeg'));
    }

    // Reference video
    uploads.push(uploadFile(workerUrl, token, eventId, 'reference', videoPath, 'video/mp4'));

    const keys = await Promise.allSettled(uploads);
    const failedUpload = keys.find(k => k.status === 'rejected');
    if (failedUpload && failedUpload.status === 'rejected') {
      return { success: false, error: `Upload failed: ${failedUpload.reason}` };
    }

    // Step 2: Build event JSON
    const thumbnailKey = keys[0]?.status === 'fulfilled' ? keys[0].value : undefined;
    const videoKey = keys[keys.length - 1]?.status === 'fulfilled' ? keys[keys.length - 1].value : undefined;

    const body = {
      id: eventId,
      title: item.title,
      category: item.category,
      event_type: 'goal_celebration',
      scene: {
        description: item.description || '',
      },
      emotion: {},
      camera: {},
      user: {},
      entities: {},
      moment: {},
      generation: {
        prompt_template: `A sports video of ${item.title}. ${item.description || ''}`,
      },
      thumbnailUrl: thumbnailKey,
      referenceVideo: videoKey,
      status: 'draft',
    };

    // Step 3: POST event
    const resp = await fetch(`${workerUrl}/admin/events`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30_000),
    });

    const data = await resp.json() as { success: boolean; error?: string; data?: { id: string } };

    if (!resp.ok || !data.success) {
      return { success: false, error: data.error ?? `HTTP ${resp.status}` };
    }

    return { success: true, eventId: data.data?.id ?? eventId };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Upload failed' };
  }
}
