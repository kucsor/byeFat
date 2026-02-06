'use client';

import { AppHeader } from '@/components/app/header';
import { useFirebase } from '@/firebase';
import Loading from './loading';
import { CreateUsernameDialog } from '@/components/app/create-username-dialog';
import { TempDataSeeder } from '@/components/app/temp-data-seeder';
import dynamic from 'next/dynamic';

const LoginPage = dynamic(() => import('@/components/app/login-page').then(mod => mod.LoginPage), {
  loading: () => <Loading />,
});

const Dashboard = dynamic(() => import('@/components/app/dashboard'), {
  loading: () => <Loading />,
});

export default function Home() {
  const { user, isUserLoading, userProfile, isUserProfileLoading } = useFirebase();

  if (isUserLoading || (user && isUserProfileLoading)) {
    return <Loading />;
  }

  if (!user) {
    return <LoginPage />;
  }

  // If the user is logged in, but their profile is loaded and has no username,
  // force them to create one.
  if (user && userProfile && !userProfile.username) {
    return (
       <div className="flex min-h-screen w-full flex-col bg-background">
        <AppHeader />
        <CreateUsernameDialog />
       </div>
    )
  }
  
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

  // Fallback, should not be reached often
  return <Loading />;
}
