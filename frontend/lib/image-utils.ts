/**
 * Compress an image file to WebP format using canvas.
 * Returns a new File with the same base name + .webp extension.
 */
export async function compressToWebP(
  file: File,
  options: { quality?: number } = {}
): Promise<File> {
  const { quality = 0.85 } = options;

  // Skip if already a small WebP
  if (file.type === 'image/webp' && file.size < 512 * 1024) {
    return file;
  }

  const bitmap = await createImageBitmap(file);
  const { width, height } = bitmap;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close();

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => {
      if (b) resolve(b);
      else reject(new Error('Canvas toBlob failed'));
    }, 'image/webp', quality);
  });

  const baseName = file.name.replace(/\.[^.]+$/, '');
  return new File([blob], `${baseName}.webp`, { type: 'image/webp' });
}
