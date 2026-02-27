'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth, googleProvider, appleProvider } from '@/lib/firebase';
import { signInWithPopup, signInWithRedirect, getRedirectResult, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged } from 'firebase/auth';
import { Mail, Lock, Apple } from 'lucide-react';

export default function Login() {
    const router = useRouter();
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    // Handle Auth State
    useEffect(() => {
        // Check for redirect result
        getRedirectResult(auth).then((result) => {
            if (result) {
                router.push('/dashboard');
            }
        }).catch((error) => {
            setError(error.message);
        });

        // Auth state listener
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user) {
                router.push('/dashboard');
            }
        });

        return () => unsubscribe();
    }, [router]);

    const isMobile = () => {
        if (typeof window !== 'undefined') {
            return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        }
        return false;
    };

    const handleGoogleLogin = async () => {
        setLoading(true);
        setError('');
        try {
            // Use signInWithPopup (signInWithRedirect is broken on iOS Safari due to ITP)
            const result = await signInWithPopup(auth, googleProvider);
            router.push('/dashboard');
        } catch (err) {
            setError(`Authentication failed: ${err.message}`);
            setLoading(false);
        }
    };

    const handleAppleLogin = async () => {
        setLoading(true);
        setError('');
        try {
            if (isMobile()) {
                await signInWithRedirect(auth, appleProvider);
            } else {
                await signInWithPopup(auth, appleProvider);
                router.push('/dashboard');
            }
        } catch (err) {
            setError(err.message);
            setLoading(false);
        }
    };

    const handleEmailAuth = async (e) => {
        e.preventDefault();
        setError('');

        // Validation
        if (!email || !/\S+@\S+\.\S+/.test(email)) {
            setError('Please enter a valid email address.');
            return;
        }
        if (password.length < 6) {
            setError('Password must be at least 6 characters.');
            return;
        }

        setLoading(true);
        try {
            if (isLogin) {
                await signInWithEmailAndPassword(auth, email, password);
            } else {
                await createUserWithEmailAndPassword(auth, email, password);
            }
            router.push('/dashboard');
        } catch (err) {
            console.error(err);
            if (err.code === 'auth/invalid-credential') {
                setError('Invalid email or password.');
            } else if (err.code === 'auth/email-already-in-use') {
                setError('Email is already in use.');
            } else {
                setError('Authentication failed. Please try again.');
            }
            setLoading(false);
        }
    };

    return (
        <main className="min-h-screen flex flex-col items-center justify-center p-6 bg-background">
            <div className="w-full max-w-md space-y-8 animate-fade-in">
                <div className="text-center">
                    <h1 className="text-3xl font-bold">{isLogin ? 'Welcome Back' : 'Create Account'}</h1>
                    <p className="text-muted-foreground mt-2">
                        {isLogin ? 'Sign in to continue your progress' : 'Start your journey to a calmer pet'}
                    </p>
                </div>

                {/* Social Auth */}
                <div className="space-y-4">
                    <button
                        onClick={handleGoogleLogin}
                        disabled={loading}
                        className="w-full btn btn-outline flex items-center justify-center gap-3 py-3"
                    >
                        <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
                        Continue with Google
                    </button>

                    <button
                        onClick={handleAppleLogin}
                        disabled={loading}
                        className="w-full btn btn-outline flex items-center justify-center gap-3 py-3"
                    >
                        <Apple size={20} />
                        Continue with Apple
                    </button>
                </div>

                <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t border-border"></span>
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-background px-2 text-muted-foreground">Or continue with email</span>
                    </div>
                </div>

                {/* Email Form */}
                <form onSubmit={handleEmailAuth} className="space-y-4">
                    <div className="space-y-2">
                        <div className="relative">
                            <Mail className="absolute left-3 top-3 text-muted-foreground" size={20} />
                            <input
                                type="email"
                                placeholder="Email address"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className="input pl-10"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <div className="relative">
                            <Lock className="absolute left-3 top-3 text-muted-foreground" size={20} />
                            <input
                                type="password"
                                placeholder="Password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                className="input pl-10"
                            />
                        </div>
                    </div>

                    {error && <p className="text-sm text-destructive text-center">{error}</p>}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full btn btn-primary py-3"
                    >
                        {loading ? 'Processing...' : (isLogin ? 'Sign In' : 'Create Account')}
                    </button>
                </form>

                <p className="text-center text-sm text-muted-foreground">
                    {isLogin ? "Don't have an account? " : "Already have an account? "}
                    <button
                        onClick={() => setIsLogin(!isLogin)}
                        className="text-primary hover:underline font-medium"
                    >
                        {isLogin ? 'Sign up' : 'Sign in'}
                    </button>
                </p>
            </div>
        </main>
    );
}
