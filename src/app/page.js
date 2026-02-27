'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

export default function Home() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // User is signed in, check for profile
        const docRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists() && docSnap.data().onboardingCompleted) {
          router.push('/dashboard');
        } else {
          router.push('/onboarding');
        }
      } else {
        // Not signed in, stay here
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [router]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-pulse text-primary font-bold text-xl">Loading...</div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 text-center bg-[url('/bg-gradient.png')] bg-cover">
      <div className="z-10 max-w-md w-full animate-fade-in">
        <h1 className="text-4xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">
          Pet Anxiety Coach
        </h1>
        <p className="text-lg text-muted-foreground mb-8">
          The world's first AR-powered anxiety relief program for your furry friend.
        </p>

        <div className="flex flex-col gap-4">
          <Link href="/onboarding" className="btn btn-primary w-full">
            Get Started
          </Link>
          <Link href="/login" className="btn btn-outline w-full">
            I already have an account
          </Link>
        </div>
      </div>
    </main>
  );
}
