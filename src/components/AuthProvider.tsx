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
import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';
import { UserProfile } from '@/types';
import { auth, db } from '@/lib/firebase';
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
    console.log('=== updateUserProfile CALLED ===');
    console.log('Input profile data:', profile);
    
    if (!user) {
      const error = new Error('No user logged in');
      console.error('❌ updateUserProfile ERROR:', error.message);
      console.error('User state:', { user: null, userProfile });
      throw error;
    }

    console.log('✅ User authenticated:', { uid: user.uid, email: user.email });
    console.log('🔄 Updating user profile in Firestore...', { uid: user.uid, profile });
    
    if (!db) {
      const error = new Error('Firestore database not initialized');
      console.error('❌ updateUserProfile ERROR:', error.message);
      console.error('Database state:', { db: null });
      throw error;
    }
    
    let currentProfileVersion: number;
    
    try {
      // Refresh auth token to ensure it's valid
      try {
        const authToken = await user.getIdToken(true); // Force refresh
        console.log('🔑 Auth token refreshed:', authToken ? 'present' : 'missing');
      } catch (tokenError: any) {
        console.warn('⚠️ Could not refresh auth token:', tokenError?.message);
      }
      
      const profileRef = doc(db, 'profiles', user.uid);
      console.log('📄 Profile reference created:', profileRef.path);
      console.log('📄 Profile reference ID:', profileRef.id);
      console.log('📄 User UID for path match:', user.uid);
      
      console.log('📖 Reading existing profile...');
      const existingProfile = await getDoc(profileRef);
      console.log('📖 Profile read result:', {
        exists: existingProfile.exists(),
        hasData: !!existingProfile.data(),
      });
      
      const isNewProfile = !existingProfile.exists();
      
      if (isNewProfile) {
        console.log('📝 Profile does not exist - will CREATE new profile (triggers webhook)');
      } else {
        console.log('📝 Profile exists - will UPDATE existing profile');
      }
      
      currentProfileVersion = existingProfile.exists() 
        ? (existingProfile.data()?.profileVersion || 1) 
        : 1;
      console.log('📊 Current profile version:', currentProfileVersion);
      
      const now = Timestamp.now();
      const updatedProfile: any = {
        ...profile,
        uid: user.uid,
        email: user.email!,
        updatedAt: now,
        profileVersion: currentProfileVersion + 1, // Increment version on profile update
      };
      
      // For new profiles, set createdAt as Firestore Timestamp to trigger webhook
      if (isNewProfile) {
        updatedProfile.createdAt = now;
        console.log('📅 Setting createdAt timestamp for new profile');
      } else {
        // Preserve existing createdAt if it exists
        const existingData = existingProfile.data();
        if (existingData?.createdAt) {
          updatedProfile.createdAt = existingData.createdAt;
          console.log('📅 Preserving existing createdAt timestamp');
        }
      }
      
      console.log('💾 Profile data to save:', updatedProfile);
      console.log('💾 Writing to Firestore...');
      
      // Use setDoc without merge for new profiles to ensure onCreate trigger fires
      // Use merge for updates to preserve other fields
      if (isNewProfile) {
        await setDoc(profileRef, updatedProfile);
        console.log('✅ New profile created (will trigger onUserCreated webhook)');
      } else {
        await setDoc(profileRef, updatedProfile, { merge: true });
        console.log('✅ Profile updated');
      }
      
      console.log('✅ Profile written to Firestore successfully');
      
      // Also update users collection for new matching system (non-blocking)
      try {
        const userRef = doc(db, 'users', user.uid);
        await setDoc(userRef, {
          profileVersion: currentProfileVersion + 1,
          updatedAt: new Date().toISOString(),
        }, { merge: true });
        console.log('✅ Users collection updated');
      } catch (usersError: any) {
        // Don't fail the whole operation if users collection write fails
        console.warn('⚠️ Failed to update users collection (non-critical):', usersError?.message);
        // Continue - the profile was saved successfully
      }
    } catch (firestoreError: any) {
      console.error('❌ FIRESTORE ERROR IN updateUserProfile');
      console.error('Error code:', firestoreError?.code);
      console.error('Error message:', firestoreError?.message);
      console.error('Error name:', firestoreError?.name);
      console.error('Error stack:', firestoreError?.stack);
      console.error('Full error object:', firestoreError);
      console.error('Context:', {
        userId: user.uid,
        profilePath: `profiles/${user.uid}`,
        profileData: profile,
      });
      throw firestoreError;
    }
    
    console.log('✅ Profile saved to Firestore (version incremented)');
    
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

