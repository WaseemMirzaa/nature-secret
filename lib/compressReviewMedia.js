/**
 * Client-side compression before review (or badge) uploads.
 * Images: browser-image-compression. Videos: canvas + MediaRecorder re-encode (WebM).
 */

const MAX_IMAGE_MB = 0.85;
const MAX_IMAGE_EDGE = 1920;
const MAX_VIDEO_WIDTH = 1280;
const MAX_VIDEO_DURATION_SEC = 90;
const VIDEO_BITRATE = 1_200_000;

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
  if (file.type.startsWith('video/')) {
    return compressVideoWithCanvas(file);
  }
  return file;
}

async function compressVideoWithCanvas(file) {
  if (file.size < 600 * 1024) return file;
  if (typeof MediaRecorder === 'undefined' || typeof document === 'undefined') return file;

  const mimeCandidates = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'];
  const mime = mimeCandidates.find((m) => MediaRecorder.isTypeSupported(m));
  if (!mime) return file;

  const video = document.createElement('video');
  video.muted = true;
  video.playsInline = true;
  video.setAttribute('playsinline', '');
  const url = URL.createObjectURL(file);
  video.src = url;

  try {
    await new Promise((resolve, reject) => {
      video.onloadedmetadata = resolve;
      video.onerror = () => reject(new Error('load'));
    });

    const dur = video.duration;
    if (!dur || !Number.isFinite(dur) || dur <= 0 || dur > MAX_VIDEO_DURATION_SEC) {
      URL.revokeObjectURL(url);
      return file;
    }

    const vw = video.videoWidth;
    const vh = video.videoHeight;
    if (!vw || !vh) {
      URL.revokeObjectURL(url);
      return file;
    }

    const scale = vw > MAX_VIDEO_WIDTH ? MAX_VIDEO_WIDTH / vw : 1;
    const cw = Math.max(2, Math.round(vw * scale));
    const ch = Math.max(2, Math.round(vh * scale));

    const canvas = document.createElement('canvas');
    canvas.width = cw;
    canvas.height = ch;
    const ctx = canvas.getContext('2d');

    if (typeof canvas.captureStream !== 'function') {
      URL.revokeObjectURL(url);
      return file;
    }
    const canvasStream = canvas.captureStream(24);
    if (typeof video.captureStream !== 'function') {
      URL.revokeObjectURL(url);
      return file;
    }
    let cap;
    try {
      cap = video.captureStream();
    } catch {
      URL.revokeObjectURL(url);
      return file;
    }

    const outStream = new MediaStream();
    canvasStream.getVideoTracks().forEach((t) => outStream.addTrack(t));
    cap.getAudioTracks().forEach((t) => outStream.addTrack(t));

    const chunks = [];
    const recorder = new MediaRecorder(outStream, {
      mimeType: mime,
      videoBitsPerSecond: VIDEO_BITRATE,
    });

    await new Promise((resolve, reject) => {
      let stopped = false;
      const stopOnce = () => {
        if (stopped) return;
        stopped = true;
        try {
          if (recorder.state === 'recording') recorder.stop();
        } catch (_) {}
        try {
          video.pause();
        } catch (_) {}
      };

      recorder.ondataavailable = (e) => {
        if (e.data?.size) chunks.push(e.data);
      };
      recorder.onerror = () => reject(new Error('recorder'));
      recorder.onstop = resolve;

      video.onended = () => stopOnce();

      video
        .play()
        .then(() => {
          recorder.start(250);
          const tick = () => {
            if (video.error) {
              stopOnce();
              return;
            }
            if (video.ended) {
              stopOnce();
              return;
            }
            ctx.drawImage(video, 0, 0, cw, ch);
            requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        })
        .catch(reject);
    });

    URL.revokeObjectURL(url);
    video.removeAttribute('src');
    video.load();

    const blob = new Blob(chunks, { type: 'video/webm' });
    if (!blob.size || blob.size >= file.size * 0.92) {
      return file;
    }
    const base = file.name.replace(/\.[^.]+$/i, '') || 'video';
    return new File([blob], `${base}.webm`, { type: 'video/webm' });
  } catch {
    try {
      URL.revokeObjectURL(url);
    } catch (_) {}
    return file;
  }
}
