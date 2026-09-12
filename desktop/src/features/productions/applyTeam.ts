// Apply a team (preset of personas) to production channels: deploys the
// team's agents into each channel as ordinary Buzz memberships. Instances are
// reused across productions (one Director for every film) — the per-channel
// session keeps their contexts apart, and the production event carries the
// per-production brief.
import {
  type CreateChannelManagedAgentInput,
  createChannelManagedAgents,
} from "@/features/agents/channelAgents";
import {
  getDefaultPersonaRuntime,
  resolvePersonaRuntime,
} from "@/features/agents/lib/resolvePersonaRuntime";
import { resolveTeamPersonas } from "@/features/agents/lib/teamPersonas";
import type { AgentPersona } from "@/shared/api/personaTypes";
import type { AgentTeam } from "@/shared/api/teamTypes";
import type { AcpRuntime } from "@/shared/api/types";

export type ApplyTeamResult = {
  agentPubkeys: string[];
  failures: string[];
};

export async function applyTeamToChannels({
  team,
  personas,
  runtimes,
  preferredRuntime,
  channelIds,
}: {
  team: AgentTeam;
  personas: AgentPersona[];
  runtimes: AcpRuntime[];
  preferredRuntime: string | null | undefined;
  channelIds: string[];
}): Promise<ApplyTeamResult> {
  const defaultProvider = getDefaultPersonaRuntime(runtimes, preferredRuntime);
  if (!defaultProvider) {
    throw new Error("No agent harness is available on this machine.");
  }
  const { resolvedPersonas } = resolveTeamPersonas(team, personas);
  if (resolvedPersonas.length === 0) {
    throw new Error("This team has no personas to deploy.");
  }
  const inputs: CreateChannelManagedAgentInput[] = resolvedPersonas.map(
    (persona) => {
      const { runtime: personaRuntime } = resolvePersonaRuntime(
        persona.runtime,
        runtimes,
        defaultProvider,
      );
      const runtimeToUse = personaRuntime ?? defaultProvider;
      return {
        runtime: {
          id: runtimeToUse.id,
          label: runtimeToUse.label,
          command: runtimeToUse.command,
          defaultArgs: runtimeToUse.defaultArgs,
          mcpCommand: runtimeToUse.mcpCommand,
        },
        name: persona.displayName,
        systemPrompt: persona.systemPrompt,
        avatarUrl: persona.avatarUrl ?? undefined,
        model: persona.model ?? undefined,
        personaId: persona.id,
        teamId: team.id,
        // Reuse the team's existing instances: the same professional works on
        // every production; the channel session isolates the conversation.
        forceNewInstance: false,
        role: "bot",
        ensureRunning: true,
      };
    },
  );
  const agentPubkeys = new Set<string>();
  const failures: string[] = [];
  for (const channelId of channelIds) {
    const result = await createChannelManagedAgents(channelId, inputs);
    for (const success of result.successes) {
      agentPubkeys.add(success.agent.pubkey.toLowerCase());
    }
    for (const failure of result.failures) {
      failures.push(`${failure.name}: ${failure.error}`);
    }
  }
  return { agentPubkeys: [...agentPubkeys], failures };
}
