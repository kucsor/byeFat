'use client';

import { LogOut, User as UserIcon, LineChart } from 'lucide-react';
import { useFirebase } from '@/firebase';
import { Button } from '../ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { getAuth, signOut } from 'firebase/auth';
import Link from 'next/link';
import Image from 'next/image';
import type { UserProfile } from '@/lib/types';

function UserNav() {
  const { user, userProfile } = useFirebase();

  if (!user) {
    return null;
  }

  const handleSignOut = () => {
    const auth = getAuth();
    signOut(auth);
  };

  const getInitials = (name?: string | null) => {
    if (!name) return 'U';
    const names = name.split(' ');
    if (names.length > 1) {
      return `${names[0][0]}${names[names.length - 1][0]}`;
    }
    return name.substring(0, 2);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-10 w-10 rounded-full border border-white/30 shadow-sm hover:bg-white/20">
          <Avatar className="h-10 w-10">
            <AvatarImage src={user.photoURL ?? ''} alt={user.displayName ?? 'User'} />
            <AvatarFallback className="bg-primary/10 text-primary font-black backdrop-blur-md">{getInitials(user.displayName)}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56 glass-card border-white/20" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-black leading-none text-foreground">{user.displayName}</p>
            {userProfile?.username && (
                 <p className="text-xs leading-none text-muted-foreground font-bold">@{userProfile.username}</p>
            )}
            <p className="text-xs leading-none text-muted-foreground pt-1 opacity-70">{user.email}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-white/20" />
        <DropdownMenuItem asChild className="focus:bg-white/20 focus:text-primary font-bold cursor-pointer">
            <Link href="/profile">
                <UserIcon className="mr-2 h-4 w-4" />
                <span>Profile</span>
            </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild className="focus:bg-white/20 focus:text-primary font-bold cursor-pointer">
            <Link href="/progress">
                <LineChart className="mr-2 h-4 w-4" />
                <span>Progress</span>
            </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator className="bg-white/20" />
        <DropdownMenuItem onClick={handleSignOut} className="focus:bg-rose-500/20 focus:text-rose-600 font-bold cursor-pointer text-rose-500">
          <LogOut className="mr-2 h-4 w-4" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function AppHeader({ userProfile }: { userProfile?: UserProfile | null }) {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/20 bg-white/60 backdrop-blur-xl shadow-sm">
      <div className="container mx-auto flex h-16 max-w-5xl items-center px-4 justify-between">
        <Link href="/" className='flex items-center gap-2 group'>
            {/* Logo Icon */}
            <div className="relative w-8 h-8 transition-transform duration-500 group-hover:rotate-12 drop-shadow-md">
               <Image src="/app-icon.svg" alt="byeFat Logo" fill className="object-contain" priority />
            </div>

            {/* Brand Name - Always Visible */}
            <div className="flex flex-col justify-center">
                <h1 className="text-xl font-black text-foreground tracking-tight leading-none drop-shadow-sm">byeFat</h1>
                {/* Desktop Slogan */}
                {userProfile ? (
                    <span className="hidden sm:block text-[0.65rem] font-black text-emerald-500 uppercase tracking-wider leading-none mt-0.5">
                        Let's crush it, {userProfile.name?.split(' ')[0] || 'Friend'}
                    </span>
                ) : (
                     <span className="hidden sm:block text-[0.65rem] font-black text-muted-foreground uppercase tracking-wider leading-none mt-0.5">
                        Deficit Tracker
                    </span>
                )}
            </div>
        </Link>

        <div className="flex items-center gap-2">
          <UserNav />
        </div>
      </div>
    </header>
  );
}
