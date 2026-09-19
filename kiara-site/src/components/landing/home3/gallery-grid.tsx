"use client";

import { useEffect, useRef } from "react";

const CLIPS = Array.from(
  { length: 24 },
  (_, i) => `/videoshomepage/gallery-${String(i + 1).padStart(2, "0")}.mp4`,
);

export function GalleryGrid() {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
      {CLIPS.map((src) => (
        <GalleryClip key={src} src={src} />
      ))}
    </div>
  );
}

function GalleryClip({ src }: { src: string }) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    // Vinte e quatro clipes: cada um só busca bytes ao entrar no quadro.
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          if (!video.src) video.src = src;
          void video.play().catch(() => undefined);
        } else {
          video.pause();
        }
      },
      { threshold: 0.25 },
    );
    io.observe(video);
    return () => io.disconnect();
  }, [src]);

  return (
    <video
      ref={ref}
      muted
      loop
      playsInline
      preload="none"
      aria-hidden
      className="w-full rounded-sm bg-[#141414] object-cover"
      style={{ aspectRatio: "9 / 16" }}
    />
  );
}
