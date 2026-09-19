"use client";

import { useEffect, useRef } from "react";

import { useAct } from "@/lib/scroll-scrub/act";

const CLIPS = Array.from(
  { length: 12 },
  (_, i) => `/videoshomepage/gallery-${String(i + 2).padStart(2, "0")}.mp4`,
);

/** Rolagem vertical vira viagem lateral: leitura de "amplitude", não de argumento. */
export function PanRail() {
  const railRef = useRef<HTMLDivElement>(null);
  const { subscribe } = useAct();

  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;
    return subscribe(({ p }) => {
      const distance = Math.max(rail.scrollWidth - window.innerWidth + 96, 0);
      rail.style.transform = `translate3d(${-p * distance}px,0,0)`;
    });
  }, [subscribe]);

  return (
    <div
      ref={railRef}
      className="flex items-center gap-4 pl-6 will-change-transform md:gap-6 md:pl-16"
    >
      {CLIPS.map((src) => (
        <RailClip key={src} src={src} />
      ))}
    </div>
  );
}

function RailClip({ src }: { src: string }) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    // Doze clipes baixando no load matam a primeira tela: cada um só busca
    // bytes quando entra no quadro.
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          if (!video.src) video.src = src;
          void video.play().catch(() => undefined);
        } else {
          video.pause();
        }
      },
      { threshold: 0.2 },
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
      className="h-[46vh] w-auto flex-none rounded-sm bg-[#141414] object-cover md:h-[56vh]"
      style={{ aspectRatio: "9 / 16" }}
    />
  );
}
