import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { getMetadataBase } from '@/lib/site';
import ZoomGuard from '@/components/ZoomGuard';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const metadataBase = getMetadataBase();

export const metadata: Metadata = {
  metadataBase,
  title: {
    default: 'Lab Studio Members',
    template: '%s | Lab Studio',
  },
  description: 'Members-only training, recovery, nutrition, and coaching dashboard for Lab Studio.',
  applicationName: 'Lab Studio',
  alternates: metadataBase ? { canonical: '/' } : undefined,
  openGraph: {
    title: 'Lab Studio Members',
    description: 'Members-only training, recovery, nutrition, and coaching dashboard for Lab Studio.',
    siteName: 'Lab Studio',
    type: 'website',
    url: metadataBase ? '/' : undefined,
  },
  twitter: {
    card: 'summary',
    title: 'Lab Studio Members',
    description: 'Members-only training, recovery, nutrition, and coaching dashboard for Lab Studio.',
  },
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon.ico',
    apple: '/favicon.ico',
  },
  appleWebApp: {
    capable: true,
    title: 'Lab Studio',
    statusBarStyle: 'black-translucent',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  minimumScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#09090b',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <ZoomGuard />
        {children}
      </body>
    </html>
  );
}
