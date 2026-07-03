import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User, signInWithEmailAndPassword, createUserWithEmailAndPassword,
  signOut, onAuthStateChanged, sendPasswordResetEmail,
} from 'firebase/auth';
import { auth } from '../lib/firebase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  logOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // If Firebase is misconfigured (bad/missing env at build time) the SDK
    // throws synchronously on subscribe (auth/invalid-api-key) — without the
    // try/catch every auth-gated route white-screens on an infinite spinner.
    // Fail open to the logged-out state so /login still renders.
    // Belt-and-braces: Firebase never invokes the observer's error callback
    // for init failures (e.g. auth/invalid-api-key surfaces as an unhandled
    // rejection instead), which would leave auth-gated routes on an infinite
    // spinner. If auth hasn't reported within 5s, fail open to logged-out —
    // a late success still updates the user normally.
    const failOpen = setTimeout(() => setLoading(false), 5000);
    if (!auth) { clearTimeout(failOpen); setUser(null); setLoading(false); return; }
    try {
      const unsub = onAuthStateChanged(
        auth,
        (u: User | null) => {
          clearTimeout(failOpen);
          setUser(u);
          setLoading(false);
        },
        (err) => {
          clearTimeout(failOpen);
          console.error('Firebase auth unavailable:', err);
          setUser(null);
          setLoading(false);
        }
      );
      return () => { clearTimeout(failOpen); unsub(); };
    } catch (err) {
      clearTimeout(failOpen);
      console.error('Firebase auth failed to initialise:', err);
      setUser(null);
      setLoading(false);
    }
  }, []);

  const signIn = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const signUp = async (email: string, password: string) => {
    await createUserWithEmailAndPassword(auth, email, password);
  };

  const logOut = async () => {
    await signOut(auth);
  };

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, logOut, resetPassword }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
