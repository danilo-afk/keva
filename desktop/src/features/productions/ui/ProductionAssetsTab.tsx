import * as React from "react";

import { cn } from "@/shared/lib/cn";

import type { Character, Episode } from "../productionEntities";
import type { ProductionNavigate } from "./ProductionPage";
import { EmptyState, ProductionLightbox, useMediaSrc } from "./productionUi";

type Asset = {
  url: string;
  kind: "image" | "video";
  label: string;
  source: "character" | "shot";
  go: () => void;
};

/** Derived assets: every image and clip referenced by characters and shots. */
export function ProductionAssetsTab({
  characters,
  episodes,
  onNavigate,
}: {
  characters: Character[];
  episodes: Episode[];
  onNavigate: ProductionNavigate;
}) {
  const media = useMediaSrc();
  const [lightbox, setLightbox] = React.useState<number | null>(null);
  const [filter, setFilter] = React.useState<
    "all" | "character" | "shot" | "video"
  >("all");
  const assets = React.useMemo<Asset[]>(() => {
    const out: Asset[] = [];
    for (const c of characters) {
      for (const image of c.images) {
        out.push({
          url: image.url,
          kind: "image",
          label: `${c.name}${image.caption ? ` · ${image.caption}` : ""}`,
          source: "character",
          go: () => onNavigate({ tab: "characters", id: c.id }),
        });
      }
    }
    for (const ep of episodes) {
      for (const shot of ep.shots) {
        const label = `EP. ${String(ep.number).padStart(2, "0")} · shot ${shot.n}`;
        for (const url of shot.frames) {
          out.push({
            url,
            kind: "image",
            label,
            source: "shot",
            go: () => onNavigate({ tab: "episodes", id: ep.id }),
          });
        }
        if (shot.clip) {
          out.push({
            url: shot.clip,
            kind: "video",
            label,
            source: "shot",
            go: () => onNavigate({ tab: "episodes", id: ep.id }),
          });
        }
      }
    }
    return out;
  }, [characters, episodes, onNavigate]);

  const visible = assets.filter((a) =>
    filter === "all"
      ? true
      : filter === "video"
        ? a.kind === "video"
        : a.source === filter,
  );

  if (assets.length === 0) {
    return (
      <EmptyState
        description="Reference images from character sheets and frames or clips attached to shots show up here."
        title="No assets yet"
      />
    );
  }

  const filters: { key: typeof filter; label: string }[] = [
    { key: "all", label: `All (${assets.length})` },
    { key: "character", label: "Characters" },
    { key: "shot", label: "Shots" },
    { key: "video", label: "Clips" },
  ];

  const lightboxImages = visible
    .filter((a) => a.kind === "image")
    .map((a) => ({ url: a.url, caption: a.label }));
  return (
    <div className="space-y-4">
      <ProductionLightbox
        images={lightboxImages}
        index={lightbox}
        onClose={() => setLightbox(null)}
        onIndexChange={setLightbox}
      />
      <div className="flex flex-wrap gap-1">
        {filters.map((f) => (
          <button
            className={cn(
              "rounded-full border px-3 py-1 text-xs transition-colors",
              filter === f.key
                ? "border-foreground/30 bg-accent text-foreground"
                : "border-border/60 text-muted-foreground hover:text-foreground",
            )}
            key={f.key}
            onClick={() => setFilter(f.key)}
            type="button"
          >
            {f.label}
          </button>
        ))}
      </div>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {visible.map((asset) => (
          <li key={`${asset.source}:${asset.label}:${asset.url}`}>
            <button
              className="group w-full overflow-hidden rounded-lg border border-border/60 bg-card/40 text-left transition-colors hover:border-border"
              onClick={() => {
                if (asset.kind === "image") {
                  setLightbox(
                    lightboxImages.findIndex((i) => i.url === asset.url),
                  );
                } else {
                  asset.go();
                }
              }}
              type="button"
            >
              <div className="aspect-square w-full bg-muted/40">
                {asset.kind === "video" ? (
                  <video
                    className="h-full w-full object-cover"
                    muted
                    preload="metadata"
                    src={media(asset.url)}
                  />
                ) : (
                  <img
                    alt={asset.label}
                    className="h-full w-full object-cover"
                    loading="lazy"
                    src={media(asset.url)}
                  />
                )}
              </div>
              <p className="truncate px-2 py-1.5 text-[11px] text-muted-foreground group-hover:text-foreground">
                {asset.label}
              </p>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
