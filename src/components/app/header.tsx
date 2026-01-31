'use client';

import { Leaf, LogOut, User as UserIcon, LineChart, Sun, Moon } from 'lucide-react';
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
import { useTheme } from 'next-themes';

function ThemeToggle() {
    const { setTheme, theme } = useTheme()

    return (
        <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
        >
            <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Toggle theme</span>
        </Button>
    )
}

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
        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
          <Avatar className="h-9 w-9">
            <AvatarImage src={user.photoURL ?? ''} alt={user.displayName ?? 'User'} />
            <AvatarFallback>{getInitials(user.displayName)}</AvatarFallback>
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

export function AppHeader() {
  return (
    <header className="sticky top-0 z-40 w-full border-b bg-card shadow-sm">
      <div className="container mx-auto flex h-16 max-w-5xl items-center px-4">
        <Link href="/" className='flex items-center'>
            <Leaf className="h-6 w-6 text-primary" />
            <h1 className="ml-2 text-2xl font-bold text-foreground font-headline">
            byeFat
            </h1>
        </Link>
        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
          <UserNav />
        </div>
      </div>
    </header>
  );
}
