
'use client';

import { AppHeader } from '@/components/app/header';
import { useFirebase } from '@/firebase';
import Loading from '@/app/loading';
import { CalorieCalculator } from '@/components/app/calorie-calculator';
import { BottomNav } from '@/components/app/bottom-nav';

export default function ProfilePage() {
  const { user, userProfile, isUserLoading, isUserProfileLoading } = useFirebase();

  if (isUserLoading || (user && isUserProfileLoading)) {
    return <Loading />;
  }

  if (!user || !userProfile) {
    // This should ideally redirect to login, but for now, we show loading.
    // The main page handles the redirect logic.
    return <Loading />;
  }
  
  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <AppHeader />
      <main className="container mx-auto max-w-2xl flex-1 p-4 pb-20 md:p-8 md:pb-8">
        <CalorieCalculator userProfile={userProfile} />
      </main>
      <BottomNav />
    </div>
  );
}
