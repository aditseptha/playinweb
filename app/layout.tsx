import type { Metadata } from "next";
import { Geist } from "next/font/google";
import Script from "next/script";
import { Analytics } from "@vercel/analytics/next";
import { AuthProvider } from "@/lib/auth";
import { FeaturesProvider } from "@/lib/features";
import { GamesProvider } from "@/lib/store";
import { THEME_BOOT } from "@/lib/theme";
import { umamiEnabled, umamiScriptUrl, umamiWebsiteId } from "@/lib/umami";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  applicationName: "PlayInWeb",
  title: {
    default: "PlayInWeb — indie web games",
    template: "%s · PlayInWeb",
  },
  description:
    "A YouTube-style catalogue of indie web games. Browse by plays, check popularity, and register your own.",
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
