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
          } else {
            await AsyncStorage.removeItem(AUTH_STORAGE_KEY).catch(() => {});
          }
        } catch {
          await AsyncStorage.removeItem(AUTH_STORAGE_KEY).catch(() => {});
          await AsyncStorage.removeItem(USERS_STORAGE_KEY).catch(() => {});
        }
      } else if (storedAuth) {
        await AsyncStorage.multiRemove([AUTH_STORAGE_KEY, USERS_STORAGE_KEY, REMEMBER_ME_KEY]).catch(() => {});
      }

      if (storedRememberMe === 'true') {
        setRememberMeState(true);
      }
    } catch {
      await AsyncStorage.multiRemove([AUTH_STORAGE_KEY, USERS_STORAGE_KEY, REMEMBER_ME_KEY]).catch(() => {});
    }
  };

  const login = async (email: string, password: string, remember: boolean) => {
    try {
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

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message || 'Login failed. Please try again.' };
    }
  };

  const signup = async (email: string, password: string, name: string) => {
    try {
      const usersData = await AsyncStorage.getItem(USERS_STORAGE_KEY);
      const users: StoredUser[] = usersData ? JSON.parse(usersData) : [];
      
      const existingUser = users.find(u => u.email.toLowerCase() === email.toLowerCase());
      if (existingUser) {
        return { success: false, error: 'User already exists. Please login instead.' };
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

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message || 'Signup failed. Please try again.' };
    }
  };

  const updateUserName = async (newName: string) => {
    try {
      if (!authState.user) {
        return { success: false, error: 'No user logged in' };
      }

      if (!newName || newName.trim().length === 0) {
        return { success: false, error: 'Name cannot be empty' };
      }
      
      const usersData = await AsyncStorage.getItem(USERS_STORAGE_KEY);
      const users: StoredUser[] = usersData ? JSON.parse(usersData) : [];
      
      const userIndex = users.findIndex(u => u.id === authState.user!.id);
      if (userIndex !== -1) {
        users[userIndex].name = newName.trim();
        await AsyncStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
      }

      const updatedAuthState: AuthState = {
        ...authState,
        user: {
          ...authState.user,
          name: newName.trim(),
        },
      };
      
      setAuthState(updatedAuthState);
      await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(updatedAuthState));

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message || 'Update failed. Please try again.' };
    }
  };

  const logout = async () => {
    try {
      setAuthState({ user: null, token: null });
      
      if (Platform.OS !== 'web') {
        setCurrentUserId(null);
      }
      
      await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
      await AsyncStorage.removeItem(REMEMBER_ME_KEY);
    } catch {
      // Silent fail on logout storage cleanup
    }
  };

  return {
    user: authState.user,
    token: authState.token,
    isAuthenticated: !!authState.user,
    isLoading: false,
    rememberMe,
    login,
    signup,
    logout,
    updateUserName,
  };
});
