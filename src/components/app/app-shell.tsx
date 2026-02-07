'use client';

import { AppHeader } from '@/components/app/header';
import { useFirebase } from '@/firebase';
import LoadingScreen from '@/components/app/loading-screen';
import { CreateUsernameDialog } from '@/components/app/create-username-dialog';
import { TempDataSeeder } from '@/components/app/temp-data-seeder';
import dynamic from 'next/dynamic';

const LoginPage = dynamic(() => import('@/components/app/login-page').then(mod => mod.LoginPage), {
  loading: () => <LoadingScreen />,
});

const Dashboard = dynamic(() => import('@/components/app/dashboard'), {
  loading: () => <LoadingScreen />,
});

export function AppShell() {
  const { user, isUserLoading, userProfile, isUserProfileLoading } = useFirebase();

  // Initial loading state or auth check in progress
  if (isUserLoading || (user && isUserProfileLoading)) {
    return <LoadingScreen />;
  }

  // Not logged in
  if (!user) {
    return <LoginPage />;
  }

  // Logged in but no username (incomplete profile)
  if (user && userProfile && !userProfile.username) {
    return (
       <div className="flex min-h-screen w-full flex-col bg-background">
        <AppHeader userProfile={userProfile} />
        <CreateUsernameDialog />
       </div>
    )
  }

  // Fully authenticated and onboarded
  if (user && userProfile) {
    return (
      <div className="flex min-h-screen w-full flex-col bg-background">
        <TempDataSeeder />
        <main className="flex-1 pb-20 md:pb-0">
          <Dashboard />
        </main>
      </div>
    );
  }

  // Fallback
  return <LoadingScreen />;
}
