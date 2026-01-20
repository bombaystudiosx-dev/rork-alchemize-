import { useState, useEffect } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import createContextHook from '@nkzw/create-context-hook';

import { setCurrentUserId } from '@/lib/database';

const AUTH_STORAGE_KEY = '@alchemize_auth';
const REMEMBER_ME_KEY = '@alchemize_remember_me';
const USERS_STORAGE_KEY = '@alchemize_users';

interface User {
  id: string;
  email: string;
  name: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
}

interface StoredUser {
  id: string;
  email: string;
  name: string;
  password: string;
}

export const [AuthProvider, useAuth] = createContextHook(() => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    token: null,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [rememberMe, setRememberMeState] = useState(false);

  useEffect(() => {
    const loadAuthState = async () => {
      try {
        console.log('[Auth] Loading auth state...');
        
        let storedAuth: string | null = null;
        let storedRememberMe: string | null = null;
        
        try {
          storedAuth = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
        } catch (e) {
          console.warn('[Auth] Failed to get auth from storage:', e);
        }
        
        try {
          storedRememberMe = await AsyncStorage.getItem(REMEMBER_ME_KEY);
        } catch (e) {
          console.warn('[Auth] Failed to get remember me from storage:', e);
        }

        if (storedAuth && typeof storedAuth === 'string' && storedAuth.trim().startsWith('{')) {
          try {
            const auth = JSON.parse(storedAuth) as AuthState;
            if (auth && typeof auth === 'object' && auth.user && typeof auth.user === 'object') {
              setAuthState(auth);
              if (Platform.OS !== 'web') {
                setCurrentUserId(auth.user.id);
              }
              console.log('[Auth] Restored auth state for:', auth.user?.email);
            }
          } catch (parseError) {
            console.warn('[Auth] Invalid auth data, clearing:', parseError);
            try {
              await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
            } catch (e) {
              console.warn('[Auth] Failed to clear auth:', e);
            }
          }
        } else {
          console.log('[Auth] No stored auth found');
        }

        if (storedRememberMe === 'true') {
          setRememberMeState(true);
        }
      } catch (error) {
        console.error('[Auth] Error loading auth state:', error);
      } finally {
        console.log('[Auth] Auth loading complete');
        setIsLoading(false);
      }
    };
    
    loadAuthState();
  }, []);

  const login = async (email: string, password: string, remember: boolean): Promise<{ success: boolean; error?: string }> => {
    try {
      console.log('[Auth] Attempting login for:', email);
      
      let usersData: string | null = null;
      try {
        usersData = await AsyncStorage.getItem(USERS_STORAGE_KEY);
      } catch (e) {
        console.warn('[Auth] Failed to get users from storage:', e);
      }
      
      const users: StoredUser[] = usersData ? JSON.parse(usersData) : [];
      console.log('[Auth] Found', users.length, 'registered users');
      
      const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
      
      if (!user) {
        console.log('[Auth] User not found:', email);
        return { success: false, error: 'User not found. Please sign up first.' };
      }
      
      if (user.password !== password) {
        console.log('[Auth] Invalid password for:', email);
        return { success: false, error: 'Invalid password' };
      }

      const token = `token_${user.id}_${Date.now()}`;
      const newAuthState: AuthState = {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
        token,
      };
      
      setAuthState(newAuthState);
      setRememberMeState(remember);
      
      if (Platform.OS !== 'web') {
        setCurrentUserId(user.id);
      }

      try {
        await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(newAuthState));
        await AsyncStorage.setItem(REMEMBER_ME_KEY, remember.toString());
      } catch (e) {
        console.warn('[Auth] Failed to save auth to storage:', e);
      }

      console.log('[Auth] Login successful for:', email);
      return { success: true };
    } catch (error: any) {
      console.error('[Auth] Login error:', error);
      return { success: false, error: error?.message || 'Login failed. Please try again.' };
    }
  };

  const signup = async (email: string, password: string, name: string): Promise<{ success: boolean; error?: string }> => {
    try {
      console.log('[Auth] Attempting signup for:', email);

      let usersData: string | null = null;
      try {
        usersData = await AsyncStorage.getItem(USERS_STORAGE_KEY);
      } catch (e) {
        console.warn('[Auth] Failed to get users from storage:', e);
      }
      
      const users: StoredUser[] = usersData ? JSON.parse(usersData) : [];
      
      const existingUser = users.find(u => u.email.toLowerCase() === email.toLowerCase());
      if (existingUser) {
        console.log('[Auth] User already exists:', email);
        return { success: false, error: 'An account with this email already exists. Please login instead.' };
      }
      
      const userId = `user_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      const newUser: StoredUser = {
        id: userId,
        email: email.toLowerCase().trim(),
        name: name.trim(),
        password,
      };
      
      users.push(newUser);
      
      try {
        await AsyncStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
      } catch (e) {
        console.error('[Auth] Failed to save users to storage:', e);
        return { success: false, error: 'Failed to create account. Please try again.' };
      }

      const token = `token_${userId}_${Date.now()}`;
      const newAuthState: AuthState = {
        user: {
          id: userId,
          email: email.toLowerCase().trim(),
          name: name.trim(),
        },
        token,
      };
      
      setAuthState(newAuthState);
      
      if (Platform.OS !== 'web') {
        setCurrentUserId(userId);
      }

      try {
        await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(newAuthState));
      } catch (e) {
        console.warn('[Auth] Failed to save auth to storage:', e);
      }

      console.log('[Auth] Signup successful for:', email);
      return { success: true };
    } catch (error: any) {
      console.error('[Auth] Signup error:', error);
      return { success: false, error: error?.message || 'Signup failed. Please try again.' };
    }
  };



  const logout = async () => {
    try {
      console.log('[Auth] Logging out');
      setAuthState({ user: null, token: null });
      
      if (Platform.OS !== 'web') {
        setCurrentUserId(null);
      }
      
      await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
      await AsyncStorage.removeItem(REMEMBER_ME_KEY);

      console.log('[Auth] Logout successful');
    } catch (error) {
      console.error('[Auth] Logout error:', error);
    }
  };

  return {
    user: authState.user,
    token: authState.token,
    isAuthenticated: !!authState.user,
    isLoading,
    rememberMe,
    login,
    signup,
    logout,
  };
});
