'use client';

import { useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';

export default function PrivacyPolicy() {
    const router = useRouter();

    return (
        <main className="min-h-screen bg-background p-6 container mx-auto max-w-2xl animate-fade-in">
            <button
                onClick={() => router.back()}
                className="flex items-center text-primary mb-6 hover:underline"
            >
                <ChevronLeft size={20} />
                Back
            </button>

            <h1 className="text-3xl font-bold mb-8">Privacy Policy</h1>

            <div className="space-y-4 text-muted-foreground">
                <p>Last updated: December 2025</p>
                <p>
                    At Pet Anxiety Coach, we take your privacy seriously. This policy describes how we collect, use, and protect your data.
                </p>

                <h2 className="text-xl font-semibold text-foreground mt-6">1. Data Collection</h2>
                <ul className="list-disc pl-5 space-y-2">
                    <li>We collect your email for account management.</li>
                    <li>We process audio recordings of your pet solely for anxiety analysis.</li>
                    <li>We store your pet's profile data (name, breed, weight) to personalize the experience.</li>
                </ul>

                <h2 className="text-xl font-semibold text-foreground mt-6">2. Data Usage</h2>
                <p>
                    Your data is used to provide personalized anxiety relief plans and to improve our AI models. We do not sell your data to third parties.
                </p>

                <h2 className="text-xl font-semibold text-foreground mt-6">3. Data Deletion</h2>
                <p>
                    You can request full data deletion at any time via the Settings menu in the app.
                </p>
            </div>
        </main>
    );
}
