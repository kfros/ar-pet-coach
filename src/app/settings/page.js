'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { deleteUser, signOut } from 'firebase/auth';
import { doc, deleteDoc } from 'firebase/firestore';
import { ChevronLeft, Trash2, LogOut } from 'lucide-react';

export default function Settings() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    const handleLogout = async () => {
        await signOut(auth);
        router.push('/');
    };

    const handleDeleteAccount = async () => {
        if (!confirm("Are you sure? This will delete all your data permanently. This action cannot be undone.")) return;

        setLoading(true);
        try {
            const user = auth.currentUser;
            if (user) {
                // Delete user data from Firestore
                await deleteDoc(doc(db, 'users', user.uid));
                // Delete user auth account
                await deleteUser(user);
                router.push('/');
            }
        } catch (error) {
            console.error("Error deleting account:", error);
            alert("Please log out and log in again to delete your account for security reasons.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="min-h-screen bg-background flex flex-col">
            <header className="p-4 flex items-center gap-4 border-b border-border bg-card">
                <button onClick={() => router.back()} className="p-2 hover:bg-muted rounded-full">
                    <ChevronLeft size={24} />
                </button>
                <h1 className="text-xl font-bold">Settings</h1>
            </header>

            <div className="container py-6 space-y-6">

                <div className="card space-y-4">
                    <h2 className="font-bold text-lg">Account</h2>

                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center justify-between p-3 hover:bg-muted rounded-lg transition-colors"
                    >
                        <span className="flex items-center gap-3">
                            <LogOut size={20} />
                            Log Out
                        </span>
                    </button>
                </div>

                <div className="card space-y-4 border-destructive/50">
                    <h2 className="font-bold text-lg text-destructive">Danger Zone</h2>

                    <button
                        onClick={handleDeleteAccount}
                        disabled={loading}
                        className="w-full flex items-center justify-between p-3 hover:bg-destructive/10 text-destructive rounded-lg transition-colors"
                    >
                        <span className="flex items-center gap-3">
                            <Trash2 size={20} />
                            {loading ? 'Deleting...' : 'Delete Account & Data'}
                        </span>
                    </button>
                    <p className="text-xs text-muted-foreground px-3">
                        Permanently remove your account and all associated data.
                    </p>
                </div>

                <div className="text-center text-sm text-muted-foreground mt-8">
                    <p>Version 1.0.0</p>
                    <p>© 2025 Pet Anxiety Coach</p>
                </div>

            </div>
        </main>
    );
}
