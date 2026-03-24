import { signOut } from 'firebase/auth';
import { auth } from '../firebase';

/** Firebase Auth is primary; this is now a no-op compatibility shim. */
export async function syncFirebaseSession(): Promise<void> {
  if (!auth.currentUser) await signOut(auth).catch(() => {});
}

/** Call before Firestore reads/writes under `users/{apiUserId}/…` so `request.auth.uid` matches rules. */
export async function ensureFirebaseUidMatchesApiUser(apiUserId: string): Promise<boolean> {
  if (auth.currentUser?.uid === apiUserId) return true;
  return false;
}
