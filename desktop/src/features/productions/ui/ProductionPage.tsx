import {
  BookOpen,
  Clapperboard,
  EllipsisVertical,
  Images,
  LayoutDashboard,
  ListVideo,
  MessageSquare,
  Pencil,
  Trash2,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { useQueryClient } from "@tanstack/react-query";
import * as React from "react";

import { useAppNavigation } from "@/app/navigation/useAppNavigation";
import { useChannelsQuery } from "@/features/channels/hooks";
import type { Channel } from "@/shared/api/types";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import { Input } from "@/shared/ui/input";
import { PageHeader } from "@/shared/ui/PageHeader";
import { ViewLoadingFallback } from "@/shared/ui/ViewLoadingFallback";

import {
  useProductionCharacters,
  useProductionDocuments,
  useProductionEpisodes,
} from "../entityHooks";
import { useProductionQuery, usePublishProductionMutation } from "../hooks";
import {
  PRODUCTION_ASPECTS,
  PRODUCTION_FORMATS,
  PRODUCTION_STATUSES,
  type Production,
  productionToInput,
} from "../productionEvents";
import { ProductionAssetsTab } from "./ProductionAssetsTab";
import { ProductionCharactersTab } from "./ProductionCharactersTab";
import { ProductionDocumentsTab } from "./ProductionDocumentsTab";
import { ProductionEpisodesTab } from "./ProductionEpisodesTab";
import { ProductionOverviewTab } from "./ProductionOverviewTab";
import { ProductionTeamTab } from "./ProductionTeamTab";
import { Chip, DISPLAY_FONT, SELECT_CLASS } from "./productionUi";

export const PRODUCTION_TABS = [
  "overview",
  "episodes",
  "characters",
  "documents",
  "assets",
  "team",
] as const;
export type ProductionTab = (typeof PRODUCTION_TABS)[number];

export function isProductionTab(value: unknown): value is ProductionTab {
  return (
    typeof value === "string" &&
    (PRODUCTION_TABS as readonly string[]).includes(value)
  );
}

export type ProductionNavigate = (next: {
  tab: ProductionTab;
  id?: string;
}) => void;

const TAB_META: Record<
  ProductionTab,
  { label: string; Icon: typeof LayoutDashboard }
> = {
  overview: { label: "Overview", Icon: LayoutDashboard },
  episodes: { label: "Episodes", Icon: ListVideo },
  characters: { label: "Characters", Icon: Users },
  documents: { label: "Documents", Icon: BookOpen },
  assets: { label: "Assets", Icon: Images },
  team: { label: "Team", Icon: Users },
};

export function productionMainChannel(
  production: Production,
  channels: Channel[],
): Channel | null {
  const owned = production.channelIds
    .map((id) => channels.find((c) => c.id === id))
    .filter((c): c is Channel => Boolean(c));
  return (
    owned.find((c) => c.name === `${production.slug}-general`) ??
    owned.find((c) => c.name.endsWith("-general")) ??
    owned[0] ??
    null
  );
}

export function ProductionPage({
  slug,
  tab,
  entityId,
  onNavigate,
}: {
  slug: string;
  tab: ProductionTab;
  entityId?: string;
  onNavigate: ProductionNavigate;
}) {
  const { production, isPending, isError } = useProductionQuery(slug);
  if (isPending) return <ViewLoadingFallback kind="projects" />;
  if (isError || !production) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-10">
        <PageHeader
          description="It may belong to another identity or have been removed."
          title="Production not found"
        />
      </div>
    );
  }
  return (
    <ProductionShell
      entityId={entityId}
      onNavigate={onNavigate}
      production={production}
      tab={tab}
    />
  );
}

function ProductionShell({
  production,
  tab,
  entityId,
  onNavigate,
}: {
  production: Production;
  tab: ProductionTab;
  entityId?: string;
  onNavigate: ProductionNavigate;
}) {
  const { goChannel } = useAppNavigation();
  const channelsQuery = useChannelsQuery();
  const docs = useProductionDocuments(production.slug);
  const episodes = useProductionEpisodes(production.slug);
  const characters = useProductionCharacters(production.slug);
  const mainChannel = productionMainChannel(
    production,
    channelsQuery.data ?? [],
  );
  // Window-focus refetch is off app-wide; agents and the CLI write entities
  // behind our back, so re-pull them whenever the user switches section.
  const queryClient = useQueryClient();
  // biome-ignore lint/correctness/useExhaustiveDependencies: `tab` is the trigger, not an input
  React.useEffect(() => {
    void queryClient.invalidateQueries({ queryKey: ["production-entities"] });
  }, [queryClient, tab]);

  const counts: Record<ProductionTab, number | null> = {
    overview: null,
    episodes: episodes.episodes.length,
    characters: characters.characters.length,
    documents: docs.documents.length,
    assets: null,
    team: production.agents.length,
  };

  return (
    <div className="flex h-full min-h-0 flex-col" data-testid="production-page">
      <header className="shrink-0 border-b border-border/60 px-8 pb-5 pt-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="mb-1 flex items-center gap-2 text-xs text-muted-foreground">
              <Clapperboard className="h-3.5 w-3.5" />
              <span>Production</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono">{production.slug}</span>
            </div>
            <h1
              className="truncate text-3xl font-semibold leading-tight tracking-[-0.02em]"
              style={DISPLAY_FONT}
            >
              {production.name}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {production.format ? <Chip>{production.format}</Chip> : null}
              {production.aspect ? <Chip>{production.aspect}</Chip> : null}
              <Chip
                className={cn(
                  production.status === "active" &&
                    "border-emerald-500/40 text-emerald-300",
                  production.status === "archived" && "opacity-60",
                )}
              >
                {production.status || "draft"}
              </Chip>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ProductionMenu production={production} />
            <Button
              data-testid="production-ask"
              disabled={!mainChannel}
              onClick={() => mainChannel && void goChannel(mainChannel.id)}
              title={
                mainChannel ? `Open #${mainChannel.name}` : "No channel yet"
              }
              type="button"
            >
              <MessageSquare className="mr-1.5 h-4 w-4" />
              Ask the production
            </Button>
          </div>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <aside className="w-52 shrink-0 border-r border-border/60 p-3">
          <nav className="space-y-0.5">
            {PRODUCTION_TABS.map((key) => {
              const { label, Icon } = TAB_META[key];
              const active = key === tab;
              return (
                <button
                  className={cn(
                    "flex w-full items-center justify-between gap-2 rounded-md px-2.5 py-1.5 text-sm transition-colors",
                    active
                      ? "bg-accent text-foreground"
                      : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
                  )}
                  data-testid={`production-tab-${key}`}
                  key={key}
                  onClick={() => onNavigate({ tab: key })}
                  type="button"
                >
                  <span className="flex items-center gap-2">
                    <Icon className="h-4 w-4" />
                    {label}
                  </span>
                  {counts[key] != null ? (
                    <span className="text-xs tabular-nums text-muted-foreground/70">
                      {counts[key]}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </nav>
        </aside>

        <main className="min-w-0 flex-1 overflow-y-auto px-8 py-6 [scrollbar-gutter:stable]">
          {tab === "overview" ? (
            <ProductionOverviewTab
              characters={characters.characters}
              documents={docs.documents}
              episodes={episodes.episodes}
              onNavigate={onNavigate}
              production={production}
            />
          ) : null}
          {tab === "episodes" ? (
            <ProductionEpisodesTab
              entityId={entityId}
              episodes={episodes.episodes}
              isPending={episodes.isPending}
              onNavigate={onNavigate}
              production={production}
            />
          ) : null}
          {tab === "characters" ? (
            <ProductionCharactersTab
              characters={characters.characters}
              entityId={entityId}
              isPending={characters.isPending}
              onNavigate={onNavigate}
              production={production}
            />
          ) : null}
          {tab === "documents" ? (
            <ProductionDocumentsTab
              documents={docs.documents}
              entityId={entityId}
              isPending={docs.isPending}
              onNavigate={onNavigate}
              production={production}
            />
          ) : null}
          {tab === "team" ? (
            <ProductionTeamTab production={production} />
          ) : null}
          {tab === "assets" ? (
            <ProductionAssetsTab
              characters={characters.characters}
              episodes={episodes.episodes}
              onNavigate={onNavigate}
            />
          ) : null}
        </main>
      </div>
    </div>
  );
}

function ProductionMenu({ production }: { production: Production }) {
  const { goProductions } = useAppNavigation();
  const publish = usePublishProductionMutation();
  const [editOpen, setEditOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [name, setName] = React.useState(production.name);
  const [format, setFormat] = React.useState(production.format);
  const [aspect, setAspect] = React.useState(production.aspect);
  const [status, setStatus] = React.useState(production.status || "active");

  function openEdit() {
    setName(production.name);
    setFormat(production.format);
    setAspect(production.aspect);
    setStatus(production.status || "active");
    setEditOpen(true);
  }

  async function handleEdit(event: React.FormEvent) {
    event.preventDefault();
    const input = productionToInput(production);
    input.name = name.trim() || production.name;
    input.format = format;
    input.aspect = aspect;
    input.status = status;
    try {
      await publish.mutateAsync(input);
      setEditOpen(false);
      toast.success("Production updated.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update.");
    }
  }

  async function handleDelete() {
    const input = productionToInput(production);
    input.deleted = true;
    try {
      await publish.mutateAsync(input);
      toast.success(
        `Production "${production.name}" deleted. Channels and documents were kept.`,
      );
      setDeleteOpen(false);
      await goProductions();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete.");
    }
  }

  const formats = PRODUCTION_FORMATS.includes(
    format as (typeof PRODUCTION_FORMATS)[number],
  )
    ? PRODUCTION_FORMATS
    : [format, ...PRODUCTION_FORMATS];
  const aspects = PRODUCTION_ASPECTS.includes(
    aspect as (typeof PRODUCTION_ASPECTS)[number],
  )
    ? PRODUCTION_ASPECTS
    : [aspect, ...PRODUCTION_ASPECTS];

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            aria-label="Production actions"
            className="h-9 w-9 p-0"
            data-testid="production-menu"
            type="button"
            variant="outline"
          >
            <EllipsisVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            data-testid="production-edit"
            onSelect={() => setTimeout(openEdit, 0)}
          >
            <Pencil className="h-4 w-4" />
            <span>Edit production</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            data-testid="production-delete"
            onSelect={() => setTimeout(() => setDeleteOpen(true), 0)}
          >
            <Trash2 className="h-4 w-4" />
            <span>Delete production</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog onOpenChange={setEditOpen} open={editOpen}>
        <DialogContent className="max-w-md">
          <form className="space-y-4" onSubmit={handleEdit}>
            <DialogHeader>
              <DialogTitle>Edit production</DialogTitle>
              <DialogDescription>
                The slug <code className="font-mono">{production.slug}</code>{" "}
                and the channel names stay the same.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-1.5">
              <label
                className="text-sm font-medium"
                htmlFor="edit-production-name"
              >
                Name
              </label>
              <Input
                data-testid="production-edit-name"
                id="edit-production-name"
                onChange={(e) => setName(e.target.value)}
                value={name}
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <label
                  className="text-sm font-medium"
                  htmlFor="edit-production-format"
                >
                  Format
                </label>
                <select
                  className={`${SELECT_CLASS} w-full`}
                  id="edit-production-format"
                  onChange={(e) => setFormat(e.target.value)}
                  value={format}
                >
                  {formats.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label
                  className="text-sm font-medium"
                  htmlFor="edit-production-aspect"
                >
                  Aspect
                </label>
                <select
                  className={`${SELECT_CLASS} w-full`}
                  id="edit-production-aspect"
                  onChange={(e) => setAspect(e.target.value)}
                  value={aspect}
                >
                  {aspects.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label
                  className="text-sm font-medium"
                  htmlFor="edit-production-status"
                >
                  Status
                </label>
                <select
                  className={`${SELECT_CLASS} w-full`}
                  id="edit-production-status"
                  onChange={(e) => setStatus(e.target.value)}
                  value={status}
                >
                  {PRODUCTION_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <DialogFooter>
              <Button
                onClick={() => setEditOpen(false)}
                type="button"
                variant="outline"
              >
                Cancel
              </Button>
              <Button
                data-testid="production-edit-save"
                disabled={publish.isPending || !name.trim()}
                type="submit"
              >
                {publish.isPending ? "Saving…" : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog onOpenChange={setDeleteOpen} open={deleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {production.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              The production disappears from the sidebar and agents stop
              receiving its brief. Channels, documents, episodes and characters
              are not deleted.
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
                data-testid="production-delete-confirm"
                disabled={publish.isPending}
                onClick={(event) => {
                  event.preventDefault();
                  void handleDelete();
                }}
                type="button"
                variant="destructive"
              >
                {publish.isPending ? "Deleting…" : "Delete production"}
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
