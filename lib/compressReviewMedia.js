/**
 * Client-side compression before review (or badge) uploads.
 * Images: browser-image-compression. Videos: passed through as-is (always MP4;
 * server handles transcoding via FFmpeg to ensure A/V sync).
 */

const MAX_IMAGE_MB = 0.85;
const MAX_IMAGE_EDGE = 1920;

export async function compressReviewMediaFile(file) {
  if (!file || typeof window === 'undefined') return file;
  if (file.type === 'image/gif') return file;
  if (file.type.startsWith('image/')) {
    try {
      const imageCompression = (await import('browser-image-compression')).default;
      const out = await imageCompression(file, {
        maxSizeMB: MAX_IMAGE_MB,
        maxWidthOrHeight: MAX_IMAGE_EDGE,
        useWebWorker: true,
        initialQuality: 0.82,
      });
      const ext =
        out.type === 'image/png' ? '.png' : out.type === 'image/webp' ? '.webp' : '.jpg';
      const name = (file.name.replace(/\.[^.]+$/i, '') || 'photo') + ext;
      return new File([out], name, { type: out.type || 'image/jpeg' });
    } catch {
      return file;
    }
  }
  if (file.type.startsWith('video/') || file.type.startsWith('audio/')) {
    return file; // pass through — server handles video transcode; audio served as-is
  }
  return file;
}
