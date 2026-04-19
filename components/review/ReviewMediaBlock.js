'use client';

import { useState, useMemo, useRef, useEffect, useId, useCallback } from 'react';
import Image from 'next/image';
import {
  buildReviewVideoVariants,
  getNetworkTier,
  isHlsUrl,
  pickVariantStartIndex,
} from '@/lib/reviewVideoAdaptive';

/** Treat as video if type says so or URL is clearly a stream / file. */
export function mediaItemIsVideo(item) {
  if (item?.type === 'video') return true;
  const u = String(item?.url || '').trim();
  if (/youtube\.com|youtu\.be|vimeo\.com|\.(mp4|webm|ogg|m3u8)(\?|$)/i.test(u)) return true;
  if (Array.isArray(item?.sources) && item.sources.some((s) => /\.(mp4|webm|ogg|m3u8)(\?|$)/i.test(String(s?.url || '')))) {
    return true;
  }
  return false;
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
    if (/\.(mp4|webm|ogg|m3u8)(\?|$)/i.test(u)) return { kind: 'native', src: u };
    return null;
  }
  if (/\.(mp4|webm|ogg|m3u8)(\?|$)/i.test(u)) return { kind: 'native', src: u };
  return { kind: 'native', src: u };
}

const VIDEO_REPLAY_MAX = 3;

function useNetworkTier() {
  const [tier, setTier] = useState(() => (typeof window !== 'undefined' ? getNetworkTier() : 'medium'));
  useEffect(() => {
    const c = typeof navigator !== 'undefined' ? navigator.connection : undefined;
    const upd = () => setTier(getNetworkTier());
    upd();
    c?.addEventListener?.('change', upd);
    return () => c?.removeEventListener?.('change', upd);
  }, []);
  return tier;
}

function ReviewVideoPlayer({ pres, rawUrl, resolvedPlayUrl, mediaItem, resolveImageUrl }) {
  const idBase = useId();
  const videoRef = useRef(null);
  const nativeReplayRef = useRef(0);
  const embedReplayRef = useRef(0);
  const [nativeError, setNativeError] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [videoReplayNonce, setVideoReplayNonce] = useState(0);
  const [embedReplayNonce, setEmbedReplayNonce] = useState(0);
  const [qualityDownshift, setQualityDownshift] = useState(0);
  const openUrl = resolvedPlayUrl || getOpenVideoPageUrl(rawUrl);
  const tier = useNetworkTier();

  const variants = useMemo(
    () => buildReviewVideoVariants(mediaItem, resolvedPlayUrl || pres.src, resolveImageUrl),
    [mediaItem, resolvedPlayUrl, pres.src, resolveImageUrl],
  );

  const baseVariantIndex = useMemo(
    () => pickVariantStartIndex(variants.length, tier),
    [variants.length, tier],
  );

  const chosenVariantIndex = Math.min(
    baseVariantIndex + qualityDownshift,
    Math.max(0, variants.length - 1),
  );
  const chosenSrc = variants[chosenVariantIndex]?.url || pres.src;
  const isHls = isHlsUrl(chosenSrc);

  useEffect(() => {
    nativeReplayRef.current = 0;
    embedReplayRef.current = 0;
    setNativeError(false);
    setVideoReplayNonce(0);
    setEmbedReplayNonce(0);
    setQualityDownshift(0);
  }, [pres.kind, pres.src]);

  useEffect(() => {
    setQualityDownshift(0);
  }, [tier, rawUrl]);

  useEffect(() => {
    const el = videoRef.current;
    if (!el || pres.kind !== 'native') return;
    el.playbackRate = playbackRate;
  }, [playbackRate, pres.kind, videoReplayNonce, chosenSrc]);

  useEffect(() => {
    if (pres.kind !== 'native' || !isHlsUrl(chosenSrc)) return undefined;
    const video = videoRef.current;
    if (!video) return undefined;
    let hls;
    let cancelled = false;
    import('hls.js')
      .then(({ default: Hls }) => {
        if (cancelled || !videoRef.current) return;
        if (Hls.isSupported()) {
          hls = new Hls({
            enableWorker: true,
            capLevelToPlayerSize: true,
            lowLatencyMode: false,
            abrEwmaDefaultEstimate: tier === 'low' ? 220000 : tier === 'medium' ? 1000000 : 3500000,
          });
          hls.loadSource(chosenSrc);
          hls.attachMedia(video);
          hls.on(Hls.Events.MANIFEST_PARSED, () => {
            if (!hls.levels?.length) return;
            if (tier === 'low') {
              hls.currentLevel = 0;
            } else if (tier === 'medium' && hls.levels.length > 2) {
              hls.currentLevel = Math.min(hls.levels.length - 2, Math.floor(hls.levels.length / 2));
            }
          });
        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
          video.src = chosenSrc;
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      if (hls) hls.destroy();
      else if (video) {
        try {
          video.pause();
          video.removeAttribute('src');
          video.load();
        } catch {
          /* ignore */
        }
      }
    };
  }, [pres.kind, chosenSrc, tier, videoReplayNonce, qualityDownshift]);

  const handleNativeVideoError = useCallback(() => {
    const maxIdx = variants.length - 1;
    if (chosenVariantIndex < maxIdx) {
      setQualityDownshift((d) => d + 1);
      window.setTimeout(() => setVideoReplayNonce((n) => n + 1), 100);
      return;
    }
    if (nativeReplayRef.current < VIDEO_REPLAY_MAX) {
      nativeReplayRef.current += 1;
      window.setTimeout(() => {
        setVideoReplayNonce((n) => n + 1);
      }, 350);
      return;
    }
    setNativeError(true);
  }, [chosenVariantIndex, variants.length]);

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
            YouTube / Vimeo adjust quality to your connection. Use <span className="font-medium">⋮</span> or the gear menu to override.
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

  const qualityHint = isHls
    ? 'Adaptive stream (HLS): quality follows your connection.'
    : variants.length > 1
      ? 'Multiple files: starts on a rung suited to your connection, then steps down if playback fails.'
      : 'Single file: full quality (buffering depends on your connection).';

  return (
    <div className="space-y-2">
      <video
        key={`native-${chosenSrc}-${videoReplayNonce}-${qualityDownshift}`}
        ref={videoRef}
        src={isHls ? undefined : chosenSrc}
        controls
        playsInline
        preload={isHls ? 'metadata' : tier === 'low' ? 'none' : 'metadata'}
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
        <span className="text-neutral-400">{qualityHint}</span>
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

  return (
    <ReviewVideoPlayer
      pres={presForPlayer}
      rawUrl={rawUrl}
      resolvedPlayUrl={resolvedPlayUrl}
      mediaItem={item}
      resolveImageUrl={resolveImageUrl}
    />
  );
}
