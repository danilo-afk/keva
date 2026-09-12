import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useIdentityQuery } from "@/shared/api/hooks";

import {
  type Animatic,
  ANIMATIC_DOC_ID,
  type Character,
  type Episode,
  type EntityKind,
  fetchEntityEvents,
  parseAnimatic,
  parseCharacter,
  parseDocument,
  parseEpisode,
  type ProductionDocument,
  publishEntity,
} from "./productionEntities";

export const entityQueryKey = (kind: EntityKind) =>
  ["production-entities", kind] as const;

function useEntityEvents(kind: EntityKind) {
  const identityQuery = useIdentityQuery();
  const owner = identityQuery.data?.pubkey;
  return useQuery({
    enabled: Boolean(owner),
    queryKey: [...entityQueryKey(kind), owner ?? "none"],
    queryFn: () => fetchEntityEvents(kind, owner ?? ""),
    staleTime: 15_000,
    retry: 2,
  });
}

export function useProductionDocuments(slug: string) {
  const q = useEntityEvents("doc");
  const documents: ProductionDocument[] = (q.data ?? [])
    .flatMap((e) => parseDocument(e, slug) ?? [])
    .filter((d) => d.format !== "animatic" && d.id !== ANIMATIC_DOC_ID)
    .sort((a, b) => a.title.localeCompare(b.title));
  return { ...q, documents };
}

export function useProductionAnimatic(slug: string) {
  const q = useEntityEvents("doc");
  const animatic: Animatic | null =
    (q.data ?? []).flatMap((e) => parseAnimatic(e, slug) ?? [])[0] ?? null;
  return { ...q, animatic };
}

export function useProductionEpisodes(slug: string) {
  const q = useEntityEvents("ep");
  const episodes: Episode[] = (q.data ?? [])
    .flatMap((e) => parseEpisode(e, slug) ?? [])
    .sort((a, b) => a.number - b.number || a.id.localeCompare(b.id));
  return { ...q, episodes };
}

export function useProductionCharacters(slug: string) {
  const q = useEntityEvents("char");
  const characters: Character[] = (q.data ?? [])
    .flatMap((e) => parseCharacter(e, slug) ?? [])
    .sort((a, b) => a.name.localeCompare(b.name));
  return { ...q, characters };
}

export function usePublishEntityMutation(kind: EntityKind, slug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      content,
    }: {
      id: string;
      content: Record<string, unknown>;
    }) => publishEntity(kind, slug, id, content),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: entityQueryKey(kind) });
    },
  });
}
