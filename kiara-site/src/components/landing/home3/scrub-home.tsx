"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";

import { Act, Cue, useAct } from "@/lib/scroll-scrub/act";
import { ScrubVideo } from "@/lib/scroll-scrub/scrub-video";

import { Crosshair } from "./crosshair";
import { PanRail } from "./pan-rail";
import { SiteFooter } from "./site-footer";
import { StartButton } from "./start-button";
import { TopBar } from "./top-bar";

const COVER = "absolute inset-0 h-full w-full object-cover";

export function ScrubHome() {
  return (
    <div className="relative bg-[#0B0B0B] text-[#F2F2ED] antialiased">
      <Grain />
      <TopBar />

      <main>
        <ActHero />
        <ActStudio />
        <ActWork />
        <ActScale />
        <ActClose />
      </main>
      <SiteFooter />
    </div>
  );
}

/* ---------------------------------------------------------------- ato 1 */
/* Abre com a Kiara: o clipe corre sob a mão de quem rola. */
function ActHero() {
  const stageRef = useRef<HTMLDivElement>(null);

  return (
    <Act span={2.2} stageClassName="bg-black">
      <div ref={stageRef} className="absolute inset-0">
        <ScrubVideo
          src="/home3/01-kiara.mp4"
          srcMobile="/home3/01-kiara-m.mp4"
          poster="/home3/01-kiara.jpg"
          className={COVER}
          style={{ objectPosition: "30% center" }}
        />
        {/* Densidade só no canto onde a copy vive. */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(120% 90% at 100% 55%, rgba(11,11,11,0.92) 0%, rgba(11,11,11,0.75) 38%, rgba(11,11,11,0) 68%)",
          }}
        />
        <Crosshair scopeRef={stageRef} />

        <div className="absolute inset-0 z-40 flex items-center justify-end px-6 md:px-16">
          <Cue
            from={0}
            to={0.94}
            rampIn={0}
            rampOut={0.14}
            rise={0}
            className="w-full max-w-xl md:max-w-2xl"
          >
            <h1 className="font-[family-name:var(--font-sora)] text-[2.6rem] font-bold leading-[0.98] tracking-[-0.035em] md:text-[4.4rem]">
              One A.I.
              <br />
              the power of
              <br />
              <span
                data-crosshair
                className="relative inline-block after:pointer-events-none after:absolute after:-bottom-1 after:left-0 after:h-[3px] after:w-full after:origin-left after:scale-x-0 after:bg-[#F2C230] after:content-[''] hover:after:scale-x-100 after:transition-transform after:duration-500 after:ease-[cubic-bezier(0.23,1,0.32,1)]"
              >
                an entire agency<span className="text-[#F2C230]">.</span>
              </span>
            </h1>
            <p className="mt-6 max-w-[46ch] font-[family-name:var(--font-manrope)] text-[1.05rem] leading-[1.65] text-[#B9B9B2] md:text-[1.15rem]">
              Images, video, characters and workflows. One agent, and you keep
              control of every step.
            </p>
            <CallToAction className="mt-9" />
          </Cue>
        </div>
      </div>
    </Act>
  );
}

/* ---------------------------------------------------------------- ato 2 */
/* Um wipe: a luz do estúdio entra pela borda conforme você desce. */
function ActStudio() {
  return (
    <Act span={2.8} stageClassName="bg-[#0B0B0B]">
      <Wipe>
        <video
          src="/home3/03-studio.mp4"
          poster="/home3/03-studio.jpg"
          autoPlay
          muted
          loop
          playsInline
          aria-hidden
          className={COVER}
        />
      </Wipe>
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(110% 90% at 0% 60%, rgba(11,11,11,0.94) 0%, rgba(11,11,11,0.7) 42%, rgba(11,11,11,0) 72%)",
        }}
      />
      {/* As três etapas entram em sequência e FICAM: no fim do ato o pipeline
          inteiro está na tela, que é a coisa que precisa ser lida de uma vez. */}
      <div className="absolute inset-0 flex items-center px-6 md:px-16">
        <div className="w-full max-w-xl">
          <Cue from={0} to={0.98} rampIn={0.04} rampOut={0.06}>
            <h2 className="font-[family-name:var(--font-sora)] text-[2rem] font-bold leading-[1.02] tracking-[-0.03em] text-balance md:text-[3.1rem]">
              From brief to final cut.
            </h2>
            <p className="mt-4 max-w-[52ch] font-[family-name:var(--font-manrope)] text-[1rem] leading-[1.7] text-[#B9B9B2]">
              The studio is already lit. Battle-tested workflows and a prompt
              library, waiting before you write the first line.
            </p>
          </Cue>

          <div className="mt-8 space-y-5 md:mt-10 md:space-y-6">
            <Cue from={0.18} to={1} rampIn={0.1} rampOut={0.05}>
              <Stage n="01" title="Pre-production">
                Brief, references and characters. The agent keeps your direction
                in memory.
              </Stage>
            </Cue>
            <Cue from={0.4} to={1} rampIn={0.1} rampOut={0.05}>
              <Stage n="02" title="Production">
                Images, video and voice, on the models you choose.
              </Stage>
            </Cue>
            <Cue from={0.62} to={1} rampIn={0.1} rampOut={0.05}>
              <Stage n="03" title="Post-production">
                Cuts, sound and formats, assembled in the workflow canvas.
              </Stage>
            </Cue>
          </div>
        </div>
      </div>
    </Act>
  );
}

/** Uma etapa do pipeline. A numeração fica porque aqui a ordem é a informação. */
function Stage({
  n,
  title,
  children,
}: {
  n: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-4 border-l border-[#2E2E2A] pl-4 md:gap-5 md:pl-5">
      <span className="mt-1 font-[family-name:var(--font-mono)] text-[11px] tracking-[0.14em] text-[#F2C230]">
        {n}
      </span>
      <div>
        <h3 className="font-[family-name:var(--font-sora)] text-[1.05rem] font-bold tracking-[-0.01em] text-[#F2F2ED] md:text-[1.2rem]">
          {title}
        </h3>
        <p className="mt-1 max-w-[44ch] font-[family-name:var(--font-manrope)] text-[0.9rem] leading-[1.6] text-[#8A8A84] md:text-[0.95rem]">
          {children}
        </p>
      </div>
    </div>
  );
}

/** Revela o conteúdo por um corte que anda com o scroll. */
function Wipe({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const { subscribe } = useAct();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    return subscribe(({ p }) => {
      // Revela da direita, onde o clipe tem luz: um wipe pela esquerda mostrava
      // parede preta e a costura entre os atos ficava sem imagem. Começa com
      // uma fatia já aberta porque o stage aparece antes de p sair de 0.
      const edge = (1 - Math.min(p * 1.45, 1)) * 62;
      el.style.clipPath = `polygon(${edge}% 0, 100% 0, 100% 100%, ${edge + 8}% 100%)`;
    });
  }, [subscribe]);

  return (
    <div ref={ref} className="absolute inset-0" style={{ clipPath: "polygon(62% 0, 100% 0, 100% 100%, 70% 100%)" }}>
      {children}
    </div>
  );
}

/* ---------------------------------------------------------------- ato 3 */
/* Lateral lê como amplitude. Os clipes são os que a plataforma produz. */
function ActWork() {
  return (
    <Act span={2} stageClassName="bg-[#0B0B0B]">
      <div className="absolute inset-x-0 top-[14vh] px-6 md:px-16">
        <Cue from={0.02} to={0.95} rampIn={0.06} rampOut={0.12}>
          <h2 className="font-[family-name:var(--font-sora)] text-[2rem] font-bold leading-[1.05] tracking-[-0.03em] text-balance md:text-[3rem]">
            Made with Kiara.
          </h2>
          <p className="mt-4 max-w-[44ch] font-[family-name:var(--font-manrope)] text-[1rem] leading-[1.7] text-[#B9B9B2]">
            Throw in your footage, say what you want.
          </p>
        </Cue>
      </div>
      <div className="absolute inset-x-0 bottom-[8vh]">
        <PanRail />
      </div>
    </Act>
  );
}

/* ---------------------------------------------------------------- ato 4 */
/* O pico: o maior trecho de scroll da página, e a única grade de luz. */
function ActScale() {
  return (
    <Act span={2.6} stageClassName="bg-black">
      <ScrubVideo
        src="/home3/05-lights.mp4"
        srcMobile="/home3/05-lights-m.mp4"
        poster="/home3/05-lights.jpg"
        dwellAmount={0.45}
        className={COVER}
      />
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(to top, rgba(11,11,11,0.95) 0%, rgba(11,11,11,0.55) 34%, rgba(11,11,11,0) 62%)",
        }}
      />
      <div className="absolute inset-x-0 bottom-[12vh] px-6 md:px-16">
        <Cue from={0.16} to={0.96} rampIn={0.14} rampOut={0.16} className="ml-auto max-w-2xl md:text-right">
          <h2 className="font-[family-name:var(--font-sora)] text-[2.1rem] font-bold leading-[1.02] tracking-[-0.03em] text-balance md:text-[3.6rem]">
            One prompt.
            <br />
            A hundred takes.
            <br />
            One direction.
          </h2>
          <p className="mt-5 max-w-[50ch] font-[family-name:var(--font-manrope)] text-[1rem] leading-[1.7] text-[#B9B9B2] md:ml-auto md:text-[1.1rem]">
            Scale is the same care, repeated. The agent holds the look across
            every frame it makes.
          </p>
        </Cue>
      </div>
    </Act>
  );
}

/* ---------------------------------------------------------------- ato 5 */
/* Fecha e segura: a última tela é a que a pessoa leva. */
function ActClose() {
  return (
    <Act span={2} stageClassName="bg-black">
      <img src="/home3/06-close.jpg" alt="" aria-hidden className={COVER} />
      <div className="absolute inset-0 bg-[#0B0B0B]/60" />
      <div className="absolute inset-0 flex items-center justify-center px-6 pt-14">
        <Cue from={0.12} rampIn={0.22} className="text-center">
          <h2 className="font-[family-name:var(--font-sora)] text-[2.4rem] font-bold leading-[1.02] tracking-[-0.035em] md:text-[4rem]">
            Start with one prompt<span className="text-[#F2C230]">.</span>
          </h2>
          <CallToAction className="mt-10 justify-center" />
          <p className="mt-8 font-[family-name:var(--font-manrope)] text-[0.9rem] text-[#B9B9B2]">
            Rather talk first?{" "}
            <Link
              href="mailto:contato@kiara.ai"
              className="text-[#F2F2ED] underline underline-offset-4 decoration-[#8A8A84] hover:decoration-[#F2C230] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#F2C230]"
            >
              contato@kiara.ai
            </Link>
          </p>
        </Cue>
      </div>
    </Act>
  );
}

/* ---------------------------------------------------------------- chrome */

function CallToAction({ className }: { className?: string }) {
  return (
    <div className={`flex items-center gap-5 ${className ?? ""}`} data-crosshair>
      <StartButton />
    </div>
  );
}

/** Fundo escuro liso faz banding em tela real. */
function Grain() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-40 opacity-[0.045] mix-blend-overlay"
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3'/%3E%3C/filter%3E%3Crect width='140' height='140' filter='url(%23n)'/%3E%3C/svg%3E\")",
      }}
    />
  );
}
