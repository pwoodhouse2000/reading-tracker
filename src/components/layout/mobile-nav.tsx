'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/components/auth/auth-provider';
import { BarChart3, Settings, Home, Library, Quote, Sparkles } from 'lucide-react';

const navItems = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/books', label: 'Library', icon: Library },
  { href: '/discover', label: 'Discover', icon: Sparkles },
  { href: '/notes', label: 'Notes', icon: Quote },
  { href: '/reports', label: 'Reports', icon: BarChart3 },
];

const adminItem = { href: '/settings', label: 'Settings', icon: Settings };

/**
 * Fixed bottom tab bar shown only on mobile (md:hidden). The desktop top nav
 * is hidden at the same breakpoint, so exactly one navigation surface is
 * visible at any width.
 */
export function MobileNav() {
  const { isAuthenticated } = useAuth();
  const pathname = usePathname();

  const items = isAuthenticated ? [...navItems, adminItem] : navItems;

  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-50 border-t border-border bg-card/95 backdrop-blur-xl pb-[env(safe-area-inset-bottom)]"
      aria-label="Primary"
    >
      <div className="flex items-stretch justify-around">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href ||
            (item.href !== '/' && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-1 flex-col items-center gap-1 py-2 text-[10px] font-medium transition-colors ${
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className="h-5 w-5" />
              <span className="leading-none">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
