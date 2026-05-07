import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { auth, db, firestore } from '../services/firebaseConfig';
import { COLORS, SIZES, FONTS, SHADOWS } from '../constants/Theme';

export default function OnboardingScreen({ navigation }: any) {
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Check if user is already logged in (Profile Setup Mode)
    const currentUser = auth().currentUser;
    const isProfileSetupMode = !!currentUser;

    const [formData, setFormData] = useState({
        petName: '',
        breed: '',
        age: '',
        gender: '',
        weight: '',
        problems: [] as string[],
        termsAccepted: false,
        gdprAccepted: false,
        permissionsGranted: false
    });

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const totalSteps = 5;

    const updateFormData = (key: string, value: any) => {
        setFormData(prev => ({ ...prev, [key]: value }));
        setError('');
    };

    const toggleProblem = (problem: string) => {
        const current = formData.problems;
        if (current.includes(problem)) {
            updateFormData('problems', current.filter(p => p !== problem));
        } else {
            updateFormData('problems', [...current, problem]);
        }
    };

    const validateStep = () => {
        setError('');
        switch (step) {
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
                if (!formData.termsAccepted) return "You must agree to the Terms and Privacy Policy.";
                if (!formData.gdprAccepted) return "You must agree to data processing.";
                break;
        }
        return null;
    };

    const handleNext = () => {
        const err = validateStep();
        if (err) {
            setError(err);
            return;
        }
        if (step < totalSteps) {
            setStep(step + 1);
        }
    };

    const handleBack = () => {
        if (step > 1) {
            setStep(step - 1);
        } else {
            navigation.replace('Login'); // Back to login if on step 1
        }
    };

    const createProfile = async () => {
        setLoading(true);
        try {
            let uid;

            if (isProfileSetupMode && currentUser) {
                // Existing user - just create profile
                uid = currentUser.uid;
            } else {
                // New user - create account
                const result = await auth().createUserWithEmailAndPassword(email, password);
                uid = result.user.uid;
            }

            // 1. User Doc
            await db.collection('users').doc(uid).set({
                email: isProfileSetupMode ? currentUser?.email : email,
                createdAt: firestore.FieldValue.serverTimestamp(),
                onboardingCompleted: true
            }, { merge: true });

            // 2. Pet Doc (Subcollection)
            await db.collection('users').doc(uid).collection('pets').add({
                ...formData,
                createdAt: firestore.FieldValue.serverTimestamp(),
                anxietyScore: 5 // Default
            });

            navigation.replace('Dashboard');
        } catch (err: any) {
            console.error(err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <View style={styles.header}>
                <View style={[styles.progressBar, { width: `${(step / totalSteps) * 100}%` }]} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>

                {/* Step 1: Name */}
                {step === 1 && (
                    <View style={styles.stepContainer}>
                        <Text style={styles.title}>Welcome!{'\n'}What is your pet's name?</Text>
                        <TextInput
                            style={styles.inputLarge}
                            placeholder="e.g. Buddy"
                            value={formData.petName}
                            onChangeText={(text) => updateFormData('petName', text)}
                            autoFocus
                        />
                    </View>
                )}

                {/* Step 2: Details */}
                {step === 2 && (
                    <View style={styles.stepContainer}>
                        <Text style={styles.title}>Tell us more about {formData.petName}</Text>

                        <Text style={styles.label}>Breed</Text>
                        <TextInput
                            style={styles.input}
                            value={formData.breed}
                            onChangeText={(text) => updateFormData('breed', text)}
                        />

                        <View style={styles.row}>
                            <View style={{ flex: 1, marginRight: 8 }}>
                                <Text style={styles.label}>Age (years)</Text>
                                <TextInput
                                    style={styles.input}
                                    value={formData.age}
                                    onChangeText={(text) => updateFormData('age', text)}
                                    keyboardType="numeric"
                                />
                            </View>
                            <View style={{ flex: 1, marginLeft: 8 }}>
                                <Text style={styles.label}>Weight (kg)</Text>
                                <TextInput
                                    style={styles.input}
                                    value={formData.weight}
                                    onChangeText={(text) => updateFormData('weight', text)}
                                    keyboardType="numeric"
                                />
                            </View>
                        </View>

                        <Text style={styles.label}>Gender</Text>
                        <View style={styles.row}>
                            {['Male', 'Female'].map(g => (
                                <TouchableOpacity
                                    key={g}
                                    style={[styles.choiceBtn, formData.gender === g && styles.choiceBtnActive]}
                                    onPress={() => updateFormData('gender', g)}
                                >
                                    <Text style={[styles.choiceText, formData.gender === g && styles.choiceTextActive]}>{g}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                )}

                {/* Step 3: Problems */}
                {step === 3 && (
                    <View style={styles.stepContainer}>
                        <Text style={styles.title}>What is the main problem?</Text>
                        <Text style={styles.subtitle}>Select all that apply.</Text>
                        <View style={{ gap: 10 }}>
                            {['Separation Anxiety', 'Noise Phobia', 'Visitors', 'Thunderstorms', 'Fireworks', 'Car Travel'].map(p => (
                                <TouchableOpacity
                                    key={p}
                                    style={[styles.problemBtn, formData.problems.includes(p) && styles.problemBtnActive]}
                                    onPress={() => toggleProblem(p)}
                                >
                                    <Text style={[styles.problemText, formData.problems.includes(p) && styles.problemTextActive]}>{p}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                )}


                {/* Step 4: Legal */}
                {step === 4 && (
                    <View style={styles.stepContainer}>
                        <Text style={styles.title}>Almost there!</Text>
                        <Text style={styles.subtitle}>Please review our terms.</Text>

                        <View style={styles.legalBox}>
                            <TouchableOpacity
                                style={styles.checkboxRow}
                                onPress={() => updateFormData('termsAccepted', !formData.termsAccepted)}
                            >
                                <Ionicons
                                    name={formData.termsAccepted ? "checkbox" : "square-outline"}
                                    size={24}
                                    color={COLORS.primary}
                                />
                                <Text style={styles.checkboxText}>
                                    I agree to the <Text style={styles.link}>Terms of Service</Text> and <Text style={styles.link}>Privacy Policy</Text>.
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.checkboxRow}
                                onPress={() => updateFormData('gdprAccepted', !formData.gdprAccepted)}
                            >
                                <Ionicons
                                    name={formData.gdprAccepted ? "checkbox" : "square-outline"}
                                    size={24}
                                    color={COLORS.primary}
                                />
                                <Text style={styles.checkboxText}>
                                    I agree to have my pet's profile data securely stored locally or synced to my private account.
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}

                {/* Step 5: Create Account */}
                {step === 5 && (
                    <View style={styles.stepContainer}>
                        <Text style={styles.title}>{isProfileSetupMode ? 'Complete Setup' : 'Create Account'}</Text>
                        <Text style={styles.subtitle}>Save your pet's profile and start the journey.</Text>

                        {!isProfileSetupMode && (
                            <>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Email"
                                    value={email}
                                    onChangeText={setEmail}
                                    autoCapitalize="none"
                                    keyboardType="email-address"
                                />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Password"
                                    value={password}
                                    onChangeText={setPassword}
                                    secureTextEntry
                                />
                            </>
                        )}

                        {loading ? <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 20 }} /> : (
                            <TouchableOpacity style={styles.createBtn} onPress={createProfile}>
                                <Text style={styles.createBtnText}>{isProfileSetupMode ? 'Save Profile' : 'Create Account & Save'}</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                )}

                {error ? (
                    <View style={styles.errorBox}>
                        <Text style={styles.errorText}>{error}</Text>
                    </View>
                ) : null}

            </ScrollView>

            <View style={styles.footerContainer}>
                <View style={styles.footer}>
                    <TouchableOpacity onPress={handleBack} style={[styles.navBtn, { opacity: step === 1 ? 0 : 1 }]} disabled={step === 1}>
                        <Text style={styles.navBtnText}>Back</Text>
                    </TouchableOpacity>

                    {step < 6 && (
                        <TouchableOpacity onPress={handleNext} style={[styles.navBtn, styles.nextBtn]}>
                            <Text style={[styles.navBtnText, { color: '#fff' }]}>Next</Text>
                            <Ionicons name="chevron-forward" size={20} color="#fff" />
                        </TouchableOpacity>
                    )}
                </View>

                {!isProfileSetupMode && (
                    <TouchableOpacity style={styles.loginLink} onPress={() => navigation.navigate('Login')}>
                        <Text style={styles.loginLinkText}>Already have an account? <Text style={styles.loginLinkBold}>Log In</Text></Text>
                    </TouchableOpacity>
                )}
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.mint,
    },
    header: {
        height: 6,
        width: '100%',
        backgroundColor: 'rgba(255, 255, 255, 0.5)',
        marginTop: Platform.OS === 'ios' ? 50 : 30,
    },
    progressBar: {
        height: '100%',
        backgroundColor: COLORS.primary,
    },
    content: {
        padding: SIZES.padding,
        paddingBottom: 100,
    },
    stepContainer: {
        gap: 16,
    },
    title: {
        ...FONTS.h1,
        color: COLORS.text,
        marginBottom: 8,
    },
    subtitle: {
        ...FONTS.body,
        color: COLORS.textSecondary,
        marginTop: -8,
        lineHeight: 22,
    },
    label: {
        ...FONTS.caption,
        color: COLORS.textSecondary,
        marginBottom: 4,
        fontWeight: '600',
    },
    inputLarge: {
        ...FONTS.h1,
        borderBottomWidth: 3,
        borderBottomColor: COLORS.primary,
        paddingVertical: 8,
        marginTop: 16,
        color: COLORS.primary,
    },
    input: {
        backgroundColor: COLORS.background,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: SIZES.radius,
        padding: 14,
        ...FONTS.body,
        color: COLORS.text,
        ...SHADOWS.small,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    choiceBtn: {
        flex: 1,
        backgroundColor: COLORS.background,
        borderWidth: 1,
        borderColor: COLORS.border,
        padding: 14,
        borderRadius: SIZES.radius,
        alignItems: 'center',
        marginHorizontal: 4,
        ...SHADOWS.small,
    },
    choiceBtnActive: {
        borderColor: COLORS.primary,
        backgroundColor: '#E0F2F1',
    },
    choiceText: {
        ...FONTS.body,
        color: COLORS.textSecondary,
    },
    choiceTextActive: {
        color: COLORS.primary,
        fontWeight: 'bold',
    },
    problemBtn: {
        backgroundColor: COLORS.background,
        borderWidth: 1,
        borderColor: COLORS.border,
        padding: 16,
        borderRadius: SIZES.radius,
        ...SHADOWS.small,
    },
    problemBtnActive: {
        borderColor: COLORS.primary,
        backgroundColor: '#E0F2F1',
    },
    problemText: {
        ...FONTS.body,
        color: COLORS.text,
    },
    problemTextActive: {
        color: COLORS.primary,
        fontWeight: '600',
    },
    permIconContainer: {
        marginVertical: 30,
        alignItems: 'center',
    },
    permIconCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#E0F2F1',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
        ...SHADOWS.small,
    },
    permGranted: {
        backgroundColor: '#DCFCE7',
    },
    permLabel: {
        ...FONTS.caption,
        color: COLORS.textSecondary,
    },
    grantBtn: {
        backgroundColor: COLORS.primary,
        paddingHorizontal: 24,
        paddingVertical: 14,
        borderRadius: SIZES.radius,
        ...SHADOWS.medium,
    },
    grantBtnText: {
        ...FONTS.body,
        color: '#fff',
        fontWeight: 'bold',
    },
    successText: {
        ...FONTS.h3,
        color: COLORS.success,
    },
    legalBox: {
        backgroundColor: 'rgba(255, 255, 255, 0.6)',
        padding: SIZES.padding,
        borderRadius: SIZES.radius,
        gap: 16,
        ...SHADOWS.small,
    },
    checkboxRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
    },
    checkboxText: {
        flex: 1,
        ...FONTS.caption,
        lineHeight: 20,
        color: COLORS.text,
    },
    link: {
        color: COLORS.primary,
        fontWeight: '600',
    },
    createBtn: {
        backgroundColor: COLORS.primary,
        padding: 16,
        borderRadius: SIZES.radius,
        alignItems: 'center',
        marginTop: 20,
        ...SHADOWS.medium,
    },
    createBtnText: {
        ...FONTS.h3,
        color: '#fff',
    },
    errorBox: {
        backgroundColor: '#FEE2E2',
        padding: 12,
        borderRadius: SIZES.radius,
        marginTop: 16,
    },
    errorText: {
        color: COLORS.error,
        textAlign: 'center',
        ...FONTS.small,
    },
    navBtnText: {
        ...FONTS.body,
        color: COLORS.textSecondary,
        fontWeight: 'bold',
    },
    navBtn: {
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: SIZES.radius,
    },
    nextBtn: {
        backgroundColor: COLORS.primary,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        ...SHADOWS.small,
    },
    footerContainer: {
        borderTopWidth: 1,
        borderTopColor: 'rgba(0, 0, 0, 0.05)',
        paddingVertical: 20,
        backgroundColor: COLORS.mint,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        marginBottom: 16,
    },
    loginLink: {
        alignItems: 'center',
        paddingVertical: 8,
    },
    loginLinkText: {
        ...FONTS.caption,
        color: COLORS.textSecondary,
    },
    loginLinkBold: {
        ...FONTS.caption,
        color: COLORS.primary,
        fontWeight: 'bold',
    },
});
