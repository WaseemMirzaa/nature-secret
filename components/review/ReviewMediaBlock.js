'use client';

import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import Image from 'next/image';

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

const videoShellClass =
  'relative aspect-video w-full min-h-[11.25rem] overflow-hidden rounded-lg bg-black sm:min-h-0';

function videoMimeTypeFromUrl(url) {
  const path = String(url).split('?')[0].toLowerCase();
  if (path.endsWith('.webm')) return 'video/webm';
  if (path.endsWith('.mov') || path.endsWith('.qt')) return 'video/quicktime';
  if (path.endsWith('.ogg') || path.endsWith('.ogv')) return 'video/ogg';
  return 'video/mp4';
}

function ReviewVideoPlayer({ pres, rawUrl, resolvedPlayUrl }) {
  const shellRef = useRef(null);
  const videoRef = useRef(null);
  const nativeRecoverRef = useRef(0);
  const [nativeError, setNativeError] = useState(false);
  const [preloadPolicy, setPreloadPolicy] = useState('metadata');
  const openUrl = resolvedPlayUrl || getOpenVideoPageUrl(rawUrl);

  useEffect(() => {
    const root = shellRef.current;
    if (!root || typeof IntersectionObserver === 'undefined') {
      setPreloadPolicy('auto');
      return undefined;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setPreloadPolicy('auto');
          io.disconnect();
        }
      },
      { rootMargin: '200px', threshold: 0.01 },
    );
    io.observe(root);
    return () => io.disconnect();
  }, [pres.src]);

  useEffect(() => {
    nativeRecoverRef.current = 0;
    setNativeError(false);
  }, [pres.kind, pres.src]);

  const handleNativeVideoError = useCallback(() => {
    const el = videoRef.current;
    if (el && nativeRecoverRef.current < 1) {
      nativeRecoverRef.current += 1;
      try {
        el.load();
      } catch {
        setNativeError(true);
      }
      return;
    }
    setNativeError(true);
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

  const srcType = videoMimeTypeFromUrl(pres.src);

  return (
    <div ref={shellRef} className={videoShellClass}>
      <video
        ref={videoRef}
        controls
        playsInline
        preload={preloadPolicy}
        className={`absolute inset-0 h-full w-full object-contain ${nativeError ? 'pointer-events-none opacity-0' : ''}`}
        controlsList="nodownload"
        onError={handleNativeVideoError}
      >
        <source src={pres.src} type={srcType} />
      </video>
      {nativeError ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-neutral-900 px-3 text-center text-sm text-white">
          <p>Could not play this file in the browser.</p>
          {openUrl ? (
            <a href={openUrl} target="_blank" rel="noopener noreferrer" className="font-semibold text-gold-300 underline">
              Open video link
            </a>
          ) : null}
        </div>
      ) : null}
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
