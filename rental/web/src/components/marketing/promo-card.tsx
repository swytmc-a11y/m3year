export type MarketingBanner = {
  id: string;
  render: "image" | "template";
  tone: string;
  figure: string | null;
  title: string | null;
  subtitle: string | null;
  cta_label: string | null;
  image_url: string | null;
};

/**
 * The templated promo, drawn the same way the app draws it — the oversized
 * figure carries the offer and the copy sits on top of it.
 */
export function MarketingPromoCard({ banner }: { banner: MarketingBanner }) {
  if (banner.render === "image" && banner.image_url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={banner.image_url}
        alt={banner.title ?? ""}
        className="h-full w-full rounded-2xl object-cover"
      />
    );
  }

  const lime = banner.tone === "lime";
  return (
    <div
      className={`relative flex min-h-[170px] flex-col justify-center overflow-hidden rounded-2xl p-6 ${
        lime ? "bg-[#EDF7D4]" : "bg-[#111113]"
      }`}
    >
      {banner.figure ? (
        <span
          aria-hidden="true"
          className={`pointer-events-none absolute -bottom-7 left-3 select-none font-heading text-[120px] font-extrabold leading-none ${
            lime ? "text-[#C8F250]" : "text-white/10"
          }`}
        >
          {banner.figure}
        </span>
      ) : null}

      <div className="relative flex flex-col gap-1.5">
        {banner.title ? (
          <h3
            className={`font-heading text-xl font-extrabold leading-snug ${
              lime ? "text-ink" : "text-white"
            }`}
          >
            {banner.title}
          </h3>
        ) : null}
        {banner.subtitle ? (
          <p className={`text-[13px] leading-6 ${lime ? "text-ink/70" : "text-white/70"}`}>
            {banner.subtitle}
          </p>
        ) : null}
        {banner.cta_label ? (
          <span
            className={`mt-1 text-[13px] font-bold ${lime ? "text-ink" : "text-white"}`}
          >
            {banner.cta_label} ←
          </span>
        ) : null}
      </div>
    </div>
  );
}
