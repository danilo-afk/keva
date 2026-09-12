import { Film } from "lucide-react";

import { cn } from "@/shared/lib/cn";

import type { Episode, Shot } from "../productionEntities";
import { StateChip, useMediaSrc } from "./productionUi";

export type BoardItem = { episode: Episode; shot: Shot };

function pad(n: number) {
  return String(n).padStart(2, "0");
}

/** Storyboard grid: one card per shot, frame first (HyperFrames-style). */
export function ShotBoard({
  items,
  onOpen,
  showEpisode = true,
  className,
}: {
  items: BoardItem[];
  onOpen: (item: BoardItem) => void;
  showEpisode?: boolean;
  className?: string;
}) {
  const media = useMediaSrc();
  return (
    <ul
      className={cn(
        "grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4",
        className,
      )}
      data-testid="shot-board"
    >
      {items.map(({ episode, shot }) => {
        const frame = shot.frames[0];
        const seconds = shotSeconds(shot);
        return (
          <li key={`${episode.id}:${shot.n}`}>
            <button
              className="group flex w-full flex-col overflow-hidden rounded-xl border border-border/60 bg-card/40 text-left transition-colors hover:border-border hover:bg-card/70"
              data-testid={`board-shot-${episode.id}-${shot.n}`}
              onClick={() => onOpen({ episode, shot })}
              type="button"
            >
              <div className="relative aspect-video w-full bg-muted/40">
                {frame ? (
                  <img
                    alt=""
                    className="h-full w-full object-cover"
                    loading="lazy"
                    src={media(frame)}
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-muted-foreground/60">
                    <Film className="h-6 w-6" />
                  </div>
                )}
                <span className="absolute left-2 top-2 flex h-7 min-w-7 items-center justify-center rounded-full bg-background/85 px-2 text-xs font-semibold tabular-nums shadow">
                  {shot.n}
                </span>
              </div>
              <div className="space-y-1.5 p-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="min-w-0 truncate text-sm font-semibold">
                    {showEpisode ? `EP.${pad(episode.number)} ` : ""}P
                    {pad(shot.n)}
                    {shot.scene ? (
                      <span className="font-medium text-muted-foreground">
                        {" "}
                        · {shot.scene}
                      </span>
                    ) : null}
                  </p>
                  <StateChip state={shot.state} />
                </div>
                <p className="line-clamp-2 text-xs leading-snug text-muted-foreground">
                  {[shot.framing, shot.action].filter(Boolean).join(" · ")}
                </p>
                <p className="text-[11px] text-muted-foreground/80">
                  {seconds != null ? `${seconds}s` : shot.start}
                  {shot.cast ? ` · ${shot.cast}` : ""}
                </p>
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function toSeconds(tc: string): number | null {
  const m = /^(\d+):(\d+)$/.exec(tc.trim());
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

export function shotSeconds(shot: Shot): number | null {
  const a = toSeconds(shot.start);
  const b = toSeconds(shot.end);
  if (a == null || b == null || b < a) return null;
  return b - a;
}
