/**
 * rAF único compartilhado por todos os atos da página.
 * Um loop só evita N loops concorrentes brigando pelo frame.
 */
type Tick = () => void;

const ticks = new Set<Tick>();
let raf = 0;

function loop() {
  for (const tick of ticks) tick();
  raf = requestAnimationFrame(loop);
}

export function addTick(tick: Tick): () => void {
  ticks.add(tick);
  if (!raf) raf = requestAnimationFrame(loop);
  return () => {
    ticks.delete(tick);
    if (!ticks.size && raf) {
      cancelAnimationFrame(raf);
      raf = 0;
    }
  };
}

export const clamp01 = (n: number) => (n < 0 ? 0 : n > 1 ? 1 : n);

/** Remapeia o tempo para o clipe "assentar" no meio do ato e correr nas bordas. */
export function dwell(p: number, amount: number): number {
  if (amount <= 0) return p;
  const k = Math.min(amount, 0.6);
  const s = (p - 0.5) * 2;
  const eased = Math.sign(s) * Math.pow(Math.abs(s), 1 + k * 2);
  return clamp01((eased + 1) / 2);
}

/**
 * Janela de cue: `from`/`to` em progresso do ato, com rampas de entrada e saída.
 * `to` ausente = entra e SEGURA até o fim (só o último ato deve usar).
 */
export function cueOpacity(
  p: number,
  from: number,
  to?: number,
  rampIn?: number,
  rampOut?: number,
): number {
  const rIn = rampIn ?? (to == null ? 0.12 : (to - from) * 0.3);
  if (to == null) return rIn <= 0 ? (p >= from ? 1 : 0) : clamp01((p - from) / rIn);
  const rOut = rampOut ?? (to - from) * 0.3;
  if (p < from) return 0;
  if (p > to) return 0;
  const inFade = rIn <= 0 ? 1 : clamp01((p - from) / rIn);
  const outFade = rOut <= 0 ? 1 : clamp01((to - p) / rOut);
  return Math.min(inFade, outFade);
}
