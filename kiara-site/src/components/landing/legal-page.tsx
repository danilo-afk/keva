import { Footer } from "@/components/landing/footer";
import { Header } from "@/components/landing/header";

// Wrapper das páginas legais (Terms, Privacy) — header/footer + prose centrada.
export function LegalPage({
  title,
  updatedAt,
  children,
}: {
  title: string;
  updatedAt: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen w-full bg-[#0a0a0a]">
      <Header />
      <main className="mx-auto max-w-3xl px-4 py-24 md:py-32">
        <h1 className="mb-2 text-3xl font-bold text-white md:text-4xl">
          {title}
        </h1>
        <p className="mb-10 text-sm text-zinc-500">Last updated: {updatedAt}</p>
        <div className="space-y-6 text-sm leading-relaxed text-zinc-300 [&_a]:text-violet-400 [&_a:hover]:underline [&_h2]:mt-10 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-white [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-6">
          {children}
        </div>
      </main>
      <Footer />
    </div>
  );
}
