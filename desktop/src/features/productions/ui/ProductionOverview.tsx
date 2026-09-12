import { Hash, Lock, Users } from "lucide-react";
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
import { useChannelsQuery } from "@/features/channels/hooks";
import { Button } from "@/shared/ui/button";
import { PageHeader } from "@/shared/ui/PageHeader";
import { Textarea } from "@/shared/ui/textarea";
import { ViewLoadingFallback } from "@/shared/ui/ViewLoadingFallback";

import { applyTeamToChannels } from "../applyTeam";
import { useProductionQuery, usePublishProductionMutation } from "../hooks";
import {
  contextToText,
  PRODUCTION_CONTEXT_FIELDS,
  PRODUCTION_STATUSES,
  type Production,
  type ProductionContext,
  type ProductionContextKey,
  productionToInput,
  textToContext,
} from "../productionEvents";

const SELECT_CLASS =
  "flex h-9 rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs";

export function ProductionOverview({ slug }: { slug: string }) {
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
    <ProductionOverviewContent
      key={production.eventId}
      production={production}
    />
  );
}

function ProductionOverviewContent({ production }: { production: Production }) {
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
  const [draft, setDraft] = React.useState<
    Record<ProductionContextKey, string>
  >(() => {
    const initial = {} as Record<ProductionContextKey, string>;
    for (const field of PRODUCTION_CONTEXT_FIELDS) {
      initial[field.key] = contextToText(production.context[field.key]);
    }
    return initial;
  });
  const [instructions, setInstructions] = React.useState<
    Record<string, string>
  >(() =>
    Object.fromEntries(
      production.agents.map((a) => [a.pubkey, a.instructions ?? ""]),
    ),
  );
  const [teamId, setTeamId] = React.useState("");
  const [applying, setApplying] = React.useState(false);

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
    PRODUCTION_CONTEXT_FIELDS.some(
      (f) =>
        draft[f.key].trim() !== contextToText(production.context[f.key]).trim(),
    ) ||
    production.agents.some(
      (a) =>
        (instructions[a.pubkey] ?? "").trim() !== (a.instructions ?? "").trim(),
    );

  async function handleSave() {
    const context: ProductionContext = {};
    for (const field of PRODUCTION_CONTEXT_FIELDS) {
      const value = textToContext(field.key, draft[field.key]);
      if (value !== undefined) context[field.key] = value;
    }
    const input = productionToInput(production);
    input.status = status;
    input.context = context;
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

  const meta = [production.format, production.aspect]
    .filter(Boolean)
    .join(" · ");

  return (
    <div
      className="mx-auto w-full max-w-4xl space-y-8 px-6 py-8"
      data-testid="production-overview"
    >
      <PageHeader
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
              data-testid="production-save"
              disabled={!dirty || publishMutation.isPending}
              onClick={() => void handleSave()}
              type="button"
            >
              {publishMutation.isPending ? "Saving…" : "Save"}
            </Button>
          </div>
        }
        description={meta ? `${meta} · ${production.slug}` : production.slug}
        title={production.name}
      />

      <section className="grid gap-6 md:grid-cols-2">
        <div className="space-y-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Channels
          </h2>
          {production.channelIds.length === 0 ? (
            <p className="text-sm text-muted-foreground">No channels yet.</p>
          ) : (
            <ul className="space-y-1">
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
        </div>
        <div className="space-y-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Team
          </h2>
          <div className="flex items-center gap-2">
            <select
              className={`${SELECT_CLASS} flex-1`}
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
              type="button"
              variant="outline"
            >
              <Users className="mr-1 h-4 w-4" />
              {applying ? "Applying…" : "Apply team"}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Adds the team's agents to every channel of this production.
          </p>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Agents ({production.agents.length})
        </h2>
        {production.agents.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No agents assigned. Apply a team to add them.
          </p>
        ) : (
          <ul className="space-y-3">
            {production.agents.map((agent) => {
              const managed = agentsByPubkey.get(agent.pubkey);
              return (
                <li
                  className="space-y-1.5 rounded-md border border-border/60 p-3"
                  key={agent.pubkey}
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-sm font-medium">
                      {managed?.name ?? `${agent.pubkey.slice(0, 12)}…`}
                    </span>
                    <span className="text-2xs text-muted-foreground">
                      {agent.pubkey.slice(0, 16)}…
                    </span>
                  </div>
                  <Textarea
                    aria-label={`Instructions for ${managed?.name ?? agent.pubkey}`}
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
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Bible
        </h2>
        {PRODUCTION_CONTEXT_FIELDS.map((field) => (
          <div className="space-y-1.5" key={field.key}>
            <label
              className="text-sm font-medium"
              htmlFor={`production-${field.key}`}
            >
              {field.label}
            </label>
            <Textarea
              data-testid={`production-field-${field.key}`}
              id={`production-${field.key}`}
              onChange={(e) =>
                setDraft((cur) => ({ ...cur, [field.key]: e.target.value }))
              }
              rows={field.key === "bible" ? 8 : 3}
              value={draft[field.key]}
            />
          </div>
        ))}
      </section>
    </div>
  );
}
