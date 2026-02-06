'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, LineChart, User, PackageSearch } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/', label: 'Dashboard', icon: Home },
  { href: '/products', label: 'Products', icon: PackageSearch },
  { href: '/progress', label: 'Progress', icon: LineChart },
  { href: '/profile', label: 'Profile', icon: User },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-[20px] border-t border-gray-200 md:hidden pb-safe">
      <div className="container mx-auto flex h-16 items-center justify-around px-4">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-1 flex-col items-center justify-center gap-1 transition-colors relative h-full',
                isActive ? 'text-primary' : 'text-gray-400 hover:text-gray-600'
              )}
            >
              {isActive && (
                  <span className="absolute top-2 w-1 h-1 rounded-full bg-primary animate-in fade-in zoom-in duration-200" />
              )}

              <item.icon
                className={cn(
                    "h-6 w-6 transition-all duration-200",
                    isActive && "fill-current"
                )}
                strokeWidth={1.5}
              />

              <span className={cn(
                "text-[10px] font-medium transition-all duration-200",
                isActive ? "font-bold text-primary" : "font-normal"
              )}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
