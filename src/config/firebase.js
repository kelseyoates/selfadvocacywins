import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAaD38_3u9weXef6XjefQDYCeGyVRSAu9k",
  authDomain: "selfadvocacywins-acb4f.firebaseapp.com",
  projectId: "selfadvocacywins-acb4f",
  storageBucket: "selfadvocacywins-acb4f.firebasestorage.app",
  messagingSenderId: "142115352134",
  appId: "1:142115352134:web:44ef1dcc0771950c53e447",
  measurementId: "G-QSESF1H6W6"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Auth with persistence
const auth = getAuth(app);

// Initialize Firestore
const db = getFirestore(app);

// Initialize Storage
const storage = getStorage(app);

export { auth, db, storage }; 