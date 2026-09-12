NIP-KP
======

Productions (keva)
------------------

`draft` `optional` `keva`

**Depends on**: NIP-01 (addressable events), NIP-29 (channels). Interacts with NIP-AP (personas, teams, managed agents) and NIP-AE (agent memory).

## Abstract

This NIP defines `kind:30180`, an addressable **production** event: a film or series project that groups channels and the agents working on it, and carries the project's shared context (premise, bible, characters, visual style, rules). It is the only new entity the Kiara fork adds to the Buzz agent model; agents, teams and channel memberships stay as they are.

## Motivation

A studio runs several productions at once (today *Jony*, tomorrow *Magnetic*) with the same professionals. Buzz already gives each agent one identity, a session per channel, and reusable teams. What it lacks is a place for the context every channel of a project must share without merging their conversations: the Writer decides in `#story` that a character lost an arm, and the Art Director in `#visual` must know it. The production event is that place.

## Model

```
Agent      = professional (existing identity)
Team       = preset of professionals (existing)
Production = the film (this NIP)
Channel    = a room of the film (existing; referenced by the production)
```

A production does not own agents. It references the channels it spans; an agent takes part in a production by being a member of its channels (ordinary NIP-29 membership). Optional per-production instructions for an agent live in the production event, so one Director serves two productions with different briefs and one identity.

## Event

```json
{
  "kind": 30180,
  "tags": [
    ["d", "jony"],
    ["c", "<channel uuid>"],
    ["c", "<channel uuid>"],
    ["agent", "<agent pubkey hex>"],
    ["agent", "<agent pubkey hex>", "Handheld camera, natural light, Amazon thriller."]
  ],
  "content": "{\"name\":\"Jony\",\"format\":\"microdrama\",\"aspect\":\"9:16\",\"status\":\"active\",\"context\":{\"premise\":\"…\",\"bible\":\"…\",\"characters\":[\"…\"],\"visual_style\":\"…\",\"continuity_rules\":[\"…\"],\"camera_rules\":\"…\",\"narrative_rules\":\"…\"}}"
}
```

- `d` — the slug, `[a-z0-9-]{1,64}`. Latest `created_at` wins (NIP-33).
- `c` — a channel the production spans. It is a **reference**, not an `h` scope: relays MUST NOT channel-scope this event, and it is readable by any member.
- `agent` — an agent taking part; the optional third element is that agent's brief for this production only.
- `content` — JSON object. `context` is free-form structured text keyed by section; clients render it as a document, harnesses render it as a prompt section.

## Harness behaviour

When a harness creates a new session for a channel, it queries `kind:30180` with `#c` = channel id. If a production is found it appends a `<production>` section to the system prompt with the production header, every `context` section, and this agent's `agent` brief if present. The section is capped (8k characters); the bible is a briefing, not a second base prompt. A production edit is picked up when the channel session is recreated, mirroring NIP-AE core memory.

## Client behaviour

- **Create Production with Team**: publish the event, create the default channels (`#general`, `#story`, `#visual`), add the team's agents to the chosen channels (ordinary memberships), open the overview.
- **Apply Team to Production**: only the membership step, over the production's channels.
- Sidebar lists productions above channels; a channel referenced by a production is shown under it.

## Non-Goals

Episodes, scenes, shots and assets are not in this NIP. Per-production agent memory is reserved (the harness ignores unknown fields).
