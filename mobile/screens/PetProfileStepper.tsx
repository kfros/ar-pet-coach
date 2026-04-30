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
    ActivityIndicator,
    Alert,
    Modal,
    Image
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons, FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, FONTS, SIZES, SHADOWS } from '../constants/Theme';
import PetProfileRepository, { PetProfile } from '../services/petProfileRepository';
import { signOut } from '../services/authService';

const TOTAL_STEPS = 7;

const ANXIETY_TRIGGERS = [
    { id: "being_alone", label: "Being alone" },
    { id: "visitors", label: "Visitors" },
    { id: "fireworks", label: "Fireworks" },
    { id: "loud_noises", label: "Loud noises" },
    { id: "traffic_car_horns", label: "Traffic or car horns" },
    { id: "other_dogs", label: "Other dogs" },
    { id: "vet_visits", label: "Vet visits" },
    { id: "new_places", label: "New places" },
    { id: "car_rides", label: "Car rides" },
    { id: "grooming", label: "Grooming" },
    { id: "nighttime", label: "Nighttime" },
    { id: "not_sure", label: "Not sure yet" },
    { id: "other", label: "Other" },
];

const AGE_GROUPS = [
    { id: "puppy", label: "Puppy", helper: "Under 1 year" },
    { id: "young", label: "Young", helper: "1–3 years" },
    { id: "adult", label: "Adult", helper: "4–7 years" },
    { id: "senior", label: "Senior", helper: "8+ years" },
    { id: "not_sure", label: "Not sure", helper: null },
];

const SIZE_OPTIONS = [
    { id: "small", label: "Small" },
    { id: "medium", label: "Medium" },
    { id: "large", label: "Large" },
];

const BREED_SUGGESTIONS = [
    "Mixed Breed",
    "Not sure",
    "Labrador",
    "Poodle",
    "French Bulldog",
    "Beagle",
];

export default function PetProfileStepper({ navigation }: any) {
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);

    // Profile State
    const [petName, setPetName] = useState('');
    const [hasPhoto, setHasPhoto] = useState(false);
    const [photoUri, setPhotoUri] = useState<string | null>(null);
    const [anxietyTriggers, setAnxietyTriggers] = useState<string[]>([]);
    const [anxietyTriggerOther, setAnxietyTriggerOther] = useState('');
    const [breed, setBreed] = useState('');
    const [size, setSize] = useState('');
    const [ageGroup, setAgeGroup] = useState<string | null>(null);
    const [notes, setNotes] = useState('');

    const [authMode, setAuthMode] = useState<string>('unauthenticated');
    const [showExitModal, setShowExitModal] = useState(false);

    React.useEffect(() => {
        const checkMode = async () => {
            const mode = await PetProfileRepository.getAuthMode();
            setAuthMode(mode);
        };
        checkMode();
    }, []);

    const isCurrentStepValid = () => {
        if (step === 1) return petName.trim().length > 0 && petName.length <= 40;
        if (step === 2) return true; // Optional
        if (step === 3) return true; // Optional
        if (step === 4) return true; // Optional
        if (step === 5) return size !== ''; // Required
        if (step === 6) return true; // Optional
        if (step === 7) return true; // Optional
        return true;
    };

    const handlePhotoActionSheet = () => {
        Alert.alert(
            "Add Profile Photo",
            "Choose a photo from your library or skip for now.",
            [
                {
                    text: "Choose from Library",
                    onPress: async () => {
                        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
                        if (!permission.granted) {
                            Alert.alert("Permission Needed", "Photo library access is needed to choose a pet photo. You can enable it in Settings.");
                            return;
                        }
                        const result = await ImagePicker.launchImageLibraryAsync({
                            allowsEditing: true,
                            aspect: [1, 1],
                            quality: 0.7,
                        });
                        if (!result.canceled && result.assets && result.assets[0].uri) {
                            setPhotoUri(result.assets[0].uri);
                            setHasPhoto(true);
                        }
                    }
                },
                {
                    text: "Skip for now",
                    onPress: () => setStep(step + 1)
                },
                { text: "Cancel", style: "cancel" }
            ]
        );
    };

    const handleNext = () => {
        if (!isCurrentStepValid()) return;
        if (step < TOTAL_STEPS) setStep(step + 1);
        else handleComplete();
    };

    const handleBack = () => {
        if (step > 1) {
            setStep(step - 1);
        } else {
            setShowExitModal(true);
        }
    };

    const handleSkip = () => {
        // Skip is only available on optional steps: 2, 3, 4, 6, 7
        if ([2, 3, 4, 6, 7].includes(step)) {
            if (step < TOTAL_STEPS) setStep(step + 1);
            else handleComplete();
        }
    };

    const handleComplete = async () => {
        setLoading(true);
        try {
            const profile: PetProfile = {
                petName: petName.trim(),
                hasPhoto,
                photoUri,
                anxietyTriggers,
                anxietyTriggerOther: anxietyTriggerOther.trim() || null,
                breed: breed.trim(),
                size,
                ageGroup,
                notes: notes.trim(),
                anxietyScore: 5,
                updatedAt: new Date().toISOString(),
            };

            await PetProfileRepository.savePetProfile(profile);
            navigation.replace('Dashboard');
        } catch (error) {
            console.error('[PetProfileStepper] Error saving profile:', error);
            Alert.alert('Error', 'Could not save pet profile. Please try again.');
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

    const toggleTrigger = (id: string) => {
        if (id === 'not_sure') {
            setAnxietyTriggers(['not_sure']);
            return;
        }

        let newTriggers = anxietyTriggers.filter(t => t !== 'not_sure');
        if (newTriggers.includes(id)) {
            newTriggers = newTriggers.filter(t => t !== id);
        } else {
            newTriggers.push(id);
        }
        setAnxietyTriggers(newTriggers);
    };

    const renderStepContent = () => {
        switch (step) {
            case 1: // Name
                return (
                    <View style={styles.stepContainer}>
                        <View style={styles.helperCard}>
                            <Text style={styles.helperText}>Let's get to know your best friend!</Text>
                        </View>
                        <Text style={styles.stepTitle}>What is your dog's name?</Text>
                        <TextInput
                            style={styles.inputLarge}
                            placeholder="Buddy"
                            placeholderTextColor={COLORS.textSecondary}
                            value={petName}
                            onChangeText={setPetName}
                            maxLength={40}
                            autoFocus
                        />
                    </View>
                );
            case 2: // Photo
                return (
                    <View style={styles.stepContainer}>
                        <View style={styles.helperCard}>
                            <Text style={styles.helperText}>Show us how cute they are!</Text>
                        </View>
                        <Text style={styles.stepTitle}>Add a Profile Photo</Text>
                        <TouchableOpacity
                            style={[styles.photoUploadBtn, hasPhoto && styles.photoUploadBtnActive]}
                            onPress={handlePhotoActionSheet}
                        >
                            {photoUri ? (
                                <Image source={{ uri: photoUri }} style={styles.photoPreview} />
                            ) : (
                                <Ionicons name={hasPhoto ? "checkmark-circle" : "camera"} size={60} color={hasPhoto ? COLORS.success : COLORS.primary} />
                            )}
                            <Text style={styles.photoUploadText}>
                                {hasPhoto ? "Photo Selected!" : "Add Photo"}
                            </Text>
                        </TouchableOpacity>
                        {!hasPhoto && (
                            <Text style={styles.photoSubtext}>Choose a photo from your library.</Text>
                        )}
                    </View>
                );
            case 3: // Triggers
                return (
                    <ScrollView style={styles.stepContainer} showsVerticalScrollIndicator={false}>
                        <View style={styles.helperCard}>
                            <Text style={styles.helperText}>Choose any that apply so we can tailor sessions and guidance.</Text>
                        </View>
                        <Text style={styles.stepTitle}>What situations make them uneasy?</Text>
                        <View style={styles.chipsContainer}>
                            {ANXIETY_TRIGGERS.map((trigger) => (
                                <TouchableOpacity
                                    key={trigger.id}
                                    style={[
                                        styles.chip,
                                        anxietyTriggers.includes(trigger.id) && styles.chipSelected
                                    ]}
                                    onPress={() => toggleTrigger(trigger.id)}
                                >
                                    <Text style={[
                                        styles.chipLabel,
                                        anxietyTriggers.includes(trigger.id) && styles.chipLabelSelected
                                    ]}>
                                        {trigger.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                        {anxietyTriggers.includes('other') && (
                            <TextInput
                                style={styles.inputSmall}
                                placeholder="Tell us more"
                                placeholderTextColor={COLORS.textSecondary}
                                value={anxietyTriggerOther}
                                onChangeText={setAnxietyTriggerOther}
                                maxLength={120}
                            />
                        )}
                        <View style={{ height: 20 }} />
                    </ScrollView>
                );
            case 4: // Breed
                return (
                    <View style={styles.stepContainer}>
                        <View style={styles.helperCard}>
                            <Text style={styles.helperText}>Every pup is unique.</Text>
                        </View>
                        <Text style={styles.stepTitle}>What breed are they?</Text>
                        <TextInput
                            style={styles.inputLarge}
                            placeholder="e.g. Beagle"
                            placeholderTextColor={COLORS.textSecondary}
                            value={breed}
                            onChangeText={setBreed}
                            maxLength={60}
                        />
                        <View style={styles.suggestionsContainer}>
                            {BREED_SUGGESTIONS.map((suggestion) => (
                                <TouchableOpacity
                                    key={suggestion}
                                    style={styles.suggestionChip}
                                    onPress={() => setBreed(suggestion)}
                                >
                                    <Text style={styles.suggestionLabel}>{suggestion}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                );
            case 5: // Size
                return (
                    <View style={styles.stepContainer}>
                        <View style={styles.helperCard}>
                            <Text style={styles.helperText}>Little or large, all dogs are welcome!</Text>
                        </View>
                        <Text style={styles.stepTitle}>Select their size</Text>
                        <View style={styles.sizeContainer}>
                            {SIZE_OPTIONS.map((opt) => (
                                <TouchableOpacity
                                    key={opt.id}
                                    style={[
                                        styles.sizeCard,
                                        size === opt.id && styles.sizeCardSelected
                                    ]}
                                    onPress={() => setSize(opt.id)}
                                >
                                    <MaterialCommunityIcons
                                        name={opt.id === 'small' ? 'dog-side' : opt.id === 'medium' ? 'dog' : 'dog-service'}
                                        size={40}
                                        color={size === opt.id ? COLORS.primary : COLORS.textSecondary}
                                    />
                                    <Text style={[
                                        styles.sizeLabel,
                                        size === opt.id && styles.sizeLabelSelected
                                    ]}>
                                        {opt.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                );
            case 6: // Age
                return (
                    <View style={styles.stepContainer}>
                        <View style={styles.helperCard}>
                            <Text style={styles.helperText}>Age helps us suggest routines that fit their stage of life.</Text>
                        </View>
                        <Text style={styles.stepTitle}>How old are they?</Text>
                        <View style={styles.ageContainer}>
                            {AGE_GROUPS.map((group) => (
                                <TouchableOpacity
                                    key={group.id}
                                    style={[
                                        styles.ageCard,
                                        ageGroup === group.id && styles.ageCardSelected
                                    ]}
                                    onPress={() => setAgeGroup(group.id)}
                                >
                                    <View style={{ flex: 1 }}>
                                        <Text style={[
                                            styles.ageLabel,
                                            ageGroup === group.id && styles.ageLabelSelected
                                        ]}>
                                            {group.label}
                                        </Text>
                                        {group.helper && (
                                            <Text style={styles.ageHelper}>{group.helper}</Text>
                                        )}
                                    </View>
                                    {ageGroup === group.id && (
                                        <Ionicons name="checkmark-circle" size={24} color={COLORS.primary} />
                                    )}
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                );
            case 7: // Notes
                return (
                    <View style={styles.stepContainer}>
                        <View style={styles.helperCard}>
                            <Text style={styles.helperText}>Any special notes?</Text>
                        </View>
                        <Text style={styles.stepTitle}>Anything else we should know?</Text>
                        <TextInput
                            style={styles.inputMultiline}
                            placeholder="Habits, sensitivities, favorite routines..."
                            placeholderTextColor={COLORS.textSecondary}
                            value={notes}
                            onChangeText={setNotes}
                            multiline
                            numberOfLines={6}
                            maxLength={500}
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
                    <Ionicons
                        name={step === 1 ? "close" : "arrow-back"}
                        size={24}
                        color={COLORS.text}
                    />
                </TouchableOpacity>

                <Text style={styles.headerTitle}>Add Pet</Text>

                {[2, 3, 4, 6, 7].includes(step) ? (
                    <TouchableOpacity onPress={handleSkip} style={styles.skipBtn}>
                        <Text style={styles.skipText}>Skip</Text>
                    </TouchableOpacity>
                ) : <View style={{ width: 40 }} />}
            </View>

            {renderProgressBar()}

            <View style={{ flex: 1 }}>
                {renderStepContent()}
            </View>

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

            {/* Exit Confirmation Modal */}
            <Modal
                visible={showExitModal}
                transparent
                animationType="fade"
                onRequestClose={() => setShowExitModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Exit setup?</Text>
                        <Text style={styles.modalBody}>You can add your pet later.</Text>

                        <View style={styles.modalActions}>
                            <TouchableOpacity
                                style={styles.modalSecondaryBtn}
                                onPress={() => setShowExitModal(false)}
                            >
                                <Text style={styles.modalSecondaryBtnText}>Stay</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.modalPrimaryBtn}
                                onPress={() => navigation.goBack()}
                            >
                                <Text style={styles.modalPrimaryBtnText}>Exit</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
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
        height: 8,
        backgroundColor: '#FFFFFF80',
        borderRadius: 4,
        overflow: 'hidden',
        marginBottom: 8,
    },
    progressFill: {
        height: '100%',
        backgroundColor: COLORS.primary,
        borderRadius: 4,
    },
    progressText: {
        ...FONTS.caption,
        color: COLORS.textSecondary,
        textAlign: 'right',
    },
    stepContainer: {
        flex: 1,
        paddingHorizontal: SIZES.padding,
    },
    helperCard: {
        backgroundColor: COLORS.background,
        padding: SIZES.padding,
        borderRadius: SIZES.radius,
        marginBottom: 20,
        ...SHADOWS.small,
    },
    helperText: {
        ...FONTS.body,
        color: COLORS.text,
        textAlign: 'center',
        lineHeight: 22,
    },
    stepTitle: {
        ...FONTS.h2,
        color: COLORS.text,
        marginBottom: 20,
        textAlign: 'left',
    },
    inputLarge: {
        ...FONTS.h1,
        color: COLORS.primary,
        borderBottomWidth: 2,
        borderBottomColor: COLORS.primary,
        paddingVertical: 10,
        marginBottom: 20,
    },
    inputSmall: {
        backgroundColor: COLORS.background,
        borderRadius: SIZES.radius,
        padding: SIZES.padding,
        ...FONTS.body,
        color: COLORS.text,
        ...SHADOWS.small,
        marginTop: 15,
        borderWidth: 1,
        borderColor: COLORS.primary + '20',
    },
    inputMultiline: {
        backgroundColor: COLORS.background,
        borderRadius: SIZES.radius,
        padding: SIZES.padding,
        ...FONTS.body,
        color: COLORS.text,
        ...SHADOWS.small,
        height: 150,
        textAlignVertical: 'top',
    },
    photoUploadBtn: {
        backgroundColor: COLORS.background,
        height: 200,
        borderRadius: SIZES.radius,
        justifyContent: 'center',
        alignItems: 'center',
        ...SHADOWS.medium,
        overflow: 'hidden',
        borderWidth: 2,
        borderColor: COLORS.primary + '30',
        borderStyle: 'dashed',
    },
    photoUploadBtnActive: {
        borderStyle: 'solid',
        borderColor: COLORS.success,
    },
    photoPreview: {
        width: '100%',
        height: '100%',
    },
    photoUploadText: {
        ...FONTS.body,
        color: COLORS.primary,
        marginTop: 10,
        fontWeight: '600',
    },
    photoSubtext: {
        ...FONTS.caption,
        color: COLORS.textSecondary,
        textAlign: 'center',
        marginTop: 10,
    },
    chipsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        marginBottom: 10,
    },
    chip: {
        backgroundColor: COLORS.background,
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: COLORS.primary + '20',
        ...SHADOWS.small,
    },
    chipSelected: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary,
    },
    chipLabel: {
        ...FONTS.body,
        color: COLORS.textSecondary,
    },
    chipLabelSelected: {
        color: COLORS.background,
        fontWeight: '600',
    },
    suggestionsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginTop: 10,
    },
    suggestionChip: {
        backgroundColor: COLORS.background + '80',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 15,
        borderWidth: 1,
        borderColor: COLORS.primary + '10',
    },
    suggestionLabel: {
        ...FONTS.caption,
        color: COLORS.primary,
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
        aspectRatio: 0.9,
        ...SHADOWS.small,
        borderWidth: 2,
        borderColor: 'transparent',
    },
    sizeCardSelected: {
        borderColor: COLORS.primary,
        backgroundColor: COLORS.primary + '05',
    },
    sizeLabel: {
        ...FONTS.body,
        color: COLORS.textSecondary,
        marginTop: 8,
        fontWeight: '500',
    },
    sizeLabelSelected: {
        color: COLORS.primary,
        fontWeight: '700',
    },
    ageContainer: {
        gap: 12,
    },
    ageCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.background,
        borderRadius: SIZES.radius,
        padding: 16,
        ...SHADOWS.small,
        borderWidth: 2,
        borderColor: 'transparent',
    },
    ageCardSelected: {
        borderColor: COLORS.primary,
        backgroundColor: COLORS.primary + '05',
    },
    ageLabel: {
        ...FONTS.h3,
        color: COLORS.text,
    },
    ageLabelSelected: {
        color: COLORS.primary,
    },
    ageHelper: {
        ...FONTS.caption,
        color: COLORS.textSecondary,
        marginTop: 2,
    },
    footer: {
        padding: SIZES.padding,
        paddingBottom: Platform.OS === 'ios' ? 40 : SIZES.padding,
        backgroundColor: COLORS.background,
        borderTopWidth: 1,
        borderTopColor: COLORS.primary + '10',
    },
    nextBtn: {
        backgroundColor: COLORS.primary,
        height: 56,
        borderRadius: SIZES.radius,
        justifyContent: 'center',
        alignItems: 'center',
        ...SHADOWS.medium,
    },
    nextBtnDisabled: {
        backgroundColor: '#D1D5DB',
        shadowOpacity: 0,
    },
    nextBtnText: {
        ...FONTS.h3,
        color: '#fff',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: SIZES.padding,
    },
    modalContent: {
        backgroundColor: COLORS.background,
        borderRadius: SIZES.radius,
        padding: 24,
        width: '100%',
        ...SHADOWS.medium,
    },
    modalTitle: {
        ...FONTS.h2,
        color: COLORS.text,
        marginBottom: 10,
        textAlign: 'center',
    },
    modalBody: {
        ...FONTS.body,
        color: COLORS.textSecondary,
        marginBottom: 24,
        textAlign: 'center',
    },
    modalActions: {
        flexDirection: 'row',
        gap: 12,
    },
    modalPrimaryBtn: {
        flex: 1,
        backgroundColor: COLORS.error,
        height: 48,
        borderRadius: SIZES.radius,
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalPrimaryBtnText: {
        ...FONTS.body,
        color: '#fff',
        fontWeight: 'bold',
    },
    modalSecondaryBtn: {
        flex: 1,
        backgroundColor: COLORS.background,
        height: 48,
        borderRadius: SIZES.radius,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: COLORS.textSecondary + '30',
    },
    modalSecondaryBtnText: {
        ...FONTS.body,
        color: COLORS.text,
    },
});
