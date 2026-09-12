import { ImagePlus, Plus, Trash2 } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

import { pickAndUploadMedia } from "@/shared/api/tauri";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Textarea } from "@/shared/ui/textarea";

import type {
  Character,
  CharacterImage,
  CharacterVoice,
} from "../productionEntities";
import { Kicker, Panel, SELECT_CLASS, useMediaSrc } from "./productionUi";

export type CharacterDraft = Omit<
  Character,
  "id" | "d" | "eventId" | "updatedAt"
>;

export const CHARACTER_SECTIONS: { key: string; label: string }[] = [
  { key: "corpo_rosto", label: "Body and face" },
  { key: "figurino", label: "Wardrobe" },
  { key: "voz", label: "Voice" },
  { key: "modelos", label: "Generation models" },
];

const IMAGE_GROUPS = ["cover", "views", "reference"] as const;

export function emptyCharacterDraft(name = ""): CharacterDraft {
  return {
    name,
    kicker: "",
    summary: "",
    sections: {},
    images: [],
    voices: [],
  };
}

export function characterToDraft(c: Character): CharacterDraft {
  return {
    name: c.name,
    kicker: c.kicker,
    summary: c.summary,
    sections: { ...c.sections },
    images: c.images.map((i) => ({ ...i })),
    voices: c.voices.map((v) => ({ ...v })),
  };
}

export function CharacterEditor({
  draft,
  onChange,
}: {
  draft: CharacterDraft;
  onChange: (next: CharacterDraft) => void;
}) {
  const media = useMediaSrc();
  const [uploading, setUploading] = React.useState(false);
  const set = (patch: Partial<CharacterDraft>) =>
    onChange({ ...draft, ...patch });
  const sectionKeys = [
    ...CHARACTER_SECTIONS.map((s) => s.key),
    ...Object.keys(draft.sections).filter(
      (k) => !CHARACTER_SECTIONS.some((s) => s.key === k),
    ),
  ];

  async function handleAddImages() {
    setUploading(true);
    try {
      const blobs = await pickAndUploadMedia();
      if (blobs.length === 0) return;
      const images: CharacterImage[] = [
        ...draft.images,
        ...blobs.map((b) => ({ url: b.url, caption: "", group: "reference" })),
      ];
      set({ images });
      toast.success(`${blobs.length} image(s) uploaded.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  function updateImage(index: number, patch: Partial<CharacterImage>) {
    set({
      images: draft.images.map((img, i) =>
        i === index ? { ...img, ...patch } : img,
      ),
    });
  }
  function updateVoice(index: number, patch: Partial<CharacterVoice>) {
    set({
      voices: draft.voices.map((v, i) =>
        i === index ? { ...v, ...patch } : v,
      ),
    });
  }

  return (
    <div className="space-y-6" data-testid="character-editor">
      <Panel title="Identity">
        <div className="grid gap-3 md:grid-cols-[1fr_1fr]">
          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="char-name">
              Name
            </label>
            <Input
              data-testid="character-name"
              id="char-name"
              onChange={(e) => set({ name: e.target.value })}
              value={draft.name}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="char-kicker">
              Kicker (short label)
            </label>
            <Input
              id="char-kicker"
              onChange={(e) => set({ kicker: e.target.value })}
              placeholder="JONY MILLER"
              value={draft.kicker}
            />
          </div>
        </div>
        <div className="mt-3 space-y-1.5">
          <label className="text-sm font-medium" htmlFor="char-summary">
            Summary
          </label>
          <Textarea
            className="min-h-0"
            id="char-summary"
            onChange={(e) => set({ summary: e.target.value })}
            placeholder="Who this character is, in one or two lines."
            rows={2}
            value={draft.summary}
          />
        </div>
      </Panel>

      <Panel
        action={
          <Button
            disabled={uploading}
            onClick={() => void handleAddImages()}
            size="sm"
            type="button"
            variant="outline"
          >
            <ImagePlus className="mr-1 h-3.5 w-3.5" />
            {uploading ? "Uploading…" : "Add images"}
          </Button>
        }
        title={`Images (${draft.images.length})`}
      >
        {draft.images.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Cover sheets, front/profile/back views and reference portraits.
          </p>
        ) : (
          <ul className="space-y-2">
            {draft.images.map((image, index) => (
              <li
                className="flex items-center gap-3 rounded-lg border border-border/60 p-2"
                key={image.url}
              >
                <img
                  alt=""
                  className="h-14 w-20 shrink-0 rounded-md object-cover"
                  src={media(image.url)}
                />
                <Input
                  aria-label="Caption"
                  className="h-8 flex-1"
                  onChange={(e) =>
                    updateImage(index, { caption: e.target.value })
                  }
                  placeholder="Caption"
                  value={image.caption}
                />
                <select
                  aria-label="Group"
                  className={`${SELECT_CLASS} h-8 w-32`}
                  onChange={(e) =>
                    updateImage(index, { group: e.target.value })
                  }
                  value={
                    IMAGE_GROUPS.includes(
                      image.group as (typeof IMAGE_GROUPS)[number],
                    )
                      ? image.group
                      : "reference"
                  }
                >
                  {IMAGE_GROUPS.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
                <Button
                  aria-label="Remove image"
                  className="h-8 w-8 p-0"
                  onClick={() =>
                    set({ images: draft.images.filter((_, i) => i !== index) })
                  }
                  size="sm"
                  type="button"
                  variant="ghost"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <div className="grid gap-4 md:grid-cols-2">
        {sectionKeys.map((key) => (
          <div className="space-y-1.5" key={key}>
            <Kicker>
              {CHARACTER_SECTIONS.find((s) => s.key === key)?.label ??
                key.replace(/_/g, " ")}
            </Kicker>
            <Textarea
              className="min-h-0 text-[13px]"
              data-testid={`character-section-${key}`}
              onChange={(e) =>
                set({ sections: { ...draft.sections, [key]: e.target.value } })
              }
              placeholder="Markdown"
              rows={6}
              value={draft.sections[key] ?? ""}
            />
          </div>
        ))}
      </div>

      <Panel
        action={
          <Button
            onClick={() =>
              set({
                voices: [
                  ...draft.voices,
                  {
                    phase: "",
                    engine: "",
                    voice: "",
                    targetF0: "",
                    direction: "",
                    where: "",
                  },
                ],
              })
            }
            size="sm"
            type="button"
            variant="outline"
          >
            <Plus className="mr-1 h-3.5 w-3.5" /> Add voice
          </Button>
        }
        title={`Voices (${draft.voices.length})`}
      >
        {draft.voices.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Engine, voice name, target F0 and direction per phase.
          </p>
        ) : (
          <ul className="space-y-2">
            {draft.voices.map((voice, index) => (
              <li
                className="grid gap-2 rounded-lg border border-border/60 p-2 md:grid-cols-[1fr_1fr_1fr_100px_2fr_1fr_32px]"
                // biome-ignore lint/suspicious/noArrayIndexKey: voices carry no id; rows are positional
                key={`voice-${index}`}
              >
                <Input
                  aria-label="Phase"
                  className="h-8"
                  onChange={(e) =>
                    updateVoice(index, { phase: e.target.value })
                  }
                  placeholder="Phase"
                  value={voice.phase}
                />
                <Input
                  aria-label="Engine"
                  className="h-8"
                  onChange={(e) =>
                    updateVoice(index, { engine: e.target.value })
                  }
                  placeholder="Engine"
                  value={voice.engine}
                />
                <Input
                  aria-label="Voice"
                  className="h-8"
                  onChange={(e) =>
                    updateVoice(index, { voice: e.target.value })
                  }
                  placeholder="Voice"
                  value={voice.voice}
                />
                <Input
                  aria-label="Target F0"
                  className="h-8"
                  onChange={(e) =>
                    updateVoice(index, { targetF0: e.target.value })
                  }
                  placeholder="F0"
                  value={voice.targetF0}
                />
                <Input
                  aria-label="Direction"
                  className="h-8"
                  onChange={(e) =>
                    updateVoice(index, { direction: e.target.value })
                  }
                  placeholder="Direction"
                  value={voice.direction}
                />
                <Input
                  aria-label="Heard in"
                  className="h-8"
                  onChange={(e) =>
                    updateVoice(index, { where: e.target.value })
                  }
                  placeholder="Heard in"
                  value={voice.where}
                />
                <Button
                  aria-label="Remove voice"
                  className="h-8 w-8 p-0"
                  onClick={() =>
                    set({ voices: draft.voices.filter((_, i) => i !== index) })
                  }
                  size="sm"
                  type="button"
                  variant="ghost"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
