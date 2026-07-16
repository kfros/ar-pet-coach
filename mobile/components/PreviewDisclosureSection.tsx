import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS } from '../constants/Theme';

interface PreviewDisclosureSectionProps {
    title: string | ((expanded: boolean) => string);
    collapsedMeta?: string;
    testID?: string;
    initialExpanded?: boolean;
    children: React.ReactNode;
}

export default function PreviewDisclosureSection({
    title,
    collapsedMeta,
    testID,
    initialExpanded = false,
    children
}: PreviewDisclosureSectionProps) {
    const [expanded, setExpanded] = useState(initialExpanded);
    const resolvedTitle = typeof title === 'function' ? title(expanded) : title;

    return (
        <View style={styles.container}>
            <Pressable
                style={({ pressed }) => [
                    styles.header,
                    pressed && styles.headerPressed
                ]}
                onPress={() => setExpanded(!expanded)}
                accessibilityRole="button"
                accessibilityState={{ expanded }}
                accessibilityLabel={`${resolvedTitle}${collapsedMeta ? `, ${collapsedMeta}` : ''}`}
                testID={testID}
            >
                <View style={styles.headerLeft}>
                    <Text style={styles.title}>{resolvedTitle}</Text>
                    {collapsedMeta && !expanded && (
                        <Text style={styles.meta} testID={`${testID}-meta`}>{collapsedMeta}</Text>
                    )}
                </View>
                <Ionicons
                    name={expanded ? "chevron-up" : "chevron-down"}
                    size={20}
                    color={COLORS.textSecondary}
                />
            </Pressable>
            {expanded && (
                <View style={styles.content} testID={`${testID}-content`}>
                    {children}
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
        backgroundColor: COLORS.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 14,
        paddingHorizontal: 20,
        minHeight: 48,
    },
    headerPressed: {
        backgroundColor: COLORS.backgroundLight,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        marginRight: 8,
    },
    title: {
        ...FONTS.h3,
        color: COLORS.text,
    },
    meta: {
        ...FONTS.caption,
        color: COLORS.textSecondary,
        marginLeft: 12,
        backgroundColor: COLORS.backgroundLight,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 12,
        overflow: 'hidden',
    },
    content: {
        paddingHorizontal: 20,
        paddingBottom: 16,
    }
});
