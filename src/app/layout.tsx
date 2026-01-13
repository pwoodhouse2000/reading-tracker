import type { Metadata } from 'next';
import Link from 'next/link';
import '../styles/globals.css';
import { BookOpen } from 'lucide-react';
import { AuthProvider } from '@/components/auth/auth-provider';
import { HeaderNav } from '@/components/layout/header-nav';

export const metadata: Metadata = {
  title: "Pete's Reading Tracker",
  description: 'Track your reading journey',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          {/* Decorative background */}
          <div className="fixed inset-0 -z-10">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-50 via-orange-50/50 to-rose-50" />
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-orange-200/30 rounded-full blur-3xl" />
            <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-amber-200/30 rounded-full blur-3xl" />
            <div className="absolute inset-0 bg-noise opacity-[0.015]" />
          </div>

          <div className="min-h-screen">
            {/* Header */}
            <header className="sticky top-0 z-50 border-b border-white/20 bg-white/70 backdrop-blur-xl">
              <div className="container mx-auto px-6 py-4">
                <div className="flex items-center justify-between">
                  <Link href="/" className="flex items-center gap-3 group">
                    <div className="relative">
                      <div className="absolute inset-0 bg-gradient-to-br from-primary to-accent rounded-xl blur opacity-50 group-hover:opacity-75 transition-opacity" />
                      <div className="relative bg-gradient-to-br from-primary to-accent p-2.5 rounded-xl text-white shadow-lg">
                        <BookOpen className="h-5 w-5" />
                      </div>
                    </div>
                    <div>
                      <h1 className="text-xl font-bold text-foreground group-hover:text-primary transition-colors">
                        Pete&apos;s Reading Tracker
                      </h1>
                      <p className="text-xs text-muted-foreground -mt-0.5">Personal library</p>
                    </div>
                  </Link>

                  <HeaderNav />
                </div>
              </div>
            </header>

            {/* Main content */}
            <main className="container mx-auto px-6 py-8">
              {children}
            </main>

            {/* Footer */}
            <footer className="border-t border-white/20 bg-white/30 backdrop-blur-sm mt-auto">
              <div className="container mx-auto px-6 py-6">
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <p>© {new Date().getFullYear()} Pete&apos;s Reading Tracker</p>
                  <p className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4" />
                    <span>Track your reading journey</span>
                  </p>
                </div>
              </div>
            </footer>
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
