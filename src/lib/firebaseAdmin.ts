import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

let _app: App | null = null;
let _db: Firestore | null = null;

function getPrivateKey() {
  const key = process.env.FIREBASE_PRIVATE_KEY;
  return key ? key.replace(/\\n/g, "\n") : "";
}

function requireEnv(name: string) {
  const v = process.env[name];
  if (!v) {
    // IMPORTANT: don't crash build-time imports; only throw when actually used.
    throw new Error(`Missing env var: ${name}`);
  }
  return v;
}

export function getAdminDb() {
  if (_db) return _db;

  const projectId = requireEnv("FIREBASE_PROJECT_ID");
  const clientEmail = requireEnv("FIREBASE_CLIENT_EMAIL");
  const privateKey = getPrivateKey();
  if (!privateKey) throw new Error("Missing env var: FIREBASE_PRIVATE_KEY");

  _app =
    getApps().length > 0
      ? getApps()[0]
      : initializeApp({
          credential: cert({
            projectId,
            clientEmail,
            privateKey,
          }),
        });

  _db = getFirestore(_app);
  return _db;
}