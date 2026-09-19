import Image from "next/image";

import { sora } from "@/lib/brand-fonts";

const GOLD = "#F2C230";

// Logo do rebrand: símbolo âmbar + wordmark "kiara." + ponto dourado.
export function KiaraLogo({
  height = 30,
  dark = true,
}: {
  height?: number;
  dark?: boolean;
}) {
  return (
    <span className="flex items-center gap-2">
      <Image
        src="/images/kiara-icon-mark.png"
        alt="Kiara"
        width={268}
        height={264}
        priority
        style={{ height, width: "auto" }}
      />
      <span
        className={sora.className}
        style={{
          fontWeight: 700,
          fontSize: height * 0.74,
          letterSpacing: "-0.03em",
          lineHeight: 1,
          color: dark ? "#F2F2ED" : "#141414",
        }}
      >
        kiara<span style={{ color: GOLD }}>.</span>
      </span>
    </span>
  );
}
