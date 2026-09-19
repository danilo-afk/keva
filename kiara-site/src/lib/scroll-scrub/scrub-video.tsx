"use client";

import { useEffect, useRef } from "react";

import { useAct } from "./act";
import { addTick, clamp01, dwell } from "./driver";

/**
 * Vídeo com o playhead preso ao scroll.
 *
 * Três coisas que decidem se isso desliza ou trava:
 * - o clipe é buscado como Blob (seek sem depender de HTTP range);
 * - o scroll escreve um ALVO, e um rAF caminha até ele (escrever currentTime
 *   direto reproduz cada buraco entre eventos de wheel e vira stutter);
 * - nenhum seek novo é emitido enquanto o decoder ainda está em `seeking`.
 *
 * O tempo do clipe é mapeado na vida visível inteira do stage, não no trecho
 * pinado: senão o clipe congela no primeiro frame enquanto o ato entra e no
 * último enquanto ele sai.
 */
export function ScrubVideo({
  src,
  srcMobile,
  poster,
  dwellAmount = 0.35,
  className,
  style,
}: {
  src: string;
  srcMobile?: string;
  poster: string;
  dwellAmount?: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const posterRef = useRef<HTMLImageElement>(null);
  const { subscribe } = useAct();

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return; // poster segura a cena; nada é baixado.

    const isMobile = window.matchMedia("(max-width: 860px)").matches;
    const url = isMobile && srcMobile ? srcMobile : src;

    let objectUrl = "";
    let cancelled = false;
    let target = 0;
    let current = 0;
    let painted = false;

    const revealOnce = () => {
      if (painted) return;
      painted = true;
      if (posterRef.current) posterRef.current.style.opacity = "0";
      video.style.opacity = "1";
    };

    // Só busca os bytes quando o ato está a uma viewport de distância: um clipe
    // de 2 MB no fim da página não pode pesar na primeira tela.
    let started = false;
    const fetchClip = () => {
      if (started) return;
      started = true;
      void fetch(url)
        .then((r) => r.blob())
        .then((blob) => {
          if (cancelled) return;
          objectUrl = URL.createObjectURL(blob);
          video.src = objectUrl;
          video.load();
        })
        .catch(() => {
          /* rede caiu — o poster continua sendo a cena */
        });
    };
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          fetchClip();
          io.disconnect();
        }
      },
      { rootMargin: "100% 0px" },
    );
    io.observe(video);

    const unsubscribe = subscribe(({ life }) => {
      const d = video.duration;
      if (!d || Number.isNaN(d)) return;
      target = clamp01(dwell(life, dwellAmount)) * (d - 0.05);
    });

    const DEADBAND = isMobile ? 0.02 : 0.008;
    const LERP = 0.18;

    const stop = addTick(() => {
      const d = video.duration;
      if (!d || Number.isNaN(d)) return;
      current += (target - current) * LERP;
      if (Math.abs(current - video.currentTime) < DEADBAND) return;
      if (video.seeking) return; // coalescing: um seek por vez
      video.currentTime = current;
    });

    const onSeeked = () => revealOnce();
    const onLoaded = () => {
      video.currentTime = target;
    };
    video.addEventListener("seeked", onSeeked);
    video.addEventListener("loadeddata", onLoaded);

    // iOS mantém um vídeo mudo "seekado mas nunca tocado" em branco.
    const prime = () => {
      void video.play().then(() => video.pause()).catch(() => undefined);
    };
    window.addEventListener("touchstart", prime, { once: true, passive: true });

    return () => {
      cancelled = true;
      io.disconnect();
      stop();
      unsubscribe();
      video.removeEventListener("seeked", onSeeked);
      video.removeEventListener("loadeddata", onLoaded);
      window.removeEventListener("touchstart", prime);
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [src, srcMobile, subscribe, dwellAmount]);

  return (
    <>
      <img
        ref={posterRef}
        src={poster}
        alt=""
        aria-hidden
        className={className}
        style={{ ...style, transition: "opacity 220ms ease-out" }}
      />
      <video
        ref={videoRef}
        muted
        playsInline
        preload="auto"
        aria-hidden
        className={className}
        style={{ ...style, opacity: 0, transition: "opacity 220ms ease-out" }}
      />
    </>
  );
}
