'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutGrid, Calendar as CalendarIcon, Plus, Utensils, User } from 'lucide-react';
import { cn } from '@/lib/utils';

export function BottomNav() {
  const pathname = usePathname();

  // Helper to check active state
  const isActive = (path: string) => pathname === path;

  return (
    <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-[360px]">
      <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-full px-6 py-4 shadow-2xl flex justify-between items-center border border-white/40 dark:border-white/10">

        {/* Dashboard */}
        <Link href="/" className="flex flex-col items-center gap-1 group w-12 relative">
            <LayoutGrid
                className={cn(
                    "h-[26px] w-[26px] transition-all duration-300 group-hover:scale-110",
                    isActive('/') ? "text-[#2b8cee]" : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                )}
                strokeWidth={isActive('/') ? 2.5 : 2}
            />
            {isActive('/') && <span className="w-1 h-1 bg-[#2b8cee] rounded-full absolute -bottom-1" />}
        </Link>

        {/* Diary */}
        <Link href="/diary" className="flex flex-col items-center gap-1 group w-12 relative">
            <CalendarIcon
                className={cn(
                    "h-[26px] w-[26px] transition-all duration-300 group-hover:scale-110",
                    isActive('/diary') ? "text-[#2b8cee]" : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                )}
                strokeWidth={isActive('/diary') ? 2.5 : 2}
            />
            {isActive('/diary') && <span className="w-1 h-1 bg-[#2b8cee] rounded-full absolute -bottom-1" />}
        </Link>

        {/* Floating Action Button (Center) */}
        <div className="relative -top-8 group cursor-pointer">
            <div className="absolute inset-0 bg-[#2b8cee] blur-lg opacity-40 group-hover:opacity-60 transition-opacity rounded-full"></div>
            <button
                onClick={() => {
                   window.dispatchEvent(new CustomEvent('open-add-menu'));
                }}
                className="relative bg-gradient-to-br from-[#2b8cee] to-blue-600 text-white w-14 h-14 rounded-full flex items-center justify-center shadow-lg transform group-hover:scale-105 transition-all duration-300 border-4 border-white dark:border-slate-900"
            >
                <Plus className="h-8 w-8" />
            </button>
        </div>

        {/* Recipes / Products */}
        <Link href="/products" className="flex flex-col items-center gap-1 group w-12 relative">
            <Utensils
                className={cn(
                    "h-[26px] w-[26px] transition-all duration-300 group-hover:scale-110",
                    isActive('/products') ? "text-[#2b8cee]" : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                )}
                strokeWidth={isActive('/products') ? 2.5 : 2}
            />
             {isActive('/products') && <span className="w-1 h-1 bg-[#2b8cee] rounded-full absolute -bottom-1" />}
        </Link>

        {/* Profile */}
        <Link href="/profile" className="flex flex-col items-center gap-1 group w-12 relative">
            <User
                className={cn(
                    "h-[26px] w-[26px] transition-all duration-300 group-hover:scale-110",
                    isActive('/profile') ? "text-[#2b8cee]" : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                )}
                strokeWidth={isActive('/profile') ? 2.5 : 2}
            />
             {isActive('/profile') && <span className="w-1 h-1 bg-[#2b8cee] rounded-full absolute -bottom-1" />}
        </Link>

      </div>
    </nav>
  );
}
