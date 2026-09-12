import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as React from "react";

import { useIdentityQuery } from "@/shared/api/hooks";
import { relayClient } from "@/shared/api/relayClient";
import { useRelayConnection } from "@/shared/api/useRelayConnection";
import { KIND_PRODUCTION } from "@/shared/constants/kinds";

import {
  latestProductions,
  type Production,
  type ProductionInput,
  publishProduction,
} from "./productionEvents";

export const productionsQueryKey = ["productions"] as const;

export function useProductionsQuery() {
  const identityQuery = useIdentityQuery();
  const ownerPubkey = identityQuery.data?.pubkey;
  const connection = useRelayConnection();
  const query = useQuery({
    enabled: Boolean(ownerPubkey),
    queryKey: [...productionsQueryKey, ownerPubkey ?? "none"],
    queryFn: async (): Promise<Production[]> => {
      const events = await relayClient.fetchEvents({
        kinds: [KIND_PRODUCTION],
        authors: ownerPubkey ? [ownerPubkey] : [],
        limit: 500,
      });
      return latestProductions(events);
    },
    staleTime: 15_000,
    retry: 2,
  });
  // refetchOnWindowFocus is off app-wide, so a relay outage would leave the
  // list stuck in error. Refetch once the socket is healthy again.
  const refetch = query.refetch;
  React.useEffect(() => {
    if (connection === "connected") void refetch();
  }, [connection, refetch]);
  return query;
}

export function useProductionQuery(slug: string | null) {
  const productions = useProductionsQuery();
  const production =
    slug === null
      ? null
      : (productions.data?.find((p) => p.slug === slug) ?? null);
  return { ...productions, production };
}

export function usePublishProductionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ProductionInput) => publishProduction(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: productionsQueryKey });
    },
  });
}
