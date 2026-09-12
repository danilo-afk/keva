/** Kiara mark in place of the animated bee (keva fork); export name kept. */
export function FlappingBee({ className }: { className?: string }) {
  return (
    <img
      alt=""
      aria-hidden="true"
      className={["object-contain", className].filter(Boolean).join(" ")}
      draggable={false}
      src="/kiara/mark-light.png"
    />
  );
}
