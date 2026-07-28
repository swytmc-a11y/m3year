import type { Metadata } from "next";
import { Almarai, IBM_Plex_Sans_Arabic, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

const almarai = Almarai({
  variable: "--font-almarai",
  subsets: ["arabic"],
  weight: ["700", "800"],
});

const ibmPlexSansArabic = IBM_Plex_Sans_Arabic({
  variable: "--font-ibm-plex-sans-arabic",
  subsets: ["arabic"],
  weight: ["400", "500", "600", "700"],
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-ibm-plex-mono",
  subsets: ["latin"],
  weight: ["500", "600"],
});

const SITE_URL = "https://miyear.site";
const DESCRIPTION =
  "معيار توثّق الإيرادات الفعلية لمشروعك عبر شبكة محاسبين مستقلين، لترفع مصداقية عرضك أمام أي شريك ممول محتمل.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "معيار — منصة توثيق المشاريع الباحثة عن شريك ممول",
    // Sub-pages set their own title and inherit the brand suffix, so a shared
    // link reads as "اسم المشروع — معيار" instead of a bare page name.
    template: "%s — معيار",
  },
  description: DESCRIPTION,
  applicationName: "معيار",
  keywords: [
    "معيار",
    "شريك ممول",
    "تمويل المشاريع",
    "امتياز تجاري",
    "فرنشايز",
    "توثيق مالي",
    "محاسب قانوني",
    "السعودية",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: "معيار",
    locale: "ar_SA",
    url: SITE_URL,
    title: "معيار — منصة توثيق المشاريع الباحثة عن شريك ممول",
    description: DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: "معيار — منصة توثيق المشاريع الباحثة عن شريك ممول",
    description: DESCRIPTION,
  },
  icons: { icon: "/icon.svg", apple: "/icon.svg" },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ar"
      dir="rtl"
      className={`${almarai.variable} ${ibmPlexSansArabic.variable} ${ibmPlexMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-paper text-ink">
        {children}
      </body>
    </html>
  );
}
