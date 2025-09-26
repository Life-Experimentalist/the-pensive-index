import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { ClerkProvider } from '@clerk/nextjs';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'The Pensieve Index',
  metadataBase: new URL('http://localhost:3000'),
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
    images: ['/social banner.png'],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'The Pensieve Index',
    description:
      'A library-first story discovery platform and intelligent prompt generator for fanfiction',
    images: ['/social banner.png'],
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
    >
      <html lang="en">
        <body className={inter.className} suppressHydrationWarning={true}>
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
