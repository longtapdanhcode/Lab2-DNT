import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Alert, Platform } from 'react-native';
import { Session, User, AuthChangeEvent } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';

// Ensure the auth session completes properly on web
if (Platform.OS === 'web') {
  WebBrowser.maybeCompleteAuthSession();
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  userProfile: UserProfileData | null;
  updateUserProfile: (data: Partial<UserProfileData>) => Promise<void>;
}

export interface UserProfileData {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string;
  student_id: string;
  faculty: string;
  phone: string;
  created_at: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch or create user profile from Supabase
  const fetchOrCreateProfile = useCallback(async (authUser: User) => {
    try {
      // First, try to fetch existing profile
      const { data: existingProfile, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single();

      if (existingProfile && !fetchError) {
        setUserProfile(existingProfile as UserProfileData);
        return;
      }

      // Create new profile from Google auth metadata
      const metadata = authUser.user_metadata;
      const newProfile: Partial<UserProfileData> = {
        id: authUser.id,
        email: authUser.email || metadata?.email || '',
        full_name: metadata?.full_name || metadata?.name || '',
        avatar_url: metadata?.avatar_url || metadata?.picture || '',
        student_id: '',
        faculty: '',
        phone: '',
      };

      const { data: createdProfile, error: insertError } = await supabase
        .from('profiles')
        .upsert(newProfile, { onConflict: 'id' })
        .select()
        .single();

      if (insertError) {
        console.error('Error creating profile:', insertError);
        // Use a fallback in-memory profile
        setUserProfile({
          id: authUser.id,
          email: newProfile.email!,
          full_name: newProfile.full_name!,
          avatar_url: newProfile.avatar_url!,
          student_id: '',
          faculty: '',
          phone: '',
          created_at: new Date().toISOString(),
        });
        return;
      }

      setUserProfile(createdProfile as UserProfileData);
    } catch (err) {
      console.error('Profile fetch/create error:', err);
    }
  }, []);

  // Listen to auth state changes
  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      setSession(initialSession);
      setUser(initialSession?.user ?? null);
      if (initialSession?.user) {
        fetchOrCreateProfile(initialSession.user);
      }
      setIsLoading(false);
    });

    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, newSession: Session | null) => {
        setSession(newSession);
        setUser(newSession?.user ?? null);

        if (event === 'SIGNED_IN' && newSession?.user) {
          await fetchOrCreateProfile(newSession.user);
        }

        if (event === 'SIGNED_OUT') {
          setUserProfile(null);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchOrCreateProfile]);

  // Google Sign-In using Supabase OAuth
  const signInWithGoogle = useCallback(async () => {
    try {
      setIsLoading(true);

      // Build the redirect URL for Expo
      const redirectUrl = AuthSession.makeRedirectUri({
        path: 'auth/callback',
      });

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: true,
        },
      });

      if (error) {
        throw error;
      }

      if (data?.url) {
        // Open the OAuth URL in a browser
        const result = await WebBrowser.openAuthSessionAsync(
          data.url,
          redirectUrl
        );

        if (result.type === 'success' && result.url) {
          // Extract tokens from the URL
          const url = new URL(result.url);

          // Handle hash fragment (implicit flow)
          const hashParams = new URLSearchParams(url.hash.substring(1));
          const accessToken = hashParams.get('access_token');
          const refreshToken = hashParams.get('refresh_token');

          if (accessToken) {
            await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken || '',
            });
          }

          // Handle query params (PKCE flow)
          const code = url.searchParams.get('code');
          if (code) {
            await supabase.auth.exchangeCodeForSession(code);
          }
        }
      }
    } catch (error: any) {
      console.error('Google Sign-In Error:', error);
      const message = error?.message || 'An unexpected error occurred during sign in.';
      if (Platform.OS === 'web') {
        alert(`Sign-in failed: ${message}`);
      } else {
        Alert.alert('Sign-in Error', message);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Sign Out
  const signOut = useCallback(async () => {
    try {
      setIsLoading(true);
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setSession(null);
      setUser(null);
      setUserProfile(null);
    } catch (error: any) {
      console.error('Sign-out error:', error);
      if (Platform.OS === 'web') {
        alert('Failed to sign out: ' + (error?.message || 'Unknown error'));
      } else {
        Alert.alert('Sign-out Error', error?.message || 'Could not sign out');
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Update user profile in Supabase
  const updateProfileData = useCallback(async (data: Partial<UserProfileData>) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update(data)
        .eq('id', user.id);

      if (error) throw error;

      // Update local state
      setUserProfile((prev) => prev ? { ...prev, ...data } : null);
    } catch (error: any) {
      console.error('Profile update error:', error);
      if (Platform.OS === 'web') {
        alert('Failed to update profile: ' + (error?.message || 'Unknown error'));
      } else {
        Alert.alert('Update Error', error?.message || 'Could not update profile');
      }
    }
  }, [user]);

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        isLoading,
        signInWithGoogle,
        signOut,
        userProfile,
        updateUserProfile: updateProfileData,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
