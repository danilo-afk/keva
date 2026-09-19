// URL canônica do site. Configurável via NEXT_PUBLIC_SITE_URL; fallback = prod.
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://ai-kiara.com"
).replace(/\/$/, "");

export const SITE_NAME = "Kiara A.I.";

export const SITE_DESCRIPTION =
  "Super agent platform to build, run and orchestrate AI agents for content " +
  "at scale: AI video, AI images, editing, sound and UGC. Battle-tested " +
  "workflows, a prompt library and cost management.";

// Imagem de compartilhamento (OG/Twitter). Ideal 1200x630.
export const OG_IMAGE = "/images/kiara-logo.png";

export const url = (path = "/") => `${SITE_URL}${path}`;
