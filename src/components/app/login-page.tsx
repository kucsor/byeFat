'use client';

import { Leaf } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useFirebase } from '@/firebase';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';

export function LoginPage() {
  const { auth } = useFirebase();

  const handleGoogleSignIn = () => {
    const provider = new GoogleAuthProvider();
    signInWithPopup(auth, provider)
      .catch((error) => {
        // Log errors to the console for easier debugging
        console.error("Google Sign-In Error:", error);
        // This is particularly useful for diagnosing a disabled provider.
        if (error.code === 'auth/operation-not-allowed') {
          alert("Sign-in with Google is not enabled. Please enable it in the Firebase console's Authentication > Sign-in method tab.");
        }
      });
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="mx-auto flex w-full max-w-sm flex-col items-center justify-center space-y-6">
        <div className="flex items-center gap-2">
          <Leaf className="h-12 w-12 text-primary" />
          <h1 className="text-4xl font-bold">byeFat</h1>
        </div>
        <p className="text-center text-muted-foreground">
          Track your calories, simplify your life.
        </p>
        <div className="w-full space-y-4">
          <Button onClick={handleGoogleSignIn} className="w-full" size="lg">
            <svg className="mr-2 h-4 w-4" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512">
              <path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 126 23.4 172.9 61.9l-76.2 76.2C322.3 103.5 287.4 88 248 88c-86.5 0-157.2 70.2-157.2 156.8s70.7 156.8 157.2 156.8c99.3 0 133-66.8 138-101.4H248v-95h236.3c4.7 25.8 7.4 55.8 7.7 87.8z"></path>
            </svg>
            Sign in with Google
          </Button>
        </div>
        <p className="px-8 text-center text-sm text-muted-foreground">
          By continuing, you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
}
