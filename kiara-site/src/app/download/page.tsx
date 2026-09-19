import { type Metadata } from "next";

import { PageShell } from "@/components/landing/home3/page-shell";
import { DOWNLOADS, EARLY_ACCESS_HREF } from "@/lib/site";

export const metadata: Metadata = {
  title: "Download Kiara Studio",
  description:
    "Kiara Studio for macOS, Windows and Linux. Install, create your identity and join your studio with an invite.",
};

const FOCUS =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#F2C230]";

const STEPS = [
  {
    n: "01",
    title: "Install",
    body: "Download the app for your system and open it. No account form, no password.",
  },
  {
    n: "02",
    title: "Create your identity",
    body: "Kiara Studio generates your key on first launch. It stays on your device. Already have one? Import it.",
  },
  {
    n: "03",
    title: "Join your studio",
    body: "Open the invite you received and you are in — projects, characters, shots and agents, all in one place.",
  },
];

export default function DownloadPage() {
  return (
    <PageShell
      title="Kiara Studio on your desktop."
      lede="The production workspace for studios: scripts, shots, characters, assets and AI agents, with humans approving every step."
    >
      <section aria-labelledby="download-heading">
        <h2 id="download-heading" className="sr-only">
          Download
        </h2>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {DOWNLOADS.map((d) => (
            <li
              key={d.id}
              className="flex flex-col justify-between rounded-2xl border border-[#2A2A26] bg-[#121211] p-6"
            >
              <div>
                <p className="font-[family-name:var(--font-sora)] text-[1.25rem] font-bold tracking-[-0.02em]">
                  {d.label}
                </p>
                <p className="mt-1 font-[family-name:var(--font-manrope)] text-[0.9rem] text-[#B9B9B2]">
                  {d.note}
                </p>
              </div>
              {d.href ? (
                <a
                  href={d.href}
                  className={`mt-8 inline-flex justify-center rounded-full bg-[#F2C230] px-5 py-2.5 font-[family-name:var(--font-manrope)] text-[0.9rem] font-bold text-[#141414] hover:bg-[#FFD24A] ${FOCUS}`}
                >
                  Download
                </a>
              ) : (
                <a
                  href={EARLY_ACCESS_HREF}
                  className={`mt-8 inline-flex justify-center rounded-full border border-[#3A3A35] px-5 py-2.5 font-[family-name:var(--font-manrope)] text-[0.9rem] font-bold text-[#F2F2ED] hover:border-[#F2C230] hover:text-[#F2C230] ${FOCUS}`}
                >
                  Request early access
                </a>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="steps-heading" className="mt-20 md:mt-28">
        <h2
          id="steps-heading"
          className="font-[family-name:var(--font-sora)] text-[1.6rem] font-bold tracking-[-0.03em] md:text-[2rem]"
        >
          Three steps. No password.
        </h2>
        <ol className="mt-10 grid gap-10 md:grid-cols-3">
          {STEPS.map((s) => (
            <li key={s.n}>
              <p className="font-[family-name:var(--font-mono)] text-[0.8rem] text-[#F2C230]">
                {s.n}
              </p>
              <h3 className="mt-3 font-[family-name:var(--font-sora)] text-[1.15rem] font-bold tracking-[-0.02em]">
                {s.title}
              </h3>
              <p className="mt-2 font-[family-name:var(--font-manrope)] text-[0.95rem] leading-[1.7] text-[#B9B9B2]">
                {s.body}
              </p>
            </li>
          ))}
        </ol>
      </section>
    </PageShell>
  );
}
