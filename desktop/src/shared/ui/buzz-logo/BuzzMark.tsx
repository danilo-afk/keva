/**
 * Kiara mark (keva fork). Keeps the `BuzzMark` export so every call site stays
 * untouched; the gold variant reads on both the dark app chrome and the light
 * onboarding pages.
 */
export function BuzzMark({ className }: { className?: string }) {
  return (
    <img
      alt=""
      aria-hidden="true"
      className={["buzz-mark object-contain", className].filter(Boolean).join(" ")}
      draggable={false}
      src="/kiara/mark.png"
    />
  );
}
