import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { initializeAppCheck, CustomProvider } from 'firebase/app-check';
import { Platform } from 'react-native';

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID,
  measurementId: process.env.FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize App Check with better performance
if (!__DEV__) {
  // Initialize in background without blocking app startup
  setTimeout(() => {
    const appCheck = initializeAppCheck(app, {
      provider: new CustomProvider({
        getToken: async () => {
          // Cache duration: 12 hours for better performance
          return {
            token: Platform.OS === 'ios' 
              ? 'ios-development-token'
              : 'android-development-token',
            expireTimeMillis: Date.now() + (12 * 60 * 60 * 1000),
          };
        }
      }),
      isTokenAutoRefreshEnabled: true
    });
  }, 0);
}

// Initialize Auth with persistence
const auth = getAuth(app);

// Initialize Firestore with offline persistence
const db = getFirestore(app);
enableIndexedDbPersistence(db)
  .catch((err) => {
    if (err.code == 'failed-precondition') {
      console.log('Multiple tabs open, persistence can only be enabled in one tab at a time.');
    } else if (err.code == 'unimplemented') {
      console.log('The current browser/environment does not support offline persistence');
    }
});

// Initialize Storage
const storage = getStorage(app);

export { auth, db, storage }; 