'use client';

import { useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';

export default function TermsOfService() {
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

            <h1 className="text-3xl font-bold mb-8">Terms of Service</h1>

            <div className="space-y-4 text-muted-foreground">
                <p>Last updated: December 2025</p>
                <p>
                    By using the Pet Anxiety Coach application, you agree to the following terms.
                </p>

                <h2 className="text-xl font-semibold text-foreground mt-6">1. Medical Disclaimer</h2>
                <p>
                    This app provides advice and training protocols but is NOT a substitute for professional veterinary care. If your pet shows signs of severe aggression or health issues, consult a vet immediately.
                </p>

                <h2 className="text-xl font-semibold text-foreground mt-6">2. Liability</h2>
                <p>
                    We are not liable for any behavioral issues that may arise or persist during the use of this app. Results may vary for every pet.
                </p>

                <h2 className="text-xl font-semibold text-foreground mt-6">3. Subscriptions</h2>
                <p>
                    Premium subscriptions are billed annually or monthly. You can cancel at any time in your account settings.
                </p>
            </div>
        </main>
    );
}
