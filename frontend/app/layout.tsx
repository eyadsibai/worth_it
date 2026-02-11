import type { Metadata } from "next";
import { JetBrains_Mono, Inter, Noto_Sans_Arabic } from "next/font/google";
import "./globals.css";
import { Providers } from "@/lib/providers";
import { Toaster } from "@/components/ui/sonner";
import { ErrorBoundary } from "@/components/error-boundary";
import { getTextDirection, normalizeLocaleTag } from "@/lib/i18n-utils";

// Terminal-style monospace for data and code - the star of the show
const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

// Clean sans for UI elements - refined but not precious
const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const notoSansArabic = Noto_Sans_Arabic({
  variable: "--font-arabic",
  subsets: ["arabic"],
  weight: ["400", "500", "600", "700"],
});

const appLocale = normalizeLocaleTag(process.env.NEXT_PUBLIC_DEFAULT_LOCALE);
const appDirection = getTextDirection(appLocale);

export const metadata: Metadata = {
  title: "Worth It - Job Offer Financial Analyzer",
  description: "Analyze startup job offers with comprehensive financial modeling",
};

// Required for safe-area CSS utilities (env(safe-area-inset-*)) on devices with notches
export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang={appLocale} dir={appDirection} suppressHydrationWarning className="dark">
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} ${notoSansArabic.variable} antialiased`}
      >
        <ErrorBoundary>
          <Providers>{children}</Providers>
        </ErrorBoundary>
        <Toaster position="bottom-right" richColors closeButton />
      </body>
    </html>
  );
}
