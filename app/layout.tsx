import type { Metadata } from 'next';
// import { Inter } from 'next/font/google';  // Commented out for CI build - requires network access
import { ClerkProvider } from '@clerk/nextjs';
import { ThemeProvider } from '@/components/theme/ThemeProvider';
import './globals.css';

// const inter = Inter({ subsets: ['latin'] });  // Commented out for CI build

export const metadata: Metadata = {
  title: 'The Pensieve Index',
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3003'
  ),
  description:
    'A discovery-focused story discovery platform and intelligent prompt generator for fanfiction',
  icons: {
    icon: '/icon.png',
    shortcut: '/icon.png',
    apple: '/icon.png',
  },
  openGraph: {
    title: 'The Pensieve Index',
    description:
      'A discovery-focused story discovery platform and intelligent prompt generator for fanfiction',
    images: ['/social-banner.png'],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'The Pensieve Index',
    description:
      'A discovery-focused story discovery platform and intelligent prompt generator for fanfiction',
    images: ['/social-banner.png'],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider
      appearance={{
        variables: { colorPrimary: '#6366f1' },
        layout: {
          socialButtonsVariant: 'iconButton',
          logoImageUrl: '/icon.png',
          logoPlacement: 'inside',
        },
      }}
      signInFallbackRedirectUrl="/"
      signUpFallbackRedirectUrl="/"
    >
      <html lang="en" suppressHydrationWarning>
        <head>
          <meta name="theme-color" content="#ffffff" />
          <meta name="color-scheme" content="light dark" />
        </head>
        <body suppressHydrationWarning={true}>
          <ThemeProvider>{children}</ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
