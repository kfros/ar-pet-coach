import { auth, db } from './firebaseConfig';
import RevenueCatService from './revenueCatService';
import { Alert } from 'react-native';

class InitializationService {
    private static isInitialized = false;

    static async initialize() {
        if (this.isInitialized) return;

        console.log("[Initialization] Starting production pre-flight check...");

        try {
            // 1. Initialize RevenueCat
            await RevenueCatService.configure();
            
            // 2. Initial Auth & Firestore check
            // Firestore is already initialized in firebaseConfig.ts via native SDK
            // Auth is already initialized in firebaseConfig.ts via native SDK
            
            console.log("[Initialization] Core services initialized.");
            this.isInitialized = true;
        } catch (error: any) {
            console.error("[Initialization] CRITICAL FAILURE:", error);
            
            // Handle Firestore 'unavailable' or other major failures
            if (error.message?.includes('unavailable') || error.code === 'unavailable') {
                this.handleInitializationFailure();
            }
        }
    }

    private static handleInitializationFailure() {
        Alert.alert(
            "Connection Issue",
            "The app is having trouble connecting to our services. Some features may be limited. We are retrying...",
            [
                { text: "Retry", onPress: () => this.initialize() },
                { text: "Continue in Offline Mode", style: "cancel" }
            ]
        );
    }
}

export default InitializationService;
