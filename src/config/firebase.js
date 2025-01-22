import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getStorage } from 'firebase/storage';
import { initializeAppCheck, CustomProvider } from 'firebase/app-check';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  FIREBASE_API_KEY,
  FIREBASE_AUTH_DOMAIN,
  FIREBASE_PROJECT_ID,
  FIREBASE_STORAGE_BUCKET,
  FIREBASE_MESSAGING_SENDER_ID,
  FIREBASE_APP_ID
} from '@env';

console.log(`Starting Firebase initialization on ${Platform.OS}...`);

const firebaseConfig = {
  apiKey: FIREBASE_API_KEY,
  authDomain: FIREBASE_AUTH_DOMAIN,
  projectId: FIREBASE_PROJECT_ID,
  storageBucket: FIREBASE_STORAGE_BUCKET,
  messagingSenderId: FIREBASE_MESSAGING_SENDER_ID,
  appId: FIREBASE_APP_ID,
  databaseURL: `https://${FIREBASE_PROJECT_ID}.firebaseio.com`
};

// Initialize Firebase only if it hasn't been initialized already
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize App Check
if (Platform.OS === 'android') {
  try {
    console.log('Initializing App Check for Android...');
    
    // Use different providers for development and production
    const provider = new CustomProvider({
      getToken: async () => {
        if (__DEV__) {
          console.log('Using debug token for development');
          // Use the debug token we registered in Firebase Console
          return {
            token: '51B7C090-C685-4189-AB3D-EF226A8F3724',
            expireTimeMillis: Date.now() + (60 * 60 * 1000) // 1 hour
          };
        } else {
          try {
            const { default: appCheckModule } = await import('@react-native-firebase/app-check');
            const appCheck = appCheckModule();
            const token = await appCheck.getToken();
            return {
              token: token,
              expireTimeMillis: Date.now() + (60 * 60 * 1000)
            };
          } catch (error) {
            console.error('Error getting Play Integrity token:', error);
            throw error;
          }
        }
      }
    });

    const appCheck = initializeAppCheck(app, {
      provider: provider,
      isTokenAutoRefreshEnabled: true
    });

    console.log('App Check initialized successfully');
  } catch (error) {
    console.error('Error setting up App Check:', error);
    console.error('Error details:', error.message);
  }
}

// Initialize Firebase services with persistence
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage)
});
const db = getFirestore(app);
const storage = getStorage(app);

// Export everything in a single export statement
export { auth, db, storage, firebaseConfig }; 