import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyD0kU--Rw_0cEEb0isvFyxgrkXQsyoP7RU",
  authDomain: "kyushu-trip-2026-9997.firebaseapp.com",
  projectId: "kyushu-trip-2026-9997",
  storageBucket: "kyushu-trip-2026-9997.firebasestorage.app",
  messagingSenderId: "848352229595",
  appId: "1:848352229595:web:930dca518c52e4b93ab4fe",
  measurementId: "G-VMXSHY6H72"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

export async function ensureAuth(): Promise<string> {
  // Race between auth flow and a 10-second timeout
  const authPromise = new Promise<string>((resolve, reject) => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      unsubscribe();
      if (user) {
        resolve(user.uid);
      } else {
        try {
          const cred = await signInAnonymously(auth);
          resolve(cred.user.uid);
        } catch (err) {
          reject(err);
        }
      }
    });
  });

  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error('驗證逾時，請檢查網路連線或 Firebase 設定')), 10_000);
  });

  return Promise.race([authPromise, timeoutPromise]);
}
