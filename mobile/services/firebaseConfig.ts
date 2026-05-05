import auth from '@react-native-firebase/auth';
import firestore, { 
  getFirestore, 
  collection, 
  doc, 
  addDoc, 
  getDocs, 
  getDoc, 
  query, 
  where, 
  orderBy, 
  limit, 
  onSnapshot, 
  writeBatch, 
  serverTimestamp,
  updateDoc 
} from '@react-native-firebase/firestore';

// Native Firebase automatically reads google-services.json / GoogleService-Info.plist
// No explicit initializeApp() with API keys is required for the native SDK.

const db = firestore();

export { 
  auth, 
  db, 
  firestore, 
  getFirestore, 
  collection, 
  doc, 
  addDoc, 
  getDocs, 
  getDoc, 
  query, 
  where, 
  orderBy, 
  limit, 
  onSnapshot, 
  writeBatch, 
  serverTimestamp,
  updateDoc 
};
export default { auth, db };
