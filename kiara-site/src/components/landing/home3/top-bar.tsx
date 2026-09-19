import Link from "next/link";

import { CTA_HREF } from "@/lib/site";

const FOCUS =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#F2C230]";

export function TopBar() {
  return (
    <header className="fixed inset-x-0 top-0 z-50 flex items-center justify-between px-6 py-5 md:px-10">
      <Link href="/" className={`flex items-center gap-2.5 ${FOCUS}`}>
        <img src="/images/kiara-icon-mark.png" alt="" aria-hidden className="h-6 w-auto" />
        <span className="font-[family-name:var(--font-sora)] text-[1.15rem] font-bold tracking-[-0.03em]">
          kiara<span className="text-[#F2C230]">.</span>
        </span>
      </Link>
      {/* Site estático: sem sessão. O único CTA leva ao download. */}
      <div className="flex items-center gap-5">
        <a
          href={CTA_HREF}
          className={`font-[family-name:var(--font-manrope)] text-[0.9rem] font-bold text-[#F2F2ED] underline-offset-[6px] hover:underline ${FOCUS}`}
        >
          Get started
        </a>
      </div>
    </header>
  );
}
