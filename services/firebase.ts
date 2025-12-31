
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from "firebase/auth";
import { getFirestore, doc, setDoc, getDoc, onSnapshot } from "firebase/firestore";

// --- ÁREA DO DESENVOLVEDOR ---
// Preencha estas informações com os dados do seu projeto no Firebase Console
// (Project Settings > General > Your apps > SDK setup and configuration)
const firebaseConfig = {
  apiKey: "AIzaSyDk71IS9WInlzUYfdWmd1yd-sXsWs089zU",
  authDomain: "wealthplanning.firebaseapp.com",
  projectId: "wealthplanning",
  storageBucket: "wealthplanning.firebasestorage.app",
  messagingSenderId: "140665210036",
  appId: "1:140665210036:web:72f292d688cdfddabd83e1"
};
// -----------------------------

let auth: any;
let db: any;
let isInitialized = false;

// Initialize immediately
try {
  // Check if config is filled (basic check)
  if (firebaseConfig.apiKey) {
    if (!getApps().length) {
        const app = initializeApp(firebaseConfig);
        auth = getAuth(app);
        // Força o uso do banco (default) que o erro dizia não encontrar
        db = getFirestore(app); 
    } else {
        const app = getApp();
        auth = getAuth(app);
        db = getFirestore(app);
    }
    isInitialized = true;
  } else {
    console.warn("Firebase não configurado. Adicione suas chaves em services/firebase.ts");
  }
} catch (error) {
  console.error("Firebase init error", error);
}

export const isFirebaseReady = () => isInitialized;

export const getAuthInstance = () => auth;

export const loginUser = async (email: string, pass: string) => {
  if (!auth) throw new Error("Firebase não configurado pelo desenvolvedor.");
  return signInWithEmailAndPassword(auth, email, pass);
};

export const registerUser = async (email: string, pass: string) => {
  if (!auth) throw new Error("Firebase não configurado pelo desenvolvedor.");
  return createUserWithEmailAndPassword(auth, email, pass);
};

export const logoutUser = async () => {
  if (!auth) return;
  return signOut(auth);
};

// --- Data Sync Methods ---

export const saveUserData = async (userId: string, key: string, data: any) => {
    if (!db) return;
    try {
        // Firestore TRAVA se receber 'undefined'. 
        // JSON.stringify remove chaves com valores undefined automaticamente.
        const safeData = data === undefined ? null : JSON.parse(JSON.stringify(data));
        
        // REMOVIDO { merge: true } para permitir exclusão total de chaves em objetos de estado (como o budget)
        await setDoc(doc(db, "users", userId, "data", key), { value: safeData });
    } catch (e: any) {
        console.error("Error saving to cloud", e);
        throw e;
    }
};

export const loadUserData = async (userId: string, key: string) => {
    if (!db) return null;
    try {
        const snap = await getDoc(doc(db, "users", userId, "data", key));
        if (snap.exists()) {
            return snap.data().value;
        }
    } catch (e) {
        console.error("Error loading from cloud", e);
    }
    return null;
};

// Real-time listener
export const subscribeToUserData = (
    userId: string, 
    key: string, 
    onUpdate: (data: any) => void,
    onError?: (error: any) => void
) => {
    if (!db) return () => {};
    
    const unsubscribe = onSnapshot(doc(db, "users", userId, "data", key), (doc) => {
        if (doc.exists()) {
            onUpdate(doc.data().value);
        } else {
            // Document doesn't exist yet (new user), return null/undefined
            onUpdate(undefined);
        }
    }, (error) => {
        console.error(`Error subscribing to ${key}:`, error);
        if (onError) onError(error);
    });

    return unsubscribe;
};
