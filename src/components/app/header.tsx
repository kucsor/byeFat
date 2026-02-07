'use client';

import { User as UserIcon, LogOut } from 'lucide-react';
import { useFirebase } from '@/firebase';
import { Button } from '../ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import Link from 'next/link';
import Image from 'next/image';
import type { UserProfile } from '@/lib/types';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { getAuth, signOut } from 'firebase/auth';

function UserNav({ userProfile }: { userProfile?: UserProfile | null }) {
    const { user } = useFirebase();

    if (!user) return null;

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
                 <Button variant="ghost" className="relative h-9 w-9 rounded-full overflow-hidden border border-border hover:opacity-80 transition-opacity">
                    <Avatar className="h-9 w-9">
                        <AvatarImage src={user.photoURL ?? ''} alt={user.displayName ?? 'User'} />
                        <AvatarFallback className="bg-primary text-primary-foreground font-bold text-xs">{getInitials(user.displayName)}</AvatarFallback>
                    </Avatar>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">{user.displayName}</p>
                        <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                    </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                    <Link href="/profile" className="cursor-pointer">
                        <UserIcon className="mr-2 h-4 w-4" />
                        <span>Profile</span>
                    </Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive cursor-pointer">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}

export function AppHeader({ userProfile }: { userProfile?: UserProfile | null }) {
  return (
    <header className="sticky top-0 z-40 w-full bg-card/80 backdrop-blur-md border-b border-border/50">
      <div className="container mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
        {/* Logo Section */}
        <Link href="/" className="flex items-center gap-3 transition-opacity hover:opacity-80">
            <div className="relative h-8 w-8">
               <Image
                 src="/app-icon.svg"
                 alt="Logo"
                 fill
                 className="object-contain"
                 priority
                 sizes="32px"
               />
            </div>
            <span className="font-sans font-semibold text-xl tracking-tight text-foreground">
                byeFat
            </span>
        </Link>

        {/* Right Section */}
        <div className="flex items-center gap-3">
            <UserNav userProfile={userProfile} />
        </div>
      </div>
    </header>
  );
}
