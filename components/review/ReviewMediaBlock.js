'use client';

import { useState, useMemo, useRef, useEffect, useId, useCallback } from 'react';
import Image from 'next/image';

/** Treat as video if type says so or URL is clearly a stream / file. */
export function mediaItemIsVideo(item) {
  if (!item?.url || typeof item.url !== 'string') return false;
  if (item.type === 'video') return true;
  const u = item.url.trim();
  return /youtube\.com|youtu\.be|vimeo\.com|\.(mp4|webm|ogg)(\?|$)/i.test(u);
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
    if (/\.(mp4|webm|ogg)(\?|$)/i.test(u)) return { kind: 'native', src: u };
    return null;
  }
  if (/\.(mp4|webm|ogg)(\?|$)/i.test(u)) return { kind: 'native', src: u };
  return { kind: 'native', src: u };
}

const VIDEO_REPLAY_MAX = 3;

function ReviewVideoPlayer({ pres, rawUrl, resolvedPlayUrl }) {
  const idBase = useId();
  const videoRef = useRef(null);
  const nativeReplayRef = useRef(0);
  const embedReplayRef = useRef(0);
  const [nativeError, setNativeError] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [videoReplayNonce, setVideoReplayNonce] = useState(0);
  const [embedReplayNonce, setEmbedReplayNonce] = useState(0);
  const openUrl = resolvedPlayUrl || getOpenVideoPageUrl(rawUrl);

  useEffect(() => {
    nativeReplayRef.current = 0;
    embedReplayRef.current = 0;
    setNativeError(false);
    setVideoReplayNonce(0);
    setEmbedReplayNonce(0);
  }, [pres.kind, pres.src]);

  useEffect(() => {
    const el = videoRef.current;
    if (el && pres.kind === 'native') {
      el.playbackRate = playbackRate;
    }
  }, [playbackRate, pres.kind, videoReplayNonce]);

  const handleNativeVideoError = useCallback(() => {
    if (nativeReplayRef.current < VIDEO_REPLAY_MAX) {
      nativeReplayRef.current += 1;
      window.setTimeout(() => {
        setVideoReplayNonce((n) => n + 1);
      }, 350);
      return;
    }
    setNativeError(true);
  }, []);

  const handleEmbedError = useCallback(() => {
    if (embedReplayRef.current < VIDEO_REPLAY_MAX) {
      embedReplayRef.current += 1;
      window.setTimeout(() => {
        setEmbedReplayNonce((n) => n + 1);
      }, 400);
    }
  }, []);

  const embedSrc = useMemo(() => {
    if (pres.kind !== 'embed') return '';
    if (embedReplayNonce === 0) return pres.src;
    const join = pres.src.includes('?') ? '&' : '?';
    return `${pres.src}${join}_retry=${embedReplayNonce}`;
  }, [pres.kind, pres.src, embedReplayNonce]);

  if (pres.kind === 'embed') {
    return (
      <div className="space-y-2">
        <div className="relative aspect-video w-full min-h-[11.25rem] overflow-hidden rounded-lg bg-black sm:min-h-0">
          <iframe
            key={`embed-${embedReplayNonce}`}
            title="Review video"
            src={embedSrc}
            className="absolute inset-0 h-full w-full border-0"
            width={560}
            height={315}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
            loading="eager"
            onError={handleEmbedError}
          />
        </div>
        <div className="flex flex-col gap-1.5 text-[11px] text-neutral-600 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-3 sm:text-xs">
          <span className="text-neutral-500">
            Quality: use the player&apos;s <span className="font-medium">⋮</span> or gear menu (YouTube / Vimeo).
          </span>
          {openUrl ? (
            <a
              href={openUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-gold-800 underline decoration-gold-500/40 underline-offset-2 hover:text-gold-700"
            >
              Open in browser / app
            </a>
          ) : null}
        </div>
      </div>
    );
  }

  if (nativeError) {
    return (
      <div className="rounded-lg border border-neutral-200 bg-neutral-100 px-3 py-4 text-center text-sm text-neutral-700">
        <p className="mb-2">Could not play this file in the browser.</p>
        {openUrl ? (
          <a
            href={openUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-gold-700 underline"
          >
            Open video link
          </a>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <video
        key={`native-${pres.src}-${videoReplayNonce}`}
        ref={videoRef}
        src={pres.src}
        controls
        playsInline
        preload="metadata"
        className="max-h-[min(70vh,26rem)] w-full rounded-lg bg-black"
        controlsList="nodownload"
        onError={handleNativeVideoError}
      />
      <div className="flex flex-wrap items-center gap-2 text-[11px] text-neutral-600 sm:text-xs">
        <label htmlFor={`${idBase}-rate`} className="font-medium text-neutral-700">
          Speed
        </label>
        <select
          id={`${idBase}-rate`}
          value={playbackRate}
          onChange={(e) => setPlaybackRate(Number(e.target.value) || 1)}
          className="min-h-[36px] rounded-lg border border-neutral-200 bg-white px-2 py-1 text-xs text-neutral-900 sm:min-h-0"
        >
          {[0.75, 1, 1.25, 1.5, 2].map((r) => (
            <option key={r} value={r}>
              {r === 1 ? 'Normal (1×)' : `${r}×`}
            </option>
          ))}
        </select>
        <span className="text-neutral-400">HD / quality depends on the uploaded file.</span>
      </div>
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

  return <ReviewVideoPlayer pres={presForPlayer} rawUrl={rawUrl} resolvedPlayUrl={resolvedPlayUrl} />;
}
