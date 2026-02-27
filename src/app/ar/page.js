'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import ARView from '@/components/ARView';
import { ArrowLeft } from 'lucide-react';

export default function ARPage() {
    const router = useRouter();
    const [showAR, setShowAR] = useState(false);
    const [scanComplete, setScanComplete] = useState(false);

    const handleScanComplete = (markers) => {
        setShowAR(false);
        setScanComplete(true);
        // Here we would save the room data to Firestore
    };

    return (
        <main className="min-h-screen bg-background flex flex-col">
            {!showAR && !scanComplete && (
                <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-8 animate-fade-in">
                    <div className="space-y-4">
                        <h1 className="text-3xl font-bold">Room Scanner</h1>
                        <p className="text-muted-foreground">
                            We need to scan your room to identify anxiety triggers and safe zones.
                        </p>
                    </div>

                    <div className="relative w-64 h-64 bg-muted rounded-full flex items-center justify-center">
                        <div className="absolute inset-0 border-4 border-primary/30 rounded-full animate-ping" />
                        <img src="/scan-icon.png" alt="Scan" className="w-32 h-32 opacity-50" />
                        {/* Placeholder icon, using text for now if image fails */}
                        <span className="absolute text-4xl">📷</span>
                    </div>

                    <button
                        onClick={() => setShowAR(true)}
                        className="btn btn-primary w-full max-w-xs py-4 text-lg shadow-xl shadow-primary/20"
                    >
                        Start Scanning
                    </button>

                    <button onClick={() => router.back()} className="text-muted-foreground hover:text-foreground">
                        Cancel
                    </button>
                </div>
            )}

            {showAR && (
                <ARView
                    onClose={() => setShowAR(false)}
                    onScanComplete={handleScanComplete}
                />
            )}

            {scanComplete && (
                <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-8 animate-fade-in">
                    <div className="w-20 h-20 bg-green-500/10 text-green-500 rounded-full flex items-center justify-center mb-4">
                        <span className="text-4xl">✓</span>
                    </div>

                    <h1 className="text-3xl font-bold">Scan Complete!</h1>
                    <p className="text-muted-foreground">
                        We've mapped your room and identified potential stress zones.
                    </p>

                    <div className="card w-full p-6 bg-muted/50">
                        <h3 className="font-bold mb-2">Analysis Result</h3>
                        <p className="text-sm">Safe Zone: <span className="text-green-500 font-bold">Living Room Corner</span></p>
                        <p className="text-sm">Stress Zone: <span className="text-red-500 font-bold">Near Main Door</span></p>
                    </div>

                    <button
                        onClick={() => router.push('/dashboard')}
                        className="btn btn-primary w-full max-w-xs"
                    >
                        Return to Dashboard
                    </button>
                </div>
            )}
        </main>
    );
}
