import { FileText, Pencil, Plus } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

import { cn } from "@/shared/lib/cn";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Markdown } from "@/shared/ui/markdown";
import { Textarea } from "@/shared/ui/textarea";

import { usePublishEntityMutation } from "../entityHooks";
import {
  documentToContent,
  isValidEntityId,
  type ProductionDocument,
} from "../productionEntities";
import { type Production, slugify } from "../productionEvents";
import type { ProductionNavigate } from "./ProductionPage";
import { DISPLAY_FONT, EmptyState, formatDate, Kicker } from "./productionUi";

export function ProductionDocumentsTab({
  production,
  documents,
  isPending,
  entityId,
  onNavigate,
}: {
  production: Production;
  documents: ProductionDocument[];
  isPending: boolean;
  entityId?: string;
  onNavigate: ProductionNavigate;
}) {
  const publish = usePublishEntityMutation("doc", production.slug);
  const selected =
    documents.find((d) => d.id === entityId) ?? documents[0] ?? null;
  const [creating, setCreating] = React.useState(false);
  const [newTitle, setNewTitle] = React.useState("");

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    const id = slugify(newTitle);
    if (!isValidEntityId(id)) return;
    if (documents.some((d) => d.id === id)) {
      toast.error("A document with this id already exists.");
      return;
    }
    try {
      await publish.mutateAsync({
        id,
        content: documentToContent({
          title: newTitle.trim(),
          body: "",
          version: 1,
        }),
      });
      setCreating(false);
      setNewTitle("");
      onNavigate({ tab: "documents", id });
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to create the document.",
      );
    }
  }

  if (!isPending && documents.length === 0 && !creating) {
    return (
      <EmptyState
        action={
          <Button onClick={() => setCreating(true)} size="sm" type="button">
            <Plus className="mr-1 h-3.5 w-3.5" /> New document
          </Button>
        }
        description="Bible, treatment, script notes, editing diary. Agents read them with the CLI."
        title="No documents yet"
      />
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
      <aside className="space-y-2">
        <div className="flex items-center justify-between">
          <Kicker>Documents</Kicker>
          <Button
            aria-label="New document"
            className="h-7 w-7 p-0"
            onClick={() => setCreating((c) => !c)}
            size="sm"
            type="button"
            variant="ghost"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        {creating ? (
          <form
            className="space-y-2 rounded-lg border border-border/60 p-2"
            onSubmit={handleCreate}
          >
            <Input
              autoFocus
              className="h-8"
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Title"
              value={newTitle}
            />
            <div className="flex justify-end gap-1">
              <Button
                onClick={() => setCreating(false)}
                size="sm"
                type="button"
                variant="ghost"
              >
                Cancel
              </Button>
              <Button
                disabled={
                  !isValidEntityId(slugify(newTitle)) || publish.isPending
                }
                size="sm"
                type="submit"
              >
                Create
              </Button>
            </div>
          </form>
        ) : null}
        <ul className="space-y-0.5">
          {documents.map((doc) => (
            <li key={doc.id}>
              <button
                className={cn(
                  "flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors",
                  selected?.id === doc.id
                    ? "bg-accent text-foreground"
                    : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
                )}
                data-testid={`production-doc-${doc.id}`}
                onClick={() => onNavigate({ tab: "documents", id: doc.id })}
                type="button"
              >
                <FileText className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span className="min-w-0">
                  <span className="block truncate">{doc.title}</span>
                  <span className="block text-[11px] text-muted-foreground/80">
                    v{doc.version} · {formatDate(doc.updatedAt)}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </aside>
      {selected ? (
        <DocumentView
          doc={selected}
          key={selected.eventId}
          production={production}
        />
      ) : (
        <div />
      )}
    </div>
  );
}

function DocumentView({
  doc,
  production,
}: {
  doc: ProductionDocument;
  production: Production;
}) {
  const publish = usePublishEntityMutation("doc", production.slug);
  const [editing, setEditing] = React.useState(false);
  const [title, setTitle] = React.useState(doc.title);
  const [body, setBody] = React.useState(doc.body);

  async function handleSave() {
    try {
      await publish.mutateAsync({
        id: doc.id,
        content: documentToContent({
          title: title.trim() || doc.title,
          body,
          version: doc.version + 1,
        }),
      });
      setEditing(false);
      toast.success(`Saved v${doc.version + 1}.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save.");
    }
  }

  return (
    <article className="min-w-0">
      <header className="mb-4 flex items-start justify-between gap-4 border-b border-border/60 pb-4">
        <div className="min-w-0">
          {editing ? (
            <Input
              aria-label="Title"
              className="text-lg font-semibold"
              onChange={(e) => setTitle(e.target.value)}
              value={title}
            />
          ) : (
            <h2
              className="truncate text-2xl font-semibold tracking-tight"
              style={DISPLAY_FONT}
            >
              {doc.title}
            </h2>
          )}
          <p className="mt-1 text-xs text-muted-foreground">
            Version {doc.version} · updated {formatDate(doc.updatedAt)} ·{" "}
            {doc.body.length.toLocaleString()} chars ·{" "}
            <code className="font-mono">
              buzz productions docs get --slug {production.slug} {doc.id}
            </code>
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {editing ? (
            <>
              <Button
                onClick={() => {
                  setEditing(false);
                  setTitle(doc.title);
                  setBody(doc.body);
                }}
                size="sm"
                type="button"
                variant="ghost"
              >
                Cancel
              </Button>
              <Button
                data-testid="production-doc-save"
                disabled={
                  publish.isPending ||
                  (body === doc.body && title.trim() === doc.title)
                }
                onClick={() => void handleSave()}
                size="sm"
                type="button"
              >
                {publish.isPending ? "Saving…" : `Save v${doc.version + 1}`}
              </Button>
            </>
          ) : (
            <Button
              data-testid="production-doc-edit"
              onClick={() => setEditing(true)}
              size="sm"
              type="button"
              variant="outline"
            >
              <Pencil className="mr-1 h-3.5 w-3.5" /> Edit
            </Button>
          )}
        </div>
      </header>
      {editing ? (
        <Textarea
          aria-label="Document body (markdown)"
          className="min-h-[60vh] font-mono text-[13px] leading-relaxed"
          onChange={(e) => setBody(e.target.value)}
          value={body}
        />
      ) : doc.body.trim() ? (
        <div className="prose-sm max-w-none">
          <Markdown
            blockCode
            content={doc.body}
            hardLineBreaks={false}
            interactive={false}
          />
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Empty document. Click Edit to write it.
        </p>
      )}
    </article>
  );
}
