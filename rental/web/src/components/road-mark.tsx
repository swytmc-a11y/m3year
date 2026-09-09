/**
 * The سمو mark: a road in perspective, its verges converging and the centre
 * line receding — each dash shorter and thinner than the last.
 *
 * Kept in sync with the app's components/logo.tsx by hand; both draw the
 * same 24×24 geometry.
 */
export function RoadMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      width="1em"
      height="1em"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M5 20.5 L10.2 5.5" strokeWidth={2} />
      <path d="M19 20.5 L13.8 5.5" strokeWidth={2} />
      <path d="M12 20.6 L12 16.9" strokeWidth={2} />
      <path d="M12 14.7 L12 12.1" strokeWidth={1.6} />
      <path d="M12 10.3 L12 8.9" strokeWidth={1.2} />
    </svg>
  );
}
