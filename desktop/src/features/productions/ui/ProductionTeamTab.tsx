import { Hash, Lock, Plus, Users } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

import { useAppNavigation } from "@/app/navigation/useAppNavigation";
import {
  managedAgentsQueryKey,
  useAvailableAcpRuntimes,
  useManagedAgentsQuery,
  usePersonasQuery,
} from "@/features/agents/hooks";
import { useTeamsQuery } from "@/features/agents/teamHooks";
import { useGlobalAgentConfig } from "@/features/agents/useGlobalAgentConfig";
import { channelsQueryKey, useChannelsQuery } from "@/features/channels/hooks";
import { ProfileAvatar } from "@/features/profile/ui/ProfileAvatar";
import { createChannel } from "@/shared/api/tauriChannels";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Textarea } from "@/shared/ui/textarea";

import { applyTeamToChannels } from "../applyTeam";
import { productionChannelName } from "../createProduction";
import { usePublishProductionMutation } from "../hooks";
import {
  PRODUCTION_STATUSES,
  type Production,
  productionToInput,
} from "../productionEvents";
import { EmptyState, Panel, SELECT_CLASS } from "./productionUi";

export function ProductionTeamTab({ production }: { production: Production }) {
  return (
    <ProductionTeamContent key={production.eventId} production={production} />
  );
}

function ProductionTeamContent({ production }: { production: Production }) {
  const queryClient = useQueryClient();
  const { goChannel } = useAppNavigation();
  const channelsQuery = useChannelsQuery();
  const agentsQuery = useManagedAgentsQuery();
  const teamsQuery = useTeamsQuery();
  const personasQuery = usePersonasQuery();
  const runtimesQuery = useAvailableAcpRuntimes();
  const { globalConfig } = useGlobalAgentConfig();
  const publishMutation = usePublishProductionMutation();

  const [status, setStatus] = React.useState(production.status || "active");
  const [instructions, setInstructions] = React.useState<
    Record<string, string>
  >(() =>
    Object.fromEntries(
      production.agents.map((a) => [a.pubkey, a.instructions ?? ""]),
    ),
  );
  const [teamId, setTeamId] = React.useState("");
  const [applying, setApplying] = React.useState(false);
  const [newChannel, setNewChannel] = React.useState("");
  const [addingChannel, setAddingChannel] = React.useState(false);

  const channelsById = React.useMemo(
    () => new Map((channelsQuery.data ?? []).map((c) => [c.id, c])),
    [channelsQuery.data],
  );
  const agentsByPubkey = React.useMemo(
    () =>
      new Map((agentsQuery.data ?? []).map((a) => [a.pubkey.toLowerCase(), a])),
    [agentsQuery.data],
  );

  const dirty =
    status !== (production.status || "active") ||
    production.agents.some(
      (a) =>
        (instructions[a.pubkey] ?? "").trim() !== (a.instructions ?? "").trim(),
    );

  async function handleSave() {
    const input = productionToInput(production);
    input.status = status;
    input.agents = production.agents.map((a) => ({
      pubkey: a.pubkey,
      instructions: (instructions[a.pubkey] ?? "").trim() || null,
    }));
    try {
      await publishMutation.mutateAsync(input);
      toast.success(
        "Production saved. Agents pick it up on their next new session.",
      );
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to save the production.",
      );
    }
  }

  async function handleApplyTeam() {
    const team = (teamsQuery.data ?? []).find((t) => t.id === teamId);
    if (!team) return;
    if (production.channelIds.length === 0) {
      toast.error("This production has no channels to deploy the team into.");
      return;
    }
    setApplying(true);
    try {
      const applied = await applyTeamToChannels({
        team,
        personas: personasQuery.data ?? [],
        runtimes: runtimesQuery.data ?? [],
        preferredRuntime: globalConfig.preferred_runtime,
        channelIds: production.channelIds,
      });
      const input = productionToInput(production);
      const known = new Set(input.agents.map((a) => a.pubkey));
      for (const pubkey of applied.agentPubkeys) {
        if (!known.has(pubkey))
          input.agents.push({ pubkey, instructions: null });
      }
      await publishMutation.mutateAsync(input);
      await queryClient.invalidateQueries({ queryKey: managedAgentsQueryKey });
      if (applied.failures.length > 0) {
        toast.warning("Team applied with warnings", {
          description: applied.failures.join("\n"),
        });
      } else {
        toast.success(
          `Team "${team.name}" applied to ${production.channelIds.length} channel(s).`,
        );
      }
      setTeamId("");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to apply the team.",
      );
    } finally {
      setApplying(false);
    }
  }

  async function handleAddChannel() {
    const name = productionChannelName(production.slug, newChannel);
    if (!newChannel.trim() || name === production.slug) return;
    setAddingChannel(true);
    try {
      const channel = await createChannel({
        name,
        channelType: "stream",
        visibility: "private",
        description: `Production ${production.name}`,
      });
      const input = productionToInput(production);
      input.channelIds.push(channel.id);
      await publishMutation.mutateAsync(input);
      await queryClient.invalidateQueries({ queryKey: channelsQueryKey });
      setNewChannel("");
      toast.success(`#${channel.name} added to the production.`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to add the channel.",
      );
    } finally {
      setAddingChannel(false);
    }
  }

  return (
    <div
      className="mx-auto min-w-0 max-w-5xl space-y-6"
      data-testid="production-team"
    >
      <div className="grid gap-6 md:grid-cols-2">
        <div className="contents">
          <Panel title="Channels">
            {production.channelIds.length === 0 ? (
              <p className="text-sm text-muted-foreground">No channels yet.</p>
            ) : (
              <ul className="space-y-0.5">
                {production.channelIds.map((channelId) => {
                  const channel = channelsById.get(channelId);
                  const Icon = channel?.visibility === "private" ? Lock : Hash;
                  return (
                    <li key={channelId}>
                      <button
                        className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted"
                        onClick={() => void goChannel(channelId)}
                        type="button"
                      >
                        <Icon className="h-3.5 w-3.5 opacity-70" />
                        <span className="truncate">
                          {channel ? `#${channel.name}` : channelId.slice(0, 8)}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
            <form
              className="mt-3 flex items-center gap-2 border-t border-border/60 pt-3"
              onSubmit={(event) => {
                event.preventDefault();
                void handleAddChannel();
              }}
            >
              <span className="shrink-0 text-xs text-muted-foreground">
                {production.slug}-
              </span>
              <Input
                aria-label="New channel name"
                className="h-8"
                data-testid="production-add-channel-name"
                disabled={addingChannel}
                onChange={(e) => setNewChannel(e.target.value)}
                placeholder="audio"
                value={newChannel}
              />
              <Button
                data-testid="production-add-channel"
                disabled={!newChannel.trim() || addingChannel}
                size="sm"
                type="submit"
                variant="outline"
              >
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </form>
          </Panel>

          <Panel title="Team">
            <div className="flex items-center gap-2">
              <select
                className={`${SELECT_CLASS} min-w-0 flex-1`}
                data-testid="production-apply-team-select"
                disabled={applying}
                onChange={(e) => setTeamId(e.target.value)}
                value={teamId}
              >
                <option value="">Choose a team…</option>
                {(teamsQuery.data ?? []).map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name} ({team.personaIds.length})
                  </option>
                ))}
              </select>
              <Button
                data-testid="production-apply-team"
                disabled={!teamId || applying}
                onClick={() => void handleApplyTeam()}
                size="sm"
                type="button"
                variant="outline"
              >
                <Users className="mr-1 h-3.5 w-3.5" />
                {applying ? "Applying…" : "Apply"}
              </Button>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Adds the team's agents to every channel of this production.
            </p>
          </Panel>
        </div>
      </div>

      <Panel
        action={
          <div className="flex items-center gap-2">
            <select
              aria-label="Status"
              className={SELECT_CLASS}
              onChange={(e) => setStatus(e.target.value)}
              value={status}
            >
              {PRODUCTION_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <Button
              data-testid="production-team-save"
              disabled={!dirty || publishMutation.isPending}
              onClick={() => void handleSave()}
              size="sm"
              type="button"
            >
              {publishMutation.isPending ? "Saving…" : "Save"}
            </Button>
          </div>
        }
        title={`Agents (${production.agents.length})`}
      >
        {production.agents.length === 0 ? (
          <EmptyState
            description="Apply a team above, or add agents to a channel of this production."
            title="No agents assigned"
          />
        ) : (
          <ul className="grid gap-3 md:grid-cols-2">
            {production.agents.map((agent) => {
              const managed = agentsByPubkey.get(agent.pubkey);
              const label = managed?.name ?? `${agent.pubkey.slice(0, 12)}…`;
              return (
                <li
                  className="space-y-2 rounded-lg border border-border/60 bg-background/40 p-3"
                  key={agent.pubkey}
                >
                  <div className="flex items-center gap-2">
                    <ProfileAvatar
                      avatarUrl={managed?.avatarUrl ?? null}
                      className="h-7 w-7 text-xs"
                      label={label}
                      shape="squircle"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{label}</p>
                      <p className="truncate font-mono text-[11px] text-muted-foreground">
                        {agent.pubkey.slice(0, 16)}…
                      </p>
                    </div>
                  </div>
                  <Textarea
                    aria-label={`Instructions for ${label}`}
                    className="min-h-0"
                    onChange={(e) =>
                      setInstructions((cur) => ({
                        ...cur,
                        [agent.pubkey]: e.target.value,
                      }))
                    }
                    placeholder="Role in this production (e.g. You are the Director: own tone and shot list)."
                    rows={2}
                    value={instructions[agent.pubkey] ?? ""}
                  />
                </li>
              );
            })}
          </ul>
        )}
      </Panel>
    </div>
  );
}
