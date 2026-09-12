import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";

import { ViewLoadingFallback } from "@/shared/ui/ViewLoadingFallback";
import {
  isProductionTab,
  type ProductionTab,
} from "@/features/productions/ui/ProductionPage";

const ProductionPage = React.lazy(async () => {
  const module = await import("@/features/productions/ui/ProductionPage");
  return { default: module.ProductionPage };
});

export const Route = createFileRoute("/productions/$productionId")({
  component: ProductionRouteComponent,
  validateSearch: (search: Record<string, unknown>) => ({
    tab: isProductionTab(search.tab) ? search.tab : undefined,
    id: typeof search.id === "string" && search.id ? search.id : undefined,
  }),
});

function ProductionRouteComponent() {
  const { productionId } = Route.useParams();
  const { tab, id } = Route.useSearch();
  const navigate = Route.useNavigate();
  const onNavigate = React.useCallback(
    (next: { tab: ProductionTab; id?: string }) => {
      void navigate({ search: { tab: next.tab, id: next.id }, replace: false });
    },
    [navigate],
  );
  return (
    <React.Suspense fallback={<ViewLoadingFallback kind="projects" />}>
      <ProductionPage
        entityId={id}
        onNavigate={onNavigate}
        slug={productionId}
        tab={tab ?? "overview"}
      />
    </React.Suspense>
  );
}
