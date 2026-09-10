/**
 * A branch's location card needs two different kinds of "map": a small
 * preview image (no API key, no map SDK dependency) and a link that hands
 * the customer off to an app they already know how to drive.
 */

/**
 * A static preview image centred on the pin — OpenStreetMap's own free
 * static-map renderer, no API key required. Good enough for a small
 * in-app preview; the customer taps through to Google Maps for anything
 * more (directions, live traffic, satellite view).
 */
export function staticMapUrl(
  latitude: number,
  longitude: number,
  { width = 640, height = 320, zoom = 15 }: { width?: number; height?: number; zoom?: number } = {},
): string {
  const params = new URLSearchParams({
    center: `${latitude},${longitude}`,
    zoom: String(zoom),
    size: `${width}x${height}`,
    markers: `${latitude},${longitude},red-pushpin`,
  });
  return `https://staticmap.openstreetmap.de/staticmap.php?${params.toString()}`;
}

/** Opens directly in the Google Maps app when installed, else the browser. */
export function googleMapsUrl(latitude: number, longitude: number): string {
  const params = new URLSearchParams({ api: "1", query: `${latitude},${longitude}` });
  return `https://www.google.com/maps/search/?${params.toString()}`;
}
