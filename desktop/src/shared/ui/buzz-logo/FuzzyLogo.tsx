import { cn } from "@/shared/lib/cn";
import type { BuzzLogoAnimationProps } from "./BuzzLogoAnimation";

export type FuzzyLogoProps = Partial<BuzzLogoAnimationProps> & {
  fuzz?: boolean;
  pulse?: boolean;
};

/**
 * Kiara mark with a soft pulse (keva fork). Replaces the fuzzy Buzz bee; the
 * animation props are accepted for call-site compatibility and ignored.
 */
export function FuzzyLogo({
  className,
  ariaLabel = "Kiara logo",
  pulse = true,
  style,
}: FuzzyLogoProps) {
  return (
    <img
      alt={ariaLabel}
      className={cn("object-contain", pulse && "buzz-logo--pulse", className)}
      draggable={false}
      src="/kiara/mark.png"
      style={style}
    />
  );
}
