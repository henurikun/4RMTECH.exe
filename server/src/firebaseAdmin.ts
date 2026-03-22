import admin from 'firebase-admin';

export function getFirebaseAdmin() {
  if (!admin.apps.length) {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    if (raw) {
      const cred = JSON.parse(raw) as admin.ServiceAccount;
      admin.initializeApp({ credential: admin.credential.cert(cred) });
    } else {
      admin.initializeApp();
    }
  }
  return admin;
}
