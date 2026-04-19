import { execFile } from 'child_process';
import { promisify } from 'util';
import { existsSync, renameSync, unlinkSync } from 'fs';

const execFileAsync = promisify(execFile);

const FFMPEG_TIMEOUT_MS = 300_000;
/** Wait before replacing the file so in-flight playback is less likely to see a mid-stream swap (decoder pops/crackle). */
const TRANSCODE_START_DELAY_MS = 90_000;

/**
 * Re-encode review uploads in place for smoother playback (H.264, max width 1280, faststart).
 * Runs in the background: the upload response returns first; when done, the same URL serves the smaller file.
 *
 * Enable on the server: install `ffmpeg`, set `REVIEW_VIDEO_TRANSCODE=1` (and optional `FFMPEG_PATH`).
 */
export function scheduleReviewVideoOptimize(absPath: string, mimetype: string): void {
  if (process.env.REVIEW_VIDEO_TRANSCODE !== '1') return;
  if (!mimetype.startsWith('video/')) return;
  const delay = Number(process.env.REVIEW_VIDEO_TRANSCODE_DELAY_MS || TRANSCODE_START_DELAY_MS);
  const ms = Number.isFinite(delay) && delay >= 0 ? delay : TRANSCODE_START_DELAY_MS;
  setTimeout(() => {
    void optimizeInPlace(absPath).catch(() => {});
  }, ms);
}

async function optimizeInPlace(absPath: string): Promise<void> {
  const ffmpeg = process.env.FFMPEG_PATH || 'ffmpeg';
  const tmp = `${absPath}.optpart`;
  const opts = { timeout: FFMPEG_TIMEOUT_MS, maxBuffer: 20 * 1024 * 1024 };

  const base = [
    '-hide_banner',
    '-loglevel',
    'error',
    '-nostdin',
    '-y',
    '-i',
    absPath,
    '-vf',
    'scale=min(1280,iw):-2',
    '-c:v',
    'libx264',
    '-profile:v',
    'main',
    '-pix_fmt',
    'yuv420p',
    '-crf',
    '25',
    '-preset',
    'veryfast',
    '-movflags',
    '+faststart',
  ];

  const cleanupTmp = () => {
    if (existsSync(tmp)) {
      try {
        unlinkSync(tmp);
      } catch {
        /* ignore */
      }
    }
  };

  try {
    await execFileAsync(ffmpeg, [...base, '-c:a', 'aac', '-b:a', '96k', '-ac', '2', tmp], opts);
  } catch {
    cleanupTmp();
    try {
      await execFileAsync(ffmpeg, [...base, '-an', tmp], opts);
    } catch {
      cleanupTmp();
      return;
    }
  }

  if (!existsSync(tmp)) return;

  try {
    renameSync(tmp, absPath);
  } catch {
    cleanupTmp();
  }
}
