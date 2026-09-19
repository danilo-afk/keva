import { SiteFooter } from "./site-footer";
import { TopBar } from "./top-bar";

/** Mesma moldura da home para as páginas que saem dela. */
export function PageShell({
  title,
  lede,
  children,
}: {
  title: string;
  lede?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen bg-[#0B0B0B] text-[#F2F2ED] antialiased">
      <TopBar />
      <main className="px-6 pb-20 pt-32 md:px-10 md:pt-40">
        <div className="mx-auto max-w-6xl">
          <h1 className="max-w-[18ch] font-[family-name:var(--font-sora)] text-[2.4rem] font-bold leading-[1.02] tracking-[-0.035em] text-balance md:text-[3.6rem]">
            {title}
          </h1>
          {lede ? (
            <p className="mt-5 max-w-[58ch] font-[family-name:var(--font-manrope)] text-[1.05rem] leading-[1.7] text-[#B9B9B2]">
              {lede}
            </p>
          ) : null}
          <div className="mt-14 md:mt-20">{children}</div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
