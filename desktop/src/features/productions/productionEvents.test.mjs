import assert from "node:assert/strict";
import test from "node:test";

import {
  buildProductionTemplate,
  latestProductions,
  parseProductionEvent,
  slugify,
  textToContext,
} from "./productionEvents.ts";

const OWNER = "a".repeat(64);
const AGENT = "b".repeat(64);
const CHANNEL = "47da111f-4c82-50c6-923e-ff955b4d69d0";

function event(overrides = {}) {
  return {
    id: "e".repeat(64),
    pubkey: OWNER,
    created_at: 100,
    kind: 30180,
    tags: [
      ["d", "jony"],
      ["c", CHANNEL],
      ["agent", AGENT, "You are the Director."],
    ],
    content: JSON.stringify({
      name: "Jony",
      format: "microdrama",
      aspect: "9:16",
      status: "active",
      context: { premise: "A boy runs.", characters: ["Jony", "Mother"] },
    }),
    sig: "f".repeat(128),
    ...overrides,
  };
}

test("parseProductionEvent reads content and tags", () => {
  const production = parseProductionEvent(event());
  assert.equal(production.slug, "jony");
  assert.equal(production.name, "Jony");
  assert.deepEqual(production.channelIds, [CHANNEL]);
  assert.deepEqual(production.agents, [
    { pubkey: AGENT, instructions: "You are the Director." },
  ]);
  assert.deepEqual(production.context.characters, ["Jony", "Mother"]);
});

test("parseProductionEvent tolerates broken content", () => {
  const production = parseProductionEvent(event({ content: "{not json" }));
  assert.equal(production.name, "jony");
  assert.deepEqual(production.context, {});
  assert.equal(parseProductionEvent(event({ kind: 1 })), null);
  assert.equal(parseProductionEvent(event({ tags: [] })), null);
});

test("latestProductions keeps the newest event per slug", () => {
  const older = event({ id: "1".repeat(64), created_at: 50 });
  const newer = event({
    id: "2".repeat(64),
    created_at: 200,
    content: JSON.stringify({ name: "Jony v2" }),
  });
  const list = latestProductions([older, newer]);
  assert.equal(list.length, 1);
  assert.equal(list[0].name, "Jony v2");
});

test("buildProductionTemplate round-trips and drops empty context", () => {
  const template = buildProductionTemplate({
    slug: "jony",
    name: " Jony ",
    format: "microdrama",
    aspect: "9:16",
    status: "draft",
    context: { premise: "A boy runs.", bible: "   ", characters: [] },
    channelIds: [CHANNEL, CHANNEL],
    agents: [
      { pubkey: AGENT.toUpperCase(), instructions: " Director " },
      { pubkey: AGENT, instructions: null },
    ],
  });
  assert.equal(template.kind, 30180);
  assert.deepEqual(JSON.parse(template.content), {
    name: "Jony",
    format: "microdrama",
    aspect: "9:16",
    status: "draft",
    context: { premise: "A boy runs." },
  });
  assert.deepEqual(template.tags, [
    ["d", "jony"],
    ["c", CHANNEL],
    ["agent", AGENT, "Director"],
  ]);
  assert.throws(() =>
    buildProductionTemplate({
      slug: "Bad Slug",
      name: "x",
      format: "",
      aspect: "",
      status: "",
      context: {},
      channelIds: [],
      agents: [],
    }),
  );
});

test("slugify and textToContext", () => {
  assert.equal(slugify("Ação Noturna: Jony!"), "acao-noturna-jony");
  assert.deepEqual(textToContext("characters", " Jony \n\n Mother "), [
    "Jony",
    "Mother",
  ]);
  assert.equal(textToContext("premise", "  "), undefined);
  assert.equal(textToContext("premise", " text "), "text");
});
