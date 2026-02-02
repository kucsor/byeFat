'use client';

import { Leaf } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useFirebase } from '@/firebase';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { motion } from 'framer-motion';

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
        <div className="flex flex-col items-center gap-4">
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
            className="p-6 rounded-[2.5rem] bg-primary/20 shadow-xl border-4 border-white"
          >
            <Leaf className="h-20 w-20 text-primary-foreground" />
          </motion.div>
          <motion.h1
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-7xl font-black text-primary-foreground tracking-tighter drop-shadow-sm"
          >
            byeFat
          </motion.h1>
        </div>
        <p className="text-center text-muted-foreground">
          Track your calories, simplify your life.
        </p>
        <div className="w-full space-y-4">
          <Button onClick={handleGoogleSignIn} className="w-full h-16 rounded-full text-lg font-bold bouncy-hover" size="lg">
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
