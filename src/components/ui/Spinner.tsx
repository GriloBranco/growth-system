export function Spinner({ size = "md" }: { size?: "sm" | "md" }) {
  const sizeClass = size === "sm" ? "h-4 w-4 border-[1.5px]" : "h-5 w-5 border-2";
  return (
    <div className={`animate-spin ${sizeClass} border-zinc-300 border-t-zinc-900 rounded-full`} />
  );
}
