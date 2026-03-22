import { signInWithCustomToken, signOut } from 'firebase/auth';
import { auth } from '../firebase';
import { api } from './api';

/** Aligns Firebase Auth uid with API user id via custom token (required for Firestore rules). */
export async function syncFirebaseSession(): Promise<void> {
  try {
    const { token } = await api.auth.firebaseCustomToken();
    await signInWithCustomToken(auth, token);
  } catch {
    await signOut(auth).catch(() => {});
  }
}

/** Call before Firestore reads/writes under `users/{apiUserId}/…` so `request.auth.uid` matches rules. */
export async function ensureFirebaseUidMatchesApiUser(apiUserId: string): Promise<boolean> {
  if (auth.currentUser?.uid === apiUserId) return true;
  await syncFirebaseSession();
  return auth.currentUser?.uid === apiUserId;
}
