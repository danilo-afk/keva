import { ScrubHome } from "@/components/landing/home3/scrub-home";
import { StructuredData } from "@/components/landing/structured-data";
import { jetbrainsMono, manrope, sora } from "@/lib/brand-fonts";

export default function LandingPage() {
  return (
    <div className={`${sora.variable} ${manrope.variable} ${jetbrainsMono.variable}`}>
      <StructuredData />
      <ScrubHome />
    </div>
  );
}
