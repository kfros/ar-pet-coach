import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SIZES, SHADOWS } from '../constants/Theme';
import SessionService from '../services/sessionService';
import { useSubscription } from '../components/SubscriptionManager';

export default function SessionPreviewScreen({ navigation, route }: any) {
    const { sessionId, petId } = route.params;
    const session = SessionService.getSessionById(sessionId);
    const { isPremium } = useSubscription();

    const isLocked = session?.accessLevel === 'premium' && !isPremium;

    if (!session) {
        return (
            <View style={styles.center}>
                <Text>Session not found</Text>
                <Pressable onPress={() => navigation.goBack()}><Text>Go Back</Text></Pressable>
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="chevron-back" size={28} color={COLORS.text} />
                </Pressable>
                <Text style={styles.headerTitle}>Session Preview</Text>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.heroCard}>
                    <View style={styles.rowBetween}>
                        <Text style={styles.title}>{session.title}</Text>
                        {session.accessLevel === 'premium' && (
                            <View style={[styles.premiumBadge, isLocked && { backgroundColor: '#FEF3C7' }]}>
                                <Ionicons name={isLocked ? "lock-closed" : "sparkles"} size={12} color={isLocked ? "#D97706" : COLORS.primary} />
                                <Text style={[styles.premiumBadgeText, isLocked && { color: "#D97706" }]}>PREMIUM</Text>
                            </View>
                        )}
                    </View>
                    <Text style={styles.subtitle}>{session.subtitle}</Text>
                    
                    <View style={styles.metaRow}>
                        <View style={styles.metaItem}>
                            <Ionicons name="time-outline" size={16} color={COLORS.primary} />
                            <Text style={styles.metaText}>{session.durationMinutes} min</Text>
                        </View>
                        <View style={styles.metaItem}>
                            <Ionicons name="stats-chart-outline" size={16} color={COLORS.primary} />
                            <Text style={styles.metaText}>{session.difficulty}</Text>
                        </View>
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Goal</Text>
                    <Text style={styles.sectionText}>{session.goal}</Text>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Before You Start</Text>
                    {session.beforeYouStart.map((item, index) => (
                        <View key={index} style={styles.listItem}>
                            <Ionicons name="checkmark-circle-outline" size={18} color={COLORS.success} />
                            <Text style={styles.listText}>{item}</Text>
                        </View>
                    ))}
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>What to Watch For</Text>
                    {session.whatToWatchFor.map((item, index) => (
                        <View key={index} style={styles.listItem}>
                            <Ionicons name="eye-outline" size={18} color={COLORS.primary} />
                            <Text style={styles.listText}>{item}</Text>
                        </View>
                    ))}
                </View>

                <View style={styles.warningSection}>
                    <Text style={styles.warningTitle}>Stop the session if:</Text>
                    {session.stopIf.map((item, index) => (
                        <View key={index} style={styles.listItem}>
                            <Ionicons name="alert-circle-outline" size={18} color={COLORS.error} />
                            <Text style={[styles.listText, { color: COLORS.error }]}>{item}</Text>
                        </View>
                    ))}
                </View>
                
                <View style={styles.disclaimer}>
                    <Text style={styles.disclaimerText}>
                        ChillPup provides gentle routines and tracking tools for pet owners. It does not diagnose, treat, or cure anxiety or medical conditions.
                    </Text>
                </View>
            </ScrollView>

            <View style={styles.footer}>
                <Pressable
                    style={({ pressed }) => [
                        styles.startButton, 
                        isLocked && { backgroundColor: '#D97706' },
                        pressed && { opacity: 0.8 }
                    ]}
                    onPress={() => {
                        if (isLocked) {
                            navigation.navigate('Paywall', { source: 'premium_session' });
                        } else {
                            navigation.navigate('GuidedSession', { sessionId, petId });
                        }
                    }}
                >
                    <Text style={styles.startButtonText}>
                        {isLocked ? 'Unlock with Premium' : 'Start Session'}
                    </Text>
                </Pressable>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.backgroundLight },
    header: { flexDirection: 'row', alignItems: 'center', padding: 20 },
    backButton: { padding: 5 },
    headerTitle: { ...FONTS.h3, marginLeft: 10 },
    scrollContent: { padding: 20, paddingBottom: 100 },
    heroCard: { backgroundColor: '#fff', borderRadius: SIZES.radius, padding: 24, marginBottom: 24, ...SHADOWS.small },
    title: { ...FONTS.h1, color: COLORS.text, marginBottom: 8 },
    subtitle: { ...FONTS.body, color: COLORS.textSecondary, marginBottom: 20 },
    metaRow: { flexDirection: 'row', gap: 20 },
    metaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    metaText: { ...FONTS.caption, color: COLORS.textSecondary, textTransform: 'capitalize' },
    section: { marginBottom: 24 },
    sectionTitle: { ...FONTS.h3, color: COLORS.text, marginBottom: 12 },
    sectionText: { ...FONTS.body, color: COLORS.text, lineHeight: 24 },
    listItem: { flexDirection: 'row', gap: 12, marginBottom: 10, alignItems: 'flex-start' },
    listText: { ...FONTS.body, color: COLORS.text, flex: 1, lineHeight: 22 },
    warningSection: { backgroundColor: '#FEF2F2', borderRadius: SIZES.radius, padding: 16, marginBottom: 24 },
    warningTitle: { ...FONTS.h3, color: COLORS.error, marginBottom: 12 },
    disclaimer: { marginBottom: 20 },
    disclaimerText: { ...FONTS.small, color: COLORS.textSecondary, textAlign: 'center', fontStyle: 'italic' },
    footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: COLORS.border },
    startButton: { backgroundColor: COLORS.primary, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', ...SHADOWS.medium },
    startButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
    premiumBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#E0F2FE', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
    premiumBadgeText: { fontSize: 10, fontWeight: '800', color: COLORS.primary }
});
