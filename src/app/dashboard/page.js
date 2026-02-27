'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, collection, query, limit, getDocs, deleteDoc, where, writeBatch } from 'firebase/firestore';
import { Activity, Camera, Calendar, Bell, Map as MapIcon, PlayCircle, Trash2 } from 'lucide-react';
import Modal from 'react-bootstrap/Modal';
import Button from 'react-bootstrap/Button';
import 'bootstrap/dist/css/bootstrap.min.css';
import Paywall from '@/components/Paywall';
import SettingsMenu from '@/components/SettingsMenu';

export default function Dashboard() {
    const router = useRouter();
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showPaywall, setShowPaywall] = useState(false);
    const [petId, setPetId] = useState('default-pet'); // Initial fallback
    const [safeZones, setSafeZones] = useState([]);
    const [showRoomSelector, setShowRoomSelector] = useState(false);
    const [petData, setPetData] = useState(null);
    const [todaysContent, setTodaysContent] = useState(null);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                setUser(currentUser);

                // 1. Get User Profile (MVP root data)
                const docRef = doc(db, 'users', currentUser.uid);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    setProfile(docSnap.data());

                    // 2. Get Dynamic Pet ID & Check Safe Zones
                    try {
                        const petsRef = collection(db, 'users', currentUser.uid, 'pets');
                        const q = query(petsRef, limit(1));
                        const querySnapshot = await getDocs(q);

                        if (!querySnapshot.empty) {
                            const petDoc = querySnapshot.docs[0];
                            const realPetId = petDoc.id;
                            setPetId(realPetId);
                            setPetData(petDoc.data()); // Store pet data including anxietyScore

                            // Fetch Daily Content
                            const currentDay = petDoc.data().currentDay || 1;
                            const dayRef = doc(db, 'courses', 'separation-anxiety-21-days', 'days', `day-${currentDay}`);
                            const daySnap = await getDoc(dayRef);
                            if (daySnap.exists()) {
                                setTodaysContent(daySnap.data());
                            } else {
                                setTodaysContent({
                                    day: currentDay,
                                    title: "Day " + currentDay,
                                    description: "Coming soon..."
                                });
                            }

                            // Check for existing MindAR Safe Zones (Fetch ALL)
                            const { where, orderBy } = await import('firebase/firestore');
                            const zoneRef = collection(db, 'users', currentUser.uid, 'pets', realPetId, 'safeZones');
                            const zQ = query(zoneRef, where('type', '==', 'mindar'), orderBy('createdAt', 'desc'));
                            const zSnap = await getDocs(zQ);

                            if (!zSnap.empty) {
                                const zones = zSnap.docs.map(d => ({ id: d.id, ...d.data() }));
                                setSafeZones(zones);
                            }
                        }
                    } catch (err) {
                        console.error("Error fetching pet/zone data:", err);
                    }
                } else {
                    router.push('/onboarding');
                }
            } else {
                router.push('/');
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, [router]);

    const handleARAction = () => {
        if (safeZones.length === 0) {
            // No zones -> Setup
            router.push(`/scan-room?userId=${user.uid}&petId=${petId}`);
        } else if (safeZones.length === 1) {
            // One zone -> Open directly
            window.location.href = `/mindar-safe-zone.html?userId=${user.uid}&petId=${petId}&zoneId=${safeZones[0].id}`;
        } else {
            // Multiple zones -> Select
            setShowRoomSelector(true);
        }
    };

    const openZone = (zoneId) => {
        window.location.href = `/mindar-safe-zone.html?userId=${user.uid}&petId=${petId}&zoneId=${zoneId}`;
    };

    const handleDeleteZone = async (zoneId, e) => {
        e.stopPropagation();
        if (!confirm("Delete this room? This cannot be undone.")) return;

        try {
            const batch = writeBatch(db);

            // 1. Delete Associated Activity Points
            const pointsRef = collection(db, 'users', user.uid, 'pets', petId, 'activityPoints');
            const pointsQuery = query(pointsRef, where('zoneId', '==', zoneId));
            const pointsSnap = await getDocs(pointsQuery);

            pointsSnap.docs.forEach((doc) => {
                batch.delete(doc.ref);
            });

            // 2. Delete the Zone itself
            const zoneRef = doc(db, 'users', user.uid, 'pets', petId, 'safeZones', zoneId);
            batch.delete(zoneRef);

            await batch.commit();

            setSafeZones(prev => prev.filter(z => z.id !== zoneId));
            if (safeZones.length <= 1) setShowRoomSelector(false); // Close if empty or 1 left
        } catch (error) {
            console.error("Error deleting zone:", error);
            alert("Failed to delete room.");
        }
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
    if (!profile) return null;

    return (
        <main className="min-h-screen pb-20 bg-background relative">
            {/* Header */}
            <header className="p-6 flex justify-between items-center bg-card border-b border-border">
                <h1 className="text-xl font-bold">Pet Anxiety Coach</h1>
                <SettingsMenu />
            </header>

            <div className="container py-6 space-y-6">

                {/* Pet Profile Card */}
                <div className="card flex gap-4 items-center">
                    <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center overflow-hidden border-2 border-primary">
                        <span className="text-2xl">🐶</span>
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold">{profile.petName}</h2>
                        <p className="text-muted-foreground">{profile.breed} • {profile.age}y • {profile.weight}kg</p>
                    </div>
                </div>

                {/* Alert Level */}
                <div className="card space-y-2">
                    <div className="flex justify-between items-center">
                        <h3 className="font-semibold flex items-center gap-2">
                            <Activity size={18} className="text-destructive" />
                            Anxiety Alert Level
                        </h3>
                        <span className="text-2xl font-bold text-destructive">{petData?.anxietyScore ?? 0}/10</span>
                    </div>
                    <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                        <div
                            className="h-full bg-destructive transition-all duration-500"
                            style={{ width: `${((petData?.anxietyScore ?? 0) / 10) * 100}%` }}
                        />
                    </div>
                    <p className="text-xs text-muted-foreground text-right">Auto-updating based on analysis</p>
                </div>

                {/* Quick Actions Horizontal Scroll */}
                <div className="flex gap-4 overflow-x-auto pb-4 snap-x pr-4 -mx-6 px-6 scrollbar-hide">
                    {/* Primary AR Action */}
                    {/* Button 1: Activity Heatmap (Merged View) */}
                    <button
                        disabled={safeZones.length === 0}
                        onClick={handleARAction}
                        className={`card min-w-[160px] flex flex-col items-center justify-center gap-4 hover:border-primary transition-colors py-8 snap-center ${safeZones.length === 0 ? 'opacity-50 cursor-not-allowed grayscale' : ''}`}
                    >
                        <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 shadow-sm">
                            <MapIcon size={28} />
                        </div>
                        <span className="font-semibold text-center">
                            Activity Heatmap
                        </span>
                        {safeZones.length === 0 && <span className="text-xs text-muted-foreground">(Scan Room First)</span>}
                    </button>

                    {/* Button 2: Add New Room (Always Active) */}
                    <button
                        onClick={() => router.push(`/scan-room?petId=${petId}`)}
                        className="card min-w-[160px] flex flex-col items-center justify-center gap-4 hover:border-primary transition-colors py-8 snap-center"
                    >
                        <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-primary shadow-sm">
                            <Camera size={28} />
                        </div>
                        <span className="font-semibold text-center">Add New Room</span>
                    </button>

                    <button
                        onClick={() => setShowPaywall(true)}
                        className="card min-w-[160px] flex flex-col items-center justify-center gap-4 hover:border-primary transition-colors py-8 snap-center"
                    >
                        <div className="w-14 h-14 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 shadow-sm">
                            <Calendar size={28} />
                        </div>
                        <span className="font-semibold text-center">Schedule Plan</span>
                    </button>

                    <button
                        onClick={() => router.push('/analysis')}
                        className="card min-w-[160px] flex flex-col items-center justify-center gap-4 hover:border-primary transition-colors py-8 snap-center"
                    >
                        <div className="w-14 h-14 rounded-full bg-accent/10 flex items-center justify-center text-accent shadow-sm">
                            <Bell size={28} />
                        </div>
                        <span className="font-semibold text-center">Analyze Bark</span>
                    </button>

                    <button
                        onClick={() => router.push('/diary')}
                        className="card min-w-[160px] flex flex-col items-center justify-center gap-4 hover:border-primary transition-colors py-8 snap-center"
                    >
                        <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center text-foreground shadow-sm">
                            <Calendar size={28} />
                        </div>
                        <span className="font-semibold text-center">Diary</span>
                    </button>
                </div>

                {/* Daily Task Teaser */}
                {todaysContent && (
                    <div className="card bg-gradient-to-br from-primary/20 to-transparent border-primary/50 relative overflow-hidden">
                        <div className="relative z-10">
                            <div className="flex justify-between items-start mb-2">
                                <h3 className="font-bold text-lg">Day {todaysContent.day}: {todaysContent.title}</h3>
                                <span className="bg-primary text-white text-xs px-2 py-1 rounded-full">Today</span>
                            </div>
                            <p className="text-sm mb-4 line-clamp-2">{todaysContent.description}</p>
                            <button className="btn btn-primary w-full text-sm flex items-center justify-center gap-2">
                                <PlayCircle size={16} /> Start Daily Routine
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Room Selector Modal - React Bootstrap */}
            <Modal
                show={showRoomSelector}
                onHide={() => setShowRoomSelector(false)}
                centered
                size="md"
            >
                <Modal.Header closeButton>
                    <Modal.Title>Select a Room</Modal.Title>
                </Modal.Header>
                <Modal.Body style={{ maxHeight: '60vh', overflowY: 'auto' }}>
                    {safeZones.map((zone) => (
                        <div
                            key={zone.id}
                            onClick={() => openZone(zone.id)}
                            className="d-flex align-items-center gap-3 p-3 rounded mb-2 border"
                            style={{ cursor: 'pointer' }}
                            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f8f9fa'}
                            onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                            {/* Thumbnail */}
                            <div style={{ width: 64, height: 64, borderRadius: 8, overflow: 'hidden', flexShrink: 0, backgroundColor: '#e9ecef', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>
                                {zone.thumbnail ? (
                                    <img src={zone.thumbnail} alt={zone.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : (
                                    '📺'
                                )}
                            </div>

                            {/* Info */}
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontWeight: 'bold' }}>{zone.name || 'Untitled Room'}</div>
                                <div style={{ fontSize: 12, color: '#6c757d' }}>
                                    📅 {new Date(zone.createdAt?.seconds * 1000).toLocaleDateString()}
                                </div>
                            </div>

                            {/* Delete Button */}
                            <Button
                                variant="outline-danger"
                                size="sm"
                                onClick={(e) => handleDeleteZone(zone.id, e)}
                                title="Delete Room"
                            >
                                <Trash2 size={16} />
                            </Button>
                        </div>
                    ))}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowRoomSelector(false)}>
                        Close
                    </Button>
                    <Button variant="primary" onClick={() => { setShowRoomSelector(false); router.push(`/scan-room?petId=${petId}`); }}>
                        + Scan New Room
                    </Button>
                </Modal.Footer>
            </Modal>

            {showPaywall && <Paywall onClose={() => setShowPaywall(false)} />}
        </main>
    );
}
