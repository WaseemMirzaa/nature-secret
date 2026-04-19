'use client';

import { useMemo, useRef, useCallback, useState, useEffect } from 'react';
import Image from 'next/image';

function getAudioMimeType(src) {
  if (!src || typeof src !== 'string') return 'audio/mpeg';
  const ext = src.split('?')[0].split('.').pop()?.toLowerCase();
  const map = { mp3: 'audio/mpeg', m4a: 'audio/mp4', wav: 'audio/wav', ogg: 'audio/ogg', aac: 'audio/aac', weba: 'audio/webm' };
  return map[ext] || 'audio/mpeg';
}

/** Coerce DB/API `media` into `{ type, url }[]` for rendering (handles JSON string or single object). */
export function normalizeReviewMediaItems(review) {
  const raw = review?.media;
  if (raw == null) return [];
  if (Array.isArray(raw)) {
    return raw.filter((m) => m && typeof m.url === 'string' && String(m.url).trim());
  }
  if (typeof raw === 'string') {
    try {
      const p = JSON.parse(raw.trim());
      if (Array.isArray(p)) return p.filter((m) => m && typeof m.url === 'string' && String(m.url).trim());
    } catch {
      /* ignore */
    }
    return [];
  }
  if (typeof raw === 'object' && typeof raw.url === 'string' && String(raw.url).trim()) {
    const type = raw.type === 'video' ? 'video' : 'image';
    return [{ type, url: String(raw.url).trim() }];
  }
  return [];
}

/** Treat as video if type says so or URL is clearly a stream / file. */
export function mediaItemIsVideo(item) {
  if (!item?.url || typeof item.url !== 'string') return false;
  if (item.type === 'video') return true;
  const u = item.url.trim();
  return /youtube\.com|youtu\.be|vimeo\.com|\.mp4(\?|$)/i.test(u);
}

/** Treat as audio if type says so or URL extension is a known audio format. */
export function mediaItemIsAudio(item) {
  if (!item?.url || typeof item.url !== 'string') return false;
  if (item.type === 'audio') return true;
  const u = item.url.trim();
  return /\.(mp3|m4a|wav|ogg|aac|weba)(\?|#|$)/i.test(u);
}

function parseYoutubeVideoId(parsed) {
  const host = parsed.hostname.replace(/^www\./i, '').replace(/^m\./i, '');
  if (host === 'youtu.be') {
    const id = parsed.pathname.replace(/^\//, '').split(/[/?#]/)[0];
    return id && /^[\w-]{11}$/.test(id) ? id : null;
  }
  if (!host.includes('youtube.com')) return null;
  const v = parsed.searchParams.get('v');
  if (v && /^[\w-]{11}$/.test(v)) return v;
  let m = parsed.pathname.match(/\/(?:embed|shorts|live)\/([\w-]{11})/);
  if (m) return m[1];
  m = parsed.pathname.match(/\/v\/([\w-]{11})/);
  return m ? m[1] : null;
}

function parseVimeoId(parsed) {
  if (!parsed.hostname.includes('vimeo.com')) return null;
  const m = parsed.pathname.match(/\/(?:video\/)?(\d+)/);
  return m ? m[1] : null;
}

function buildYoutubeEmbedSrc(videoId) {
  const params = new URLSearchParams({
    playsinline: '1',
    rel: '0',
    modestbranding: '1',
    iv_load_policy: '3',
    fs: '1',
    cc_load_policy: '0',
  });
  if (typeof window !== 'undefined' && window.location?.origin) {
    try {
      params.set('origin', window.location.origin);
    } catch {
      /* ignore */
    }
  }
  return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}?${params.toString()}`;
}

/** Best URL to open the same video in the YouTube / Vimeo app or browser (embed often fails in in-app WebViews). */
export function getOpenVideoPageUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') return '';
  const u = rawUrl.trim();
  try {
    const parsed = new URL(u, typeof window !== 'undefined' ? window.location.href : 'https://example.com');
    const yid = parseYoutubeVideoId(parsed);
    if (yid) return `https://www.youtube.com/watch?v=${encodeURIComponent(yid)}`;
    const vid = parseVimeoId(parsed);
    if (vid) return `https://vimeo.com/${vid}`;
  } catch {
    /* fall through */
  }
  if (/^https?:\/\//i.test(u)) return u;
  return u;
}

/**
 * @returns {{ kind: 'embed', src: string } | { kind: 'native', src: string } | null}
 */
export function getVideoPresentation(url) {
  if (!url || typeof url !== 'string') return null;
  const u = url.trim();
  try {
    const parsed = new URL(u, typeof window !== 'undefined' ? window.location.href : 'https://example.com');
    const yid = parseYoutubeVideoId(parsed);
    if (yid) return { kind: 'embed', src: buildYoutubeEmbedSrc(yid) };
    const vid = parseVimeoId(parsed);
    if (vid) {
      const params = new URLSearchParams({ playsinline: '1', portrait: '0', title: '0', byline: '0' });
      return { kind: 'embed', src: `https://player.vimeo.com/video/${vid}?${params.toString()}` };
    }
  } catch {
    if (/\.mp4(\?|$)/i.test(u)) return { kind: 'native', src: u };
    return null;
  }
  if (/\.mp4(\?|$)/i.test(u)) return { kind: 'native', src: u };
  return { kind: 'native', src: u };
}

const videoShellClass =
  'relative aspect-video w-full min-h-[11.25rem] overflow-hidden rounded-lg bg-black sm:min-h-0';

// MediaError codes
// 1 = MEDIA_ERR_ABORTED           — user aborted (ignore)
// 2 = MEDIA_ERR_NETWORK           — network blip (short retry)
// 3 = MEDIA_ERR_DECODE            — bad frame / corrupt data (short retry)
// 4 = MEDIA_ERR_SRC_NOT_SUPPORTED — HEVC on unsupporting browser; server transcodes
//                                   to H.264 within ~90s so retry with longer delay
const NETWORK_ERROR_CODES = new Set([2, 3]);
const FORMAT_ERROR_CODE = 4;

// Mobile: silently retry this many times before surfacing the error UI.
// Desktop: surface error immediately (stable connections, real failures).
const MAX_SILENT_RETRIES = 2;
const MAX_MANUAL_RETRIES = 2;
const NETWORK_RETRY_DELAY_MS = 700;  // network blip — retry quickly
const FORMAT_RETRY_DELAY_MS = 4000;  // HEVC → wait for server FFmpeg transcode

function checkIsMobile() {
  return (
    typeof navigator !== 'undefined' &&
    /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(navigator.userAgent)
  );
}

// --- shared UI pieces ---

function Spinner() {
  return (
    <div className="h-9 w-9 animate-spin rounded-full border-2 border-white/25 border-t-white" />
  );
}

function SpinnerShell() {
  // Full-size black shell with a centered spinner — used while a silent retry is in flight.
  // Keeps the same aspect-ratio box so layout doesn't jump.
  return (
    <div className={`${videoShellClass} flex items-center justify-center`}>
      <Spinner />
    </div>
  );
}

function VideoErrorState({ manualRetryCount, onRetry, openHref, isFormatError }) {
  return (
    <div className={`${videoShellClass} flex items-center justify-center`}>
      <div className="flex flex-col items-center gap-3 px-4 py-6 text-center">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-8 w-8 text-white/40"
          aria-hidden
        >
          <line x1="2" y1="2" x2="22" y2="22" />
          <path d="M10.66 6H14a2 2 0 0 1 2 2v2.34l1 1V8a3 3 0 0 0-3-3H7.16l1 1zM7 7.16 5.23 5.38A2 2 0 0 0 5 6.5v11A2 2 0 0 0 7 19.5H17a2 2 0 0 0 1.12-.35L16.78 17.8A2 2 0 0 1 17 18.5H7a1 1 0 0 1-1-1v-11a1 1 0 0 1 .16-.51z" />
          <path d="M10 9.5v.16L15.34 15H16V9.5" />
        </svg>
        <div>
          <p className="text-sm font-medium text-white">Could not play this video</p>
          <p className="mt-0.5 text-xs text-white/50">
            {isFormatError
              ? 'Video is being processed — try again in a moment.'
              : 'Network issue — please try again.'}
          </p>
        </div>
        <div className="flex gap-2">
          {manualRetryCount < MAX_MANUAL_RETRIES && (
            <button
              type="button"
              onClick={onRetry}
              className="rounded-md bg-white/20 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-white/30 active:scale-95"
            >
              Retry
            </button>
          )}
          {openHref && (
            <a
              href={openHref}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-md bg-white/20 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-white/30 active:scale-95"
            >
              Open video
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

// --- video DOM wrapper ---

function NativeVideoPlayer({ src, onError }) {
  const videoRef = useRef(null);

  // Cancel pending network requests when this instance unmounts (key-change retry or parent gone).
  useEffect(() => {
    return () => {
      const el = videoRef.current;
      if (!el) return;
      try { el.pause(); } catch (_) {}
      try { el.removeAttribute('src'); } catch (_) {}
      try { el.load(); } catch (_) {}
    };
  }, []);

  return (
    <div className={videoShellClass}>
      <video
        ref={videoRef}
        controls
        playsInline
        preload="metadata"
        className="absolute inset-0 h-full w-full object-contain"
        controlsList="nodownload"
        onError={onError}
      >
        {/*
          type="video/mp4" always: backend transcodes all uploads to H.264/MP4.
          Explicit type lets Safari skip codec-sniffing byte fetch → no startup lag.
        */}
        <source src={src} type="video/mp4" />
      </video>
    </div>
  );
}

// --- orchestrator ---

function ReviewVideoPlayer({ pres }) {
  const isMobile = useMemo(() => checkIsMobile(), []);

  const [retryKey, setRetryKey] = useState(0);
  const [phase, setPhase] = useState('playing'); // 'playing' | 'silent-retry' | 'error'
  const [isFormatError, setIsFormatError] = useState(false);

  // Separate counters: silent (automatic, mobile-only) vs manual (user clicks Retry)
  const silentRetryCount = useRef(0);
  const manualRetryCount = useRef(0);
  const retryTimer = useRef(null);

  // Clean up any pending retry timer on unmount
  useEffect(() => {
    return () => { if (retryTimer.current) clearTimeout(retryTimer.current); };
  }, []);

  const handleError = useCallback((e) => {
    const el = e?.currentTarget;
    const code = el?.error?.code ?? null;
    const formatError = code === FORMAT_ERROR_CODE; // HEVC on unsupporting browser
    const retryable = formatError || code == null || NETWORK_ERROR_CODES.has(code);
    // Format errors need a longer delay — server FFmpeg may still be transcoding HEVC→H.264
    const delay = formatError ? FORMAT_RETRY_DELAY_MS : NETWORK_RETRY_DELAY_MS;

    console.error('[review-video]', {
      code,
      message: el?.error?.message,
      src: pres.src,
      currentSrc: el?.currentSrc,
      readyState: el?.readyState,
      networkState: el?.networkState,
    });

    // Mobile + retryable + budget remaining → silent retry behind spinner, no error flash
    if (isMobile && retryable && silentRetryCount.current < MAX_SILENT_RETRIES) {
      silentRetryCount.current += 1;
      setPhase('silent-retry');
      retryTimer.current = setTimeout(() => {
        setPhase('playing');
        setRetryKey((k) => k + 1);
      }, delay);
      return;
    }

    // Desktop or budget exhausted — surface the error UI
    setIsFormatError(formatError);
    setPhase('error');
  }, [isMobile, pres.src]);

  const handleManualRetry = useCallback(() => {
    manualRetryCount.current += 1;
    silentRetryCount.current = 0; // reset silent budget so mobile gets another quiet chance
    setIsFormatError(false);
    setPhase('playing');
    setRetryKey((k) => k + 1);
  }, []);

  if (pres.kind === 'embed') {
    return (
      <div className={videoShellClass}>
        <iframe
          title="Review video"
          src={pres.src}
          className="absolute inset-0 h-full w-full border-0"
          width={560}
          height={315}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
          loading="lazy"
        />
      </div>
    );
  }

  // Spinner-only shell during the SILENT_RETRY_DELAY_MS window — no broken video visible
  if (phase === 'silent-retry') return <SpinnerShell />;

  if (phase === 'error') {
    return (
      <VideoErrorState
        manualRetryCount={manualRetryCount.current}
        onRetry={handleManualRetry}
        openHref={pres.src}
        isFormatError={isFormatError}
      />
    );
  }

  return (
    <NativeVideoPlayer
      key={`${pres.src}_${retryKey}`}
      src={pres.src}
      onError={handleError}
    />
  );
}

function ReviewAudioPlayer({ src }) {
  const audioRef = useRef(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    return () => {
      const el = audioRef.current;
      if (!el) return;
      try { el.pause(); } catch (_) {}
      try { el.removeAttribute('src'); } catch (_) {}
      try { el.load(); } catch (_) {}
    };
  }, []);

  if (error) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-neutral-900 px-4 py-3">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 shrink-0 text-white/40" aria-hidden>
          <line x1="2" y1="2" x2="22" y2="22" />
          <path d="M10.66 6H14a2 2 0 0 1 2 2v2.34l1 1V8a3 3 0 0 0-3-3H7.16l1 1zM7 7.16 5.23 5.38A2 2 0 0 0 5 6.5v11A2 2 0 0 0 7 19.5H17a2 2 0 0 0 1.12-.35L16.78 17.8A2 2 0 0 1 17 18.5H7a1 1 0 0 1-1-1v-11a1 1 0 0 1 .16-.51z" />
        </svg>
        <span className="text-xs text-white/50">Could not play audio.</span>
        <a href={src} target="_blank" rel="noopener noreferrer" className="ml-auto text-xs font-semibold text-white/70 underline hover:text-white">
          Open audio
        </a>
      </div>
    );
  }

  return (
    <div className="rounded-lg bg-neutral-900 px-3 py-2">
      <audio
        ref={audioRef}
        controls
        preload="metadata"
        className="w-full"
        onError={() => setError(true)}
      >
        <source src={src} type={getAudioMimeType(src)} />
      </audio>
    </div>
  );
}

export function ReviewMediaBlock({ item, resolveImageUrl }) {
  const rawUrl = item?.url;
  const resolvedPlayUrl = useMemo(() => {
    if (!rawUrl || typeof rawUrl !== 'string') return '';
    const r = resolveImageUrl ? resolveImageUrl(rawUrl) : '';
    return r || (String(rawUrl).startsWith('http') ? rawUrl : '');
  }, [rawUrl, resolveImageUrl]);

  if (!rawUrl) return null;

  if (mediaItemIsAudio(item)) {
    const audioSrc = resolvedPlayUrl || rawUrl;
    return <ReviewAudioPlayer src={audioSrc} />;
  }

  if (!mediaItemIsVideo(item)) {
    const imgSrc = resolvedPlayUrl || rawUrl;
    return (
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg bg-neutral-100">
        <Image
          src={imgSrc}
          alt=""
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, 50vw"
          loading="lazy"
        />
      </div>
    );
  }

  const pres = getVideoPresentation(rawUrl) || getVideoPresentation(resolvedPlayUrl);
  if (!pres) {
    return (
      <div className="rounded-lg border border-amber-200/80 bg-amber-50 px-3 py-2 text-xs text-amber-900">
        Unsupported video link.
        {resolvedPlayUrl ? (
          <a href={resolvedPlayUrl} target="_blank" rel="noopener noreferrer" className="ml-1 font-semibold underline">
            Open link
          </a>
        ) : null}
      </div>
    );
  }

  const nativeSrc = pres.kind === 'native' ? resolvedPlayUrl || pres.src : pres.src;
  const presForPlayer = pres.kind === 'native' ? { ...pres, src: nativeSrc } : pres;

  return <ReviewVideoPlayer pres={presForPlayer} />;
}
