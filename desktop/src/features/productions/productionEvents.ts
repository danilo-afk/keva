// NIP-KP (keva): productions — film/series projects that group channels,
// agents and the shared bible. One addressable event per production.
import { relayClient } from "@/shared/api/relayClient";
import { signRelayEvent } from "@/shared/api/tauri";
import type { RelayEvent } from "@/shared/api/types";
import { KIND_PRODUCTION } from "@/shared/constants/kinds";

export const PRODUCTION_FORMATS = [
  "microdrama",
  "series",
  "trailer",
  "film",
] as const;
export const PRODUCTION_ASPECTS = ["9:16", "16:9", "1:1", "4:5"] as const;
export const PRODUCTION_STATUSES = ["draft", "active", "archived"] as const;

/** Context keys. `description` is the one field edited in the UI and always
 * injected into agents; the others are legacy (CLI/imports) and still rendered. */
export const PRODUCTION_CONTEXT_FIELDS = [
  { key: "description", label: "Description", multiline: true, list: false },
  { key: "premise", label: "Premise", multiline: true, list: false },
  { key: "bible", label: "Story bible", multiline: true, list: false },
  { key: "characters", label: "Characters", multiline: true, list: true },
  { key: "locations", label: "Locations", multiline: true, list: true },
  { key: "visual_style", label: "Visual style", multiline: true, list: false },
  { key: "camera_rules", label: "Camera rules", multiline: true, list: false },
  {
    key: "continuity_rules",
    label: "Continuity rules",
    multiline: true,
    list: true,
  },
  {
    key: "narrative_rules",
    label: "Narrative rules",
    multiline: true,
    list: false,
  },
] as const;

export type ProductionContextKey =
  (typeof PRODUCTION_CONTEXT_FIELDS)[number]["key"];
export type ProductionContext = Partial<
  Record<ProductionContextKey, string | string[]>
>;

export type ProductionAgent = { pubkey: string; instructions: string | null };

export type Production = {
  slug: string;
  name: string;
  format: string;
  aspect: string;
  status: string;
  context: ProductionContext;
  channelIds: string[];
  agents: ProductionAgent[];
  eventId: string;
  createdAt: number;
  ownerPubkey: string;
};

export function slugify(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

export function isValidSlug(slug: string): boolean {
  return /^[a-z0-9][a-z0-9-]{0,63}$/.test(slug);
}

function tagValues(event: RelayEvent, name: string): string[][] {
  return event.tags.filter((tag) => tag[0] === name);
}

export function parseProductionEvent(event: RelayEvent): Production | null {
  if (event.kind !== KIND_PRODUCTION) return null;
  const slug = tagValues(event, "d")[0]?.[1];
  if (!slug) return null;
  let body: Record<string, unknown> = {};
  try {
    const parsed: unknown = JSON.parse(event.content || "{}");
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      body = parsed as Record<string, unknown>;
    }
  } catch {
    body = {};
  }
  if (body.deleted === true) return null;
  const str = (key: string, fallback = "") =>
    typeof body[key] === "string" ? (body[key] as string) : fallback;
  const rawContext =
    body.context &&
    typeof body.context === "object" &&
    !Array.isArray(body.context)
      ? (body.context as Record<string, unknown>)
      : {};
  const context: ProductionContext = {};
  for (const field of PRODUCTION_CONTEXT_FIELDS) {
    const value = rawContext[field.key];
    if (typeof value === "string") context[field.key] = value;
    else if (Array.isArray(value))
      context[field.key] = value.filter(
        (v): v is string => typeof v === "string",
      );
  }
  return {
    slug,
    name: str("name", slug),
    format: str("format"),
    aspect: str("aspect"),
    status: str("status"),
    context,
    channelIds: tagValues(event, "c")
      .map((tag) => tag[1])
      .filter((v): v is string => Boolean(v)),
    agents: tagValues(event, "agent")
      .filter((tag) => typeof tag[1] === "string" && tag[1].length === 64)
      .map((tag) => ({
        pubkey: tag[1].toLowerCase(),
        instructions: tag[2]?.trim() || null,
      })),
    eventId: event.id,
    createdAt: event.created_at,
    ownerPubkey: event.pubkey,
  };
}

/** Latest event per slug wins (NIP-33). */
export function latestProductions(events: RelayEvent[]): Production[] {
  const bySlug = new Map<string, Production>();
  for (const event of events) {
    const production = parseProductionEvent(event);
    if (!production) continue;
    const current = bySlug.get(production.slug);
    if (!current || production.createdAt > current.createdAt) {
      bySlug.set(production.slug, production);
    }
  }
  return [...bySlug.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export type ProductionInput = {
  slug: string;
  name: string;
  format: string;
  aspect: string;
  status: string;
  context: ProductionContext;
  channelIds: string[];
  agents: ProductionAgent[];
  /** Tombstone: the relay keeps only the newest event, so deletion is a flag. */
  deleted?: boolean;
};

export function contextToText(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value.join("\n");
  return value ?? "";
}

export function textToContext(
  key: ProductionContextKey,
  text: string,
): string | string[] | undefined {
  const field = PRODUCTION_CONTEXT_FIELDS.find((f) => f.key === key);
  const trimmed = text.trim();
  if (!trimmed) return undefined;
  if (field?.list) {
    return trimmed
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
  }
  return trimmed;
}

export function buildProductionTemplate(input: ProductionInput) {
  if (!isValidSlug(input.slug)) {
    throw new Error(
      "Production slug must be 1-64 chars of a-z, 0-9 and dashes.",
    );
  }
  const context: Record<string, string | string[]> = {};
  for (const [key, value] of Object.entries(input.context)) {
    if (value === undefined) continue;
    if (Array.isArray(value) ? value.length > 0 : value.trim().length > 0) {
      context[key] = value;
    }
  }
  const content = JSON.stringify({
    name: input.name.trim() || input.slug,
    format: input.format,
    aspect: input.aspect,
    status: input.status,
    context,
    ...(input.deleted ? { deleted: true } : {}),
  });
  const tags: string[][] = [["d", input.slug]];
  for (const channelId of new Set(input.channelIds))
    tags.push(["c", channelId]);
  const seen = new Set<string>();
  for (const agent of input.agents) {
    const pubkey = agent.pubkey.toLowerCase();
    if (seen.has(pubkey)) continue;
    seen.add(pubkey);
    const instructions = agent.instructions?.trim();
    tags.push(
      instructions ? ["agent", pubkey, instructions] : ["agent", pubkey],
    );
  }
  return { kind: KIND_PRODUCTION, content, tags };
}

export async function publishProduction(
  input: ProductionInput,
): Promise<RelayEvent> {
  const template = buildProductionTemplate(input);
  const event = await signRelayEvent(template);
  await relayClient.publishEvent(
    event,
    "Timed out saving the production.",
    "Failed to save the production.",
  );
  return event;
}

/** The short text shown in the Overview and injected into every agent session. */
export function productionDescription(
  production: Pick<Production, "context">,
): string {
  return contextToText(
    production.context.description ?? production.context.premise,
  );
}

export function productionToInput(production: Production): ProductionInput {
  return {
    slug: production.slug,
    name: production.name,
    format: production.format,
    aspect: production.aspect,
    status: production.status,
    context: { ...production.context },
    channelIds: [...production.channelIds],
    agents: production.agents.map((a) => ({ ...a })),
  };
}
