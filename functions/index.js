const functions = require('firebase-functions');
const admin = require('firebase-admin');
const path = require('path');
const os = require('os');
const fs = require('fs-extra');
const { spawn } = require('child_process');

admin.initializeApp();

// Path to the NFT Marker Creator script
const scriptPath = require.resolve('@webarkit/nft-marker-creator-app/src/NFTMarkerCreator.js');

exports.generateNFTMarker = functions
    .runWith({
        timeoutSeconds: 450,
        memory: '2GB'
    })
    .storage.object().onFinalize(async (object) => {
        const filePath = object.name; // e.g., nft/{uid}/{petId}/{timestamp}.jpg
        const contentType = object.contentType;

        // 1. Validation
        if (!contentType || !contentType.startsWith('image/')) {
            console.log('Skipping non-image file:', filePath);
            return null;
        }

        const fileName = path.basename(filePath);
        // Skip if it's already an artifact or not in the expected path
        if (fileName.endsWith('.fset') || fileName.endsWith('.iset') || fileName.endsWith('.fset3') || !filePath.startsWith('nft/')) {
            console.log('Skipping artifact or non-nft path:', filePath);
            return null;
        }

        console.log('Processing new image:', filePath);

        const bucket = admin.storage().bucket(object.bucket);
        const workingDir = path.join(os.tmpdir(), 'nft_gen_' + Date.now());
        const tempFilePath = path.join(workingDir, fileName);
        const outputDir = path.join(workingDir, 'output');

        await fs.ensureDir(workingDir);
        await fs.ensureDir(outputDir);

        try {
            // 2. Download Source Image
            console.log('Downloading to:', tempFilePath);
            await bucket.file(filePath).download({ destination: tempFilePath });

            // 3. Run NFT Marker Creator
            console.log('Spawning generator...');
            await new Promise((resolve, reject) => {
                const child = spawn('node', [scriptPath, '-i', tempFilePath, '-o', outputDir], {
                    cwd: workingDir,
                    env: { ...process.env, FORCE_COLOR: '1' } // optional
                });

                child.stdout.on('data', (data) => console.log(`[Generator]: ${data}`));
                child.stderr.on('data', (data) => console.error(`[Generator Error]: ${data}`));

                child.on('close', (code) => {
                    if (code === 0) resolve();
                    else reject(new Error(`Generator exited with code ${code}`));
                });
            });

            // 4. Upload Artifacts
            const generatedFiles = await fs.readdir(outputDir);
            if (generatedFiles.length === 0) {
                throw new Error('No files generated in output directory');
            }

            console.log('Generated files:', generatedFiles);

            const uploadPromises = generatedFiles.map(async (file) => {
                const destination = path.dirname(filePath) + '/' + file;
                console.log(`Uploading ${file} to ${destination}...`);
                await bucket.upload(path.join(outputDir, file), {
                    destination: destination,
                    metadata: {
                        contentType: 'application/octet-stream' // or appropriate type
                    }
                });
                return destination;
            });

            await Promise.all(uploadPromises);

            // 5. Update Firestore
            // Path logic: nft/{uid}/{petId}/{timestamp}.jpg
            const parts = filePath.split('/');
            // parts[0] = 'nft', parts[1] = uid, parts[2] = petId, parts[3] = filename
            if (parts.length >= 4) {
                const uid = parts[1];
                const petId = parts[2];
                // Name without extension for the marker URL
                const markerName = path.parse(fileName).name;

                const safeZonesRef = admin.firestore().collection('users').doc(uid).collection('pets').doc(petId).collection('safeZones');
                // Query by the EXACT storage path we saved in scan-room/page.js
                console.log(`[DEBUG] Querying Firestore for storagePath: "${filePath}"`);
                const snapshot = await safeZonesRef.where('storagePath', '==', filePath).get();

                if (snapshot.empty) {
                    console.error(`[ERROR] No matching document found for path: "${filePath}". Documents in collection may not have correct storagePath.`);
                    // Optional: Log all docs in this collection to debug
                    const allDocs = await safeZonesRef.get();
                    console.log(`[DEBUG] Docs in collection: ${allDocs.size}`);
                    allDocs.forEach(d => console.log(`[DEBUG] Found doc ${d.id} with path: ${d.data().storagePath}`));
                    return;
                }

                console.log(`[DEBUG] Found ${snapshot.size} matching documents.`);

                const updates = [];
                snapshot.forEach(doc => {
                    console.log(`[DEBUG] Updating doc ${doc.id} (current status: ${doc.data().markerStatus}) to ready.`);
                    updates.push(doc.ref.update({
                        markerStatus: 'ready',
                        markerPath: `nft/${uid}/${petId}/${markerName}`, // Stored path prefix
                        updatedAt: admin.firestore.FieldValue.serverTimestamp()
                    }));
                });

                await Promise.all(updates);
                console.log(`[DEBUG] Successfully updated ${updates.length} Firestore documents.`);


            }

        } catch (err) {
            console.error('Error in generateNFTMarker:', err);
        } finally {
            await fs.remove(workingDir);
        }
    });

/**
 * exchangeToken - HTTPS Callable Function
 * 
 * Exchanges a Firebase ID Token for a Custom Token.
 * This allows WebViews to authenticate as the real user instead of anonymously.
 * 
 * @param {Object} data - Contains the idToken from the React Native app
 * @returns {Object} - Contains the customToken for signInWithCustomToken()
 */
exports.exchangeToken = functions.https.onCall(async (data, context) => {
    const { idToken } = data;

    if (!idToken) {
        throw new functions.https.HttpsError(
            'invalid-argument',
            'Missing idToken in request data'
        );
    }

    try {
        // 1. Verify the ID Token
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        const uid = decodedToken.uid;

        console.log(`[exchangeToken] Verified token for user: ${uid}`);

        // 2. Create a Custom Token for this user
        const customToken = await admin.auth().createCustomToken(uid);

        console.log(`[exchangeToken] Created custom token for user: ${uid}`);

        // 3. Return the custom token
        return { customToken };

    } catch (error) {
        console.error('[exchangeToken] Error:', error);
        throw new functions.https.HttpsError(
            'unauthenticated',
            'Failed to verify ID token: ' + error.message
        );
    }
});

/**
 * handleRevenueCatWebhook - HTTPS Function
 * 
 * Receives webhook events from RevenueCat and updates the user's Firestore record.
 * This ensures the backend is in sync with the subscription status.
 */
exports.handleRevenueCatWebhook = functions.https.onRequest(async (req, res) => {
    try {
        const event = req.body && req.body.event;

        if (!event) {
            console.error('No event found in request body');
            return res.status(400).send('No event found');
        }

        console.log('Received RevenueCat event:', event.type, 'for user:', event.app_user_id);

        const { app_user_id, type, entitlement_id, expiration_at_ms } = event;

        // We assume app_user_id is the Firebase UID
        const userRef = admin.firestore().collection('users').doc(app_user_id);

        // Update logic based on event type
        // Common types: INITIAL_PURCHASE, RENEWAL, CANCELLATION, UNCANCELLATION, EXPIRATION

        let isActive = false;
        let updates = {
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };

        if (['INITIAL_PURCHASE', 'RENEWAL', 'UNCANCELLATION', 'PRODUCT_CHANGE'].includes(type)) {
            isActive = true;
            updates.is_active = true;
            if (expiration_at_ms) {
                updates.expires_date = admin.firestore.Timestamp.fromMillis(expiration_at_ms);
            }
        } else if (['EXPIRATION', 'CANCELLATION', 'BILLING_ISSUE'].includes(type)) {
            if (type === 'EXPIRATION') {
                isActive = false;
                updates.is_active = false;
            }
        }

        // Only update if we have a valid mapping or logic
        console.log(`Updating user ${app_user_id} with status: ${isActive ? 'ACTIVE' : 'INACTIVE/CHECK_EXPIRY'}`);
        await userRef.set(updates, { merge: true });

        return res.status(200).send('OK');

    } catch (error) {
        console.error('Error handling RevenueCat webhook:', error);
        return res.status(500).send('Internal Server Error');
    }
});
