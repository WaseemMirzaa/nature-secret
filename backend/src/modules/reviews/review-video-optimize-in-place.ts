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
 * Enable on the server: install `ffmpeg`, set `REVIEW_VIDEO_TRANSCODE=1` (and optional `FFMPEG_PATH`,
 * `REVIEW_VIDEO_MAX_WIDTH` e.g. 854 for ~480p cap, `REVIEW_VIDEO_H264_PROFILE` main|high — default baseline for older phones).
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

function maxVideoWidthForScale(): number {
  const raw = process.env.REVIEW_VIDEO_MAX_WIDTH;
  if (raw == null || raw === '') return 1280;
  const n = parseInt(String(raw), 10);
  if (!Number.isFinite(n) || n < 320) return 1280;
  return Math.min(n, 4096);
}

function h264ProfileForMobile(): string {
  const p = (process.env.REVIEW_VIDEO_H264_PROFILE || 'baseline').toLowerCase();
  return p === 'main' || p === 'high' ? p : 'baseline';
}

async function optimizeInPlace(absPath: string): Promise<void> {
  const ffmpeg = process.env.FFMPEG_PATH || 'ffmpeg';
  const tmp = `${absPath}.optpart`;
  const opts = { timeout: FFMPEG_TIMEOUT_MS, maxBuffer: 20 * 1024 * 1024 };
  const maxW = maxVideoWidthForScale();
  const profile = h264ProfileForMobile();

  const base = [
    '-hide_banner',
    '-loglevel',
    'error',
    '-nostdin',
    '-y',
    '-i',
    absPath,
    '-vf',
    `scale=min(${maxW},iw):-2`,
    '-c:v',
    'libx264',
    '-profile:v',
    profile,
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
