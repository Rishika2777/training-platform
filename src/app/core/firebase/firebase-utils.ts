import { FirebaseApp, getApps, initializeApp } from 'firebase/app';
import { Auth, getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: 'AIzaSyA9oJ9pQ-yomBwyWdpd16b2Oa3h2C_XjLs',
  authDomain: 'synkup-lab.firebaseapp.com',
  projectId: 'synkup-lab',
  storageBucket: 'synkup-lab.firebasestorage.app',
  messagingSenderId: '393926149651',
  appId: '1:393926149651:web:80a9479add30056e4a61e6',
  measurementId: 'G-XKSF6B3XKS',
};

export function getFirebaseApp(): FirebaseApp {
  const apps = getApps();
  if (apps.length > 0) {
    return apps[0];
  }
  return initializeApp(firebaseConfig);
}

export function getFirebaseAuth(): Auth {
  return getAuth(getFirebaseApp());
}

/** Format phone number for Firebase (E.164 format: +[country code][number]) */
export function formatPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  // If it doesn't start with +, assume it's a local number and add +1 (US) or handle accordingly
  // For now, if it's 10 digits, assume US number and add +1
  if (cleaned.length === 10) {
    return `+1${cleaned}`;
  }
  // If it already has country code, add +
  if (cleaned.length > 10 && !phone.startsWith('+')) {
    return `+${cleaned}`;
  }
  // If it already starts with +, return as is
  if (phone.startsWith('+')) {
    return phone.replace(/\D/g, '').replace(/^/, '+');
  }
  return `+${cleaned}`;
}
