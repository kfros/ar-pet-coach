import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function TermsScreen({ navigation }: any) {
    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                <Ionicons name="chevron-back" size={24} color="#2563eb" />
                <Text style={styles.backText}>Back</Text>
            </TouchableOpacity>

            <Text style={styles.title}>Terms of Service</Text>
            <Text style={styles.subtitle}>Last updated: December 2025</Text>
            <Text style={styles.paragraph}>
                By using the Pet Anxiety Coach application, you agree to the following terms.
            </Text>

            <Text style={styles.sectionTitle}>1. Medical Disclaimer</Text>
            <Text style={styles.paragraph}>
                This app provides advice and training protocols but is NOT a substitute for professional veterinary care. If your pet shows signs of severe aggression or health issues, consult a vet immediately.
            </Text>

            <Text style={styles.sectionTitle}>2. Liability</Text>
            <Text style={styles.paragraph}>
                We are not liable for any behavioral issues that may arise or persist during the use of this app. Results may vary for every pet.
            </Text>

            <Text style={styles.sectionTitle}>3. Subscriptions</Text>
            <Text style={styles.paragraph}>
                Premium subscriptions are billed annually or monthly. You can cancel at any time in your account settings.
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
