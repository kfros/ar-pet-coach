import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Alert, Platform, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { auth } from '../services/firebaseConfig';
import { COLORS, FONTS, SIZES, SHADOWS } from '../constants/Theme';
import DeleteAccountModal from '../components/DeleteAccountModal';
import { deleteUserAccount } from '../services/authService';

export default function AccountScreen({ navigation }: any) {
    const user = auth().currentUser;
    const [modalVisible, setModalVisible] = useState(false);

    const handleDeletePress = () => {
        Alert.alert(
            "Delete Account?",
            "This action will permanently delete your account and cannot be undone.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Continue",
                    style: "destructive",
                    onPress: () => setModalVisible(true)
                }
            ]
        );
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Pressable
                    onPress={() => navigation.goBack()}
                    style={({ pressed }) => [
                        styles.backButton,
                        pressed && { opacity: 0.7 }
                    ]}
                >
                    <Ionicons name="arrow-back" size={24} color={COLORS.text} />
                </Pressable>
                <Text style={styles.headerTitle}>Account</Text>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.infoSection}>
                    <Text style={styles.label}>Email Address</Text>
                    <Text style={styles.value}>{user?.email || 'Guest User'}</Text>
                </View>

                <View style={styles.divider} />

                <View style={styles.destructiveSection}>
                    <Text style={styles.sectionTitle}>Account Actions</Text>
                    <Text style={styles.description}>
                        Deleting your account will remove all your data from our servers.
                        This will delete your account, pet profiles, session history, and check-in data.
                    </Text>
                    <Text style={styles.infoSection}>
                        Subscriptions are managed by Apple and must be cancelled in your device settings (Settings → Apple ID → Subscriptions).
                    </Text>

                    <Pressable
                        style={({ pressed }) => [
                            styles.deleteBtn,
                            pressed && { opacity: 0.8, transform: [{ scale: 0.98 }] }
                        ]}
                        onPress={handleDeletePress}
                    >
                        <Ionicons name="trash-outline" size={20} color="#fff" />
                        <Text style={styles.deleteBtnText}>Delete Account</Text>
                    </Pressable>
                </View>
            </ScrollView>

            <DeleteAccountModal
                visible={modalVisible}
                onClose={() => setModalVisible(false)}
                navigation={navigation}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.backgroundLight,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: SIZES.padding,
        paddingTop: Platform.OS === 'ios' ? 60 : 40,
        paddingBottom: 20,
        backgroundColor: COLORS.backgroundLight,
    },
    backButton: {
        padding: 8,
        marginLeft: -8,
        marginRight: 8,
    },
    headerTitle: {
        ...FONTS.h2,
        color: COLORS.text,
    },
    content: {
        padding: SIZES.padding,
    },
    infoSection: {
        backgroundColor: '#fff',
        padding: 20,
        borderRadius: SIZES.radius,
        ...SHADOWS.small,
    },
    label: {
        ...FONTS.caption,
        color: COLORS.textSecondary,
        marginBottom: 4,
    },
    value: {
        ...FONTS.body,
        color: COLORS.text,
        fontWeight: '600',
    },
    divider: {
        height: 1,
        backgroundColor: COLORS.border,
        marginVertical: 32,
    },
    destructiveSection: {
        backgroundColor: '#fff',
        padding: 20,
        borderRadius: SIZES.radius,
        borderWidth: 1,
        borderColor: COLORS.error + '20',
        ...SHADOWS.small,
    },
    sectionTitle: {
        ...FONTS.h3,
        color: COLORS.error,
        marginBottom: 12,
    },
    description: {
        ...FONTS.small,
        color: COLORS.textSecondary,
        lineHeight: 20,
        marginBottom: 24,
    },
    deleteBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: COLORS.error,
        padding: 16,
        borderRadius: 12,
        gap: 8,
    },
    deleteBtnText: {
        ...FONTS.body,
        color: '#fff',
        fontWeight: 'bold',
    },
});
