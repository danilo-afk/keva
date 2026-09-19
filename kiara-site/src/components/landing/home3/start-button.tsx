import { CTA_HREF } from "@/lib/site";

const FOCUS =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#F2C230]";

const BASE =
  "inline-flex justify-center rounded-full px-7 py-3 font-[family-name:var(--font-manrope)] text-[0.95rem] font-bold transition-colors duration-150 ease-out active:translate-y-px";

const SOLID = `${BASE} bg-[#F2C230] text-[#141414] hover:bg-[#FFD24A]`;
const OUTLINE = `${BASE} border border-[#3A3A35] text-[#F2F2ED] hover:border-[#F2C230] hover:text-[#F2C230]`;

/** CTA principal. Sem auth: sempre leva para CTA_HREF. */
export function StartButton({
  variant = "solid",
  className,
}: {
  variant?: "solid" | "outline";
  className?: string;
}) {
  return (
    <a
      href={CTA_HREF}
      className={`${variant === "solid" ? SOLID : OUTLINE} ${FOCUS} ${className ?? ""}`}
    >
      Get started
    </a>
  );
}
