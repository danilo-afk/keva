import Link from "next/link";

import { Button } from "@/components/ui/button";
import { CTA_HREF } from "@/lib/site";
import { cn } from "@/lib/utils";

import { KiaraLogo } from "./kiara-logo";

export type HeaderProps = {
  className?: string;
};

// Header das páginas legais. Sem i18n nem auth: links fixos.
export function Header({ className }: HeaderProps) {
  return (
    <header
      className={cn(
        "container-md fixed top-0 right-0 left-0 z-50 mx-auto flex h-16 items-center justify-between backdrop-blur-xs",
        className,
      )}
    >
      <div className="flex items-center gap-6">
        <Link href="/" className="flex items-center">
          <KiaraLogo height={30} />
        </Link>
      </div>
      <nav
        className="mr-8 ml-auto hidden items-center gap-6 text-sm md:flex md:gap-8"
        style={{
          fontFamily: "Blender Pro",
          fontWeight: 500,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
        }}
      >
        <Link
          href="/gallery"
          className="text-white/70 transition-colors hover:text-white"
        >
          Gallery
        </Link>
        <Link
          href="/pricing"
          className="text-white/70 transition-colors hover:text-white"
        >
          Pricing
        </Link>
      </nav>
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          asChild
          className="hidden border-0 bg-[#F2C230] text-[#141414] hover:bg-[#FFD24A] md:inline-flex"
        >
          <a href={CTA_HREF}>Get started</a>
        </Button>
      </div>
      <hr className="from-border/0 via-border/70 to-border/0 absolute top-16 right-0 left-0 z-10 m-0 h-px w-full border-none bg-linear-to-r" />
    </header>
  );
}
