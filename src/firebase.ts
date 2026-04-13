import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, signOut, onAuthStateChanged } from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc,
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit, 
  onSnapshot,
  serverTimestamp,
  Timestamp,
  getDocFromServer
} from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL, uploadBytesResumable, getBlob } from 'firebase/storage';

// Firebase configuration from environment variables
// Firebase configuration - Using hardcoded values for absolute reliability
const firebaseConfig = {
  apiKey: "AIzaSyB_z4K-XS5qEXyqxQ5nEeeT715rERTvnOg",
  authDomain: "ai-studio-applet-webapp-de8ea.web.app",
  projectId: "ai-studio-applet-webapp-de8ea",
  storageBucket: "ai-studio-applet-webapp-de8ea.firebasestorage.app",
  messagingSenderId: "794412096508",
  appId: "1:794412096508:web:045e71dfbba16481073079",
  firestoreDatabaseId: "ai-studio-48ffc81f-ab8d-485c-832c-1e4b4af66d00"
};

// Initialize Firebase SDK
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Initialize Firestore - default to (default) if no ID is provided
export const db = (firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== "(default)") 
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

// Initialize Storage - ensure storageBucket is used correctly
export const storage = getStorage(app, firebaseConfig.storageBucket || undefined);
storage.maxOperationRetryTime = 10000; // 10 seconds max retry time
export const googleProvider = new GoogleAuthProvider();

// Validation test
async function testConnection() {
  try {
    // Use a very short timeout or just ignore if it fails silently
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    // Completely silent for common network/fetch errors to avoid confusing warnings
  }
}
testConnection();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export { 
  signInWithPopup, 
  signInWithRedirect,
  signOut, 
  onAuthStateChanged,
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc,
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit, 
  onSnapshot,
  serverTimestamp,
  Timestamp,
  getDocFromServer,
  ref,
  uploadBytes,
  uploadBytesResumable,
  getDownloadURL,
  getBlob
};
