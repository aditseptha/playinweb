import type { Metadata } from "next";
import { Geist } from "next/font/google";
import Script from "next/script";
import { Suspense } from "react";
import { Analytics } from "@vercel/analytics/next";
import { NavProgress } from "@/components/NavProgress";
import { AuthProvider } from "@/lib/auth";
import { FeaturesProvider } from "@/lib/features";
import { GamesProvider } from "@/lib/store";
import { apexOrigin } from "@/lib/host";
import { THEME_BOOT } from "@/lib/theme";
import { umamiEnabled, umamiScriptUrl, umamiWebsiteId } from "@/lib/umami";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const siteTitle = "Play right in your browser";
const siteDescription = "Story and adventure games from indie creators. Nothing to install.";

export const metadata: Metadata = {
  // Makes Open Graph image URLs absolute (link previews need a full URL).
  metadataBase: new URL(apexOrigin()),
  applicationName: "PlayInWeb",
  title: {
    default: "PlayInWeb — play right in your browser",
    template: "%s · PlayInWeb",
  },
  description: siteDescription,
  openGraph: {
    type: "website",
    siteName: "PlayInWeb",
    title: siteTitle,
    description: siteDescription,
  },
  twitter: {
    card: "summary_large_image",
    title: siteTitle,
    description: siteDescription,
  },
};

function supabaseOrigin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) return "";
  try {
    return new URL(url).origin;
  } catch {
    return "";
  }
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  const mediaOrigin = supabaseOrigin();

  return (
    <html lang="en" className={`dark ${geistSans.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT }} />
        {mediaOrigin ? (
          <>
            <link rel="preconnect" href={mediaOrigin} crossOrigin="anonymous" />
            <link rel="dns-prefetch" href={mediaOrigin} />
          </>
        ) : null}
        {umamiEnabled() ? (
          <Script
            defer
            src={umamiScriptUrl()}
            data-website-id={umamiWebsiteId()}
            strategy="afterInteractive"
          />
        ) : null}
      </head>
      <body className="min-h-full bg-bg font-sans text-text">
        <Suspense fallback={null}>
          <NavProgress />
        </Suspense>
        <GamesProvider>
          <AuthProvider>
            <FeaturesProvider>{children}</FeaturesProvider>
          </AuthProvider>
        </GamesProvider>
        <Analytics />
      </body>
    </html>
  );
}
