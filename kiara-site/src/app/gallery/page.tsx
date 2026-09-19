import { type Metadata } from "next";

import { GalleryGrid } from "@/components/landing/home3/gallery-grid";
import { PageShell } from "@/components/landing/home3/page-shell";
import { jetbrainsMono, manrope, sora } from "@/lib/brand-fonts";

export const metadata: Metadata = {
  title: "Gallery",
  description: "Clips produced on Kiara: images, video, characters and voice.",
};

export default function GalleryPage() {
  return (
    <div className={`${sora.variable} ${manrope.variable} ${jetbrainsMono.variable}`}>
      <PageShell
        title="Made with Kiara."
        lede="Throw in your footage, say what you want. Everything below came out of the platform."
      >
        <GalleryGrid />
      </PageShell>
    </div>
  );
}
