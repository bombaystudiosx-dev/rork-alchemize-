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
    loadAuthState();
  }, []);

  const loadAuthState = async () => {
    try {
      const [storedAuth, storedRememberMe] = await Promise.all([
        AsyncStorage.getItem(AUTH_STORAGE_KEY).catch(() => null),
        AsyncStorage.getItem(REMEMBER_ME_KEY).catch(() => null),
      ]);

      if (storedAuth && typeof storedAuth === 'string' && storedAuth.trim().startsWith('{')) {
        try {
          const auth = JSON.parse(storedAuth) as AuthState;
          if (auth && typeof auth === 'object' && auth.user && typeof auth.user === 'object') {
            setAuthState(auth);
            if (Platform.OS !== 'web') {
              setCurrentUserId(auth.user.id);
            }
            console.log('[Auth] Loaded auth state:', auth.user?.email);
          }
        } catch (parseError) {
          console.warn('[Auth] Invalid auth data, clearing:', parseError);
          await AsyncStorage.removeItem(AUTH_STORAGE_KEY).catch(() => {});
        }
      }

      if (storedRememberMe === 'true') {
        setRememberMeState(true);
      }
    } catch (error) {
      console.error('[Auth] Error loading auth state:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string, remember: boolean) => {
    try {
      console.log('[Auth] Logging in:', email);
      
      const usersData = await AsyncStorage.getItem(USERS_STORAGE_KEY);
      const users: StoredUser[] = usersData ? JSON.parse(usersData) : [];
      
      const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
      
      if (!user) {
        return { success: false, error: 'User not found. Please sign up first.' };
      }
      
      if (user.password !== password) {
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

      await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(newAuthState));
      await AsyncStorage.setItem(REMEMBER_ME_KEY, remember.toString());

      console.log('[Auth] Login successful');
      return { success: true };
    } catch (error: any) {
      console.error('[Auth] Login error:', error);
      return { success: false, error: error.message || 'Login failed' };
    }
  };

  const signup = async (email: string, password: string, name: string) => {
    try {
      console.log('[Auth] Signing up:', email);

      const usersData = await AsyncStorage.getItem(USERS_STORAGE_KEY);
      const users: StoredUser[] = usersData ? JSON.parse(usersData) : [];
      
      const existingUser = users.find(u => u.email.toLowerCase() === email.toLowerCase());
      if (existingUser) {
        return { success: false, error: 'User already exists' };
      }
      
      const userId = `user_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      const newUser: StoredUser = {
        id: userId,
        email,
        name,
        password,
      };
      
      users.push(newUser);
      await AsyncStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));

      const token = `token_${userId}_${Date.now()}`;
      const newAuthState: AuthState = {
        user: {
          id: userId,
          email,
          name,
        },
        token,
      };
      
      setAuthState(newAuthState);
      
      if (Platform.OS !== 'web') {
        setCurrentUserId(userId);
      }

      await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(newAuthState));

      console.log('[Auth] Signup successful');
      return { success: true };
    } catch (error: any) {
      console.error('[Auth] Signup error:', error);
      return { success: false, error: error.message || 'Signup failed' };
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
