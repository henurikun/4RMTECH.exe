import { initializeApp } from 'firebase/app';
import { getAnalytics, isSupported } from 'firebase/analytics';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyBkfcWt7NXMBHZdYGv7ht5NC8ZxiVY4bIY',
  authDomain: 'rmtech-68ce4.firebaseapp.com',
  projectId: 'rmtech-68ce4',
  storageBucket: 'rmtech-68ce4.firebasestorage.app',
  messagingSenderId: '1069592428280',
  appId: '1:1069592428280:web:4bae4d67fd0c4a049cc50d',
  measurementId: 'G-GVETR2201R',
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

/** Call once from the browser entry if you want Analytics. */
export async function initFirebaseAnalytics() {
  if (typeof window === 'undefined') return;
  if (await isSupported()) {
    getAnalytics(app);
  }
}
