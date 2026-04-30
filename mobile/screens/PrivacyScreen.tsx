import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function PrivacyScreen({ navigation }: any) {
    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                <Ionicons name="chevron-back" size={24} color="#2563eb" />
                <Text style={styles.backText}>Back</Text>
            </TouchableOpacity>

            <Text style={styles.title}>Privacy Policy</Text>
            <Text style={styles.subtitle}>Last updated: December 2025</Text>
            <Text style={styles.paragraph}>
                At ChillPup, we take your privacy seriously. This policy describes how we collect, use, and protect your data.
            </Text>

            <Text style={styles.sectionTitle}>1. Data Collection</Text>
            <Text style={styles.paragraph}>• We collect your email for account management (if authenticated).</Text>
            <Text style={styles.paragraph}>• We store your pet's profile data (name, age, triggers) to personalize the experience.</Text>
            <Text style={styles.paragraph}>• We store session history and check-in notes to track progress.</Text>

            <Text style={styles.sectionTitle}>2. Data Usage</Text>
            <Text style={styles.paragraph}>
                Your data is used to provide personalized calming routines and track behavioral patterns. We do not sell your data to third parties.
            </Text>

            <Text style={styles.sectionTitle}>3. Full Policy</Text>
            <Text style={styles.paragraph}>
                For our complete Privacy Policy, please visit:
                https://www.kf-software.com/privacy-policy
            </Text>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    content: { padding: 24, paddingBottom: 50 },
    backButton: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
    backText: { color: '#2563eb', fontSize: 16, fontWeight: '600', marginLeft: 4 },
    title: { fontSize: 28, fontWeight: 'bold', marginBottom: 8, color: '#111' },
    subtitle: { fontSize: 14, color: '#666', marginBottom: 24 },
    sectionTitle: { fontSize: 20, fontWeight: '600', marginTop: 24, marginBottom: 12, color: '#111' },
    paragraph: { fontSize: 16, lineHeight: 24, color: '#444', marginBottom: 12 },
});
