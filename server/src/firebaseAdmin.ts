import admin from 'firebase-admin';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

function normalizePrivateKey(cred: admin.ServiceAccount): admin.ServiceAccount {
  const anyCred = cred as unknown as Record<string, unknown>;
  const pk = anyCred.private_key;
  if (typeof pk === 'string') {
    // On Windows .env / JSON embedding, newlines often arrive as literal `\n`
    // which breaks JWT signing.
    anyCred.private_key = pk.replace(/\\n/g, '\n');
  }
  return cred;
}

function loadServiceAccountFromFile(maybePath: string): admin.ServiceAccount {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const serverDir = path.resolve(__dirname, '..');
  const abs = path.isAbsolute(maybePath) ? maybePath : path.resolve(serverDir, maybePath);
  let raw: string;
  try {
    raw = fs.readFileSync(abs, 'utf8');
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('[firebaseAdmin] Could not read service account file:', abs);
    throw e;
  }
  const cred = JSON.parse(raw) as admin.ServiceAccount;
  return normalizePrivateKey(cred);
}

export function getFirebaseAdmin() {
  if (!admin.apps.length) {
    const fileCredPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    if (fileCredPath) {
      const cred = loadServiceAccountFromFile(fileCredPath);
      const projectId = (cred as unknown as Record<string, unknown>).project_id ?? (cred as unknown as Record<string, unknown>).projectId;
      if (!projectId) {
        throw new Error('[firebaseAdmin] Service account missing project_id/projectId.');
      }
      admin.initializeApp({
        credential: admin.credential.cert(cred),
        projectId: String(projectId ?? ''),
      });
      // eslint-disable-next-line no-console
      console.log(
        '[firebaseAdmin] Initialized using GOOGLE_APPLICATION_CREDENTIALS:',
        String(projectId ?? '')
      );
    } else {
      const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
      if (raw) {
        const trimmed = raw.trim();
        const cred = normalizePrivateKey(JSON.parse(trimmed) as admin.ServiceAccount);
        const projectId = (cred as unknown as Record<string, unknown>).project_id ?? (cred as unknown as Record<string, unknown>).projectId;
        admin.initializeApp({
          credential: admin.credential.cert(cred),
          projectId: String(projectId ?? ''),
        });
        // eslint-disable-next-line no-console
        console.log(
          '[firebaseAdmin] Initialized using FIREBASE_SERVICE_ACCOUNT_JSON:',
          String(projectId ?? '')
        );
      } else {
        admin.initializeApp();
      }
    }
  }
  return admin;
}
