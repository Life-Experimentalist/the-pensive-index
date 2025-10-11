import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { ClerkProvider } from '@clerk/nextjs';
import { ThemeProvider } from '@/components/theme/ThemeProvider';
import './globals.css';
import ThemeToggle from '@/components/theme/ThemeToggle';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'The Pensieve Index',
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3003'
  ),
  description:
    'A library-first story discovery platform and intelligent prompt generator for fanfiction',
  icons: {
    icon: '/icon.png',
    shortcut: '/icon.png',
    apple: '/icon.png',
  },
  openGraph: {
    title: 'The Pensieve Index',
    description:
      'A library-first story discovery platform and intelligent prompt generator for fanfiction',
    images: ['/social-banner.png'],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'The Pensieve Index',
    description:
      'A library-first story discovery platform and intelligent prompt generator for fanfiction',
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
        <body className={inter.className} suppressHydrationWarning={true}>
          <ThemeProvider>
            <div className="min-h-screen flex flex-col">
              <header className="w-full border-b border-gray-200 dark:border-gray-700 p-3 flex justify-end">
                <div className="mr-4">
                  <ThemeToggle />
                </div>
              </header>
              <main className="flex-1">{children}</main>
            </div>
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
