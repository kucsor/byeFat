'use client';

import { useFirebase } from '@/firebase';
import Loading from '@/app/loading';
import { ProfileView } from '@/components/app/profile-view';

export default function ProfilePage() {
  const { user, userProfile, isUserLoading, isUserProfileLoading } = useFirebase();

  if (isUserLoading || (user && isUserProfileLoading)) {
    return <Loading />;
  }

  // If not logged in, the auth provider usually handles redirect,
  // but we can render nothing or loading state here.
  if (!user) {
     return <Loading />;
  }
  
  return <ProfileView />;
}
