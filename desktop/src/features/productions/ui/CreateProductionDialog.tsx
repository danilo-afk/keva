import * as React from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

import {
  useAvailableAcpRuntimes,
  usePersonasQuery,
} from "@/features/agents/hooks";
import { managedAgentsQueryKey } from "@/features/agents/hooks";
import { useTeamsQuery } from "@/features/agents/teamHooks";
import { useGlobalAgentConfig } from "@/features/agents/useGlobalAgentConfig";
import { channelsQueryKey } from "@/features/channels/hooks";
import { Button } from "@/shared/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import { Input } from "@/shared/ui/input";
import { Textarea } from "@/shared/ui/textarea";

import { createProductionWithTeam } from "../createProduction";
import { productionsQueryKey, useProductionsQuery } from "../hooks";
import {
  isValidSlug,
  PRODUCTION_ASPECTS,
  PRODUCTION_FORMATS,
  slugify,
} from "../productionEvents";

const DEFAULT_CHANNELS = "general, story, visual";
const SELECT_CLASS =
  "flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs";

export function CreateProductionDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (slug: string) => void;
}) {
  const queryClient = useQueryClient();
  const teamsQuery = useTeamsQuery();
  const personasQuery = usePersonasQuery();
  const runtimesQuery = useAvailableAcpRuntimes();
  const productionsQuery = useProductionsQuery();
  const { globalConfig } = useGlobalAgentConfig();
  const [name, setName] = React.useState("");
  const [slug, setSlug] = React.useState("");
  const [slugTouched, setSlugTouched] = React.useState(false);
  const [format, setFormat] = React.useState<string>(PRODUCTION_FORMATS[0]);
  const [aspect, setAspect] = React.useState<string>(PRODUCTION_ASPECTS[0]);
  const [teamId, setTeamId] = React.useState("");
  const [channelsText, setChannelsText] = React.useState(DEFAULT_CHANNELS);
  const [premise, setPremise] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const teams = teamsQuery.data ?? [];
  const effectiveSlug = slugTouched ? slug : slugify(name);
  const slugTaken = (productionsQuery.data ?? []).some(
    (p) => p.slug === effectiveSlug,
  );
  const canSubmit =
    name.trim().length > 0 &&
    isValidSlug(effectiveSlug) &&
    !slugTaken &&
    !submitting;

  function reset() {
    setName("");
    setSlug("");
    setSlugTouched(false);
    setFormat(PRODUCTION_FORMATS[0]);
    setAspect(PRODUCTION_ASPECTS[0]);
    setTeamId("");
    setChannelsText(DEFAULT_CHANNELS);
    setPremise("");
    setError(null);
  }

  function handleOpenChange(next: boolean) {
    if (!next && !submitting) reset();
    onOpenChange(next);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const team = teams.find((t) => t.id === teamId) ?? null;
      const result = await createProductionWithTeam({
        slug: effectiveSlug,
        name: name.trim(),
        format,
        aspect,
        context: premise.trim() ? { premise: premise.trim() } : {},
        channelNames: channelsText
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        team,
        personas: personasQuery.data ?? [],
        runtimes: runtimesQuery.data ?? [],
        preferredRuntime: globalConfig.preferred_runtime,
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: productionsQueryKey }),
        queryClient.invalidateQueries({ queryKey: channelsQueryKey }),
        queryClient.invalidateQueries({ queryKey: managedAgentsQueryKey }),
      ]);
      if (result.warnings.length > 0) {
        toast.warning("Production created with warnings", {
          description: result.warnings.join("\n"),
        });
      } else {
        toast.success(`Production "${result.input.name}" created.`);
      }
      reset();
      onOpenChange(false);
      onCreated(result.input.slug);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create the production.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog onOpenChange={handleOpenChange} open={open}>
      <DialogContent className="max-w-xl overflow-hidden p-0">
        <form className="flex max-h-[85vh] flex-col" onSubmit={handleSubmit}>
          <DialogHeader className="shrink-0 border-b border-border/60 px-6 py-5 pr-14">
            <DialogTitle>New production</DialogTitle>
            <DialogDescription>
              Creates the production, its channels and deploys the team into
              every channel. Agents read the bible in each conversation.
            </DialogDescription>
          </DialogHeader>
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-5">
            <Field label="Name" htmlFor="production-name">
              <Input
                autoFocus
                data-testid="production-name"
                id="production-name"
                onChange={(e) => setName(e.target.value)}
                placeholder="Jony"
                value={name}
              />
            </Field>
            <Field
              label="Slug"
              htmlFor="production-slug"
              hint={
                slugTaken
                  ? "A production with this slug already exists."
                  : "Channels are prefixed with the slug (e.g. jony-story)."
              }
            >
              <Input
                data-testid="production-slug"
                id="production-slug"
                onChange={(e) => {
                  setSlugTouched(true);
                  setSlug(e.target.value.toLowerCase());
                }}
                value={effectiveSlug}
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Format" htmlFor="production-format">
                <select
                  className={SELECT_CLASS}
                  id="production-format"
                  onChange={(e) => setFormat(e.target.value)}
                  value={format}
                >
                  {PRODUCTION_FORMATS.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Aspect" htmlFor="production-aspect">
                <select
                  className={SELECT_CLASS}
                  id="production-aspect"
                  onChange={(e) => setAspect(e.target.value)}
                  value={aspect}
                >
                  {PRODUCTION_ASPECTS.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <Field
              label="Team"
              htmlFor="production-team"
              hint="The team's agents join every channel of the production."
            >
              <select
                className={SELECT_CLASS}
                data-testid="production-team"
                id="production-team"
                onChange={(e) => setTeamId(e.target.value)}
                value={teamId}
              >
                <option value="">No team (add agents later)</option>
                {teams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name} ({team.personaIds.length})
                  </option>
                ))}
              </select>
            </Field>
            <Field
              label="Channels"
              htmlFor="production-channels"
              hint="Comma-separated. Each becomes a private channel."
            >
              <Input
                id="production-channels"
                onChange={(e) => setChannelsText(e.target.value)}
                value={channelsText}
              />
            </Field>
            <Field label="Premise" htmlFor="production-premise">
              <Textarea
                id="production-premise"
                onChange={(e) => setPremise(e.target.value)}
                placeholder="One paragraph: who, what, where, tone."
                rows={4}
                value={premise}
              />
            </Field>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
          </div>
          <DialogFooter className="shrink-0 border-t border-border/60 px-6 py-4">
            <Button
              disabled={submitting}
              onClick={() => handleOpenChange(false)}
              type="button"
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              data-testid="production-create-submit"
              disabled={!canSubmit}
              type="submit"
            >
              {submitting ? "Creating…" : "Create production"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
