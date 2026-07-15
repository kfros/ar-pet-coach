import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, FONTS } from '../constants/Theme';

interface TemporaryTabScreenProps {
    title: string;
    testID: string;
}

export function TemporaryTabScreen({ title, testID }: TemporaryTabScreenProps) {
    return (
        <SafeAreaView style={styles.container} testID={testID}>
            <View style={styles.content}>
                <Text style={styles.title}>{title}</Text>
                <Text style={styles.subtitle}>This section is being prepared.</Text>
            </View>
        </SafeAreaView>
    );
}

export function SoundsScreen() {
    return <TemporaryTabScreen title="Sounds" testID="sounds-tab-screen" />;
}

export function ProgressScreen() {
    return <TemporaryTabScreen title="Progress" testID="progress-tab-screen" />;
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.backgroundLight,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    title: {
        ...FONTS.h2,
        color: COLORS.text,
        marginBottom: 8,
        textAlign: 'center',
    },
    subtitle: {
        ...FONTS.body,
        color: COLORS.textSecondary,
        textAlign: 'center',
    },
});
