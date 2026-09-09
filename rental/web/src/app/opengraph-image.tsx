import { ImageResponse } from "next/og";

// The link preview card. Without this, every share of a سمو link on
// WhatsApp or X rendered as a bare URL with no image and no identity — the
// worst possible first impression for a link someone is deciding to trust
// with a booking.
//
// Generated rather than shipped as a static PNG so it stays in sync with the
// brand colours defined in globals.css.

export const alt = "سمو — تأجير سيارات بسعر واضح شامل الضريبة";
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

// The سمو palette from globals.css. The card is deliberately the dark end
// of it: a preview thumbnail competes with everything else in a chat, and
// near-black is what stands out in a feed of white cards.
const NIGHT = "#0b0b0c";
const BONE = "#f1f1ef";
const MUTED = "#9b9ba0";

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
          background: NIGHT,
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
              display: "flex",
              position: "relative",
              width: 88,
              height: 88,
            }}
          >
            <div
              style={{
                position: "absolute",
                left: 20,
                top: 6,
                width: 7,
                height: 76,
                background: BONE,
                borderRadius: 4,
                transform: "rotate(19deg)",
                display: "flex",
              }}
            />
            <div
              style={{
                position: "absolute",
                right: 20,
                top: 6,
                width: 7,
                height: 76,
                background: BONE,
                borderRadius: 4,
                transform: "rotate(-19deg)",
                display: "flex",
              }}
            />
            <div style={{ position: "absolute", left: 40.5, top: 62, width: 7, height: 20, background: BONE, borderRadius: 4, display: "flex" }} />
            <div style={{ position: "absolute", left: 41.2, top: 36, width: 5.6, height: 15, background: BONE, borderRadius: 3, display: "flex" }} />
            <div style={{ position: "absolute", left: 41.9, top: 17, width: 4.2, height: 9, background: BONE, borderRadius: 2, display: "flex" }} />
          </div>
          <div
            style={{
              fontSize: 96,
              fontWeight: 800,
              color: BONE,
              letterSpacing: -2,
              display: "flex",
            }}
          >
            سمو
          </div>
        </div>

        <div
          style={{
            fontSize: 40,
            color: MUTED,
            textAlign: "center",
            maxWidth: 900,
            lineHeight: 1.5,
            display: "flex",
          }}
        >
          تأجير سيارات بسعر واضح شامل الضريبة
        </div>

        <div
          style={{
            marginTop: 48,
            display: "flex",
            alignItems: "center",
            gap: 14,
            fontSize: 26,
            color: MUTED,
            letterSpacing: 6,
          }}
        >
          <div style={{ width: 8, height: 8, borderRadius: 4, background: BONE, display: "flex" }} />
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
