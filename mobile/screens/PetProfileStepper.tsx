import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    Pressable,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator
} from 'react-native';
import { Ionicons, FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, FONTS, SIZES, SHADOWS } from '../constants/Theme';
import { auth, db } from '../services/firebaseConfig';
import { collection, addDoc } from 'firebase/firestore';

const TOTAL_STEPS = 7;
const MANDATORY_STEPS = 4;

const MOTIVATIONAL_TEXTS = [
    "Let's get to know your best friend!",
    "Show us how cute they are! 📸",
    "What kind of amazing dog are they?",
    "Little or large, all dogs are welcome!",
    "Almost there! (Optional)",
    "When did they join the family? (Optional)",
    "Any special notes? (Optional)"
];

export default function PetProfileStepper({ navigation }: any) {
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);

    const [petName, setPetName] = useState('');
    const [hasPhoto, setHasPhoto] = useState(false);
    const [breed, setBreed] = useState('');
    const [size, setSize] = useState('');
    const [weight, setWeight] = useState('');
    const [birthDate, setBirthDate] = useState('');
    const [notes, setNotes] = useState('');

    const isCurrentStepValid = () => {
        if (step === 1) return petName.trim().length > 0;
        if (step === 2) return hasPhoto;
        if (step === 3) return breed.trim().length > 0;
        if (step === 4) return size !== '';
        return true;
    };

    const handleNext = () => {
        if (!isCurrentStepValid()) return;
        if (step < TOTAL_STEPS) setStep(step + 1);
        else handleComplete();
    };

    const handleSkip = () => {
        if (step > MANDATORY_STEPS) {
            handleComplete();
        }
    };

    const handleBack = () => {
        if (step > 1) {
            setStep(step - 1);
        } else {
            navigation.goBack();
        }
    };

    const handleComplete = async () => {
        setLoading(true);
        try {
            const uid = auth.currentUser?.uid;
            if (!uid) throw new Error("Not logged in");

            const petsRef = collection(db, 'users', uid, 'pets');
            await addDoc(petsRef, {
                petName,
                hasPhoto,
                breed,
                size,
                weight,
                birthDate,
                notes,
                createdAt: new Date(),
                anxietyScore: 5
            });
            navigation.replace('Dashboard');
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const renderProgressBar = () => (
        <View style={styles.progressTracker}>
            <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${(step / TOTAL_STEPS) * 100}%` }]} />
            </View>
            <Text style={styles.progressText}>Step {step} of {TOTAL_STEPS}</Text>
        </View>
    );

    const renderStepContent = () => {
        switch (step) {
            case 1:
                return (
                    <View style={styles.stepContainer}>
                        <Text style={styles.title}>What is your furry friend's name?</Text>
                        <TextInput
                            style={styles.inputLarge}
                            placeholder="e.g. Buddy"
                            placeholderTextColor={COLORS.textSecondary}
                            value={petName}
                            onChangeText={setPetName}
                            autoFocus
                        />
                    </View>
                );
            case 2:
                return (
                    <View style={styles.stepContainer}>
                        <Text style={styles.title}>Add a Profile Photo</Text>
                        <TouchableOpacity
                            style={[styles.photoUploadBtn, hasPhoto && styles.photoUploadBtnActive]}
                            onPress={() => setHasPhoto(true)}
                        >
                            <Ionicons name={hasPhoto ? "checkmark-circle" : "camera"} size={60} color={hasPhoto ? COLORS.success : COLORS.primary} />
                            <Text style={styles.photoUploadText}>
                                {hasPhoto ? "Photo Selected!" : "Tap to open Camera"}
                            </Text>
                        </TouchableOpacity>
                    </View>
                );
            case 3:
                return (
                    <View style={styles.stepContainer}>
                        <Text style={styles.title}>What breed are they?</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="e.g. Golden Retriever"
                            placeholderTextColor={COLORS.textSecondary}
                            value={breed}
                            onChangeText={setBreed}
                        />
                        <View style={styles.pillContainer}>
                            {['Mixed Breed', 'Labrador', 'Poodle', 'French Bulldog', 'Beagle'].map(b => (
                                <TouchableOpacity
                                    key={b}
                                    style={[styles.pill, breed === b && styles.pillActive]}
                                    onPress={() => setBreed(b)}
                                >
                                    <Text style={[styles.pillText, breed === b && styles.pillTextActive]}>{b}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                );
            case 4:
                return (
                    <View style={styles.stepContainer}>
                        <Text style={styles.title}>Select their size</Text>
                        <View style={styles.sizeContainer}>
                            {['Small', 'Medium', 'Large'].map((s) => (
                                <TouchableOpacity
                                    key={s}
                                    style={[styles.sizeCard, size === s && styles.sizeCardActive]}
                                    onPress={() => setSize(s)}
                                >
                                    <MaterialCommunityIcons
                                        name="dog"
                                        size={s === 'Small' ? 40 : s === 'Medium' ? 60 : 80}
                                        color={size === s ? COLORS.primary : COLORS.textSecondary}
                                    />
                                    <Text style={[styles.sizeText, size === s && styles.sizeTextActive]}>{s}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                );
            case 5:
                return (
                    <View style={styles.stepContainer}>
                        <Text style={styles.title}>Weight (kg)</Text>
                        <TextInput
                            style={styles.inputLarge}
                            placeholder="e.g. 15"
                            placeholderTextColor={COLORS.textSecondary}
                            value={weight}
                            onChangeText={setWeight}
                            keyboardType="numeric"
                        />
                    </View>
                );
            case 6:
                return (
                    <View style={styles.stepContainer}>
                        <Text style={styles.title}>Birth or Adoption Date</Text>
                        <TextInput
                            style={styles.inputLarge}
                            placeholder="MM/YYYY"
                            placeholderTextColor={COLORS.textSecondary}
                            value={birthDate}
                            onChangeText={setBirthDate}
                        />
                    </View>
                );
            case 7:
                return (
                    <View style={styles.stepContainer}>
                        <Text style={styles.title}>Important Notes</Text>
                        <TextInput
                            style={[styles.input, { height: 120 }]}
                            placeholder="Medical issues, quirks, etc."
                            placeholderTextColor={COLORS.textSecondary}
                            value={notes}
                            onChangeText={setNotes}
                            multiline
                            textAlignVertical="top"
                        />
                    </View>
                );
            default:
                return null;
        }
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <View style={styles.header}>
                <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color={COLORS.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Add Pet</Text>
                {step > MANDATORY_STEPS ? (
                    <TouchableOpacity onPress={handleSkip} style={styles.skipBtn}>
                        <Text style={styles.skipText}>Skip</Text>
                    </TouchableOpacity>
                ) : <View style={{ width: 40 }} />}
            </View>

            {renderProgressBar()}

            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.motivationBubble}>
                    <Text style={styles.motivationText}>{MOTIVATIONAL_TEXTS[step - 1]}</Text>
                </View>

                {renderStepContent()}

            </ScrollView>

            <View style={styles.footer}>
                <Pressable
                    style={({ pressed }) => [
                        styles.nextBtn,
                        !isCurrentStepValid() && styles.nextBtnDisabled,
                        pressed && isCurrentStepValid() && !loading && { backgroundColor: COLORS.primaryDark, transform: [{ scale: 0.98 }] }
                    ]}
                    onPress={handleNext}
                    disabled={!isCurrentStepValid() || loading}
                >
                    {loading ? <ActivityIndicator color="#fff" /> : (
                        <Text style={styles.nextBtnText}>{step === TOTAL_STEPS ? 'Complete Setup' : 'Continue'}</Text>
                    )}
                </Pressable>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.mint, // Calming mint background
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: SIZES.padding,
        paddingTop: Platform.OS === 'ios' ? 60 : 40,
        paddingBottom: 20,
    },
    backBtn: {
        width: 40,
        height: 40,
        justifyContent: 'center',
    },
    headerTitle: {
        ...FONTS.h3,
        color: COLORS.text,
    },
    skipBtn: {
        width: 60,
        height: 40,
        justifyContent: 'center',
        alignItems: 'flex-end',
    },
    skipText: {
        ...FONTS.body,
        color: COLORS.primary,
        fontWeight: 'bold',
    },
    progressTracker: {
        paddingHorizontal: SIZES.padding,
        marginBottom: 20,
    },
    progressTrack: {
        height: 12,
        backgroundColor: '#FFFFFF80',
        borderRadius: 6,
        overflow: 'hidden',
        marginBottom: 8,
    },
    progressFill: {
        height: '100%',
        backgroundColor: COLORS.primary,
        borderRadius: 6,
    },
    progressText: {
        ...FONTS.caption,
        color: COLORS.textSecondary,
        textAlign: 'right',
    },
    content: {
        padding: SIZES.padding,
        flexGrow: 1,
    },
    motivationBubble: {
        backgroundColor: COLORS.background,
        padding: SIZES.padding,
        borderRadius: SIZES.radius,
        marginBottom: 30,
        ...SHADOWS.small,
        borderBottomLeftRadius: 4,
    },
    motivationText: {
        ...FONTS.body,
        color: COLORS.text,
        fontWeight: '600',
        textAlign: 'center',
    },
    stepContainer: {
        flex: 1,
    },
    title: {
        ...FONTS.h2,
        color: COLORS.text,
        marginBottom: 20,
        textAlign: 'center',
    },
    inputLarge: {
        ...FONTS.h1,
        color: COLORS.primary,
        borderBottomWidth: 3,
        borderBottomColor: COLORS.primary,
        paddingVertical: 10,
        textAlign: 'center',
    },
    input: {
        backgroundColor: COLORS.background,
        borderRadius: SIZES.radius,
        padding: SIZES.padding,
        ...FONTS.body,
        color: COLORS.text,
        ...SHADOWS.small,
        marginBottom: 20,
    },
    pillContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        justifyContent: 'center',
    },
    pill: {
        backgroundColor: COLORS.background,
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 20,
        ...SHADOWS.small,
    },
    pillActive: {
        backgroundColor: COLORS.primary,
    },
    pillText: {
        ...FONTS.body,
        color: COLORS.textSecondary,
    },
    pillTextActive: {
        color: COLORS.background,
        fontWeight: 'bold',
    },
    photoUploadBtn: {
        backgroundColor: COLORS.background,
        height: 200,
        borderRadius: SIZES.radius,
        justifyContent: 'center',
        alignItems: 'center',
        ...SHADOWS.small,
        borderWidth: 2,
        borderColor: 'transparent',
        borderStyle: 'dashed',
    },
    photoUploadBtnActive: {
        borderColor: COLORS.success,
        backgroundColor: '#ECFDF5',
    },
    photoUploadText: {
        ...FONTS.body,
        color: COLORS.primary,
        marginTop: 10,
        fontWeight: '600',
    },
    sizeContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 10,
    },
    sizeCard: {
        flex: 1,
        backgroundColor: COLORS.background,
        borderRadius: SIZES.radius,
        padding: SIZES.padding,
        alignItems: 'center',
        justifyContent: 'center',
        aspectRatio: 0.8,
        ...SHADOWS.small,
    },
    sizeCardActive: {
        borderWidth: 2,
        borderColor: COLORS.primary,
    },
    sizeText: {
        ...FONTS.body,
        color: COLORS.textSecondary,
        marginTop: 10,
    },
    sizeTextActive: {
        color: COLORS.primary,
        fontWeight: 'bold',
    },
    footer: {
        padding: SIZES.padding,
        paddingBottom: Platform.OS === 'ios' ? 40 : SIZES.padding,
        backgroundColor: COLORS.backgroundLight,
        borderTopLeftRadius: SIZES.radius * 2,
        borderTopRightRadius: SIZES.radius * 2,
    },
    nextBtn: {
        backgroundColor: COLORS.primary,
        height: 56,
        borderRadius: SIZES.radius,
        justifyContent: 'center',
        alignItems: 'center',
        ...SHADOWS.small,
    },
    nextBtnDisabled: {
        backgroundColor: '#D1D5DB', // Standard gray for disabled states
        shadowOpacity: 0,
    },
    nextBtnText: {
        ...FONTS.h3,
        color: '#fff',
    },
});
