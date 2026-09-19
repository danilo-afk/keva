"use client";

import { useEffect, useRef } from "react";

import { addTick } from "@/lib/scroll-scrub/driver";

/**
 * O retículo do hero atual, refeito na paleta da marca: uma grade fina de fundo
 * mais duas linhas que perseguem o ponteiro e travam nas bordas de qualquer
 * elemento marcado com `data-crosshair`. É o gesto que dizia "isto é um
 * enquadramento", e ele se perde se o hero for só vídeo e texto.
 */
export function Crosshair({ scopeRef }: { scopeRef: React.RefObject<HTMLElement | null> }) {
  const hRef = useRef<HTMLDivElement>(null);
  const vRef = useRef<HTMLDivElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const scope = scopeRef.current;
    const hLine = hRef.current;
    const vLine = vRef.current;
    const box = boxRef.current;
    if (!scope || !hLine || !vLine || !box) return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;

    let targetX = window.innerWidth * 0.5;
    let targetY = window.innerHeight * 0.5;
    let x = targetX;
    let y = targetY;
    let snapped: DOMRect | null = null;

    const onMove = (e: PointerEvent) => {
      targetX = e.clientX;
      targetY = e.clientY;
      const hit = (e.target as HTMLElement)?.closest?.("[data-crosshair]");
      snapped = hit ? hit.getBoundingClientRect() : null;
    };
    const onLeave = () => {
      snapped = null;
    };
    scope.addEventListener("pointermove", onMove);
    scope.addEventListener("pointerleave", onLeave);

    const stop = addTick(() => {
      // Travado no alvo o retículo vira moldura; solto, ele segue a mão.
      const wantX = snapped ? snapped.left + snapped.width / 2 : targetX;
      const wantY = snapped ? snapped.top + snapped.height / 2 : targetY;
      x += (wantX - x) * 0.14;
      y += (wantY - y) * 0.14;
      vLine.style.transform = `translate3d(${x}px,0,0)`;
      hLine.style.transform = `translate3d(0,${y}px,0)`;
      if (snapped) {
        box.style.opacity = "1";
        box.style.transform = `translate3d(${snapped.left - 8}px,${snapped.top - 6}px,0)`;
        box.style.width = `${snapped.width + 16}px`;
        box.style.height = `${snapped.height + 12}px`;
      } else {
        box.style.opacity = "0";
      }
    });

    return () => {
      stop();
      scope.removeEventListener("pointermove", onMove);
      scope.removeEventListener("pointerleave", onLeave);
    };
  }, [scopeRef]);

  return (
    <div className="pointer-events-none absolute inset-0 z-30 overflow-hidden" aria-hidden>
      <div
        className="absolute inset-0 opacity-[0.055]"
        style={{
          backgroundImage:
            "linear-gradient(to right, #F2F2ED 1px, transparent 1px), linear-gradient(to bottom, #F2F2ED 1px, transparent 1px)",
          backgroundSize: "clamp(180px, 18vw, 320px) clamp(180px, 18vw, 320px)",
        }}
      />
      <div ref={vRef} className="absolute top-0 h-full w-px bg-[#F2C230]/25 will-change-transform" />
      <div ref={hRef} className="absolute left-0 h-px w-full bg-[#F2C230]/25 will-change-transform" />
      <div
        ref={boxRef}
        className="absolute left-0 top-0 rounded-[3px] border border-[#F2C230]/70 opacity-0 transition-opacity duration-200 will-change-transform"
      />
    </div>
  );
}
