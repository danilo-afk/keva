import { Clapperboard, Upload } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

import { pickAndUploadMedia } from "@/shared/api/tauri";
import { cn } from "@/shared/lib/cn";
import { Button } from "@/shared/ui/button";
import { Textarea } from "@/shared/ui/textarea";

import { usePublishEntityMutation } from "../entityHooks";
import {
  type Animatic,
  ANIMATIC_DOC_ID,
  animaticToContent,
  type Episode,
  episodeSeconds,
  formatTimecode,
  sequenceTimeline,
  shotProgress,
} from "../productionEntities";
import type { Production } from "../productionEvents";
import type { ProductionNavigate } from "./ProductionPage";
import {
  DISPLAY_FONT,
  EmptyState,
  formatDate,
  Kicker,
  Panel,
  ShotProgressBar,
  useMediaSrc,
} from "./productionUi";

const EMPTY: Animatic = {
  cuts: [],
  currentVersion: null,
  notes: "",
  docVersion: 0,
};

export function ProductionAnimaticTab({
  production,
  animatic,
  episodes,
  onNavigate,
}: {
  production: Production;
  animatic: Animatic | null;
  episodes: Episode[];
  onNavigate: ProductionNavigate;
}) {
  const media = useMediaSrc();
  const publish = usePublishEntityMutation("doc", production.slug);
  const data = animatic ?? EMPTY;
  const [uploading, setUploading] = React.useState(false);
  const [notes, setNotes] = React.useState(data.notes);
  const [selected, setSelected] = React.useState<number | null>(null);
  const current =
    data.cuts.find((c) => c.version === (selected ?? data.currentVersion)) ??
    data.cuts[data.cuts.length - 1] ??
    null;
  const timeline = sequenceTimeline(episodes);
  const total = [...timeline.values()].reduce(
    (max, t) => Math.max(max, t.end ?? t.start),
    0,
  );

  async function save(next: Animatic) {
    try {
      await publish.mutateAsync({
        id: ANIMATIC_DOC_ID,
        content: animaticToContent({
          ...next,
          docVersion: data.docVersion + 1,
        }),
      });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save the animatic.",
      );
      throw error;
    }
  }

  async function handleUpload() {
    setUploading(true);
    try {
      const blobs = await pickAndUploadMedia();
      if (blobs.length === 0) return;
      const nextVersion =
        data.cuts.reduce((m, c) => Math.max(m, c.version), 0) + 1;
      const cuts = [
        ...data.cuts,
        ...blobs.map((b, i) => ({
          url: b.url,
          label: b.filename ?? `Cut v${nextVersion + i}`,
          version: nextVersion + i,
          uploadedAt: Math.floor(Date.now() / 1000),
        })),
      ];
      await save({
        ...data,
        cuts,
        currentVersion: cuts[cuts.length - 1].version,
        notes,
      });
      setSelected(null);
      toast.success(
        `Cut v${cuts[cuts.length - 1].version} uploaded and set as current.`,
      );
    } catch (error) {
      if (error instanceof Error && !error.message.includes("Failed to save")) {
        toast.error(error.message);
      }
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <Kicker>
              Current cut{current ? ` · v${current.version}` : ""}
              {total > 0 ? ` · sequence ${formatTimecode(total)}` : ""}
            </Kicker>
            <Button
              data-testid="animatic-upload"
              disabled={uploading || publish.isPending}
              onClick={() => void handleUpload()}
              size="sm"
              type="button"
            >
              <Upload className="mr-1 h-3.5 w-3.5" />
              {uploading ? "Uploading…" : "Upload new cut"}
            </Button>
          </div>
          {current ? (
            // biome-ignore lint/a11y/useMediaCaption: animatic cuts carry no captions
            <video
              className="aspect-video w-full rounded-xl border border-border/60 bg-black"
              controls
              preload="metadata"
              src={media(current.url)}
            />
          ) : (
            <EmptyState
              description="Upload the exported animatic (mp4). Every upload is a new version; the latest becomes the current cut."
              title="No cut yet"
            />
          )}
          <Panel title="Editing notes">
            <Textarea
              className="min-h-0"
              onChange={(e) => setNotes(e.target.value)}
              placeholder="What changed in this cut, what is still a black card, what to check next."
              rows={4}
              value={notes}
            />
            <div className="mt-2 flex justify-end">
              <Button
                disabled={notes === data.notes || publish.isPending}
                onClick={() =>
                  void save({ ...data, notes }).then(() =>
                    toast.success("Notes saved."),
                  )
                }
                size="sm"
                type="button"
                variant="outline"
              >
                Save notes
              </Button>
            </div>
          </Panel>
        </div>

        <Panel title={`Versions (${data.cuts.length})`}>
          {data.cuts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No versions yet.</p>
          ) : (
            <ul className="space-y-1">
              {[...data.cuts].reverse().map((cut) => {
                const isCurrent = cut.version === data.currentVersion;
                const isShown = current?.version === cut.version;
                return (
                  <li key={cut.version}>
                    <div
                      className={cn(
                        "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm",
                        isShown ? "bg-accent" : "hover:bg-muted/40",
                      )}
                    >
                      <button
                        className="min-w-0 flex-1 text-left"
                        onClick={() => setSelected(cut.version)}
                        type="button"
                      >
                        <span className="font-medium">v{cut.version}</span>
                        <span className="ml-2 text-muted-foreground">
                          {cut.label}
                        </span>
                        <span className="block text-[11px] text-muted-foreground">
                          {cut.uploadedAt ? formatDate(cut.uploadedAt) : ""}
                        </span>
                      </button>
                      {isCurrent ? (
                        <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-300">
                          current
                        </span>
                      ) : (
                        <Button
                          className="h-7 px-2 text-xs"
                          disabled={publish.isPending}
                          onClick={() =>
                            void save({
                              ...data,
                              currentVersion: cut.version,
                              notes,
                            })
                          }
                          size="sm"
                          type="button"
                          variant="ghost"
                        >
                          Set current
                        </Button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>
      </div>

      <Panel title="Sequence">
        {episodes.length === 0 ? (
          <p className="text-sm text-muted-foreground">No episodes yet.</p>
        ) : (
          <ul className="divide-y divide-border/50">
            {[...episodes]
              .sort((a, b) => a.number - b.number)
              .map((ep) => {
                const t = timeline.get(ep.id);
                const len = episodeSeconds(ep);
                const counts = shotProgress(ep.shots);
                return (
                  <li key={ep.id}>
                    <button
                      className="flex w-full items-center gap-4 px-1 py-2 text-left hover:bg-muted/40"
                      onClick={() => onNavigate({ tab: "episodes", id: ep.id })}
                      type="button"
                    >
                      <span className="w-14 shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
                        {t ? formatTimecode(t.start) : "—"}
                      </span>
                      <span className="w-14 shrink-0 text-xs font-semibold tabular-nums text-muted-foreground">
                        EP. {String(ep.number).padStart(2, "0")}
                      </span>
                      <span
                        className="min-w-0 flex-1 truncate font-medium"
                        style={DISPLAY_FONT}
                      >
                        {ep.title}
                      </span>
                      <span className="w-16 shrink-0 text-right text-xs text-muted-foreground">
                        {len != null ? formatTimecode(len) : "?"}
                      </span>
                      <span className="w-32 shrink-0">
                        <ShotProgressBar counts={counts} />
                      </span>
                    </button>
                  </li>
                );
              })}
          </ul>
        )}
        <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clapperboard className="h-3.5 w-3.5" />
          Start times come from each episode's duration, in episode order.
        </p>
      </Panel>
    </div>
  );
}
