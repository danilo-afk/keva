import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";

import { ViewLoadingFallback } from "@/shared/ui/ViewLoadingFallback";

const ProductionOverview = React.lazy(async () => {
  const module = await import("@/features/productions/ui/ProductionOverview");
  return { default: module.ProductionOverview };
});

export const Route = createFileRoute("/productions/$productionId")({
  component: ProductionRouteComponent,
});

function ProductionRouteComponent() {
  const { productionId } = Route.useParams();
  return (
    <React.Suspense fallback={<ViewLoadingFallback kind="projects" />}>
      <ProductionOverview slug={productionId} />
    </React.Suspense>
  );
}
