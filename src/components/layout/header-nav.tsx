'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/components/auth/auth-provider';
import { Button } from '@/components/ui/button';
import { BookOpen, BarChart3, Settings, Home, Library, LogIn, LogOut, Lock } from 'lucide-react';

const publicNavItems = [
  { href: '/', label: 'Dashboard', icon: Home },
  { href: '/books', label: 'Library', icon: Library },
  { href: '/reports', label: 'Reports', icon: BarChart3 },
];

const adminNavItems = [
  { href: '/settings', label: 'Settings', icon: Settings },
];

export function HeaderNav() {
  const { isAuthenticated, isLoading, logout } = useAuth();
  const pathname = usePathname();

  const handleLogout = async () => {
    await logout();
    window.location.href = '/';
  };

  return (
    <nav className="flex items-center gap-1">
      {publicNavItems.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href || 
          (item.href !== '/' && pathname.startsWith(item.href));
        
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl transition-all ${
              isActive 
                ? 'text-primary bg-white/70 shadow-sm' 
                : 'text-muted-foreground hover:text-foreground hover:bg-white/50'
            }`}
          >
            <Icon className="h-4 w-4" />
            <span className="hidden sm:inline">{item.label}</span>
          </Link>
        );
      })}

      {/* Admin-only nav items */}
      {isAuthenticated && adminNavItems.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href || pathname.startsWith(item.href);
        
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl transition-all ${
              isActive 
                ? 'text-primary bg-white/70 shadow-sm' 
                : 'text-muted-foreground hover:text-foreground hover:bg-white/50'
            }`}
          >
            <Icon className="h-4 w-4" />
            <span className="hidden sm:inline">{item.label}</span>
          </Link>
        );
      })}

      {/* Separator */}
      <div className="h-6 w-px bg-gray-200 mx-2 hidden sm:block" />

      {/* Auth button */}
      {!isLoading && (
        isAuthenticated ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Sign Out</span>
          </Button>
        ) : (
          <Link href="/login">
            <Button
              variant="ghost"
              size="sm"
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
            >
              <Lock className="h-4 w-4" />
              <span className="hidden sm:inline">Admin</span>
            </Button>
          </Link>
        )
      )}
    </nav>
  );
}
