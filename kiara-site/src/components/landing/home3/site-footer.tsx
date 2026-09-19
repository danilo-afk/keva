import { Instagram, Linkedin, Mail } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { CONTACT_EMAIL, CTA_HREF } from "@/lib/site";

const FOCUS =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#F2C230]";

const TikTokIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="h-[18px] w-[18px]" aria-hidden>
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
  </svg>
);

const SOCIAL = [
  { href: "https://www.instagram.com/kiaraatila_ai", label: "Instagram", icon: <Instagram className="h-[18px] w-[18px]" aria-hidden /> },
  { href: "https://www.tiktok.com/@kiaraatila_ai", label: "TikTok", icon: <TikTokIcon /> },
  { href: "https://www.linkedin.com/company/kiara-ai", label: "LinkedIn", icon: <Linkedin className="h-[18px] w-[18px]" aria-hidden /> },
];

/** Rodapé: contato, legal e as rotas que não cabem na narrativa do scroll. */
export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="relative z-10 border-t border-[#232320] bg-[#0B0B0B] px-6 py-14 md:px-10">
      <div className="mx-auto grid max-w-6xl gap-10 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <div className="flex items-center gap-4">
            <span className="font-[family-name:var(--font-sora)] text-[1.15rem] font-bold tracking-[-0.03em] text-[#F2F2ED]">
              kiara<span className="text-[#F2C230]">.</span>
            </span>
            <span className="h-6 w-px bg-[#2E2E2A]" />
            <Image
              src="/google.png"
              alt="Google for Startups"
              width={230}
              height={199}
              className="h-7 w-auto opacity-80"
            />
          </div>
          <p className="mt-5 max-w-xs font-[family-name:var(--font-manrope)] text-[0.9rem] leading-[1.7] text-[#8A8A84]">
            Images, video, characters and workflows, run by one agent. Tell your
            story at scale.
          </p>
          <div className="mt-6 flex items-center gap-4">
            {SOCIAL.map((s) => (
              <Link
                key={s.label}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={s.label}
                className={`text-[#8A8A84] transition-colors hover:text-[#F2C230] ${FOCUS}`}
              >
                {s.icon}
              </Link>
            ))}
          </div>
        </div>

        <FooterColumn title="Talk to us">
          <FooterLink href={`mailto:${CONTACT_EMAIL}`}>
            <span className="inline-flex items-center gap-2">
              <Mail className="h-4 w-4" aria-hidden />
              {CONTACT_EMAIL}
            </span>
          </FooterLink>
          <FooterLink href="/pricing">Pricing</FooterLink>
        </FooterColumn>

        <FooterColumn title="Product">
          <FooterLink href={CTA_HREF}>Download</FooterLink>
          <FooterLink href="/gallery">Gallery</FooterLink>
        </FooterColumn>

        <FooterColumn title="Legal">
          <FooterLink href="/terms">Terms of service</FooterLink>
          <FooterLink href="/privacy">Privacy policy</FooterLink>
        </FooterColumn>
      </div>

      <div className="mx-auto mt-12 flex max-w-6xl flex-col gap-3 border-t border-[#1C1C1A] pt-6 font-[family-name:var(--font-manrope)] text-[0.8rem] text-[#6E6E69] md:flex-row md:items-center md:justify-between">
        <p>© {year} Kiara A.I. All rights reserved.</p>
        <p>Open Cinema. Everyone has the right to tell their story.</p>
      </div>
    </footer>
  );
}

function FooterColumn({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.18em] text-[#8A8A84]">
        {title}
      </h3>
      <ul className="mt-4 space-y-2.5 font-[family-name:var(--font-manrope)] text-[0.9rem] text-[#D6D6CF]">
        {children}
      </ul>
    </div>
  );
}

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <li>
      <Link
        href={href}
        className={`underline-offset-4 transition-colors hover:text-[#F2C230] hover:underline ${FOCUS}`}
      >
        {children}
      </Link>
    </li>
  );
}
