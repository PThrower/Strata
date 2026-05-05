import type { Metadata } from "next";
import { Geist, Geist_Mono, Inter } from "next/font/google";
import "./globals.css";
import { SpaceBackdrop } from "@/components/ui/space-backdrop";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Strata — The Trust Layer for AI Agents",
  description:
    "Strata scores 2,179 MCP servers for security and behavioral risk. Trust scores, capability flags, and injection scanning — so your agents know what they're connecting to.",
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    title: "Strata — The Trust Layer for AI Agents",
    description:
      "Strata scores 2,179 MCP servers for security and behavioral risk. Trust scores, capability flags, and injection scanning — so your agents know what they're connecting to.",
    url: "https://usestrata.dev",
    siteName: "Strata",
    type: "website",
    images: [
      {
        url: "https://usestrata.dev/og-image.png",
        width: 1200,
        height: 630,
        alt: "Strata — The Trust Layer for AI Agents",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Strata — The Trust Layer for AI Agents",
    description:
      "Strata scores 2,179 MCP servers for security and behavioral risk. Trust scores, capability flags, and injection scanning — so your agents know what they're connecting to.",
    images: ["https://usestrata.dev/og-image.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <SpaceBackdrop />
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
