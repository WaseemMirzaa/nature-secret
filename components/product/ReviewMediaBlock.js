'use client';

import Image from 'next/image';

export function getVideoPresentation(url) {
  if (!url || typeof url !== 'string') return null;
  const u = url.trim();
  try {
    const parsed = new URL(u);
    if (parsed.hostname.includes('youtu.be')) {
      const id = parsed.pathname.replace(/^\//, '').split('/')[0];
      if (id) return { kind: 'embed', src: `https://www.youtube-nocookie.com/embed/${id}` };
    }
    if (parsed.hostname.includes('youtube.com')) {
      const id = parsed.searchParams.get('v');
      if (id) return { kind: 'embed', src: `https://www.youtube-nocookie.com/embed/${id}` };
      const short = parsed.pathname.match(/\/embed\/([^/?]+)/);
      if (short) return { kind: 'embed', src: `https://www.youtube-nocookie.com/embed/${short[1]}` };
    }
    if (parsed.hostname.includes('vimeo.com')) {
      const m = parsed.pathname.match(/\/(\d+)/);
      if (m) return { kind: 'embed', src: `https://player.vimeo.com/video/${m[1]}` };
    }
  } catch {
    if (/\.(mp4|webm|ogg)(\?|$)/i.test(u)) return { kind: 'native', src: u };
    return null;
  }
  if (/\.(mp4|webm|ogg)(\?|$)/i.test(u)) return { kind: 'native', src: u };
  return { kind: 'native', src: u };
}

export function ReviewMediaBlock({ item, resolveImageUrl }) {
  const rawUrl = item?.url;
  if (!rawUrl) return null;
  const isVideo = item.type === 'video';
  if (!isVideo) {
    const imgSrc = resolveImageUrl(rawUrl) || rawUrl;
    return (
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg bg-neutral-100">
        <Image src={imgSrc} alt="" fill className="object-cover" sizes="(max-width: 768px) 100vw, 50vw" loading="lazy" />
      </div>
    );
  }
  const pres = getVideoPresentation(rawUrl);
  if (!pres) return null;
  if (pres.kind === 'embed') {
    return (
      <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-black">
        <iframe
          title="Review video"
          src={pres.src}
          className="absolute inset-0 h-full w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      </div>
    );
  }
  return (
    <video src={pres.src} controls playsInline className="w-full rounded-lg bg-black max-h-[280px]" />
  );
}
