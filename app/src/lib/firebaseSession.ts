import { signOut } from 'firebase/auth';
import { auth } from '../firebase';

/** Firebase Auth is primary; legacy shim kept for compatibility. */
export async function syncFirebaseSession(): Promise<void> {
  if (!auth.currentUser) await signOut(auth).catch(() => {});
}

/**
 * Legacy guard that used to wait for Firebase Auth to match an API user id.
 * The app now uses the same Firebase ID token for both API and Firestore,
 * so this is effectively a no-op and always returns true as long as a user is signed in.
 */
export async function ensureFirebaseUidMatchesApiUser(_apiUserId: string): Promise<boolean> {
  return !!auth.currentUser;
}
