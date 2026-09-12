// "Create Production with Team" wizard: creates the channels, applies the
// team (channel memberships) and publishes the kind 30180 event.
import { createChannel } from "@/shared/api/tauriChannels";
import type { AgentPersona } from "@/shared/api/personaTypes";
import type { AgentTeam } from "@/shared/api/teamTypes";
import type { AcpRuntime, Channel } from "@/shared/api/types";

import { applyTeamToChannels } from "./applyTeam";
import {
  type ProductionContext,
  type ProductionInput,
  publishProduction,
} from "./productionEvents";

export type CreateProductionWizardInput = {
  slug: string;
  name: string;
  format: string;
  aspect: string;
  context: ProductionContext;
  /** Channel names without the production prefix (e.g. "general"). */
  channelNames: string[];
  team: AgentTeam | null;
  personas: AgentPersona[];
  runtimes: AcpRuntime[];
  preferredRuntime: string | null | undefined;
};

export type CreateProductionResult = {
  input: ProductionInput;
  channels: Channel[];
  warnings: string[];
};

export function productionChannelName(slug: string, name: string): string {
  const clean = name
    .trim()
    .toLowerCase()
    .replace(/^#/, "")
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return clean ? `${slug}-${clean}` : slug;
}

export async function createProductionWithTeam(
  wizard: CreateProductionWizardInput,
): Promise<CreateProductionResult> {
  const warnings: string[] = [];
  const channels: Channel[] = [];
  const names = [
    ...new Set(
      wizard.channelNames.map((n) => productionChannelName(wizard.slug, n)),
    ),
  ];
  for (const name of names) {
    channels.push(
      await createChannel({
        name,
        channelType: "stream",
        visibility: "private",
        description: `Production ${wizard.name}`,
      }),
    );
  }
  let agents: ProductionInput["agents"] = [];
  if (wizard.team && channels.length > 0) {
    const applied = await applyTeamToChannels({
      team: wizard.team,
      personas: wizard.personas,
      runtimes: wizard.runtimes,
      preferredRuntime: wizard.preferredRuntime,
      channelIds: channels.map((c) => c.id),
    });
    agents = applied.agentPubkeys.map((pubkey) => ({
      pubkey,
      instructions: null,
    }));
    warnings.push(...applied.failures);
  }
  const input: ProductionInput = {
    slug: wizard.slug,
    name: wizard.name,
    format: wizard.format,
    aspect: wizard.aspect,
    status: "active",
    context: wizard.context,
    channelIds: channels.map((c) => c.id),
    agents,
  };
  await publishProduction(input);
  return { input, channels, warnings };
}
