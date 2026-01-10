import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import Link from 'next/link';
import '../styles/globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Reading Tracker',
  description: 'Track your reading journey',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="min-h-screen bg-background">
          <header className="border-b">
            <div className="container mx-auto px-4 py-4">
              <div className="flex items-center justify-between">
                <Link href="/">
                  <h1 className="text-2xl font-bold text-primary cursor-pointer hover:text-primary/80">
                    Reading Tracker
                  </h1>
                </Link>
                <nav className="flex gap-6">
                  <Link
                    href="/"
                    className="text-sm font-medium hover:text-primary transition-colors"
                  >
                    Dashboard
                  </Link>
                  <Link
                    href="/books"
                    className="text-sm font-medium hover:text-primary transition-colors"
                  >
                    Books
                  </Link>
                  <Link
                    href="/reports"
                    className="text-sm font-medium hover:text-primary transition-colors"
                  >
                    Reports
                  </Link>
                  <Link
                    href="/settings/todoist"
                    className="text-sm font-medium hover:text-primary transition-colors"
                  >
                    Settings
                  </Link>
                </nav>
              </div>
            </div>
          </header>
          <main className="container mx-auto px-4 py-8">{children}</main>
        </div>
      </body>
    </html>
  );
}
