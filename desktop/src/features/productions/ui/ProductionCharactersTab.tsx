import { ArrowLeft, ImagePlus, Pencil, Plus, Trash2 } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/ui/alert-dialog";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Markdown } from "@/shared/ui/markdown";
import { pickAndUploadMedia } from "@/shared/api/tauri";

import { usePublishEntityMutation } from "../entityHooks";
import {
  type CharacterDraft,
  CharacterEditor,
  characterToDraft,
  emptyCharacterDraft,
} from "./CharacterEditor";

import {
  type Character,
  characterToContent,
  isValidEntityId,
} from "../productionEntities";
import { type Production, slugify } from "../productionEvents";
import type { ProductionNavigate } from "./ProductionPage";
import {
  Chip,
  DISPLAY_FONT,
  EmptyState,
  Kicker,
  Panel,
  ProductionLightbox,
  useMediaSrc,
} from "./productionUi";

const SECTION_LABEL: Record<string, string> = {
  corpo_rosto: "Body and face",
  figurino: "Wardrobe",
  voz: "Voice",
  modelos: "Generation models",
};

export function ProductionCharactersTab({
  production,
  characters,
  isPending,
  entityId,
  onNavigate,
}: {
  production: Production;
  characters: Character[];
  isPending: boolean;
  entityId?: string;
  onNavigate: ProductionNavigate;
}) {
  const media = useMediaSrc();
  const publish = usePublishEntityMutation("char", production.slug);
  const [creating, setCreating] = React.useState(false);
  const [newName, setNewName] = React.useState("");
  const selected = entityId
    ? (characters.find((c) => c.id === entityId) ?? null)
    : null;

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    const id = slugify(newName);
    if (!isValidEntityId(id)) return;
    if (characters.some((c) => c.id === id)) {
      toast.error("A character with this id already exists.");
      return;
    }
    try {
      await publish.mutateAsync({
        id,
        content: characterToContent(emptyCharacterDraft(newName.trim())),
      });
      setCreating(false);
      setNewName("");
      onNavigate({ tab: "characters", id });
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to create the character.",
      );
    }
  }

  if (selected) {
    return (
      <CharacterDetail
        character={selected}
        key={selected.eventId}
        onBack={() => onNavigate({ tab: "characters" })}
        production={production}
      />
    );
  }
  const createForm = (
    <form className="flex items-center gap-2" onSubmit={handleCreate}>
      <Input
        autoFocus
        className="h-8 w-56"
        data-testid="character-new-name"
        onChange={(e) => setNewName(e.target.value)}
        placeholder="Character name"
        value={newName}
      />
      <Button
        data-testid="character-new-submit"
        disabled={!isValidEntityId(slugify(newName)) || publish.isPending}
        size="sm"
        type="submit"
      >
        Create
      </Button>
      <Button
        onClick={() => setCreating(false)}
        size="sm"
        type="button"
        variant="ghost"
      >
        Cancel
      </Button>
    </form>
  );
  if (!isPending && characters.length === 0) {
    return (
      <EmptyState
        action={
          creating ? (
            createForm
          ) : (
            <Button
              data-testid="character-new"
              onClick={() => setCreating(true)}
              size="sm"
              type="button"
            >
              <Plus className="mr-1 h-3.5 w-3.5" /> New character
            </Button>
          )
        }
        description="Sheets with body, wardrobe, voice, generation models and reference images."
        title="No characters yet"
      />
    );
  }
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <Kicker>Characters ({characters.length})</Kicker>
        {creating ? (
          createForm
        ) : (
          <Button
            data-testid="character-new"
            onClick={() => setCreating(true)}
            size="sm"
            type="button"
            variant="outline"
          >
            <Plus className="mr-1 h-3.5 w-3.5" /> New character
          </Button>
        )}
      </div>
      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {characters.map((c) => {
          const cover =
            c.images.find((i) => i.group === "cover") ?? c.images[0];
          return (
            <li key={c.id}>
              <button
                className="flex w-full flex-col overflow-hidden rounded-xl border border-border/60 bg-card/40 text-left transition-colors hover:border-border hover:bg-card/70"
                data-testid={`production-character-${c.id}`}
                onClick={() => onNavigate({ tab: "characters", id: c.id })}
                type="button"
              >
                <div className="aspect-[4/3] w-full bg-muted/40">
                  {cover ? (
                    <img
                      alt={c.name}
                      className="h-full w-full object-cover"
                      src={media(cover.url)}
                    />
                  ) : null}
                </div>
                <div className="space-y-1 p-4">
                  {c.kicker ? (
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      {c.kicker}
                    </p>
                  ) : null}
                  <p className="font-semibold" style={DISPLAY_FONT}>
                    {c.name}
                  </p>
                  {c.summary ? (
                    <p className="line-clamp-2 text-xs text-muted-foreground">
                      {c.summary}
                    </p>
                  ) : null}
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function CharacterDetail({
  character,
  onBack,
  production,
}: {
  character: Character;
  onBack: () => void;
  production: Production;
}) {
  const media = useMediaSrc();
  const publish = usePublishEntityMutation("char", production.slug);
  const [editing, setEditing] = React.useState(
    () =>
      !character.summary &&
      character.images.length === 0 &&
      Object.keys(character.sections).length === 0,
  );
  const [draft, setDraft] = React.useState<CharacterDraft>(() =>
    characterToDraft(character),
  );
  const [confirmDelete, setConfirmDelete] = React.useState(false);
  const [lightbox, setLightbox] = React.useState<number | null>(null);
  const [uploading, setUploading] = React.useState(false);
  const dirty =
    JSON.stringify(draft) !== JSON.stringify(characterToDraft(character));

  async function handleSave() {
    if (!draft.name.trim()) {
      toast.error("Name is required.");
      return;
    }
    try {
      await publish.mutateAsync({
        id: character.id,
        content: characterToContent(draft),
      });
      setEditing(false);
      toast.success("Character saved.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save.");
    }
  }

  /** Read-view image changes publish immediately (no edit mode needed). */
  async function publishImages(images: Character["images"]) {
    try {
      await publish.mutateAsync({
        id: character.id,
        content: characterToContent({ ...characterToDraft(character), images }),
      });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save images.",
      );
    }
  }

  async function handleAddImages() {
    setUploading(true);
    try {
      const blobs = await pickAndUploadMedia();
      if (blobs.length === 0) return;
      await publishImages([
        ...character.images,
        ...blobs.map((b) => ({ url: b.url, caption: "", group: "reference" })),
      ]);
      toast.success(`${blobs.length} image(s) added.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  async function handleRemoveImage(index: number) {
    setLightbox(null);
    await publishImages(character.images.filter((_, i) => i !== index));
    toast.success("Image removed.");
  }

  async function handleDelete() {
    try {
      await publish.mutateAsync({
        id: character.id,
        content: { deleted: true },
      });
      toast.success(`${character.name} deleted.`);
      onBack();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete.");
    } finally {
      setConfirmDelete(false);
    }
  }

  const actions = (
    <div className="flex shrink-0 items-center gap-2">
      {editing ? (
        <>
          <Button
            onClick={() => {
              setDraft(characterToDraft(character));
              setEditing(false);
            }}
            size="sm"
            type="button"
            variant="ghost"
          >
            Cancel
          </Button>
          <Button
            data-testid="character-save"
            disabled={!dirty || publish.isPending}
            onClick={() => void handleSave()}
            size="sm"
            type="button"
          >
            {publish.isPending ? "Saving…" : "Save"}
          </Button>
        </>
      ) : (
        <>
          <Button
            aria-label="Delete character"
            data-testid="character-delete"
            onClick={() => setConfirmDelete(true)}
            size="sm"
            type="button"
            variant="ghost"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
          <Button
            data-testid="character-edit"
            onClick={() => setEditing(true)}
            size="sm"
            type="button"
            variant="outline"
          >
            <Pencil className="mr-1 h-3.5 w-3.5" /> Edit
          </Button>
        </>
      )}
    </div>
  );

  const deleteDialog = (
    <AlertDialog onOpenChange={setConfirmDelete} open={confirmDelete}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {character.name}?</AlertDialogTitle>
          <AlertDialogDescription>
            The sheet is removed from the production for everyone. Uploaded
            images stay in the media store.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel asChild>
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </AlertDialogCancel>
          <AlertDialogAction asChild>
            <Button
              data-testid="character-delete-confirm"
              onClick={(event) => {
                event.preventDefault();
                void handleDelete();
              }}
              type="button"
              variant="destructive"
            >
              Delete
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  if (editing) {
    return (
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <button
              className="mb-2 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              onClick={onBack}
              type="button"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Characters
            </button>
            <h2
              className="text-2xl font-semibold tracking-tight"
              style={DISPLAY_FONT}
            >
              {draft.name || "New character"}
            </h2>
          </div>
          {actions}
        </div>
        <CharacterEditor draft={draft} onChange={setDraft} />
        {deleteDialog}
      </div>
    );
  }
  const groups = new Map<string, Character["images"]>();
  for (const image of character.images) {
    const key = image.group || "reference";
    groups.set(key, [...(groups.get(key) ?? []), image]);
  }
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {deleteDialog}
      <div className="flex items-start justify-between gap-4">
        <div>
          <button
            className="mb-2 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            onClick={onBack}
            type="button"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Characters
          </button>
          {character.kicker ? (
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              {character.kicker}
            </p>
          ) : null}
          <h2
            className="text-2xl font-semibold tracking-tight"
            style={DISPLAY_FONT}
          >
            {character.name}
          </h2>
          {character.summary ? (
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              {character.summary}
            </p>
          ) : null}
        </div>
        {actions}
      </div>

      <ProductionLightbox
        images={character.images}
        index={lightbox}
        onClose={() => setLightbox(null)}
        onIndexChange={setLightbox}
        onRemove={(i) => void handleRemoveImage(i)}
      />
      <div className="flex items-center justify-between">
        <Kicker>Images ({character.images.length})</Kicker>
        <Button
          data-testid="character-add-images"
          disabled={uploading || publish.isPending}
          onClick={() => void handleAddImages()}
          size="sm"
          type="button"
          variant="outline"
        >
          <ImagePlus className="mr-1 h-3.5 w-3.5" />
          {uploading ? "Uploading…" : "Add images"}
        </Button>
      </div>
      {[...groups.entries()].map(([group, images]) => (
        <section key={group}>
          <Kicker className="mb-2">{group}</Kicker>
          <div className="flex flex-wrap gap-3">
            {images.map((image) => (
              <figure className="max-w-[260px]" key={image.url}>
                <button
                  className="block overflow-hidden rounded-lg border border-border/60 transition-colors hover:border-foreground/40"
                  data-testid="character-image"
                  onClick={() => setLightbox(character.images.indexOf(image))}
                  type="button"
                >
                  <img
                    alt={image.caption || character.name}
                    className="max-h-64 object-cover"
                    src={media(image.url)}
                  />
                </button>
                {image.caption ? (
                  <figcaption className="mt-1 text-xs text-muted-foreground">
                    {image.caption}
                  </figcaption>
                ) : null}
              </figure>
            ))}
          </div>
        </section>
      ))}

      <div className="grid gap-4 md:grid-cols-2">
        {Object.entries(character.sections).map(([key, text]) => (
          <Panel key={key} title={SECTION_LABEL[key] ?? key.replace(/_/g, " ")}>
            <div className="text-sm">
              <Markdown
                content={text}
                hardLineBreaks={false}
                interactive={false}
              />
            </div>
          </Panel>
        ))}
      </div>

      {character.voices.length > 0 ? (
        <Panel title="Voice">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-xs">
              <thead className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                <tr>
                  <th className="px-2 py-1.5 text-left">Phase</th>
                  <th className="px-2 py-1.5 text-left">Engine</th>
                  <th className="px-2 py-1.5 text-left">Voice</th>
                  <th className="px-2 py-1.5 text-left">Target F0</th>
                  <th className="px-2 py-1.5 text-left">Direction</th>
                  <th className="px-2 py-1.5 text-left">Heard in</th>
                </tr>
              </thead>
              <tbody>
                {character.voices.map((v) => (
                  <tr
                    className="border-t border-border/40 align-top"
                    key={`${v.phase}:${v.engine}:${v.voice}`}
                  >
                    <td className="px-2 py-2">{v.phase}</td>
                    <td className="px-2 py-2">{v.engine}</td>
                    <td className="px-2 py-2">
                      <Chip className="font-mono">{v.voice}</Chip>
                    </td>
                    <td className="px-2 py-2 tabular-nums">{v.targetF0}</td>
                    <td className="px-2 py-2 text-muted-foreground">
                      {v.direction}
                    </td>
                    <td className="px-2 py-2 text-muted-foreground">
                      {v.where}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      ) : null}
    </div>
  );
}
