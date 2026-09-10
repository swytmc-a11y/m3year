/**
 * The سمو mark, cropped from the brand identity sheet (public/brand) rather
 * than redrawn — a flat black silhouette, since the marketing site and admin
 * panel are light-surface only (no dark mode to invert against, unlike the
 * mobile app's LogoMark).
 *
 * A plain `<img>` rather than next/image: it's a small fixed nav icon
 * bundled with the app, not page content that needs responsive srcsets.
 */
export function RoadMark({ className }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/brand/mark-flat.png"
      alt=""
      className={className}
      style={{ width: "1em", height: "1em", objectFit: "contain" }}
      aria-hidden="true"
    />
  );
}
