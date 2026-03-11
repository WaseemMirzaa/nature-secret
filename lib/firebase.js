'use client';

import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

let app = null;
let auth = null;
let messaging = null;

export function getApp() {
  if (!app && typeof window !== 'undefined' && firebaseConfig.apiKey && firebaseConfig.projectId) {
    app = initializeApp(firebaseConfig);
  }
  return app;
}

export function getFirebaseAuth() {
  if (!auth && getApp()) auth = getAuth(getApp());
  return auth;
}

/** Get Firebase Cloud Messaging instance (for FCM tokens). Call in browser only. */
export function getFirebaseMessaging() {
  if (typeof window === 'undefined') return null;
  if (!messaging && getApp()) {
    try {
      const { getMessaging } = require('firebase/messaging');
      messaging = getMessaging(app);
    } catch {
      return null;
    }
  }
  return messaging;
}

/** User-friendly message for Firebase Auth error codes (and 400 REST responses) */
export function getFirebaseAuthErrorMessage(code, firebaseMessage) {
  const messages = {
    'auth/email-already-in-use': 'This email is already registered. Try signing in.',
    'auth/invalid-email': 'Please enter a valid email address.',
    'auth/operation-not-allowed': 'Email/password sign-in is not enabled. In Firebase Console go to Authentication → Sign-in method and enable "Email/Password".',
    'auth/weak-password': 'Password must be at least 6 characters.',
    'auth/user-disabled': 'This account has been disabled.',
    'auth/user-not-found': 'No account found with this email.',
    'auth/wrong-password': 'Incorrect password. Please try again.',
    'auth/invalid-credential': 'Incorrect email or password.',
    'auth/too-many-requests': 'Too many attempts. Please try again later.',
    'auth/network-request-failed': 'Network error. Check your connection and try again.',
    'auth/requires-recent-login': 'Please sign in again to continue.',
    'auth/expired-action-code': 'This reset link has expired. Request a new one from the login page.',
    'auth/invalid-action-code': 'This reset link is invalid or was already used. Request a new one.',
  };
  if (messages[code]) return messages[code];
  if (firebaseMessage && typeof firebaseMessage === 'string') {
    if (/OPERATION_NOT_ALLOWED|EMAIL_NOT_ALLOWED/i.test(firebaseMessage))
      return 'Email/password sign-in is not enabled. In Firebase Console enable Authentication → Sign-in method → Email/Password.';
    if (/INVALID_API_KEY|API key not valid/i.test(firebaseMessage))
      return 'Invalid Firebase config. Check NEXT_PUBLIC_FIREBASE_API_KEY and API key restrictions in Google Cloud Console.';
  }
  return 'Something went wrong. Please try again.';
}

export const MIN_PASSWORD_LENGTH = 6;
