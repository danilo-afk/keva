import {
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  ArrowDown,
  ArrowUp,
  Film,
  LayoutGrid,
  Pencil,
  Plus,
  Table2,
  Trash2,
} from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

import { cn } from "@/shared/lib/cn";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/ui/alert-dialog";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Textarea } from "@/shared/ui/textarea";
import { pickAndUploadMedia } from "@/shared/api/tauri";
import { toast as notify } from "sonner";

import { usePublishEntityMutation } from "../entityHooks";
import {
  type Episode,
  episodeToContent,
  isValidEntityId,
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

export function emptyShot(n: number): Shot {
  return {
    n,
    start: "",
    end: "",
    scene: "",
    framing: "",
    action: "",
    dialogue: "",
    sound: "",
    cast: "",
    storyboardPrompt: "",
    videoPrompt: "",
    frames: [],
    clip: null,
    state: "cartela",
    notes: "",
  };
}

function renumber(shots: Shot[]): Shot[] {
  return shots.map((shot, i) =>
    shot.n === i + 1 ? shot : { ...shot, n: i + 1 },
  );
}

type EpisodeMeta = Pick<
  Episode,
  "number" | "title" | "block" | "blockTitle" | "year" | "duration" | "aspect"
>;

function EpisodeMetaForm({
  value,
  onChange,
}: {
  value: EpisodeMeta;
  onChange: (next: EpisodeMeta) => void;
}) {
  const field = (
    key: keyof EpisodeMeta,
    label: string,
    placeholder?: string,
    className?: string,
  ) => (
    <div className={cn("space-y-1", className)} key={key}>
      <label
        className="text-xs font-medium text-muted-foreground"
        htmlFor={`ep-${key}`}
      >
        {label}
      </label>
      <Input
        className="h-8"
        id={`ep-${key}`}
        onChange={(e) =>
          onChange({
            ...value,
            [key]:
              key === "number" ? Number(e.target.value) || 0 : e.target.value,
          })
        }
        placeholder={placeholder}
        type={key === "number" ? "number" : "text"}
        value={
          key === "number" ? String(value.number || "") : (value[key] as string)
        }
      />
    </div>
  );
  return (
    <div className="grid gap-3 md:grid-cols-6">
      {field("number", "Number", "1", "md:col-span-1")}
      {field("title", "Title", "A VALA", "md:col-span-3")}
      {field("duration", "Duration", "37 s")}
      {field("aspect", "Aspect", "2.39:1")}
      {field("block", "Block", "Bloco I", "md:col-span-2")}
      {field("blockTitle", "Block title", "Prólogo", "md:col-span-2")}
      {field("year", "Year / period", "Ashcombe, 1478", "md:col-span-2")}
    </div>
  );
}

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
  const publish = usePublishEntityMutation("ep", production.slug);
  const [creating, setCreating] = React.useState(false);
  const [newTitle, setNewTitle] = React.useState("");
  const selected = entityId
    ? (episodes.find((e) => e.id === entityId) ?? null)
    : null;

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    const number =
      (episodes.reduce((max, e) => Math.max(max, e.number), 0) || 0) + 1;
    const id = `ep${String(number).padStart(2, "0")}`;
    if (!isValidEntityId(id) || episodes.some((e) => e.id === id)) return;
    const last = episodes[episodes.length - 1];
    try {
      await publish.mutateAsync({
        id,
        content: episodeToContent({
          number,
          title: newTitle.trim() || `Episode ${number}`,
          block: last?.block ?? "",
          blockTitle: last?.blockTitle ?? "",
          year: last?.year ?? "",
          duration: "",
          aspect: last?.aspect ?? production.aspect,
          storyboardPrompt: "",
          shots: [],
        }),
      });
      setCreating(false);
      setNewTitle("");
      onNavigate({ tab: "episodes", id });
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to create the episode.",
      );
    }
  }

  const createForm = (
    <form className="flex items-center gap-2" onSubmit={handleCreate}>
      <Input
        autoFocus
        className="h-8 w-56"
        data-testid="episode-new-title"
        onChange={(e) => setNewTitle(e.target.value)}
        placeholder="Episode title"
        value={newTitle}
      />
      <Button
        data-testid="episode-new-submit"
        disabled={publish.isPending}
        size="sm"
        type="submit"
      >
        Create
      </Button>
      <Button
        onClick={() => setCreating(false)}
        size="sm"
        type="button"
        variant="ghost"
      >
        Cancel
      </Button>
    </form>
  );
  const newButton = (
    <Button
      data-testid="episode-new"
      onClick={() => setCreating(true)}
      size="sm"
      type="button"
      variant="outline"
    >
      <Plus className="mr-1 h-3.5 w-3.5" /> New episode
    </Button>
  );
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
        action={creating ? createForm : newButton}
        description="Each episode holds its shot list. Agents can also create them with the CLI."
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
      <div className="flex items-center justify-between gap-3">
        {creating ? createForm : newButton}
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
  const [meta, setMeta] = React.useState<EpisodeMeta>({
    number: episode.number,
    title: episode.title,
    block: episode.block,
    blockTitle: episode.blockTitle,
    year: episode.year,
    duration: episode.duration,
    aspect: episode.aspect,
  });
  const [editingMeta, setEditingMeta] = React.useState(false);
  const [confirmDelete, setConfirmDelete] = React.useState(false);
  const metaDirty =
    meta.number !== episode.number ||
    meta.title !== episode.title ||
    meta.block !== episode.block ||
    meta.blockTitle !== episode.blockTitle ||
    meta.year !== episode.year ||
    meta.duration !== episode.duration ||
    meta.aspect !== episode.aspect;

  function addShot() {
    setShots((cur) => {
      const next = [...cur, emptyShot(cur.length + 1)];
      setOpen(next.length - 1);
      setView("list");
      return next;
    });
  }
  function removeShot(index: number) {
    setShots((cur) => renumber(cur.filter((_, i) => i !== index)));
    setOpen(null);
  }
  function moveShot(index: number, delta: number) {
    setShots((cur) => {
      const target = index + delta;
      if (target < 0 || target >= cur.length) return cur;
      const next = [...cur];
      [next[index], next[target]] = [next[target], next[index]];
      setOpen(target);
      return renumber(next);
    });
  }

  async function handleDeleteEpisode() {
    try {
      await publish.mutateAsync({ id: episode.id, content: { deleted: true } });
      toast.success(`EP. ${String(episode.number).padStart(2, "0")} deleted.`);
      onBack();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete.");
    } finally {
      setConfirmDelete(false);
    }
  }
  const counts = shotProgress(shots);
  const dirty =
    JSON.stringify(shots) !== JSON.stringify(episode.shots) || metaDirty;

  function updateShot(index: number, patch: Partial<Shot>) {
    setShots((cur) =>
      cur.map((s, i) => (i === index ? { ...s, ...patch } : s)),
    );
  }

  async function handleSave() {
    try {
      await publish.mutateAsync({
        id: episode.id,
        content: episodeToContent({ ...episode, ...meta, shots }),
      });
      setEditingMeta(false);
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
            aria-label="Edit episode"
            data-testid="production-episode-edit"
            onClick={() => setEditingMeta((v) => !v)}
            size="sm"
            type="button"
            variant={editingMeta ? "secondary" : "outline"}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            aria-label="Delete episode"
            data-testid="production-episode-delete"
            onClick={() => setConfirmDelete(true)}
            size="sm"
            type="button"
            variant="ghost"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
          <Button
            data-testid="production-episode-add-shot"
            onClick={addShot}
            size="sm"
            type="button"
            variant="outline"
          >
            <Plus className="mr-1 h-3.5 w-3.5" /> Shot
          </Button>
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
      {editingMeta ? (
        <div className="rounded-xl border border-border/60 bg-card/40 p-4">
          <EpisodeMetaForm onChange={setMeta} value={meta} />
        </div>
      ) : null}
      <AlertDialog onOpenChange={setConfirmDelete} open={confirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this episode?</AlertDialogTitle>
            <AlertDialogDescription>
              EP. {String(episode.number).padStart(2, "0")} {episode.title} and
              its {shots.length} shots are removed from the production. Uploaded
              frames stay in the media store.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button
                data-testid="production-episode-delete-confirm"
                onClick={(event) => {
                  event.preventDefault();
                  void handleDeleteEpisode();
                }}
                type="button"
                variant="destructive"
              >
                Delete episode
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
                          canMoveDown={index < shots.length - 1}
                          canMoveUp={index > 0}
                          onChange={(patch) => updateShot(index, patch)}
                          onMove={(delta) => moveShot(index, delta)}
                          onRemove={() => removeShot(index)}
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
  onRemove,
  onMove,
  canMoveUp,
  canMoveDown,
}: {
  shot: Shot;
  onChange: (patch: Partial<Shot>) => void;
  onRemove: () => void;
  onMove: (delta: number) => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
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
  const text = (key: keyof Shot, label: string, placeholder?: string) => (
    <div className="space-y-1">
      <label
        className="text-xs font-medium text-muted-foreground"
        htmlFor={`shot-${shot.n}-${key}`}
      >
        {label}
      </label>
      <Input
        className="h-8"
        id={`shot-${shot.n}-${key}`}
        onChange={(e) => onChange({ [key]: e.target.value } as Partial<Shot>)}
        placeholder={placeholder}
        value={String(shot[key] ?? "")}
      />
    </div>
  );
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Kicker>Shot {shot.n}</Kicker>
        <div className="flex items-center gap-1">
          <Button
            aria-label="Move up"
            className="h-7 w-7 p-0"
            disabled={!canMoveUp}
            onClick={() => onMove(-1)}
            size="sm"
            type="button"
            variant="ghost"
          >
            <ArrowUp className="h-3.5 w-3.5" />
          </Button>
          <Button
            aria-label="Move down"
            className="h-7 w-7 p-0"
            disabled={!canMoveDown}
            onClick={() => onMove(1)}
            size="sm"
            type="button"
            variant="ghost"
          >
            <ArrowDown className="h-3.5 w-3.5" />
          </Button>
          <Button
            className="h-7 text-xs text-destructive hover:text-destructive"
            data-testid={`shot-remove-${shot.n}`}
            onClick={onRemove}
            size="sm"
            type="button"
            variant="ghost"
          >
            <Trash2 className="mr-1 h-3.5 w-3.5" /> Remove shot
          </Button>
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-6">
        {text("start", "Start", "00:00")}
        {text("end", "End", "00:06")}
        <div className="md:col-span-2">
          {text("scene", "Scene", "EXT. VALE DO SEVERN")}
        </div>
        <div className="md:col-span-2">
          {text("framing", "Shot / framing", "NOITE · plano geral")}
        </div>
        <div className="md:col-span-3">
          {text("cast", "Cast", "Jony (11), Maya (11)")}
        </div>
        <div className="md:col-span-3">
          {text("dialogue", "Dialogue", "Agnes: Jony, acorda!")}
        </div>
        <div className="space-y-1 md:col-span-4">
          <label
            className="text-xs font-medium text-muted-foreground"
            htmlFor={`shot-${shot.n}-action`}
          >
            What we see
          </label>
          <Textarea
            className="min-h-0"
            id={`shot-${shot.n}-action`}
            onChange={(e) => onChange({ action: e.target.value })}
            rows={2}
            value={shot.action}
          />
        </div>
        <div className="space-y-1 md:col-span-2">
          <label
            className="text-xs font-medium text-muted-foreground"
            htmlFor={`shot-${shot.n}-sound`}
          >
            Sound
          </label>
          <Textarea
            className="min-h-0"
            id={`shot-${shot.n}-sound`}
            onChange={(e) => onChange({ sound: e.target.value })}
            rows={2}
            value={shot.sound}
          />
        </div>
      </div>
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
                    <img
                      alt=""
                      className="h-16 object-cover"
                      src={media(url)}
                    />
                  </button>
                ))}
              </div>
            ) : (
              <p className="mt-1 text-xs text-muted-foreground">
                No frames yet.
              </p>
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
    </div>
  );
}
