import type { Metadata } from 'next';
import './globals.css';
import Navbar from '@/components/Navbar';
import { inter } from '@/lib/fonts';

export const metadata: Metadata = {
  title: 'Pricewise',
  description:
    'Track product prices effortlessly and save money on your online shopping.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <main className="mx-auto max-w-10xl">
          <Navbar />
          {children}
          <footer className="py-4 text-center text-sm text-gray-500">
            <p>
              &copy; {new Date().getFullYear()} Pricewise. All rights reserved.
              <br />
              <span className="text-xs">
                App Version: {process.env.NEXT_PUBLIC_VERSION}
              </span>
            </p>
          </footer>
        </main>
      </body>
    </html>
  );
}
