'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore'

// IMPORTANT: DO NOT MODIFY THIS FUNCTION
export function initializeFirebase() {
  if (!getApps().length) {
    const isMockAuth = process.env.NEXT_PUBLIC_MOCK_AUTH === 'true';
    const hasConfig = !!firebaseConfig.apiKey && firebaseConfig.apiKey !== '' && firebaseConfig.apiKey !== 'dummy';

    if (isMockAuth || !hasConfig) {
        console.log('Using Mock Auth / Fallback - Initializing Dummy Firebase App due to missing config or explicit mock mode.');
        const mockConfig = {
            apiKey: "dummy-api-key",
            authDomain: "dummy-auth-domain",
            projectId: "dummy-project-id",
            storageBucket: "dummy-storage-bucket",
            messagingSenderId: "dummy-sender-id",
            appId: "dummy-app-id"
        };
        // Explicitly set MOCK_AUTH for downstream components if it wasn't already
        // This is a hack because process.env is read-only usually, but helps internal logic
        if (!isMockAuth && typeof window !== 'undefined') {
             (window as any).__MOCK_AUTH__ = true;
        }

        const firebaseApp = initializeApp(mockConfig);
        return getSdks(firebaseApp);
    }

    // Important! initializeApp() is called without any arguments because Firebase App Hosting
    // integrates with the initializeApp() function to provide the environment variables needed to
    // populate the FirebaseOptions in production. It is critical that we attempt to call initializeApp()
    // without arguments.
    let firebaseApp;
    try {
      // Attempt to initialize via Firebase App Hosting environment variables
      firebaseApp = initializeApp();
    } catch (e) {
      // Only warn in production because it's normal to use the firebaseConfig to initialize
      // during development
      if (process.env.NODE_ENV === "production") {
        console.warn('Automatic initialization failed. Falling back to firebase config object.', e);
      }

      // Ensure firebaseConfig has at least one key to avoid 'app/no-options'
      const config = firebaseConfig.apiKey ? firebaseConfig : {
          apiKey: "fallback-api-key",
          authDomain: "fallback-auth-domain",
          projectId: "fallback-project-id"
      };

      firebaseApp = initializeApp(config);
    }

    return getSdks(firebaseApp);
  }

  // If already initialized, return the SDKs with the already initialized App
  return getSdks(getApp());
}

export function getSdks(firebaseApp: FirebaseApp) {
  return {
    firebaseApp,
    auth: getAuth(firebaseApp),
    firestore: getFirestore(firebaseApp)
  };
}

export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './non-blocking-updates';
export * from './non-blocking-login';
export * from './errors';
export * from './error-emitter';
