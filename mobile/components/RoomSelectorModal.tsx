import React from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet, FlatList, Image, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { db, auth } from '../services/firebaseConfig';

interface RoomSelectorModalProps {
    visible: boolean;
    onClose: () => void;
    safeZones: any[];
    onSelectZone: (zoneId: string) => void;
    petId: string;
    onZoneDeleted: (zoneId: string) => void;
}

export default function RoomSelectorModal({ visible, onClose, safeZones, onSelectZone, petId, onZoneDeleted }: RoomSelectorModalProps) {
    const user = auth().currentUser;


    const handleDelete = async (zoneId: string) => {
        if (!user) return;

        Alert.alert(
            "Delete Room",
            "Are you sure you want to delete this room? This cannot be undone.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            const batch = db.batch();

                            // 1. Delete Associated Activity Points
                            const pointsSnap = await db.collection('users')
                                .doc(user.uid)
                                .collection('pets')
                                .doc(petId)
                                .collection('activityPoints')
                                .where('zoneId', '==', zoneId).get();

                            pointsSnap.docs.forEach((doc: any) => {
                                batch.delete(doc.ref);
                            });

                            // 2. Delete the Zone itself
                            const zoneRef = db.collection('users')
                                .doc(user.uid)
                                .collection('pets')
                                .doc(petId)
                                .collection('safeZones')
                                .doc(zoneId);
                            batch.delete(zoneRef);

                            await batch.commit();
                            onZoneDeleted(zoneId);
                        } catch (error) {
                            console.error("Error deleting zone:", error);
                            Alert.alert("Error", "Failed to delete room");
                        }
                    }
                }
            ]
        );
    };

    const renderItem = ({ item }: { item: any }) => (
        <TouchableOpacity
            style={styles.roomItem}
            onPress={() => onSelectZone(item.id)}
        >
            <View style={styles.thumbnail}>
                {item.thumbnail ? (
                    <Image source={{ uri: item.thumbnail }} style={styles.thumbImage} />
                ) : (
                    <Text style={{ fontSize: 24 }}>📺</Text>
                )}
            </View>
            <View style={styles.info}>
                <Text style={styles.name}>{item.name || 'Untitled Room'}</Text>
                <Text style={styles.date}>
                    {item.createdAt?.seconds ? new Date(item.createdAt.seconds * 1000).toLocaleDateString() : 'Unknown Date'}
                </Text>
            </View>
            <TouchableOpacity
                style={styles.deleteBtn}
                onPress={() => handleDelete(item.id)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
                <Ionicons name="trash-outline" size={20} color="#ef4444" />
            </TouchableOpacity>
        </TouchableOpacity>
    );

    return (
        <Modal
            animationType="slide"
            transparent={true}
            visible={visible}
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <View style={styles.header}>
                        <Text style={styles.title}>Select a Room</Text>
                        <TouchableOpacity onPress={onClose}>
                            <Ionicons name="close" size={24} color="#000" />
                        </TouchableOpacity>
                    </View>

                    <FlatList
                        data={safeZones}
                        keyExtractor={item => item.id}
                        renderItem={renderItem}
                        contentContainerStyle={styles.listContent}
                        ListEmptyComponent={<Text style={styles.emptyText}>No rooms found.</Text>}
                    />

                    <TouchableOpacity
                        style={styles.scanButton}
                        onPress={() => {
                            onClose();
                            // Trigger scan logic from parent if needed, or parent handles navigation based on empty list?
                            // Actually parent should handle 'Scan' separately, but this modal offers it too
                        }}
                    >
                        <Text style={styles.scanText}>Close</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 20,
        maxHeight: '80%',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#111',
    },
    listContent: {
        paddingBottom: 20,
    },
    roomItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        backgroundColor: '#f8f9fa',
        borderRadius: 12,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#e5e5e5',
    },
    thumbnail: {
        width: 60,
        height: 60,
        borderRadius: 8,
        backgroundColor: '#e9ecef',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
        overflow: 'hidden',
    },
    thumbImage: {
        width: '100%',
        height: '100%',
    },
    info: {
        flex: 1,
    },
    name: {
        fontWeight: '600',
        fontSize: 16,
        color: '#111',
        marginBottom: 4,
    },
    date: {
        fontSize: 12,
        color: '#666',
    },
    deleteBtn: {
        padding: 8,
    },
    emptyText: {
        textAlign: 'center',
        color: '#666',
        marginTop: 20,
    },
    scanButton: {
        backgroundColor: '#f3f4f6',
        padding: 14,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 10,
    },
    scanText: {
        color: '#111',
        fontWeight: '600',
    },
});
