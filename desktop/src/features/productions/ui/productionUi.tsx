// Small presentational pieces shared by the production tabs.
import * as React from "react";

import { cn } from "@/shared/lib/cn";
import { rewriteRelayUrl } from "@/shared/lib/mediaUrl";
import { useMediaProxyPort } from "@/shared/lib/useMediaProxyPort";
import { SimpleImageLightbox } from "@/shared/ui/SimpleImageLightbox";

import type { ShotState } from "../productionEntities";

export const DISPLAY_FONT = {
  fontFamily: "'Sora Variable', Sora, sans-serif",
} as const;

export const SELECT_CLASS =
  "h-9 rounded-md border border-input bg-background px-3 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

export const SHOT_STATE_LABEL: Record<ShotState, string> = {
  cartela: "Cartela",
  gerado: "Gerado",
  revisao: "Em revisão",
  aprovado: "Aprovado",
};

export const SHOT_STATE_CLASS: Record<ShotState, string> = {
  cartela: "bg-muted text-muted-foreground",
  gerado: "bg-sky-500/15 text-sky-300",
  revisao: "bg-amber-500/15 text-amber-300",
  aprovado: "bg-emerald-500/15 text-emerald-300",
};

export const SHOT_STATE_BAR: Record<ShotState, string> = {
  cartela: "bg-muted-foreground/30",
  gerado: "bg-sky-400/70",
  revisao: "bg-amber-400/80",
  aprovado: "bg-emerald-400/80",
};

export function Kicker({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <h2
      className={cn(
        "text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground",
        className,
      )}
    >
      {children}
    </h2>
  );
}

export function Panel({
  children,
  className,
  title,
  action,
}: {
  children: React.ReactNode;
  className?: string;
  title?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <section
      className={cn(
        "min-w-0 overflow-hidden rounded-xl border border-border/60 bg-card/40 p-5 shadow-[inset_0_1px_0_0_hsl(var(--foreground)/0.03)]",
        className,
      )}
    >
      {title || action ? (
        <div className="mb-4 flex items-center justify-between gap-3">
          {typeof title === "string" ? <Kicker>{title}</Kicker> : title}
          {action}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function Stat({
  label,
  value,
  hint,
  onClick,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  onClick?: () => void;
}) {
  const Comp = onClick ? "button" : "div";
  return (
    <Comp
      className={cn(
        "flex min-w-0 flex-col gap-1 rounded-xl border border-border/60 bg-card/40 px-4 py-3 text-left",
        onClick && "transition-colors hover:border-border hover:bg-card/70",
      )}
      onClick={onClick}
      type={onClick ? "button" : undefined}
    >
      <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </span>
      <span
        className="text-2xl font-semibold tabular-nums"
        style={DISPLAY_FONT}
      >
        {value}
      </span>
      {hint ? (
        <span className="truncate text-xs text-muted-foreground">{hint}</span>
      ) : null}
    </Comp>
  );
}

export function Chip({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border border-border/70 bg-muted/40 px-2.5 py-0.5 text-xs font-medium text-foreground/80",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function StateChip({ state }: { state: ShotState }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold",
        SHOT_STATE_CLASS[state],
      )}
    >
      {SHOT_STATE_LABEL[state]}
    </span>
  );
}

/** Segmented progress bar by shot state. */
export function ShotProgressBar({
  counts,
  className,
}: {
  counts: Record<ShotState, number>;
  className?: string;
}) {
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  if (total === 0)
    return <div className={cn("h-1.5 rounded-full bg-muted", className)} />;
  const order: ShotState[] = ["aprovado", "revisao", "gerado", "cartela"];
  return (
    <div
      className={cn(
        "flex h-1.5 w-full overflow-hidden rounded-full bg-muted",
        className,
      )}
    >
      {order.map((state) =>
        counts[state] > 0 ? (
          <div
            className={SHOT_STATE_BAR[state]}
            key={state}
            style={{ width: `${(counts[state] / total) * 100}%` }}
            title={`${SHOT_STATE_LABEL[state]}: ${counts[state]}`}
          />
        ) : null,
      )}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border/70 px-6 py-12 text-center">
      <p className="text-sm font-medium">{title}</p>
      {description ? (
        <p className="max-w-md text-sm text-muted-foreground">{description}</p>
      ) : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}

export function formatDate(unixSeconds: number): string {
  return new Date(unixSeconds * 1000).toLocaleString(undefined, {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Relay media needs the local proxy (auth); re-renders when the port resolves. */
export function useMediaSrc(): (url: string) => string {
  useMediaProxyPort();
  return rewriteRelayUrl;
}

export type LightboxImage = { url: string; caption?: string };

/** Full-size viewer with prev/next and an optional Remove action. */
export function ProductionLightbox({
  images,
  index,
  onIndexChange,
  onClose,
  onRemove,
}: {
  images: LightboxImage[];
  index: number | null;
  onIndexChange: (index: number) => void;
  onClose: () => void;
  onRemove?: (index: number) => void;
}) {
  const media = useMediaSrc();
  const image = index == null ? null : (images[index] ?? null);
  React.useEffect(() => {
    if (index == null) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight" && index < images.length - 1)
        onIndexChange(index + 1);
      if (event.key === "ArrowLeft" && index > 0) onIndexChange(index - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [images.length, index, onIndexChange]);
  if (index == null || !image) return null;
  return (
    <SimpleImageLightbox
      alt={image.caption || "Image"}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      open
      src={media(image.url)}
    >
      <div className="relative flex max-h-[92vh] max-w-[92vw] flex-col items-center gap-3">
        <img
          alt={image.caption || ""}
          className="max-h-[80vh] max-w-[92vw] rounded-lg object-contain shadow-2xl"
          src={media(image.url)}
        />
        <div className="flex items-center gap-3 rounded-full bg-black/60 px-3 py-1.5 text-xs text-white/90">
          <button
            className="rounded-full px-2 py-0.5 hover:bg-white/10 disabled:opacity-30"
            disabled={index <= 0}
            onClick={() => onIndexChange(index - 1)}
            type="button"
          >
            ‹
          </button>
          <span className="tabular-nums">
            {index + 1} / {images.length}
          </span>
          <button
            className="rounded-full px-2 py-0.5 hover:bg-white/10 disabled:opacity-30"
            disabled={index >= images.length - 1}
            onClick={() => onIndexChange(index + 1)}
            type="button"
          >
            ›
          </button>
          {image.caption ? (
            <span className="max-w-[50vw] truncate border-l border-white/20 pl-3">
              {image.caption}
            </span>
          ) : null}
          <a
            className="border-l border-white/20 pl-3 hover:underline"
            href={media(image.url)}
            rel="noreferrer"
            target="_blank"
          >
            Open
          </a>
          {onRemove ? (
            <button
              className="border-l border-white/20 pl-3 text-red-300 hover:text-red-200"
              data-testid="lightbox-remove"
              onClick={() => onRemove(index)}
              type="button"
            >
              Remove
            </button>
          ) : null}
        </div>
      </div>
    </SimpleImageLightbox>
  );
}
