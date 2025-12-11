'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  User,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { UserProfile } from '@/types';
import { 
  setAnalyticsUserId, 
  setAnalyticsUserProperties, 
  trackLogin, 
  trackSignUp, 
  trackLogout 
} from '@/lib/analytics';

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  signUp: (email: string, password: string) => Promise<User>;
  logIn: (email: string, password: string) => Promise<User>;
  logOut: () => Promise<void>;
  updateUserProfile: (profile: Partial<UserProfile>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch user profile from Firestore
  const fetchUserProfile = async (uid: string) => {
    try {
      const profileRef = doc(db, 'profiles', uid);
      const profileSnap = await getDoc(profileRef);
      
      if (profileSnap.exists()) {
        const data = profileSnap.data();
        setUserProfile({
          ...data,
          createdAt: data.createdAt?.toDate(),
          updatedAt: data.updatedAt?.toDate(),
        } as UserProfile);
      } else {
        setUserProfile(null);
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
      setUserProfile(null);
    }
  };

  // Sign up new user
  const signUp = async (email: string, password: string) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    setAnalyticsUserId(userCredential.user.uid);
    trackSignUp('email');
    return userCredential.user;
  };

  // Log in existing user
  const logIn = async (email: string, password: string) => {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    setAnalyticsUserId(userCredential.user.uid);
    trackLogin('email');
    return userCredential.user;
  };

  // Log out
  const logOut = async () => {
    trackLogout();
    await signOut(auth);
    setUserProfile(null);
    setAnalyticsUserId(null);
  };

  // Update user profile in Firestore
  const updateUserProfile = async (profile: Partial<UserProfile>) => {
    if (!user) throw new Error('No user logged in');

    console.log('🔄 Updating user profile in Firestore...', { uid: user.uid, profile });
    
    const profileRef = doc(db, 'profiles', user.uid);
    const updatedProfile = {
      ...profile,
      uid: user.uid,
      email: user.email!,
      updatedAt: new Date(),
    };

    await setDoc(profileRef, updatedProfile, { merge: true });
    console.log('✅ Profile saved to Firestore');
    
    // Don't clear cache immediately - let it expire naturally or be cleared on next load
    // This preserves user progress (passed opportunities, current position)
    // Cache will be refreshed when user visits dashboard next time
    console.log('✅ Profile updated - cache will refresh on next dashboard visit (preserving progress)');
    
    // Fetch the updated profile to ensure state is in sync
    await fetchUserProfile(user.uid);
    console.log('✅ Profile state refreshed');
  };

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        setAnalyticsUserId(user.uid);
        await fetchUserProfile(user.uid);
      } else {
        setUserProfile(null);
        setAnalyticsUserId(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // Update analytics user properties when profile changes
  useEffect(() => {
    if (userProfile) {
      setAnalyticsUserProperties(userProfile);
    }
  }, [userProfile]);

  const value = {
    user,
    userProfile,
    loading,
    signUp,
    logIn,
    logOut,
    updateUserProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

