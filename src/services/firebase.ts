import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  getDocFromServer,
  Timestamp,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { TelemetryLogEntry } from '../types/telemetry';

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

// Test connection on boot as mandated by the Firebase skill
export async function testFirestoreConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase client is offline or network restricted.');
      return false;
    }
    // Expected if 'test/connection' doc doesn't exist, but server responded
    return true;
  }
}

// Google Sign-In
export async function signInWithGoogle(): Promise<FirebaseUser | null> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;

    // Create or update user profile document in Firestore
    if (user) {
      const userRef = doc(db, 'users', user.uid);
      await setDoc(
        userRef,
        {
          uid: user.uid,
          email: user.email || '',
          displayName: user.displayName || 'Operator Kapal',
          photoURL: user.photoURL || '',
          role: 'operator',
          updatedAt: Timestamp.now(),
        },
        { merge: true }
      );
    }

    return user;
  } catch (error) {
    console.error('Google Sign-In failed:', error);
    throw error;
  }
}

// Sign-Out
export async function logOut(): Promise<void> {
  await signOut(auth);
}

// Save Telemetry Log to Firestore
export async function saveLogToFirestore(log: TelemetryLogEntry, userId: string): Promise<boolean> {
  try {
    const logDocRef = doc(db, 'telemetry_logs', log.id);
    await setDoc(logDocRef, {
      id: log.id,
      userId: userId,
      vesselId: 'NUSA-01',
      timestamp: log.timestamp,
      timeFormatted: log.timeFormatted,
      suhu_c: log.suhu_c,
      ph: log.ph,
      tds_ppm: log.tds_ppm,
      baterai_persen: log.baterai_persen ?? 85,
      tegangan_v: log.tegangan_v ?? 12.2,
      pompa_up: log.pompa_up,
      pompa_down: log.pompa_down,
      status: log.status,
      createdAt: Timestamp.now(),
    });
    return true;
  } catch (error) {
    console.error('Failed to save log to Firestore:', error);
    return false;
  }
}

// Fetch saved logs from Firestore for the authenticated user
export async function fetchUserLogsFromFirestore(userId: string): Promise<TelemetryLogEntry[]> {
  try {
    const logsRef = collection(db, 'telemetry_logs');
    const q = query(
      logsRef,
      where('userId', '==', userId),
      orderBy('timestamp', 'desc'),
      limit(50)
    );
    const snapshot = await getDocs(q);
    const fetched: TelemetryLogEntry[] = [];

    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      fetched.push({
        id: data.id || docSnap.id,
        timestamp: data.timestamp,
        timeFormatted: data.timeFormatted,
        suhu_c: data.suhu_c,
        ph: data.ph,
        tds_ppm: data.tds_ppm,
        baterai_persen: data.baterai_persen ?? 85,
        tegangan_v: data.tegangan_v ?? 12.2,
        pompa_up: data.pompa_up,
        pompa_down: data.pompa_down,
        status: data.status,
      });
    });

    return fetched;
  } catch (error) {
    console.error('Error fetching logs from Firestore:', error);
    return [];
  }
}
