import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, LoginCredentials, RegisterData, AuthTokens } from '../types';
import { apiClient } from '../services/api';
import { realmDB } from '../database/realm';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (updates: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuthState();
  }, []);

  const checkAuthState = async () => {
    try {
      setIsLoading(true);
      
      // Check if user is authenticated
      if (apiClient.isAuthenticated()) {
        // Try to get user from local storage first
        const tokens = apiClient.getTokens();
        if (tokens) {
          // Get user from Realm database
          const localUser = realmDB.getUser('current_user');
          if (localUser) {
            setUser(localUser);
          } else {
            // User not found locally, might need to re-authenticate
            await logout();
          }
        }
      }
    } catch (error) {
      console.error('Auth state check failed:', error);
      await logout();
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (credentials: LoginCredentials): Promise<void> => {
    try {
      setIsLoading(true);
      
      const { user: serverUser, tokens } = await apiClient.login(credentials);
      
      // Save user to local database
      const userWithId = { ...serverUser, _id: 'current_user' };
      realmDB.saveUser(userWithId);
      
      setUser(userWithId);
      
      console.log('✅ Login successful');
    } catch (error) {
      console.error('❌ Login failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (data: RegisterData): Promise<void> => {
    try {
      setIsLoading(true);
      
      const { user: serverUser, tokens } = await apiClient.register(data);
      
      // Save user to local database
      const userWithId = { ...serverUser, _id: 'current_user' };
      realmDB.saveUser(userWithId);
      
      setUser(userWithId);
      
      console.log('✅ Registration successful');
    } catch (error) {
      console.error('❌ Registration failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await apiClient.logout();
      
      // Clear local user data
      setUser(null);
      
      console.log('✅ Logout successful');
    } catch (error) {
      console.error('❌ Logout failed:', error);
      // Still clear local state even if server logout fails
      setUser(null);
    }
  };

  const updateUser = (updates: Partial<User>): void => {
    if (user) {
      const updatedUser = { ...user, ...updates };
      setUser(updatedUser);
      realmDB.saveUser(updatedUser);
    }
  };

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    register,
    logout,
    updateUser
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
