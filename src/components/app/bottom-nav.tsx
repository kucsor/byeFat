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
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/20 bg-white/70 backdrop-blur-xl md:hidden rounded-t-3xl shadow-[0_-8px_30px_rgba(0,0,0,0.05)] pb-safe">
      <div className="container mx-auto flex h-20 max-w-5xl items-center justify-around px-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-1 flex-col items-center justify-center gap-1.5 transition-all duration-300 relative group',
                isActive ? 'text-primary' : 'text-muted-foreground hover:text-primary/70'
              )}
            >
              <div className={cn(
                "p-2.5 rounded-2xl transition-all duration-300",
                isActive ? "bg-primary text-white shadow-lg shadow-primary/30 -translate-y-2 scale-110" : "group-hover:bg-white/50"
              )}>
                <item.icon className={cn("h-5 w-5", isActive && "stroke-[3px]")} />
              </div>
              <span className={cn(
                "text-[9px] font-black uppercase tracking-widest transition-all absolute -bottom-1",
                isActive ? "opacity-100 translate-y-0 text-primary" : "opacity-0 translate-y-2"
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
