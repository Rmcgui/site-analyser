import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { SiteHeader, SiteFooter } from '@/components/SiteHeader';

// Self-host Inter via next/font — no CSS @import, no layout shift.
// The `variable` exposes it as the CSS custom property --font-inter,
// which globals.css points --font-sans at.
const inter = Inter({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'SiteAnalyser — Web Design by Ryan',
  description:
    'Audit any website for performance, accessibility, SEO and Core Web Vitals, with a plain-English AI summary.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.variable} antialiased`}>
        <SiteHeader />
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}