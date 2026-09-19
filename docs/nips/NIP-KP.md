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

Scenes and assets are not in this NIP (episodes, shots, documents and characters are the entities below). Per-production agent memory is reserved (the harness ignores unknown fields).


## Production entities (kinds 30181–30183)

Long-form material does not live in the production event. It is split into
addressable entities keyed by `d = <slug>/<prefix>/<id>` (`id` in
`[a-z0-9-_]`, up to 64 chars). `version` in the content is the human-visible
counter. Publishing `{"deleted": true}` tombstones an entity.

### Authorship and trust

The production event (kind 30180) is **owner-authored**: the desktop lists
only the owner's, an agent reads its owner's (owner pubkey from the NIP-OA
auth tag), and the harness injects only a production signed by the agent's
owner — any member can publish a 30180 tagging a channel, so recency never
beats authorship.

Entities (30181–30183) are authored by the **team**: the production's author
plus every pubkey in its `agent` tags. Agents sign with their own keys, so
readers (desktop, CLI, harness) query all team authors and take, per `d`, the
event with the greatest `created_at`, ties broken by the lowest event `id` —
the same rule everywhere so every reader shows the same head. Events from
outside the team are ignored, and the CLI refuses a write from an identity
that is not on the team rather than publishing something nobody will show.
An agent listed on production A has no say on production B. Only the owner
can create a production; the CLI refuses `productions create` for an agent.

The CLI validates entity content before signing (episode/shot shape, `MM:SS`
timecodes that chain without gaps, `state` enum, known fields only) and
rejects the whole write with the list of problems; nothing partial is
published.

| kind  | prefix | content (JSON) |
|-------|--------|----------------|
| 30181 | `doc`  | `{title, format: "markdown", body, version}` — bible, treatment (argumento), editing diary |
| 30182 | `ep`   | `{number, title, block, blockTitle, year, duration, aspect, storyboardPrompt, shots: [{n, start, end, scene, framing, action, dialogue, sound, cast, storyboardPrompt, videoPrompt, frames: [url], clip, state, notes, evals: {voices, quality, director}}]}` — `state` ∈ `cartela | gerado | revisao | aprovado`; `evals.director = true` is what approves a shot |
| 30183 | `char` | `{name, kicker, summary, sections: {corpo_rosto, figurino, voz, modelos, …}, images: [{url, caption, group}], voices: [{phase, engine, voice, targetF0, direction, where}]}` |

Media URLs point at the relay's Blossom store (`buzz upload file`). The store only accepts images without EXIF/ICC and MP4 with H.264 (+AAC), fast-start, no encoder tag: `ffmpeg -i in.mp4 -map 0:v:0 -map '0:a:0?' -c copy -fflags +bitexact -flags +bitexact -movflags +faststart -map_metadata -1 -map_chapters -1 -dn -sn out.mp4` (transcode with libx264/aac when the source is HEVC).

### Agent contract

The harness injects the production event (name, format, `context.description`
and any legacy context keys, this agent's instructions) plus an **index** of the
production's documents into every new session in a production channel. Bodies
are never inlined; agents fetch them:

```
buzz productions docs list --slug jony
buzz productions docs get --slug jony biblia
buzz productions episodes get --slug jony ep04
buzz productions characters get --slug jony maya
buzz productions episodes set --slug jony ep04 --content-file ep04.json   # or --content -
```
