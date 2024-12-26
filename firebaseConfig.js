import Constants from 'expo-constants';

// Debugging: log the entire Constants object
console.log('Constants:', Constants);

const firebaseConfig = {
  apiKey: "AIzaSyAaD38_3u9weXef6XjefQDYCeGyVRSAu9k",
  authDomain: "selfadvocacywins-acb4f.firebaseapp.com",
  projectId: "selfadvocacywins-acb4f",
  storageBucket: "selfadvocacywins-acb4f.firebasestorage.app",
  messagingSenderId: "142115352134",
  appId: "1:142115352134:web:44ef1dcc0771950c53e447",
  measurementId: "G-QSESF1H6W6"
};

// For now, let's keep the original config while we debug the environment setup
console.log('Firebase Config:', firebaseConfig);

export default firebaseConfig;