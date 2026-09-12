import {
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  Film,
  LayoutGrid,
  Table2,
} from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

import { cn } from "@/shared/lib/cn";
import { Button } from "@/shared/ui/button";
import { Textarea } from "@/shared/ui/textarea";
import { pickAndUploadMedia } from "@/shared/api/tauri";
import { toast as notify } from "sonner";

import { usePublishEntityMutation } from "../entityHooks";
import {
  type Episode,
  episodeToContent,
  SHOT_STATES,
  type Shot,
  type ShotState,
  shotProgress,
} from "../productionEntities";
import type { Production } from "../productionEvents";
import type { ProductionNavigate } from "./ProductionPage";
import { ShotBoard } from "./ShotBoard";
import {
  Chip,
  DISPLAY_FONT,
  EmptyState,
  Kicker,
  SELECT_CLASS,
  SHOT_STATE_LABEL,
  ShotProgressBar,
  ProductionLightbox,
  StateChip,
  useMediaSrc,
} from "./productionUi";

type EpisodesView = "list" | "board";

function ViewToggle({
  value,
  onChange,
}: {
  value: EpisodesView;
  onChange: (next: EpisodesView) => void;
}) {
  const options: { key: EpisodesView; label: string; Icon: typeof Table2 }[] = [
    { key: "list", label: "Table", Icon: Table2 },
    { key: "board", label: "Board", Icon: LayoutGrid },
  ];
  return (
    <div className="inline-flex rounded-lg border border-border/60 bg-muted/30 p-0.5">
      {options.map(({ key, label, Icon }) => (
        <button
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
            value === key
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
          data-testid={`episodes-view-${key}`}
          key={key}
          onClick={() => onChange(key)}
          type="button"
        >
          <Icon className="h-3.5 w-3.5" />
          {label}
        </button>
      ))}
    </div>
  );
}

export function ProductionEpisodesTab({
  production,
  episodes,
  isPending,
  entityId,
  onNavigate,
}: {
  production: Production;
  episodes: Episode[];
  isPending: boolean;
  entityId?: string;
  onNavigate: ProductionNavigate;
}) {
  const [view, setView] = React.useState<EpisodesView>("list");
  const selected = entityId
    ? (episodes.find((e) => e.id === entityId) ?? null)
    : null;
  if (selected) {
    return (
      <EpisodeDetail
        episode={selected}
        key={selected.eventId}
        onBack={() => onNavigate({ tab: "episodes" })}
        production={production}
      />
    );
  }
  if (!isPending && episodes.length === 0) {
    return (
      <EmptyState
        description={`Import a script or create episodes with \`buzz productions episodes set --slug ${production.slug} <id>\`.`}
        title="No episodes yet"
      />
    );
  }
  const blocks = new Map<string, Episode[]>();
  for (const ep of episodes) {
    const key = ep.block || "—";
    blocks.set(key, [...(blocks.get(key) ?? []), ep]);
  }
  if (view === "board") {
    return (
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex items-center justify-between gap-3">
          <Kicker>
            All shots ({episodes.reduce((n, e) => n + e.shots.length, 0)})
          </Kicker>
          <ViewToggle onChange={setView} value={view} />
        </div>
        {episodes.map((ep) => (
          <section className="space-y-3" key={ep.id}>
            <button
              className="flex items-baseline gap-2 text-left hover:underline"
              onClick={() => onNavigate({ tab: "episodes", id: ep.id })}
              type="button"
            >
              <span className="text-xs font-semibold tabular-nums text-muted-foreground">
                EP. {String(ep.number).padStart(2, "0")}
              </span>
              <span className="font-semibold" style={DISPLAY_FONT}>
                {ep.title}
              </span>
              <span className="text-xs text-muted-foreground">
                {ep.shots.length} shots
              </span>
            </button>
            <ShotBoard
              items={ep.shots.map((shot) => ({ episode: ep, shot }))}
              onOpen={({ episode }) =>
                onNavigate({ tab: "episodes", id: episode.id })
              }
              showEpisode={false}
            />
          </section>
        ))}
      </div>
    );
  }
  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div className="flex justify-end">
        <ViewToggle onChange={setView} value={view} />
      </div>
      {[...blocks.entries()].map(([block, eps]) => {
        const counts = shotProgress(eps.flatMap((e) => e.shots));
        return (
          <section key={block}>
            <div className="mb-3 flex items-end justify-between gap-4">
              <div>
                <Kicker>{block === "—" ? "Episodes" : block}</Kicker>
                {eps[0]?.blockTitle ? (
                  <p className="text-sm text-muted-foreground">
                    {eps[0].blockTitle}
                    {eps[0].year ? ` · ${eps[0].year}` : ""}
                  </p>
                ) : null}
              </div>
              <p className="text-xs text-muted-foreground">
                {counts.aprovado}/{eps.reduce((n, e) => n + e.shots.length, 0)}{" "}
                shots approved
              </p>
            </div>
            <ul className="grid gap-2 md:grid-cols-2">
              {eps.map((ep) => {
                const c = shotProgress(ep.shots);
                return (
                  <li key={ep.id}>
                    <button
                      className="flex w-full flex-col gap-2 rounded-xl border border-border/60 bg-card/40 p-4 text-left transition-colors hover:border-border hover:bg-card/70"
                      data-testid={`production-episode-${ep.id}`}
                      onClick={() => onNavigate({ tab: "episodes", id: ep.id })}
                      type="button"
                    >
                      <div className="flex items-baseline gap-3">
                        <span className="text-xs font-semibold tabular-nums text-muted-foreground">
                          EP. {String(ep.number).padStart(2, "0")}
                        </span>
                        <span
                          className="truncate font-semibold"
                          style={DISPLAY_FONT}
                        >
                          {ep.title}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1.5 text-xs text-muted-foreground">
                        <span>{ep.shots.length} shots</span>
                        {ep.duration ? <span>· {ep.duration}</span> : null}
                        {ep.aspect ? <span>· {ep.aspect}</span> : null}
                      </div>
                      <ShotProgressBar counts={c} />
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

function EpisodeDetail({
  production,
  episode,
  onBack,
}: {
  production: Production;
  episode: Episode;
  onBack: () => void;
}) {
  const publish = usePublishEntityMutation("ep", production.slug);
  const [shots, setShots] = React.useState<Shot[]>(episode.shots);
  const [open, setOpen] = React.useState<number | null>(null);
  const [view, setView] = React.useState<EpisodesView>("board");
  const counts = shotProgress(shots);
  const dirty = JSON.stringify(shots) !== JSON.stringify(episode.shots);

  function updateShot(index: number, patch: Partial<Shot>) {
    setShots((cur) =>
      cur.map((s, i) => (i === index ? { ...s, ...patch } : s)),
    );
  }

  async function handleSave() {
    try {
      await publish.mutateAsync({
        id: episode.id,
        content: episodeToContent({ ...episode, shots }),
      });
      toast.success("Episode saved.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save the episode.",
      );
    }
  }

  let lastScene = "";
  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <button
            className="mb-2 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            onClick={onBack}
            type="button"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Episodes
          </button>
          <h2
            className="text-2xl font-semibold tracking-tight"
            style={DISPLAY_FONT}
          >
            <span className="mr-2 text-muted-foreground">
              EP. {String(episode.number).padStart(2, "0")}
            </span>
            {episode.title}
          </h2>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {episode.block ? <Chip>{episode.block}</Chip> : null}
            {episode.duration ? <Chip>{episode.duration}</Chip> : null}
            {episode.aspect ? <Chip>{episode.aspect}</Chip> : null}
            <Chip>{shots.length} shots</Chip>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ViewToggle onChange={setView} value={view} />
          <Button
            data-testid="production-episode-save"
            disabled={!dirty || publish.isPending}
            onClick={() => void handleSave()}
            size="sm"
            type="button"
          >
            {publish.isPending ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <ShotProgressBar className="flex-1" counts={counts} />
        <span className="shrink-0 text-xs text-muted-foreground">
          {SHOT_STATES.map(
            (s) => `${counts[s]} ${SHOT_STATE_LABEL[s].toLowerCase()}`,
          ).join(" · ")}
        </span>
      </div>

      {episode.storyboardPrompt ? (
        <details className="group rounded-xl border border-border/60 bg-card/40">
          <summary className="cursor-pointer select-none px-4 py-3 text-sm font-medium">
            Storyboard sheet prompt
            <span className="ml-2 text-xs font-normal text-muted-foreground">
              {episode.storyboardPrompt.length.toLocaleString()} chars
            </span>
          </summary>
          <pre className="max-h-80 overflow-auto whitespace-pre-wrap border-t border-border/60 px-4 py-3 font-mono text-xs leading-relaxed text-foreground/85">
            {episode.storyboardPrompt}
          </pre>
        </details>
      ) : null}

      {view === "board" ? (
        <ShotBoard
          items={shots.map((shot) => ({ episode, shot }))}
          onOpen={({ shot }) => {
            const index = shots.indexOf(shot);
            setOpen(index);
            setView("list");
          }}
          showEpisode={false}
        />
      ) : null}
      <div
        className={cn(
          "overflow-x-auto rounded-xl border border-border/60",
          view !== "list" && "hidden",
        )}
      >
        <table className="w-full min-w-[880px] text-sm">
          <thead className="bg-muted/40 text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
            <tr>
              <th className="w-8 px-2 py-2 text-left" />
              <th className="w-12 px-2 py-2 text-left">#</th>
              <th className="w-28 px-2 py-2 text-left">Time</th>
              <th className="w-44 px-2 py-2 text-left">Shot</th>
              <th className="px-2 py-2 text-left">What we see</th>
              <th className="w-40 px-2 py-2 text-left">Dialogue</th>
              <th className="w-40 px-2 py-2 text-left">Sound</th>
              <th className="w-28 px-2 py-2 text-left">State</th>
            </tr>
          </thead>
          <tbody>
            {shots.map((shot, index) => {
              const sceneRow = shot.scene && shot.scene !== lastScene;
              lastScene = shot.scene || lastScene;
              const expanded = open === index;
              return (
                <React.Fragment key={`${shot.n}:${shot.start}`}>
                  {sceneRow ? (
                    <tr className="bg-muted/20">
                      <td
                        className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground"
                        colSpan={8}
                      >
                        {shot.scene}
                      </td>
                    </tr>
                  ) : null}
                  <tr
                    className={cn(
                      "cursor-pointer border-t border-border/40 align-top transition-colors hover:bg-muted/30",
                      expanded && "bg-muted/30",
                    )}
                    data-testid={`production-shot-${episode.id}-${shot.n}`}
                    onClick={() => setOpen(expanded ? null : index)}
                  >
                    <td className="px-2 py-2 text-muted-foreground">
                      {expanded ? (
                        <ChevronDown className="h-3.5 w-3.5" />
                      ) : (
                        <ChevronRight className="h-3.5 w-3.5" />
                      )}
                    </td>
                    <td className="px-2 py-2 tabular-nums text-muted-foreground">
                      {shot.n}
                    </td>
                    <td className="px-2 py-2 font-mono text-xs text-muted-foreground">
                      {shot.start}
                      {shot.end ? `–${shot.end}` : ""}
                    </td>
                    <td className="px-2 py-2 text-xs">{shot.framing}</td>
                    <td className="px-2 py-2 text-[13px] leading-snug">
                      {shot.action}
                    </td>
                    <td className="px-2 py-2 text-xs italic text-foreground/80">
                      {shot.dialogue || "—"}
                    </td>
                    <td className="px-2 py-2 text-xs text-muted-foreground">
                      {shot.sound}
                    </td>
                    <td className="px-2 py-2">
                      <StateChip state={shot.state} />
                    </td>
                  </tr>
                  {expanded ? (
                    <tr className="border-t border-border/40 bg-background/40">
                      <td className="px-4 py-4" colSpan={8}>
                        <ShotEditor
                          onChange={(patch) => updateShot(index, patch)}
                          shot={shot}
                        />
                      </td>
                    </tr>
                  ) : null}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ShotEditor({
  shot,
  onChange,
}: {
  shot: Shot;
  onChange: (patch: Partial<Shot>) => void;
}) {
  const media = useMediaSrc();
  const [lightbox, setLightbox] = React.useState<number | null>(null);
  const [uploading, setUploading] = React.useState(false);
  async function handleAddFrames() {
    setUploading(true);
    try {
      const blobs = await pickAndUploadMedia();
      if (blobs.length === 0) return;
      onChange({
        frames: [...shot.frames, ...blobs.map((b) => b.url)],
        state: shot.state === "cartela" ? "gerado" : shot.state,
      });
    } catch (error) {
      notify.error(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_1fr_280px]">
      <ProductionLightbox
        images={shot.frames.map((url) => ({ url }))}
        index={lightbox}
        onClose={() => setLightbox(null)}
        onIndexChange={setLightbox}
        onRemove={(i) => {
          setLightbox(null);
          onChange({ frames: shot.frames.filter((_, idx) => idx !== i) });
        }}
      />
      <div className="space-y-1.5">
        <Kicker>Storyboard prompt</Kicker>
        <Textarea
          className="min-h-0 font-mono text-xs leading-relaxed"
          onChange={(e) => onChange({ storyboardPrompt: e.target.value })}
          rows={8}
          value={shot.storyboardPrompt}
        />
      </div>
      <div className="space-y-1.5">
        <Kicker>Video prompt</Kicker>
        <Textarea
          className="min-h-0 font-mono text-xs leading-relaxed"
          onChange={(e) => onChange({ videoPrompt: e.target.value })}
          rows={8}
          value={shot.videoPrompt}
        />
      </div>
      <div className="space-y-3">
        <div className="space-y-1.5">
          <Kicker>State</Kicker>
          <select
            className={`${SELECT_CLASS} w-full`}
            onChange={(e) => onChange({ state: e.target.value as ShotState })}
            value={shot.state}
          >
            {SHOT_STATES.map((s) => (
              <option key={s} value={s}>
                {SHOT_STATE_LABEL[s]}
              </option>
            ))}
          </select>
        </div>
        {shot.cast ? (
          <div>
            <Kicker>Cast</Kicker>
            <p className="mt-1 text-sm">{shot.cast}</p>
          </div>
        ) : null}
        <div>
          <div className="flex items-center justify-between">
            <Kicker>Frames ({shot.frames.length})</Kicker>
            <Button
              className="h-7 px-2 text-xs"
              disabled={uploading}
              onClick={() => void handleAddFrames()}
              size="sm"
              type="button"
              variant="ghost"
            >
              {uploading ? "Uploading…" : "Add"}
            </Button>
          </div>
          {shot.frames.length > 0 ? (
            <div className="mt-1 flex flex-wrap gap-1.5">
              {shot.frames.map((url, i) => (
                <button
                  className="overflow-hidden rounded-md border border-border/60 hover:border-foreground/40"
                  key={url}
                  onClick={() => setLightbox(i)}
                  type="button"
                >
                  <img alt="" className="h-16 object-cover" src={media(url)} />
                </button>
              ))}
            </div>
          ) : (
            <p className="mt-1 text-xs text-muted-foreground">No frames yet.</p>
          )}
        </div>
        {shot.clip ? (
          <div>
            <Kicker>Clip</Kicker>
            {/* biome-ignore lint/a11y/useMediaCaption: generated clips carry no captions */}
            <video
              className="mt-1 w-full rounded-md border border-border/60"
              controls
              preload="metadata"
              src={media(shot.clip)}
            />
          </div>
        ) : (
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Film className="h-3.5 w-3.5" /> No clip yet
          </p>
        )}
        <div className="space-y-1.5">
          <Kicker>Notes</Kicker>
          <Textarea
            className="min-h-0 text-xs"
            onChange={(e) => onChange({ notes: e.target.value })}
            rows={3}
            value={shot.notes}
          />
        </div>
      </div>
    </div>
  );
}
