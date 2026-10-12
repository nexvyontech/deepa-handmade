export function Spinner({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const px = size === "sm" ? "h-3.5 w-3.5" : size === "lg" ? "h-8 w-8" : "h-5 w-5";
  return (
    <svg className={`${px} animate-spin text-current`} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-90"
        fill="currentColor"
        d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4z"
      />
    </svg>
  );
}

export function FullScreenLoader({ label }: { label?: string }) {
  return (
    <div className="flex min-h-[50vh] flex-1 flex-col items-center justify-center gap-3 text-sm text-stone-500">
      <Spinner size="lg" />
      {label ? <p>{label}</p> : null}
    </div>
  );
}