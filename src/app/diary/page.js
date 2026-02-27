'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Plus, Save } from 'lucide-react';
import { auth, db } from '@/lib/firebase';
import { collection, query, orderBy, limit, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';

export default function Diary() {
    const router = useRouter();
    const [notes, setNotes] = useState([]);
    const [newNote, setNewNote] = useState('');
    const [loading, setLoading] = useState(true);

    // Mock data for the chart
    const progressData = [
        { day: 'Day 1', level: 8 },
        { day: 'Day 7', level: 6 },
        { day: 'Day 14', level: 4 },
        { day: 'Day 21', level: 2 },
    ];

    useEffect(() => {
        // Fetch notes logic would go here
        // For now, just simulate loading
        setTimeout(() => setLoading(false), 1000);
    }, []);

    const handleSaveNote = async () => {
        if (!newNote.trim()) return;

        // Save to Firestore
        // await addDoc(collection(db, 'users', auth.currentUser.uid, 'notes'), {
        //   content: newNote,
        //   createdAt: serverTimestamp()
        // });

        setNotes([{ id: Date.now(), content: newNote, date: new Date().toLocaleDateString() }, ...notes]);
        setNewNote('');
    };

    return (
        <main className="min-h-screen bg-background pb-20">
            <header className="p-4 flex items-center gap-4 border-b border-border bg-card">
                <button onClick={() => router.back()} className="p-2 hover:bg-muted rounded-full">
                    <ChevronLeft size={24} />
                </button>
                <h1 className="text-xl font-bold">Progress Diary</h1>
            </header>

            <div className="container py-6 space-y-8">

                {/* Progress Chart */}
                <div className="card space-y-4">
                    <h2 className="font-bold text-lg">Anxiety Level Progress</h2>
                    <div className="h-48 flex items-end justify-between gap-2 px-2">
                        {progressData.map((d, i) => (
                            <div key={i} className="flex flex-col items-center gap-2 flex-1">
                                <div
                                    className="w-full bg-primary/20 rounded-t-lg relative group"
                                    style={{ height: `${d.level * 10}%` }}
                                >
                                    <div className="absolute bottom-0 w-full bg-primary rounded-t-lg transition-all duration-1000" style={{ height: '100%' }}></div>
                                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-popover text-popover-foreground text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                                        Level: {d.level}
                                    </div>
                                </div>
                                <span className="text-xs text-muted-foreground">{d.day}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Notes Section */}
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <h2 className="font-bold text-lg">Owner's Notes</h2>
                    </div>

                    {/* New Note Input */}
                    <div className="card space-y-3">
                        <textarea
                            value={newNote}
                            onChange={(e) => setNewNote(e.target.value)}
                            placeholder="How was your pet today?"
                            className="w-full bg-background p-3 rounded-lg border border-input focus:ring-2 focus:ring-primary outline-none min-h-[100px]"
                        />
                        <div className="flex justify-end">
                            <button onClick={handleSaveNote} className="btn btn-primary btn-sm text-sm px-4 py-2">
                                <Save size={16} className="mr-2" />
                                Save Note
                            </button>
                        </div>
                    </div>

                    {/* Notes List */}
                    <div className="space-y-3">
                        {notes.length === 0 ? (
                            <p className="text-center text-muted-foreground py-8">No notes yet.</p>
                        ) : (
                            notes.map((note) => (
                                <div key={note.id} className="card p-4">
                                    <p className="text-sm text-muted-foreground mb-2">{note.date}</p>
                                    <p>{note.content}</p>
                                </div>
                            ))
                        )}
                    </div>
                </div>

            </div>
        </main>
    );
}
