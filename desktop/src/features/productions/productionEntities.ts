// NIP-KP (keva) production entities: documents (30181), episodes (30182) and
// characters (30183). Addressable by `<slug>/<doc|ep|char>/<id>`; the relay
// keeps only the newest version, so `version` in the content is the counter.
import { relayClient } from "@/shared/api/relayClient";
import { signRelayEvent } from "@/shared/api/tauri";
import type { RelayEvent } from "@/shared/api/types";
import {
  KIND_PRODUCTION_CHARACTER,
  KIND_PRODUCTION_DOCUMENT,
  KIND_PRODUCTION_EPISODE,
} from "@/shared/constants/kinds";

export type EntityKind = "doc" | "ep" | "char";

export const ENTITY_KINDS: Record<EntityKind, number> = {
  doc: KIND_PRODUCTION_DOCUMENT,
  ep: KIND_PRODUCTION_EPISODE,
  char: KIND_PRODUCTION_CHARACTER,
};

export type EntityMeta = {
  id: string;
  d: string;
  eventId: string;
  updatedAt: number;
};

export type ProductionDocument = EntityMeta & {
  title: string;
  body: string;
  version: number;
};

export const SHOT_STATES = [
  "cartela",
  "gerado",
  "revisao",
  "aprovado",
] as const;
export type ShotState = (typeof SHOT_STATES)[number];

export type Shot = {
  n: number;
  start: string;
  end: string;
  scene: string;
  framing: string;
  action: string;
  dialogue: string;
  sound: string;
  cast: string;
  storyboardPrompt: string;
  videoPrompt: string;
  frames: string[];
  clip: string | null;
  state: ShotState;
  notes: string;
};

export type Episode = EntityMeta & {
  number: number;
  title: string;
  block: string;
  blockTitle: string;
  year: string;
  duration: string;
  aspect: string;
  /** Prompt for the whole storyboard sheet (one per episode). */
  storyboardPrompt: string;
  shots: Shot[];
};

export type CharacterImage = { url: string; caption: string; group: string };
export type CharacterVoice = {
  phase: string;
  engine: string;
  voice: string;
  targetF0: string;
  direction: string;
  where: string;
};

export type Character = EntityMeta & {
  name: string;
  kicker: string;
  summary: string;
  sections: Record<string, string>;
  images: CharacterImage[];
  voices: CharacterVoice[];
};

function str(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}
function num(v: unknown, fallback = 0): number {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}
function strList(v: unknown): string[] {
  return Array.isArray(v)
    ? v.filter((x): x is string => typeof x === "string")
    : [];
}
function obj(v: unknown): Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : {};
}

export function entityD(slug: string, kind: EntityKind, id: string): string {
  return `${slug}/${kind}/${id}`;
}

export function isValidEntityId(id: string): boolean {
  return /^[a-z0-9][a-z0-9_-]{0,63}$/.test(id);
}

function parseMeta(
  event: RelayEvent,
  slug: string,
  kind: EntityKind,
): EntityMeta | null {
  const d = event.tags.find((t) => t[0] === "d")?.[1];
  const prefix = `${slug}/${kind}/`;
  if (!d?.startsWith(prefix)) return null;
  return {
    id: d.slice(prefix.length),
    d,
    eventId: event.id,
    updatedAt: event.created_at,
  };
}

function parseContent(event: RelayEvent): Record<string, unknown> | null {
  try {
    const parsed = obj(JSON.parse(event.content || "{}"));
    if (parsed.deleted === true) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function parseDocument(
  event: RelayEvent,
  slug: string,
): ProductionDocument | null {
  const meta = parseMeta(event, slug, "doc");
  const body = parseContent(event);
  if (!meta || !body) return null;
  return {
    ...meta,
    title: str(body.title, meta.id),
    body: str(body.body),
    version: num(body.version, 1),
  };
}

export function parseShot(raw: unknown, index: number): Shot {
  const s = obj(raw);
  const state = str(s.state, "cartela");
  return {
    n: num(s.n, index + 1),
    start: str(s.start),
    end: str(s.end),
    scene: str(s.scene),
    framing: str(s.framing),
    action: str(s.action),
    dialogue: str(s.dialogue),
    sound: str(s.sound),
    cast: str(s.cast),
    storyboardPrompt: str(s.storyboardPrompt),
    videoPrompt: str(s.videoPrompt),
    frames: strList(s.frames),
    clip: typeof s.clip === "string" && s.clip ? s.clip : null,
    state: (SHOT_STATES as readonly string[]).includes(state)
      ? (state as ShotState)
      : "cartela",
    notes: str(s.notes),
  };
}

export function parseEpisode(event: RelayEvent, slug: string): Episode | null {
  const meta = parseMeta(event, slug, "ep");
  const body = parseContent(event);
  if (!meta || !body) return null;
  return {
    ...meta,
    number: num(body.number),
    title: str(body.title, meta.id),
    block: str(body.block),
    blockTitle: str(body.blockTitle),
    year: str(body.year),
    duration: str(body.duration),
    aspect: str(body.aspect),
    storyboardPrompt: str(body.storyboardPrompt),
    shots: Array.isArray(body.shots) ? body.shots.map(parseShot) : [],
  };
}

export function parseCharacter(
  event: RelayEvent,
  slug: string,
): Character | null {
  const meta = parseMeta(event, slug, "char");
  const body = parseContent(event);
  if (!meta || !body) return null;
  const sections: Record<string, string> = {};
  for (const [k, v] of Object.entries(obj(body.sections))) {
    if (typeof v === "string") sections[k] = v;
  }
  return {
    ...meta,
    name: str(body.name, meta.id),
    kicker: str(body.kicker),
    summary: str(body.summary),
    sections,
    images: (Array.isArray(body.images) ? body.images : [])
      .map((i) => {
        const o = obj(i);
        return {
          url: str(o.url),
          caption: str(o.caption),
          group: str(o.group),
        };
      })
      .filter((i) => i.url),
    voices: (Array.isArray(body.voices) ? body.voices : []).map((v) => {
      const o = obj(v);
      return {
        phase: str(o.phase),
        engine: str(o.engine),
        voice: str(o.voice),
        targetF0: str(o.targetF0),
        direction: str(o.direction),
        where: str(o.where),
      };
    }),
  };
}

/** Newest event per `d` wins. */
export function newestByD(events: RelayEvent[]): RelayEvent[] {
  const byD = new Map<string, RelayEvent>();
  for (const event of events) {
    const d = event.tags.find((t) => t[0] === "d")?.[1];
    if (!d) continue;
    const current = byD.get(d);
    if (!current || event.created_at > current.created_at) byD.set(d, event);
  }
  return [...byD.values()];
}

export async function fetchEntityEvents(
  kind: EntityKind,
  ownerPubkey: string,
): Promise<RelayEvent[]> {
  const events = await relayClient.fetchEvents({
    kinds: [ENTITY_KINDS[kind]],
    authors: [ownerPubkey],
    limit: 500,
  });
  return newestByD(events);
}

export async function publishEntity(
  kind: EntityKind,
  slug: string,
  id: string,
  content: Record<string, unknown>,
): Promise<RelayEvent> {
  if (!isValidEntityId(id))
    throw new Error("Id must be 1-64 chars of a-z, 0-9, dash or underscore.");
  const event = await signRelayEvent({
    kind: ENTITY_KINDS[kind],
    content: JSON.stringify(content),
    tags: [["d", entityD(slug, kind, id)]],
  });
  await relayClient.publishEvent(event, "Timed out saving.", "Failed to save.");
  return event;
}

export function documentToContent(
  doc: Pick<ProductionDocument, "title" | "body" | "version">,
) {
  return {
    title: doc.title,
    format: "markdown",
    body: doc.body,
    version: doc.version,
  };
}

export function episodeToContent(ep: Omit<Episode, keyof EntityMeta>) {
  return {
    number: ep.number,
    title: ep.title,
    block: ep.block,
    blockTitle: ep.blockTitle,
    year: ep.year,
    duration: ep.duration,
    aspect: ep.aspect,
    storyboardPrompt: ep.storyboardPrompt,
    shots: ep.shots,
  };
}

export function characterToContent(c: Omit<Character, keyof EntityMeta>) {
  return {
    name: c.name,
    kicker: c.kicker,
    summary: c.summary,
    sections: c.sections,
    images: c.images,
    voices: c.voices,
  };
}

export function shotProgress(shots: Shot[]): Record<ShotState, number> {
  const out: Record<ShotState, number> = {
    cartela: 0,
    gerado: 0,
    revisao: 0,
    aprovado: 0,
  };
  for (const shot of shots) out[shot.state] += 1;
  return out;
}
