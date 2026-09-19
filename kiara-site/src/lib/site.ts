// Destino de todo CTA "Get started". Troque aqui, vale no site todo.
export const CTA_HREF = "/download/";

export const CONTACT_EMAIL = "contato@kiara.ai";

// Assets do Kiara Studio por sistema. `null` = sem release publicada ainda;
// o botão vira "Request early access" (mailto). Preencha com as URLs da
// release quando existirem.
export const DOWNLOADS: {
  id: string;
  label: string;
  note: string;
  href: string | null;
}[] = [
  { id: "mac-arm", label: "macOS", note: "Apple Silicon", href: null },
  { id: "mac-x64", label: "macOS", note: "Intel", href: null },
  { id: "windows", label: "Windows", note: "x64 installer", href: null },
  { id: "linux", label: "Linux", note: "AppImage", href: null },
];

export const EARLY_ACCESS_HREF = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(
  "Kiara Studio — early access",
)}`;
