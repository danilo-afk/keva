/**
 * Kiara mark (keva fork). Keeps the `BuzzMark` export so every call site stays
 * untouched. Two renditions ship and CSS picks one: gold on dark surfaces,
 * ink on the light onboarding steps.
 */
export function BuzzMark({ className }: { className?: string }) {
  const base = ["buzz-mark object-contain", className].filter(Boolean).join(" ");
  return (
    <>
      <img alt="" aria-hidden="true" className={`${base} buzz-mark--gold`} draggable={false} src="/kiara/mark.png" />
      <img alt="" aria-hidden="true" className={`${base} buzz-mark--ink`} draggable={false} src="/kiara/mark-light.png" />
    </>
  );
}
