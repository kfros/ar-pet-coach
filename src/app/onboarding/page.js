'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronRight, ChevronLeft, Camera, Mic, Mail, Lock, Apple } from 'lucide-react';
import { auth, db, googleProvider, appleProvider } from '@/lib/firebase';
import { signInWithPopup, signInWithRedirect, getRedirectResult, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import Link from 'next/link';

function OnboardingContent() {
    const router = useRouter();
    const searchParams = useSearchParams();

    // Initialize step from URL or default to 1
    const initialStep = parseInt(searchParams.get('step')) || 1;
    const [step, setStep] = useState(initialStep);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [formData, setFormData] = useState({
        petName: '',
        breed: '',
        age: '',
        gender: '',
        weight: '',
        problems: [],
        termsAccepted: false,
        gdprAccepted: false,
        permissionsGranted: false
    });

    // Auth State for Step 6
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [authError, setAuthError] = useState('');

    const totalSteps = 6;

    // Handle Redirect Result (for mobile/strict environments)
    useEffect(() => {
        getRedirectResult(auth).then((result) => {
            if (result) {
                checkAndSaveProfile(result.user);
            }
        }).catch((error) => {
            console.error("Redirect auth error:", error);
            setAuthError(error.message);
        });
    }, []);

    // Sync state with URL changes (e.g. back button)
    useEffect(() => {
        const urlStep = parseInt(searchParams.get('step'));
        if (urlStep && urlStep !== step) {
            setStep(urlStep);
        }
    }, [searchParams]);

    const updateStep = (newStep) => {
        setStep(newStep);
        router.push(`/onboarding?step=${newStep}`);
    };

    const validateStep = (currentStep) => {
        setError('');
        switch (currentStep) {
            case 1:
                if (!formData.petName.trim()) return "Please enter your pet's name.";
                break;
            case 2:
                if (!formData.breed.trim()) return "Please enter the breed.";
                if (!formData.age) return "Please enter the age.";
                if (!formData.weight) return "Please enter the weight.";
                if (!formData.gender) return "Please select a gender.";
                break;
            case 3:
                if (formData.problems.length === 0) return "Please select at least one problem.";
                break;
            case 4:
                if (!formData.permissionsGranted) return "Please grant permissions to continue.";
                break;
            case 5:
                if (!formData.termsAccepted) return "You must agree to the Terms and Privacy Policy.";
                if (!formData.gdprAccepted) return "You must agree to data processing.";
                break;
        }
        return null;
    };

    const handleNext = () => {
        const validationError = validateStep(step);
        if (validationError) {
            setError(validationError);
            return;
        }

        if (step < totalSteps) {
            updateStep(step + 1);
        }
    };

    const handleBack = () => {
        if (step > 1) {
            updateStep(step - 1);
        }
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData({
            ...formData,
            [name]: type === 'checkbox' ? checked : value
        });
        setError(''); // Clear error on change
    };

    const toggleProblem = (problem) => {
        const current = formData.problems;
        if (current.includes(problem)) {
            setFormData({ ...formData, problems: current.filter(p => p !== problem) });
        } else {
            setFormData({ ...formData, problems: [...current, problem] });
        }
        setError('');
    };

    const [showOverrideModal, setShowOverrideModal] = useState(false);
    const [pendingUser, setPendingUser] = useState(null);

    const checkAndSaveProfile = async (user) => {
        try {
            const docRef = doc(db, 'users', user.uid);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists() && docSnap.data().onboardingCompleted) {
                setPendingUser(user);
                setShowOverrideModal(true);
            } else {
                await performSave(user);
            }
        } catch (error) {
            console.error("Error checking profile:", error);
            // If check fails, assume safe to save or let performSave handle it
            await performSave(user);
        }
    };

    const performSave = async (user) => {
        try {
            await setDoc(doc(db, 'users', user.uid), {
                ...formData,
                createdAt: new Date(),
                onboardingCompleted: true,
                alertLevel: 5, // Default
            });
            router.push('/dashboard');
        } catch (error) {
            console.error("Error saving profile:", error);
            setAuthError("Failed to save profile. Please try again.");
        }
    };

    const handleOverrideConfirm = async () => {
        if (pendingUser) {
            await performSave(pendingUser);
        }
        setShowOverrideModal(false);
    };

    const handleOverrideCancel = () => {
        setShowOverrideModal(false);
        setPendingUser(null);
        // Optionally sign out or stay on page
    };

    const handleGoogleAuth = async () => {
        setLoading(true);
        try {
            const result = await signInWithPopup(auth, googleProvider);
            await checkAndSaveProfile(result.user);
        } catch (error) {
            console.error("Popup auth error, trying redirect:", error);
            // Fallback to redirect if popup fails (e.g. COOP/COEP issues)
            if (error.code === 'auth/popup-blocked' || error.code === 'auth/cancelled-popup-request' || error.message.includes('Cross-Origin-Opener-Policy')) {
                try {
                    await signInWithRedirect(auth, googleProvider);
                } catch (redirectError) {
                    setAuthError(redirectError.message);
                    setLoading(false);
                }
            } else {
                setAuthError(error.message);
                setLoading(false);
            }
        }
    };

    const handleAppleAuth = async () => {
        setLoading(true);
        try {
            const result = await signInWithPopup(auth, appleProvider);
            await checkAndSaveProfile(result.user);
        } catch (error) {
            setAuthError(error.message);
            setLoading(false);
        }
    };

    const handleEmailAuth = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const result = await createUserWithEmailAndPassword(auth, email, password);
            await checkAndSaveProfile(result.user);
        } catch (error) {
            setAuthError(error.message);
            setLoading(false);
        }
    };

    return (
        <main className="min-h-screen flex flex-col p-6 max-w-md mx-auto relative">
            {/* Progress Bar */}
            <div className="w-full h-1 bg-muted rounded-full mb-8 mt-4">
                <div
                    className="h-full bg-primary rounded-full transition-all duration-300"
                    style={{ width: `${(step / totalSteps) * 100}%` }}
                />
            </div>

            <div className="flex-1 flex flex-col justify-center animate-fade-in">

                {/* Step 1: Greeting & Name */}
                {step === 1 && (
                    <div className="space-y-6">
                        <h1 className="text-3xl font-bold">Welcome! <br />What is your pet's name?</h1>
                        <input
                            type="text"
                            name="petName"
                            value={formData.petName}
                            onChange={handleChange}
                            placeholder="e.g. Buddy"
                            className="input text-xl"
                            autoFocus
                        />
                    </div>
                )}

                {/* Step 2: Details */}
                {step === 2 && (
                    <div className="space-y-4">
                        <h1 className="text-2xl font-bold">Tell us more about {formData.petName}</h1>

                        <div className="space-y-2">
                            <label className="text-sm text-muted-foreground">Breed</label>
                            <input
                                type="text"
                                name="breed"
                                value={formData.breed}
                                onChange={handleChange}
                                className="input"
                            />
                        </div>

                        <div className="flex gap-4">
                            <div className="space-y-2 flex-1">
                                <label className="text-sm text-muted-foreground">Age (years)</label>
                                <input
                                    type="number"
                                    name="age"
                                    value={formData.age}
                                    onChange={handleChange}
                                    className="input"
                                />
                            </div>
                            <div className="space-y-2 flex-1">
                                <label className="text-sm text-muted-foreground">Weight (kg)</label>
                                <input
                                    type="number"
                                    name="weight"
                                    value={formData.weight}
                                    onChange={handleChange}
                                    className="input"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm text-muted-foreground">Gender</label>
                            <div className="flex gap-4">
                                {['Male', 'Female'].map(g => (
                                    <button
                                        key={g}
                                        onClick={() => setFormData({ ...formData, gender: g })}
                                        className={`flex-1 btn ${formData.gender === g ? 'btn-primary' : 'btn-outline'}`}
                                    >
                                        {g}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Step 3: Main Problem */}
                {step === 3 && (
                    <div className="space-y-4">
                        <h1 className="text-2xl font-bold">What is the main problem?</h1>
                        <p className="text-muted-foreground">Select all that apply.</p>

                        <div className="grid grid-cols-1 gap-3">
                            {['Separation Anxiety', 'Noise Phobia', 'Visitors', 'Thunderstorms', 'Fireworks', 'Car Travel'].map(p => (
                                <button
                                    key={p}
                                    onClick={() => toggleProblem(p)}
                                    className={`w-full btn justify-start text-left ${formData.problems.includes(p) ? 'btn-primary' : 'btn-outline'}`}
                                >
                                    {p}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Step 4: Permissions */}
                {step === 4 && (
                    <div className="space-y-6 text-center">
                        <h1 className="text-2xl font-bold">We need your permission</h1>
                        <p className="text-muted-foreground">To analyze anxiety and use AR features, we need access to your camera and microphone.</p>

                        <div className="flex justify-center gap-8 py-8">
                            <div className="flex flex-col items-center gap-2">
                                <div className={`w-16 h-16 rounded-full flex items-center justify-center transition-colors ${formData.permissionsGranted ? 'bg-green-100 text-green-600' : 'bg-muted text-primary'}`}>
                                    <Camera size={32} />
                                </div>
                                <span className="text-sm">Camera</span>
                            </div>
                            <div className="flex flex-col items-center gap-2">
                                <div className={`w-16 h-16 rounded-full flex items-center justify-center transition-colors ${formData.permissionsGranted ? 'bg-green-100 text-green-600' : 'bg-muted text-primary'}`}>
                                    <Mic size={32} />
                                </div>
                                <span className="text-sm">Microphone</span>
                            </div>
                        </div>

                        {!formData.permissionsGranted ? (
                            <button
                                onClick={async () => {
                                    try {
                                        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                                            throw new Error("Camera API not available. Please ensure you are using HTTPS or localhost.");
                                        }
                                        await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
                                        setFormData({ ...formData, permissionsGranted: true });
                                    } catch (err) {
                                        console.error("Permission denied", err);
                                        setError(err.message || "Permissions denied. Please enable them in your browser settings.");
                                    }
                                }}
                                className="btn btn-primary w-full"
                            >
                                Grant Permissions
                            </button>
                        ) : (
                            <div className="text-green-600 font-medium animate-fade-in">
                                Permissions granted! You can proceed.
                            </div>
                        )}
                    </div>
                )}

                {/* Step 5: GDPR */}
                {step === 5 && (
                    <div className="space-y-6">
                        <h1 className="text-2xl font-bold">Almost there!</h1>
                        <p className="text-muted-foreground">Please review our terms.</p>

                        <div className="p-4 bg-muted rounded-xl text-sm space-y-4">
                            <div className="flex items-start gap-3">
                                <input
                                    type="checkbox"
                                    id="terms"
                                    name="termsAccepted"
                                    checked={formData.termsAccepted}
                                    onChange={handleChange}
                                    className="checkbox mt-1"
                                />
                                <label htmlFor="terms">
                                    I agree to the <Link href="/legal/terms" className="text-primary underline">Terms of Service</Link> and <Link href="/legal/privacy" className="text-primary underline">Privacy Policy</Link>.
                                </label>
                            </div>
                            <div className="flex items-start gap-3">
                                <input
                                    type="checkbox"
                                    id="gdpr"
                                    name="gdprAccepted"
                                    checked={formData.gdprAccepted}
                                    onChange={handleChange}
                                    className="checkbox mt-1"
                                />
                                <label htmlFor="gdpr">I agree to the processing of audio and photos of my pet for analysis purposes.</label>
                            </div>
                        </div>
                    </div>
                )}

                {/* Step 6: Create Account */}
                {step === 6 && (
                    <div className="space-y-6">
                        <h1 className="text-2xl font-bold">Create Account</h1>
                        <p className="text-muted-foreground">Save your pet's profile and start the journey.</p>

                        <div className="space-y-3">
                            <button onClick={handleGoogleAuth} className="w-full btn btn-outline flex items-center justify-center gap-3 py-3">
                                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
                                Continue with Google
                            </button>
                            <button onClick={handleAppleAuth} className="w-full btn btn-outline flex items-center justify-center gap-3 py-3">
                                <Apple size={20} />
                                Continue with Apple
                            </button>
                        </div>

                        <div className="relative py-2">
                            <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border"></span></div>
                            <div className="relative flex justify-center text-xs uppercase"><span className="bg-background px-2 text-muted-foreground">Or with email</span></div>
                        </div>

                        <form onSubmit={handleEmailAuth} className="space-y-3">
                            <input
                                type="email"
                                placeholder="Email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className="input"
                            />
                            <input
                                type="password"
                                placeholder="Password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                className="input"
                            />
                            {authError && <p className="text-sm text-destructive">{authError}</p>}
                            <button type="submit" disabled={loading} className="w-full btn btn-primary py-3">
                                {loading ? 'Creating Account...' : 'Create Account & Save'}
                            </button>
                        </form>
                    </div>
                )}

                {/* Error Message */}
                {error && (
                    <div className="bg-destructive/10 text-destructive p-3 rounded-lg text-sm text-center animate-fade-in">
                        {error}
                    </div>
                )}

            </div>

            {/* Navigation */}
            <div className="mt-8 flex justify-between items-center">
                <button
                    onClick={handleBack}
                    className={`btn btn-ghost ${step === 1 ? 'invisible' : ''}`}
                >
                    Back
                </button>

                {step < 6 && (
                    <button
                        onClick={handleNext}
                        disabled={loading}
                        className="btn btn-primary px-8"
                    >
                        Next
                        <ChevronRight size={20} className="ml-2" />
                    </button>
                )}
            </div>


            {/* Override Confirmation Modal */}
            {
                showOverrideModal && (
                    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                        <div className="bg-background rounded-xl p-6 max-w-sm w-full shadow-2xl animate-fade-in text-center space-y-4">
                            <h2 className="text-xl font-bold">Profile Already Exists</h2>
                            <p className="text-muted-foreground">
                                You already have a pet profile saved. Would you like to override it with this new one?
                            </p>
                            <div className="flex gap-3 pt-2">
                                <button
                                    onClick={handleOverrideCancel}
                                    className="flex-1 btn btn-outline"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleOverrideConfirm}
                                    className="flex-1 btn btn-destructive"
                                >
                                    Override
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
        </main >
    );
}

export default function Onboarding() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
            <OnboardingContent />
        </Suspense>
    );
}
