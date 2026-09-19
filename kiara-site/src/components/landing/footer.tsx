import { Instagram, Linkedin, Mail } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { Separator } from "@/components/ui/separator";

import { KiaraLogo } from "./kiara-logo";

const TikTokIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
  </svg>
);

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-zinc-800 bg-neutral-950">
      <div className="mx-auto max-w-6xl px-4 py-12 md:py-16">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          {/* Logo + Description */}
          <div className="col-span-2">
            <div className="mb-4 flex items-center gap-6">
              <KiaraLogo height={32} />
              <div className="h-8 w-px bg-zinc-700" />
              <Image
                src="/google.png"
                alt="Google for Startups"
                width={230}
                height={199}
                className="h-9 w-auto"
              />
            </div>
            <p className="max-w-xs text-sm text-zinc-400">
              Super agent for visual workflows, video pipelines, and
              multi-tenant memory. Tell your story at scale.
            </p>

            <div className="mt-6 flex gap-4">
              <Link
                href="https://www.instagram.com/kiaraatila_ai"
                target="_blank"
                rel="noopener noreferrer"
                className="text-zinc-500 transition-colors hover:text-violet-400"
                aria-label="Instagram"
              >
                <Instagram className="h-5 w-5" />
              </Link>
              <Link
                href="https://www.tiktok.com/@kiaraatila_ai"
                target="_blank"
                rel="noopener noreferrer"
                className="text-zinc-500 transition-colors hover:text-violet-400"
                aria-label="TikTok"
              >
                <TikTokIcon />
              </Link>
              <Link
                href="https://www.linkedin.com/company/kiara-ai"
                target="_blank"
                rel="noopener noreferrer"
                className="text-zinc-500 transition-colors hover:text-violet-400"
                aria-label="LinkedIn"
              >
                <Linkedin className="h-5 w-5" />
              </Link>
              <Link
                href="mailto:contato@kiara.ai"
                className="text-zinc-500 transition-colors hover:text-violet-400"
                aria-label="Email"
              >
                <Mail className="h-5 w-5" />
              </Link>
            </div>
          </div>

          {/* Product */}
          <div>
            <h4 className="mb-4 font-semibold text-white">Product</h4>
            <ul className="space-y-2 text-sm text-zinc-400">
              <li>
                <Link
                  href="/gallery"
                  className="transition-colors hover:text-violet-400"
                >
                  Gallery
                </Link>
              </li>
              <li>
                <Link
                  href="/pricing"
                  className="transition-colors hover:text-violet-400"
                >
                  Pricing
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="mb-4 font-semibold text-white">Legal</h4>
            <ul className="space-y-2 text-sm text-zinc-400">
              <li>
                <Link
                  href="/terms"
                  className="transition-colors hover:text-violet-400"
                >
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link
                  href="/privacy"
                  className="transition-colors hover:text-violet-400"
                >
                  Privacy Policy
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <Separator className="my-8 bg-zinc-800" />

        <div className="flex flex-col items-center justify-between gap-4 text-sm text-zinc-500 md:flex-row">
          <p>© {year} Kiara A.I. All rights reserved.</p>
          <p className="text-xs">
            &quot;Open Cinema — everyone has the right to tell their
            story.&quot;
          </p>
        </div>
      </div>
    </footer>
  );
}
