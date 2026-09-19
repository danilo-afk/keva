import assert from "node:assert/strict";
import test from "node:test";

import { newestByD, trustedEntityEvents } from "./productionEntities.ts";

const OWNER = "a".repeat(64);
const AGENT = "b".repeat(64);
const STRANGER = "c".repeat(64);

function event(id, pubkey, d, created_at) {
  return {
    id,
    pubkey,
    created_at,
    kind: 30182,
    tags: [["d", d]],
    content: "{}",
    sig: "",
  };
}

test("newestByD breaks created_at ties on the lowest id", () => {
  const heads = newestByD([
    event("9".repeat(64), OWNER, "jony/ep/ep01", 30),
    event("3".repeat(64), AGENT, "jony/ep/ep01", 30),
    event("5".repeat(64), OWNER, "jony/ep/ep02", 10),
    event("7".repeat(64), AGENT, "jony/ep/ep02", 20),
  ]);
  assert.deepEqual(
    heads.map((e) => e.id[0]),
    ["3", "7"],
  );
});

test("trustedEntityEvents keeps the owner and each production's own agents", () => {
  const teams = new Map([
    ["jony", [AGENT]],
    ["outra", []],
  ]);
  const kept = trustedEntityEvents(
    [
      event("1".repeat(64), OWNER, "jony/ep/ep01", 10),
      // Newer agent write on its own production replaces the owner's.
      event("2".repeat(64), AGENT, "jony/ep/ep01", 20),
      // Same agent is not on "outra": ignored even though it is newer.
      event("3".repeat(64), AGENT, "outra/ep/ep01", 50),
      event("4".repeat(64), OWNER, "outra/ep/ep01", 40),
      // Never listed anywhere.
      event("5".repeat(64), STRANGER, "jony/ep/ep02", 60),
    ],
    OWNER,
    teams,
  );
  assert.deepEqual(kept.map((e) => e.id[0]).sort(), ["2", "4"]);
});
