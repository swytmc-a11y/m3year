import { ImageResponse } from "next/og";

// The link preview card. Without this, every share of a معيار link on
// WhatsApp or X rendered as a bare URL with no image and no identity — for a
// platform whose product is trust, that is the worst possible first impression.
//
// Generated rather than shipped as a static PNG so it stays in sync with the
// brand colours defined in globals.css.

export const alt = "معيار — منصة توثيق المشاريع الباحثة عن شريك ممول";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Satori (the renderer behind ImageResponse) has no system fonts and cannot
// shape Arabic without one — rendering fails outright with a
// "substFormat: 3 is not yet supported" error rather than falling back. So
// the Arabic face used everywhere else in the site is fetched and handed to
// it explicitly.
const ALMARAI_TTF =
  "https://fonts.gstatic.com/s/almarai/v19/tssoApxBaigK_hnnS_qjhng.ttf";

async function loadArabicFont(): Promise<ArrayBuffer | null> {
  try {
    const res = await fetch(ALMARAI_TTF);
    if (!res.ok) return null;
    return await res.arrayBuffer();
  } catch {
    // Rendering the card without the brand face is far better than the route
    // throwing and every share losing its preview image entirely.
    return null;
  }
}

const INK = "#171a1c";
const VERIFY = "#0f6b66";
const AMBER = "#d9762b";
const PAPER = "#edeee9";
const GRID = "#c7cbc6";

export default async function OpengraphImage() {
  const font = await loadArabicFont();

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: PAPER,
          backgroundImage: `linear-gradient(${GRID} 1px, transparent 1px), linear-gradient(90deg, ${GRID} 1px, transparent 1px)`,
          backgroundSize: "48px 48px",
          padding: 80,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 20,
            marginBottom: 32,
          }}
        >
          <div
            style={{
              width: 18,
              height: 72,
              background: VERIFY,
              borderRadius: 4,
              display: "flex",
            }}
          />
          <div
            style={{
              fontSize: 96,
              fontWeight: 800,
              color: INK,
              letterSpacing: -2,
              display: "flex",
            }}
          >
            معيار
          </div>
        </div>

        <div
          style={{
            fontSize: 40,
            color: INK,
            opacity: 0.75,
            textAlign: "center",
            maxWidth: 900,
            lineHeight: 1.5,
            display: "flex",
          }}
        >
          توثيق مالي مستقل للمشاريع الباحثة عن شريك ممول
        </div>

        <div
          style={{
            marginTop: 48,
            display: "flex",
            alignItems: "center",
            gap: 14,
            fontSize: 26,
            color: VERIFY,
            letterSpacing: 6,
          }}
        >
          <div style={{ width: 10, height: 10, borderRadius: 5, background: AMBER, display: "flex" }} />
          MIYEAR.SITE
        </div>
      </div>
    ),
    {
      ...size,
      fonts: font
        ? [{ name: "Almarai", data: font, weight: 800 as const, style: "normal" as const }]
        : [],
    },
  );
}
