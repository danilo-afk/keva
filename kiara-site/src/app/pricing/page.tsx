import { Check } from "lucide-react";
import { type Metadata } from "next";
import Link from "next/link";

import { PageShell } from "@/components/landing/home3/page-shell";
import { StartButton } from "@/components/landing/home3/start-button";
import { jetbrainsMono, manrope, sora } from "@/lib/brand-fonts";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Kiara plans: runs per week, private storage and the models you choose. Free to start.",
};

// Mesmos planos do JSON-LD em components/landing/structured-data.tsx — mudou
// aqui, muda lá, senão o rich result do Google passa a mentir o preço.
const PLANS = [
  {
    id: "free",
    name: "Free",
    price: 0,
    runs: "20 runs a week",
    features: ["Public content", "Every model in the catalogue"],
  },
  {
    id: "pro",
    name: "Pro",
    price: 7,
    runs: "100 runs a week",
    features: ["30 GB private storage", "Private content", "Priority queue"],
    featured: true,
  },
  {
    id: "business",
    name: "Business",
    price: 21,
    runs: "300 runs a week",
    features: ["90 GB private storage", "Private content", "Priority queue"],
  },
];

const FOCUS =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#F2C230]";

export default function PricingPage() {
  return (
    <div className={`${sora.variable} ${manrope.variable} ${jetbrainsMono.variable}`}>
      <PageShell
        title="Pay for what you run."
        lede="No seats, no per-model surcharge. A run is one generation: an image, a clip, a voice take. Start free and move up only when the volume asks for it."
      >
        {/* Uma linha por plano em vez de três cartões iguais: o olho compara
            preço com preço, e o destaque não precisa de balão nem de escala. */}
        <div className="border-t border-[#232320]">
          {PLANS.map((plan) => (
            <div
              key={plan.id}
              className={`grid items-start gap-6 border-b border-[#232320] py-8 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1.4fr)_auto] md:items-center md:gap-10 md:py-10 ${
                plan.featured ? "bg-[#F2C230]/[0.035]" : ""
              }`}
            >
              <div>
                <h2 className="font-[family-name:var(--font-sora)] text-[1.5rem] font-bold tracking-[-0.02em] md:text-[1.8rem]">
                  {plan.name}
                </h2>
                {plan.featured ? (
                  <span className="mt-1 inline-block font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.18em] text-[#F2C230]">
                    Most chosen
                  </span>
                ) : null}
              </div>

              <p className="flex items-baseline gap-1.5 font-[family-name:var(--font-sora)] tabular-nums">
                {plan.price === 0 ? (
                  <span className="text-[2rem] font-bold md:text-[2.4rem]">Free</span>
                ) : (
                  <>
                    <span className="text-[2rem] font-bold md:text-[2.4rem]">
                      ${plan.price}
                    </span>
                    <span className="font-[family-name:var(--font-manrope)] text-[0.95rem] text-[#8A8A84]">
                      /month
                    </span>
                  </>
                )}
              </p>

              <ul className="space-y-2 font-[family-name:var(--font-manrope)] text-[0.95rem] text-[#B9B9B2]">
                <li className="flex items-start gap-2.5 text-[#F2F2ED]">
                  <Check className="mt-0.5 h-4 w-4 flex-none text-[#F2C230]" aria-hidden />
                  {plan.runs}
                </li>
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5">
                    <Check className="mt-0.5 h-4 w-4 flex-none text-[#4E4E48]" aria-hidden />
                    {f}
                  </li>
                ))}
              </ul>

              <StartButton variant={plan.featured ? "solid" : "outline"} />
            </div>
          ))}
        </div>

        <p className="mt-10 font-[family-name:var(--font-manrope)] text-[0.9rem] text-[#8A8A84]">
          No commitment, cancel anytime, 14-day money-back guarantee. Secure
          payment via Stripe. Questions before you commit:{" "}
          <Link
            href="mailto:contato@kiara.ai"
            className={`text-[#D6D6CF] underline underline-offset-4 decoration-[#4E4E48] hover:decoration-[#F2C230] ${FOCUS}`}
          >
            contato@kiara.ai
          </Link>
          .
        </p>
      </PageShell>
    </div>
  );
}
