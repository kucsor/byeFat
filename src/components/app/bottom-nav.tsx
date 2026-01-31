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
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t-2 border-primary/20 bg-card/95 backdrop-blur-md md:hidden rounded-t-2xl shadow-[0_-4px_10px_rgba(0,0,0,0.05)]">
      <div className="container mx-auto flex h-20 max-w-5xl items-center justify-around px-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-1 flex-col items-center justify-center gap-1.5 transition-all duration-300 relative',
                isActive ? 'text-primary' : 'text-muted-foreground hover:text-primary/70'
              )}
            >
              <div className={cn(
                "p-2 rounded-xl transition-all duration-300",
                isActive && "bg-primary/10 shadow-inner scale-110"
              )}>
                <item.icon className={cn("h-6 w-6", isActive && "stroke-[2.5px]")} />
              </div>
              <span className={cn(
                "text-[10px] font-bold uppercase tracking-widest transition-all",
                isActive ? "opacity-100 translate-y-0" : "opacity-60 translate-y-0.5"
              )}>
                {item.label}
              </span>
              {isActive && (
                <div className="absolute -top-2 w-1 h-1 bg-primary rounded-full" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
