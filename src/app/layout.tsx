import type { Metadata, Viewport } from 'next';
import Link from 'next/link';
import '../styles/globals.css';
import { BookOpen } from 'lucide-react';
import { AuthProvider } from '@/components/auth/auth-provider';
import { ThemeProvider } from '@/components/theme/theme-provider';
import { HeaderNav } from '@/components/layout/header-nav';
import { MobileNav } from '@/components/layout/mobile-nav';
import { InstallPrompt } from '@/components/pwa/install-prompt';
import { ReadingChat } from '@/components/ai/reading-chat';

export const metadata: Metadata = {
  title: "Pete's Reading Tracker",
  description: 'Track your reading progress, set goals, and share what you\'re reading',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: "Pete's Reading",
  },
  icons: {
    icon: '/icons/icon.svg',
    apple: '/icons/icon.svg',
  },
};

export const viewport: Viewport = {
  themeColor: '#8b5cf6',
  width: 'device-width',
  initialScale: 1,
  // Allow pinch-zoom so content is never permanently cut off on small screens.
  maximumScale: 5,
  userScalable: true,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className="h-full">
      <body className="h-full bg-background text-foreground">
        <ThemeProvider>
          <AuthProvider>
            {/* Decorative background - light mode */}
            <div className="fixed inset-0 -z-10 dark:hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-amber-50 via-orange-50/50 to-rose-50" />
              <div className="absolute top-0 left-1/4 w-96 h-96 bg-orange-200/30 rounded-full blur-3xl" />
              <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-amber-200/30 rounded-full blur-3xl" />
              <div className="absolute inset-0 bg-noise opacity-[0.015]" />
            </div>

            {/* Decorative background - dark mode */}
            <div className="fixed inset-0 -z-10 hidden dark:block">
              <div className="absolute inset-0 bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950" />
              <div className="absolute top-0 left-1/4 w-96 h-96 bg-orange-900/20 rounded-full blur-3xl" />
              <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-amber-900/20 rounded-full blur-3xl" />
              <div className="absolute inset-0 bg-noise opacity-[0.03]" />
            </div>

            <div className="relative min-h-screen flex flex-col">
              {/* Header */}
              <header className="sticky top-0 z-50 border-b border-border bg-card/80 backdrop-blur-xl">
                <div className="container mx-auto px-4 sm:px-6 py-4">
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

              {/* Main content. Extra bottom padding on mobile clears the
                  fixed bottom navigation bar. */}
              <main className="flex-1 container mx-auto px-4 sm:px-6 py-8 pb-24 md:pb-8">
                {children}
              </main>

              {/* Footer */}
              <footer className="border-t border-border bg-card/50 backdrop-blur-sm">
                <div className="container mx-auto px-4 sm:px-6 py-6">
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <p>© {new Date().getFullYear()} Pete&apos;s Reading Tracker</p>
                    <p className="flex items-center gap-2">
                      <BookOpen className="h-4 w-4" />
                      <span>Track your reading journey</span>
                    </p>
                  </div>
                </div>
              </footer>

              {/* Bottom navigation (mobile only) */}
              <MobileNav />

              {/* PWA Install Prompt */}
              <InstallPrompt />

              {/* AI Chat Widget */}
              <ReadingChat />
            </div>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
