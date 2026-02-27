const admin = require('firebase-admin');
const { readFileSync } = require('fs');

// Usage: node populate-content.js
// Ensure serviceAccountKey.json is in the root

try {
    const serviceAccount = JSON.parse(
        readFileSync('./serviceAccountKey.json', 'utf8')
    );

    if (admin.apps.length === 0) {
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
    }
} catch (e) {
    console.error("Error initializing Firebase Admin. content population skipped.", e.message);
    process.exit(1);
}

const db = admin.firestore();

const COURSE_ID = 'separation-anxiety-21-days';

const courseData = {
    title: '21-Day Separation Anxiety Cure',
    description: 'A comprehensive guide to helping your pet feel safe alone.',
    totalDays: 21,
    active: true,
    createdAt: admin.firestore.FieldValue.serverTimestamp()
};

const daysData = [
    {
        day: 1,
        title: 'Building a Safe Foundation',
        description: 'Establish a safe zone and introduce positive associations.',
        steps: [
            {
                order: 1,
                type: 'text',
                title: 'Welcome to Day 1',
                content: 'Today we focus on creating a Safe Zone where your pet feels secure.'
            },
            {
                order: 2,
                type: 'audio',
                title: 'Calming Audio Routine',
                content: 'Play this audio while your pet is in the safe zone.',
                audioUrl: 'https://storage.googleapis.com/ar-pet-coach-assets/audio/calm-day1.mp3' // Placeholder
            },
            {
                order: 3,
                type: 'exercise',
                title: '15-Second Door Drill',
                content: 'Walk to the door, touch the handle, walk away. Do not open it.',
                timerSeconds: 15,
                repetitions: 5
            },
            {
                order: 4,
                type: 'ar_session',
                title: 'Scan the Safe Zone',
                content: 'Use the AR Scanner to verify the safe zone setup.',
                arTarget: 'living-room'
            }
        ]
    },
    {
        day: 2,
        title: 'The Exit Cue',
        description: 'Desensitizing your pet to keys and shoes.',
        steps: [
            {
                order: 1,
                type: 'text',
                title: 'Understanding Triggers',
                content: 'Your pet knows you are leaving before you leave. Let\'s change that.'
            },
            {
                order: 2,
                type: 'exercise',
                title: 'The "Key Jingle" Drill',
                content: 'Pick up keys. Put them down. Give a treat. Ignore the door.',
                timerSeconds: 0,
                repetitions: 10
            }
        ]
    }
    // ... Add usage of loop for other days if needed
];

async function populate() {
    console.log(`Starting population for course: ${COURSE_ID}`);

    // 1. Set Course Doc
    await db.collection('courses').doc(COURSE_ID).set(courseData);
    console.log('Course doc set.');

    // 2. Set Days
    for (const day of daysData) {
        const dayRef = db.collection('courses').doc(COURSE_ID).collection('days').doc(`day-${day.day}`);
        await dayRef.set({
            day: day.day,
            title: day.title,
            description: day.description
        });

        // 3. Set Steps
        const stepsBatch = db.batch();
        for (const step of day.steps) {
            const stepRef = dayRef.collection('steps').doc(`step-${step.order}`);
            stepsBatch.set(stepRef, step);
        }
        await stepsBatch.commit();
        console.log(`  Populated Day ${day.day} with ${day.steps.length} steps.`);
    }

    // Populate remaining 19 days as placeholders
    for (let i = 3; i <= 21; i++) {
        const dayRef = db.collection('courses').doc(COURSE_ID).collection('days').doc(`day-${i}`);
        await dayRef.set({
            day: i,
            title: `Day ${i}: Continuing the Journey`,
            description: 'Exercises and tips for today.'
        });
    }
    console.log('  Populated remaining placeholder days.');

    console.log('Done!');
}

populate().catch(console.error);
