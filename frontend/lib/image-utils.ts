/**
 * Compress an image file to WebP format using canvas.
 * Returns a new File with the same base name + .webp extension.
 */
export async function compressToWebP(
  file: File,
  options: { quality?: number; maxWidth?: number } = {}
): Promise<File> {
  const { quality = 0.6, maxWidth = 640 } = options;

  // Use Image element for reliable full-image loading
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = () => reject(new Error('Failed to load image'));
    i.src = URL.createObjectURL(file);
  });

  let { naturalWidth: width, naturalHeight: height } = img;

  if (width > maxWidth) {
    height = Math.round(height * (maxWidth / width));
    width = maxWidth;
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0, width, height);
  URL.revokeObjectURL(img.src);

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => {
      if (b) resolve(b);
      else reject(new Error('Canvas toBlob failed'));
    }, 'image/webp', quality);
  });

  const baseName = file.name.replace(/\.[^.]+$/, '');
  return new File([blob], `${baseName}.webp`, { type: 'image/webp' });
}
