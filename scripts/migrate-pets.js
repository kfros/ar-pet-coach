const { readFileSync } = require('fs');

const admin = require('firebase-admin');
const { v4: uuidv4 } = require('uuid');

// Check for service account
// if (process.argv.length < 3) {
//     console.error("Usage: node migrate-pets.js <path-to-service-account-key.json>");
//     process.exit(1);
// }

// const serviceAccountPath = process.argv[2];
const serviceAccount = JSON.parse(
    readFileSync('./serviceAccountKey.json', 'utf8')
);

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function migrateUser(uid, userSnap) {
    const userData = userSnap.data();

    // 1. Create a deterministic petId (or UUID)
    // For MVP migration where we assume 1 user = 1 pet, we can generate a new ID.
    const petId = uuidv4();

    // 2. Build the pet document
    const petRef = db.collection('users').doc(uid).collection('pets').doc(petId);

    // Extract pet fields
    const {
        petName,
        breed,
        age,
        gender,
        weight,
        problems,
        alertLevel,
        ...restUserFields
    } = userData;

    // Only migrate if we actually have pet data
    if (!petName) {
        console.log(`Skipping user ${uid}: No petName found.`);
        return;
    }

    const petData = {
        petName,
        breed,
        age,
        gender,
        weight,
        problems: problems || [],
        alertLevel: alertLevel || 5, // Default
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    // 3. Write the pet document
    await petRef.set(petData);

    // 4. Create a default safe-zone
    const safeZoneRef = petRef.collection('safeZones').doc('default-zone');
    await safeZoneRef.set({
        type: 'calm_circle', // Default type
        name: 'Living Room (Default)',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // 5. Clean up the root user document
    // In a real prod migration, we might keep them for a bit or backup first.
    // For this tasks, we'll leave the root data as is (safe) or remove if requested.
    // We will NOT delete currently to be safe.

    console.log(`✅ Migrated user ${uid} -> pet ${petId}`);
}

async function runMigration() {
    const usersSnap = await db.collection('users').get();
    console.log(`Found ${usersSnap.size} user documents.`);

    const batchSize = 500;
    let batch = db.batch();
    let ops = 0;

    for (const userDoc of usersSnap.docs) {
        await migrateUser(userDoc.id, userDoc);
        ops++;

        // We are doing individual awaits inside migrateUser for simplicity in this script,
        // but typically we'd use the batch object.
        // For this MVP script, we used direct awaits which is slower but simpler for < 100 users.
    }

    console.log('🚀 Migration complete.');
}

runMigration().catch(console.error);
