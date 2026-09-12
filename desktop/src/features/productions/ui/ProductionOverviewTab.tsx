import * as React from "react";
import { toast } from "sonner";

import { Button } from "@/shared/ui/button";
import { Textarea } from "@/shared/ui/textarea";

import { usePublishProductionMutation } from "../hooks";
import {
  type Character,
  type Episode,
  type ProductionDocument,
  shotProgress,
} from "../productionEntities";
import {
  type Production,
  type ProductionContext,
  productionDescription,
  productionToInput,
  textToContext,
} from "../productionEvents";
import type { ProductionNavigate } from "./ProductionPage";
import { Panel, ShotProgressBar, Stat } from "./productionUi";

export function ProductionOverviewTab({
  production,
  episodes,
  characters,
  documents,
  onNavigate,
}: {
  production: Production;
  episodes: Episode[];
  characters: Character[];
  documents: ProductionDocument[];
  onNavigate: ProductionNavigate;
}) {
  return (
    <ProductionOverviewContent
      characters={characters}
      documents={documents}
      episodes={episodes}
      key={production.eventId}
      onNavigate={onNavigate}
      production={production}
    />
  );
}

function ProductionOverviewContent({
  production,
  episodes,
  characters,
  documents,
  onNavigate,
}: {
  production: Production;
  episodes: Episode[];
  characters: Character[];
  documents: ProductionDocument[];
  onNavigate: ProductionNavigate;
}) {
  const publishMutation = usePublishProductionMutation();
  const [description, setDescription] = React.useState(() =>
    productionDescription(production),
  );
  const allShots = episodes.flatMap((e) => e.shots);
  const progress = shotProgress(allShots);
  const dirty = description.trim() !== productionDescription(production).trim();

  async function handleSave() {
    // One field only: the description replaces the legacy premise/rules set.
    const context: ProductionContext = {};
    const value = textToContext("description", description);
    if (value !== undefined) context.description = value;
    const input = productionToInput(production);
    input.context = context;
    try {
      await publishMutation.mutateAsync(input);
      toast.success(
        "Description saved. Agents read it on their next new session.",
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save.");
    }
  }

  return (
    <div className="mx-auto min-w-0 max-w-5xl space-y-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Stat
          hint={`${progress.aprovado} approved of ${allShots.length} shots`}
          label="Episodes"
          onClick={() => onNavigate({ tab: "episodes" })}
          value={episodes.length}
        />
        <Stat
          hint={
            allShots.length
              ? `${Math.round((progress.aprovado / allShots.length) * 100)}% approved`
              : "no shots yet"
          }
          label="Shots"
          onClick={() => onNavigate({ tab: "episodes" })}
          value={allShots.length}
        />
        <Stat
          label="Characters"
          onClick={() => onNavigate({ tab: "characters" })}
          value={characters.length}
        />
        <Stat
          label="Documents"
          onClick={() => onNavigate({ tab: "documents" })}
          value={documents.length}
        />
        <Stat
          label="Channels"
          onClick={() => onNavigate({ tab: "team" })}
          value={production.channelIds.length}
        />
        <Stat
          label="Agents"
          onClick={() => onNavigate({ tab: "team" })}
          value={production.agents.length}
        />
      </div>
      {allShots.length > 0 ? <ShotProgressBar counts={progress} /> : null}

      <Panel
        action={
          <Button
            data-testid="production-save"
            disabled={!dirty || publishMutation.isPending}
            onClick={() => void handleSave()}
            size="sm"
            type="button"
          >
            {publishMutation.isPending ? "Saving…" : "Save"}
          </Button>
        }
        title="Description"
      >
        <Textarea
          className="min-h-0 resize-y text-[15px] leading-relaxed"
          data-testid="production-field-description"
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What this production is, in a few lines. Every agent reads it at the start of a session."
          rows={5}
          value={description}
        />
        <p className="mt-2 text-xs text-muted-foreground">
          Injected into every agent session in this production's channels.
          Bible, treatment and scripts live in Documents; agents fetch them on
          demand.
        </p>
      </Panel>
    </div>
  );
}
