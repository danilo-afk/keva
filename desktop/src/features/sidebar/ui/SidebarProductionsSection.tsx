import { useLocation } from "@tanstack/react-router";
import {
  ChevronDown,
  ChevronRight,
  Clapperboard,
  EllipsisVertical,
  Hash,
  Lock,
  Plus,
  Sparkles,
} from "lucide-react";
import * as React from "react";

import { useAppNavigation } from "@/app/navigation/useAppNavigation";
import { useChannelsQuery } from "@/features/channels/hooks";
import {
  productionsQueryKey,
  useProductionsQuery,
} from "@/features/productions/hooks";
import { seedExampleProductions } from "@/features/productions/examples";
import {
  useAvailableAcpRuntimes,
  usePersonasQuery,
  managedAgentsQueryKey,
} from "@/features/agents/hooks";
import { useTeamsQuery } from "@/features/agents/teamHooks";
import { useGlobalAgentConfig } from "@/features/agents/useGlobalAgentConfig";
import { channelsQueryKey } from "@/features/channels/hooks";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CreateProductionDialog } from "@/features/productions/ui/CreateProductionDialog";
import { cn } from "@/shared/lib/cn";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/shared/ui/sidebar";
import { SidebarMenuLabel } from "@/shared/ui/sidebar-menu-label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import { deferMenuAction } from "@/features/sidebar/ui/sidebarMenuHelpers";

import {
  SECTION_ACTION_VISIBILITY_CLASS,
  SECTION_ICON_BUTTON_CLASS,
} from "@/features/sidebar/ui/sidebarSectionStyles";
import { selectedChannelRouteId } from "@/features/sidebar/ui/listSidebarProjects";

const SECTION_LABEL_BUTTON_CLASS =
  "group/section-label flex w-fit max-w-[calc(100%-3rem)] cursor-pointer appearance-none items-center gap-1 text-left transition-colors hover:text-sidebar-foreground focus-visible:text-sidebar-foreground";
const SECTION_LABEL_CHEVRON_CLASS =
  "relative size-2.5 shrink-0 text-current opacity-0 transition-[color,opacity] group-hover/sidebar-section:opacity-100 group-hover/section-label:opacity-100 group-focus-within/sidebar-section:opacity-100 group-focus-visible/section-label:opacity-100";
const SECTION_LABEL_CHEVRON_ICON_CLASS =
  "absolute left-1/2 top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2";
const ROW_ACTIVE_CLASS =
  "data-[active=true]:!bg-transparent data-[active=true]:font-normal data-[active=true]:text-sidebar-foreground data-[active=true]:shadow-none data-[active=true]:hover:!bg-transparent data-[active=true]:hover:text-sidebar-foreground data-[active=true]:active:!bg-transparent";

function selectedProductionSlug(pathname: string): string | null {
  const match = /^\/productions\/([^/]+)/.exec(pathname);
  return match ? decodeURIComponent(match[1]) : null;
}

/** Productions (kind 30180) owned by the viewer, with their channels nested. */
export function SidebarProductionsSection() {
  const productionsQuery = useProductionsQuery();
  const channelsQuery = useChannelsQuery();
  const { goChannel, goProduction } = useAppNavigation();
  const pathname = useLocation({ select: (location) => location.pathname });
  const routeSlug = selectedProductionSlug(pathname);
  const routeChannelId = selectedChannelRouteId(pathname);
  const [collapsed, setCollapsed] = React.useState(false);
  const [createOpen, setCreateOpen] = React.useState(false);
  const [expanded, setExpanded] = React.useState<Record<string, boolean>>({});
  const [seeding, setSeeding] = React.useState(false);
  const queryClient = useQueryClient();
  const teamsQuery = useTeamsQuery();
  const personasQuery = usePersonasQuery();
  const runtimesQuery = useAvailableAcpRuntimes();
  const { globalConfig } = useGlobalAgentConfig();

  async function handleSeedExamples() {
    setSeeding(true);
    try {
      // Only a team the user created is deployed automatically (built-in
      // teams can spawn many harnesses); pick another one in Overview.
      const team = (teamsQuery.data ?? []).find((t) => !t.isBuiltin) ?? null;
      const result = await seedExampleProductions({
        existingSlugs: new Set(
          (productionsQuery.data ?? []).map((p) => p.slug),
        ),
        team,
        personas: personasQuery.data ?? [],
        runtimes: runtimesQuery.data ?? [],
        preferredRuntime: globalConfig.preferred_runtime,
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: productionsQueryKey }),
        queryClient.invalidateQueries({ queryKey: channelsQueryKey }),
        queryClient.invalidateQueries({ queryKey: managedAgentsQueryKey }),
      ]);
      if (result.warnings.length > 0) {
        toast.warning("Examples created with warnings", {
          description: result.warnings.join("\n"),
        });
      } else {
        toast.success(
          `${result.created.length} example production(s) created.`,
        );
      }
      if (result.created[0]) void goProduction(result.created[0]);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to create examples.",
      );
    } finally {
      setSeeding(false);
    }
  }

  const channelsById = React.useMemo(
    () => new Map((channelsQuery.data ?? []).map((c) => [c.id, c])),
    [channelsQuery.data],
  );
  const productions = productionsQuery.data ?? [];

  return (
    <SidebarGroup
      className="group/sidebar-section select-none"
      data-testid="sidebar-productions-section"
    >
      <div className="relative">
        <SidebarGroupLabel asChild>
          <button
            aria-controls="sidebar-productions"
            aria-expanded={!collapsed}
            className={SECTION_LABEL_BUTTON_CLASS}
            data-testid="sidebar-productions-section-label"
            onClick={() => setCollapsed((c) => !c)}
            type="button"
          >
            <span data-sidebar-section-title>Productions</span>
            <span aria-hidden="true" className={SECTION_LABEL_CHEVRON_CLASS}>
              <ChevronDown
                className={cn(
                  SECTION_LABEL_CHEVRON_ICON_CLASS,
                  collapsed ? "-rotate-90" : "rotate-0",
                )}
              />
            </span>
          </button>
        </SidebarGroupLabel>
        <div className="absolute right-1 top-1/2 z-10 flex -translate-y-1/2 items-center gap-0.5">
          <button
            aria-label="New production"
            className={cn(
              SECTION_ICON_BUTTON_CLASS,
              SECTION_ACTION_VISIBILITY_CLASS,
            )}
            data-testid="sidebar-productions-create"
            onClick={(event) => {
              event.stopPropagation();
              setCreateOpen(true);
            }}
            onPointerDown={(event) => event.stopPropagation()}
            title="New production"
            type="button"
          >
            <Plus className="h-4 w-4" />
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                aria-label="More actions for Productions"
                className={cn(
                  SECTION_ICON_BUTTON_CLASS,
                  SECTION_ACTION_VISIBILITY_CLASS,
                )}
                data-testid="sidebar-productions-settings"
                onClick={(event) => event.stopPropagation()}
                onPointerDown={(event) => event.stopPropagation()}
                type="button"
              >
                <EllipsisVertical className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                data-testid="sidebar-productions-seed-examples-menu"
                disabled={seeding}
                onSelect={() =>
                  deferMenuAction(() => void handleSeedExamples())
                }
              >
                <Sparkles className="h-4 w-4" />
                <span>Create example productions</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      {!collapsed ? (
        <SidebarGroupContent id="sidebar-productions">
          {productions.length > 0 ? (
            <SidebarMenu data-testid="sidebar-productions">
              {productions.map((production) => {
                const isActive = production.slug === routeSlug;
                const channels = production.channelIds.flatMap((id) => {
                  const channel = channelsById.get(id);
                  return channel ? [channel] : [];
                });
                const isExpanded =
                  channels.length > 0 &&
                  (expanded[production.slug] ?? isActive);
                return (
                  <React.Fragment key={production.slug}>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        className={cn(
                          ROW_ACTIVE_CLASS,
                          channels.length > 0 && "pr-8",
                        )}
                        data-testid={`sidebar-production-${production.slug}`}
                        isActive={isActive}
                        onClick={() => void goProduction(production.slug)}
                        tooltip={production.name}
                        type="button"
                      >
                        <Clapperboard
                          className={cn("h-4 w-4", !isActive && "opacity-80")}
                        />
                        <SidebarMenuLabel
                          className={cn(!isActive && "opacity-80")}
                        >
                          {production.name}
                        </SidebarMenuLabel>
                      </SidebarMenuButton>
                      {channels.length > 0 ? (
                        <SidebarMenuAction
                          aria-expanded={isExpanded}
                          aria-label={
                            isExpanded
                              ? `Hide channels in ${production.name}`
                              : `Show channels in ${production.name}`
                          }
                          onClick={(event) => {
                            event.stopPropagation();
                            setExpanded((cur) => ({
                              ...cur,
                              [production.slug]: !isExpanded,
                            }));
                          }}
                          type="button"
                        >
                          <ChevronRight
                            className={cn(
                              "transition-transform duration-150",
                              isExpanded && "rotate-90",
                            )}
                          />
                        </SidebarMenuAction>
                      ) : null}
                    </SidebarMenuItem>
                    {isExpanded
                      ? channels.map((channel) => {
                          const Icon =
                            channel.visibility === "private" ? Lock : Hash;
                          return (
                            <SidebarMenuItem
                              key={`${production.slug}:${channel.id}`}
                            >
                              <SidebarMenuButton
                                className="h-7 pl-7 text-sidebar-foreground/70 data-[active=true]:!bg-transparent data-[active=true]:font-semibold data-[active=true]:text-sidebar-foreground data-[active=true]:shadow-none data-[active=true]:hover:!bg-transparent data-[active=true]:hover:text-sidebar-foreground data-[active=true]:active:!bg-transparent"
                                data-testid={`sidebar-production-channel-${production.slug}-${channel.name}`}
                                isActive={channel.id === routeChannelId}
                                onClick={() => void goChannel(channel.id)}
                                tooltip={`#${channel.name}`}
                                type="button"
                              >
                                <Icon className="h-3.5 w-3.5" />
                                <SidebarMenuLabel>{`#${channel.name}`}</SidebarMenuLabel>
                              </SidebarMenuButton>
                            </SidebarMenuItem>
                          );
                        })
                      : null}
                  </React.Fragment>
                );
              })}
            </SidebarMenu>
          ) : productionsQuery.isPending ? null : productionsQuery.isError ? (
            <div className="space-y-1 px-2 py-1">
              <p className="text-xs text-destructive">
                Couldn't load productions
              </p>
              <button
                className="text-xs text-sidebar-foreground/70 underline-offset-2 hover:underline"
                onClick={() => void productionsQuery.refetch()}
                type="button"
              >
                Retry
              </button>
            </div>
          ) : (
            <div className="space-y-1 px-2 py-1">
              <p className="text-xs text-sidebar-foreground/50">
                No productions yet
              </p>
              <button
                className="text-xs text-sidebar-foreground/70 underline-offset-2 hover:underline disabled:opacity-50"
                data-testid="sidebar-productions-seed-examples"
                disabled={seeding}
                onClick={() => void handleSeedExamples()}
                type="button"
              >
                {seeding ? "Creating examples…" : "Create example productions"}
              </button>
            </div>
          )}
        </SidebarGroupContent>
      ) : null}
      <CreateProductionDialog
        onCreated={(slug) => void goProduction(slug)}
        onOpenChange={setCreateOpen}
        open={createOpen}
      />
    </SidebarGroup>
  );
}
