import type { Metadata } from "next";
import { Almarai, IBM_Plex_Sans_Arabic, IBM_Plex_Mono, Alexandria, JetBrains_Mono } from "next/font/google";
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

// Admin control panel only — matches the mobile app's current identity
// (display headings in Alexandria, numeric/mono in JetBrains Mono). See
// .admin-shell in globals.css.
const alexandria = Alexandria({
  variable: "--font-alexandria",
  subsets: ["arabic", "latin"],
  weight: ["600", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["500", "700"],
});

const SITE_URL = "https://miyear.site";
const TITLE = "سمو — تأجير سيارات بسعر واضح شامل الضريبة";
const DESCRIPTION =
  "استأجر سيارتك من أقرب فرع بسعر شامل الضريبة وبلا رسوم مفاجئة عند الاستلام — وكلما طالت المدة انخفض سعر اليوم.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: TITLE,
    // Sub-pages set their own title and inherit the brand suffix, so a shared
    // link reads as "اسم الصفحة — سمو" instead of a bare page name.
    template: "%s — سمو",
  },
  description: DESCRIPTION,
  applicationName: "سمو",
  keywords: [
    "سمو",
    "تأجير سيارات",
    "إيجار سيارة",
    "تأجير سيارات يومي",
    "تأجير سيارات شهري",
    "حجز سيارة",
    "السعودية",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: "سمو",
    locale: "ar_SA",
    url: SITE_URL,
    title: TITLE,
    description: DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
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
      className={`${almarai.variable} ${ibmPlexSansArabic.variable} ${ibmPlexMono.variable} ${alexandria.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-paper text-ink">
        {children}
      </body>
    </html>
  );
}
