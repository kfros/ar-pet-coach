const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

/**
 * handleRevenueCatWebhook - HTTPS Function
 * 
 * Receives webhook events from RevenueCat and updates the user's Firestore record.
 * This ensures the backend is in sync with the subscription status.
 */
exports.handleRevenueCatWebhook = functions.https.onRequest(async (req, res) => {
    // 1. Auth Validation
    // Standard Authorization: Bearer <secret>
    const authHeader = req.headers.authorization;
    const expectedSecret = process.env.REVENUECAT_WEBHOOK_SECRET;

    if (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`) {
        console.error('[RevenueCat Webhook] Unauthorized attempt or missing REVENUECAT_WEBHOOK_SECRET');
        return res.status(401).send('Unauthorized');
    }

    try {
        const event = req.body && req.body.event;

        if (!event) {
            console.error('[RevenueCat Webhook] No event found in request body');
            return res.status(400).send('No event found');
        }

        console.log('[RevenueCat Webhook] Received event:', event.type, 'for user:', event.app_user_id);

        const { app_user_id, type, expiration_at_ms } = event;

        if (!app_user_id) {
            console.warn('[RevenueCat Webhook] Missing app_user_id, skipping update');
            return res.status(200).send('OK');
        }

        // We assume app_user_id is the Firebase UID
        const userRef = admin.firestore().collection('users').doc(app_user_id);

        let isActive = false;
        let updates = {
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };

        // Minimal sync logic: only update is_active and expires_date
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
            // For CANCELLATION, we don't set is_active=false yet as they might have time left.
            // RevenueCat will send EXPIRATION when the period actually ends.
        }

        console.log(`[RevenueCat Webhook] Updating user ${app_user_id}. isActive: ${isActive}`);
        await userRef.set(updates, { merge: true });

        return res.status(200).send('OK');

    } catch (error) {
        console.error('[RevenueCat Webhook] Error processing event:', error);
        return res.status(500).send('Internal Server Error');
    }
});
