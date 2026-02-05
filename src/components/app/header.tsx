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
        <Button variant="ghost" className="relative h-10 w-10 rounded-full border border-slate-200">
          <Avatar className="h-10 w-10">
            <AvatarImage src={user.photoURL ?? ''} alt={user.displayName ?? 'User'} />
            <AvatarFallback className="bg-slate-100 text-slate-700 font-bold">{getInitials(user.displayName)}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{user.displayName}</p>
            {userProfile?.username && (
                 <p className="text-xs leading-none text-muted-foreground">@{userProfile.username}</p>
            )}
            <p className="text-xs leading-none text-muted-foreground pt-1">{user.email}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
            <Link href="/profile">
                <UserIcon className="mr-2 h-4 w-4" />
                <span>Profile</span>
            </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
            <Link href="/progress">
                <LineChart className="mr-2 h-4 w-4" />
                <span>Progress</span>
            </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut}>
          <LogOut className="mr-2 h-4 w-4" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function AppHeader({ userProfile }: { userProfile?: UserProfile | null }) {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/90 backdrop-blur-md">
      <div className="container mx-auto flex h-20 max-w-5xl items-center px-4 justify-between">
        <Link href="/" className='flex items-center gap-3 group'>
            <div className="relative w-10 h-10 transition-transform duration-500 group-hover:rotate-12">
               <Image src="/logo-green.svg" alt="byeFat Logo" fill className="object-contain" />
            </div>
            {userProfile ? (
                <div className="hidden sm:block">
                    <h1 className="text-lg font-black text-slate-900 leading-none">
                        {userProfile.name || 'Hello!'}
                    </h1>
                    <span className="text-xs font-bold text-green-600 uppercase tracking-wide">Let's crush today's goals.</span>
                </div>
            ) : (
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">byeFat</h1>
            )}
        </Link>

        {/* Mobile: Name shown only if space permits or hidden */}
        {userProfile && (
             <div className="sm:hidden text-right mr-3">
                <span className="text-xs font-bold text-green-600 uppercase tracking-wide block">Goals</span>
             </div>
        )}

        <div className="flex items-center gap-2">
          <UserNav />
        </div>
      </div>
    </header>
  );
}
