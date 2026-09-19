import { OG_IMAGE, SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/core/seo/site";

// Planos espelhados de pricing-section.tsx (USD/mês) para rich results de preço.
const OFFERS = [
  { name: "Free", price: 0 },
  { name: "Pro", price: 7 },
  { name: "Business", price: 21 },
];

// Schema.org JSON-LD — habilita rich results (organização, app, preços).
export function StructuredData() {
  const graph = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${SITE_URL}/#organization`,
        name: SITE_NAME,
        url: SITE_URL,
        logo: `${SITE_URL}${OG_IMAGE}`,
      },
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,
        url: SITE_URL,
        name: SITE_NAME,
        description: SITE_DESCRIPTION,
        publisher: { "@id": `${SITE_URL}/#organization` },
      },
      {
        "@type": "SoftwareApplication",
        name: SITE_NAME,
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        description: SITE_DESCRIPTION,
        url: SITE_URL,
        offers: OFFERS.map((o) => ({
          "@type": "Offer",
          name: o.name,
          price: o.price,
          priceCurrency: "USD",
          category: "subscription",
        })),
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(graph) }}
    />
  );
}
