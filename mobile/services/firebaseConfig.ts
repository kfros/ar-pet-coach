import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import storageModule from '@react-native-firebase/storage';

// Native Firebase automatically reads google-services.json / GoogleService-Info.plist
// No explicit initializeApp() with API keys is required for the native SDK.

const db = firestore();
const storage = storageModule();

export { auth, db, storage, firestore };
export default { auth, db };
