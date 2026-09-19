"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from "react";

import { addTick, clamp01, cueOpacity } from "./driver";

export interface ActState {
  /** Progresso do trecho pinado (0..1). Cues usam este. */
  p: number;
  /** Progresso da vida visível inteira: entra, pina, sai. Clipes usam este. */
  life: number;
}

type Listener = (s: ActState) => void;

interface ActContextValue {
  subscribe: (fn: Listener) => () => void;
  state: ActState;
}

const ActContext = createContext<ActContextValue | null>(null);

export function useAct(): ActContextValue {
  const ctx = useContext(ActContext);
  if (!ctx) throw new Error("useAct precisa estar dentro de <Act>");
  return ctx;
}

export function Act({
  span = 2.4,
  id,
  className,
  stageClassName,
  children,
}: {
  /** Altura do ato em alturas de viewport. Pinado precisa de >= 1.2. */
  span?: number;
  id?: string;
  className?: string;
  stageClassName?: string;
  children: ReactNode;
}) {
  const sectionRef = useRef<HTMLElement>(null);
  const listeners = useRef(new Set<Listener>());
  const state = useRef<ActState>({ p: 0, life: 0 }).current;

  const subscribe = useCallback((fn: Listener) => {
    listeners.current.add(fn);
    fn(state);
    return () => listeners.current.delete(fn);
  }, [state]);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;

    let top = 0;
    let height = 0;
    const measure = () => {
      const r = el.getBoundingClientRect();
      top = r.top + window.scrollY;
      height = r.height;
    };
    measure();
    window.addEventListener("resize", measure);
    // Fonte que carrega ou clipe que chega mudam a altura do documento; sem
    // remedir, o ato inteiro fica com o mapeamento de scroll errado.
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    ro.observe(document.body);

    let lastP = -1;
    let lastLife = -1;

    const stop = addTick(() => {
      const vh = window.innerHeight;
      const y = window.scrollY;

      const travel = Math.max(height - vh, 1);
      const p = clamp01((y - top) / travel);

      // A vida visível é clampada ao scroll que existe de fato: um ato no topo
      // do documento começa no frame 1, um no fim alcança o último frame.
      const docH = document.documentElement.scrollHeight;
      const startY = Math.max(top - vh, 0);
      const endY = Math.min(top + height, Math.max(docH - vh, 1));
      const life = clamp01((y - startY) / Math.max(endY - startY, 1));

      if (p === lastP && life === lastLife) return;
      lastP = p;
      lastLife = life;
      state.p = p;
      state.life = life;
      for (const fn of listeners.current) fn(state);
    });

    return () => {
      stop();
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [state]);

  const value = useMemo(() => ({ subscribe, state }), [subscribe, state]);

  return (
    <ActContext.Provider value={value}>
      <section
        ref={sectionRef}
        id={id}
        className={className}
        style={{ height: `${span * 100}vh` }}
      >
        <div
          className={`sticky top-0 h-screen w-full overflow-hidden ${stageClassName ?? ""}`}
        >
          {children}
        </div>
      </section>
    </ActContext.Provider>
  );
}

/**
 * Bloco de copy governado pelo scroll. `to` ausente = entra e segura (só no
 * último ato — no meio da página a linha ficaria acesa durante a saída do pin).
 */
export function Cue({
  from,
  to,
  rampIn,
  rampOut,
  rise = 18,
  className,
  children,
}: {
  from: number;
  to?: number;
  rampIn?: number;
  rampOut?: number;
  /** Deslocamento vertical em px na entrada. 0 desliga. */
  rise?: number;
  className?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { subscribe } = useAct();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    return subscribe(({ p }) => {
      const o = cueOpacity(p, from, to, rampIn, rampOut);
      el.style.opacity = String(o);
      el.style.transform = reduce || !rise ? "" : `translate3d(0,${(1 - o) * rise}px,0)`;
      el.style.visibility = o < 0.01 ? "hidden" : "visible";
    });
  }, [subscribe, from, to, rampIn, rampOut, rise]);

  // Cue de saudação (já cheio em p = 0) nasce visível: é a primeira tela que
  // todo visitante vê, e um fade a partir do zero deixaria o LCP vazio.
  const greets = from === 0 && rampIn === 0;

  return (
    <div
      ref={ref}
      className={className}
      style={{ opacity: greets ? 1 : 0, willChange: "opacity, transform" }}
    >
      {children}
    </div>
  );
}
