import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authAPI } from '../api/auth';
import type { User } from '../types';
import React from 'react';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (payload: {
    email: string;
    password: string;
    fullName: string;
    phoneNumber?: string;
    role: 'DRIVER' | 'BUYER' | 'SUPPLIER';
    supplierType?: string;
    organizationName?: string;
  }) => Promise<void>;
  verifyCompanyCode: (code: string) => Promise<string>;
  completeLocation: (payload: {
    country: string;
    city: string;
    address: string;
    landmark?: string;
    lat?: number;
    lng?: number;
  }) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: true, // true until stored token is checked
    error: null,
  });

  // Restore session on mount
  useEffect(() => {
    (async () => {
      try {
        const [token, userStr] = await AsyncStorage.multiGet(['authToken', 'user']);
        const storedToken = token[1];
        const storedUser = userStr[1] ? (JSON.parse(userStr[1]) as User) : null;
        if (storedToken && storedUser) {
          setState({ user: storedUser, token: storedToken, isAuthenticated: true, isLoading: false, error: null });
        } else {
          setState(s => ({ ...s, isLoading: false }));
        }
      } catch {
        setState(s => ({ ...s, isLoading: false }));
      }
    })();
  }, []);

  const login = async (email: string, password: string) => {
    setState(s => ({ ...s, isLoading: true, error: null }));
    try {
      const response = await authAPI.login({ email, password });
      if (!response.success) throw new Error(response.message || 'Login failed');
      const { token, refreshToken, user } = response.data;
      await AsyncStorage.multiSet([
        ['authToken', token],
        ['refreshToken', refreshToken],
        ['user', JSON.stringify(user)],
      ]);
      setState({ user, token, isAuthenticated: true, isLoading: false, error: null });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Login failed';
      setState(s => ({ ...s, isLoading: false, error: msg }));
      throw err;
    }
  };

  const register = async (payload: {
    email: string;
    password: string;
    fullName: string;
    phoneNumber?: string;
    role: 'DRIVER' | 'BUYER' | 'SUPPLIER';
    supplierType?: string;
    organizationName?: string;
  }) => {
    setState(s => ({ ...s, isLoading: true, error: null }));
    try {
      const response = await authAPI.register(payload);
      if (!response.success) throw new Error(response.message || 'Registration failed');
      const { token, refreshToken, user } = response.data;
      await AsyncStorage.multiSet([
        ['authToken', token],
        ['refreshToken', refreshToken],
        ['user', JSON.stringify(user)],
      ]);
      setState({ user, token, isAuthenticated: true, isLoading: false, error: null });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Registration failed';
      setState(s => ({ ...s, isLoading: false, error: msg }));
      throw err;
    }
  };

  const logout = async () => {
    const refreshToken = await AsyncStorage.getItem('refreshToken');
    if (refreshToken) authAPI.logout(refreshToken).catch(() => {});
    await AsyncStorage.multiRemove(['authToken', 'refreshToken', 'user']);
    setState({ user: null, token: null, isAuthenticated: false, isLoading: false, error: null });
  };

  const verifyCompanyCode = async (code: string): Promise<string> => {
    setState(s => ({ ...s, isLoading: true, error: null }));
    try {
      const response = await authAPI.verifyCompanyCode(code);
      if (!response.success) throw new Error(response.message || 'Invalid company code');
      const { user, companyName } = response.data;
      const stored = await AsyncStorage.getItem('user');
      const merged = { ...(stored ? JSON.parse(stored) : {}), ...user };
      await AsyncStorage.setItem('user', JSON.stringify(merged));
      setState(s => ({ ...s, user: merged, isLoading: false }));
      return companyName;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to verify code';
      setState(s => ({ ...s, isLoading: false, error: msg }));
      throw err;
    }
  };

  const completeLocation = async (payload: {
    country: string;
    city: string;
    address: string;
    landmark?: string;
    lat?: number;
    lng?: number;
  }) => {
    setState(s => ({ ...s, isLoading: true, error: null }));
    try {
      const response = await authAPI.completeLocation(payload);
      if (!response.success) throw new Error(response.message || 'Failed to save location');
      const { user } = response.data;
      const stored = await AsyncStorage.getItem('user');
      const merged = { ...(stored ? JSON.parse(stored) : {}), ...user };
      await AsyncStorage.setItem('user', JSON.stringify(merged));
      setState(s => ({ ...s, user: merged, isLoading: false }));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save location';
      setState(s => ({ ...s, isLoading: false, error: msg }));
      throw err;
    }
  };

  const clearError = () => setState(s => ({ ...s, error: null }));

  return (
    <AuthContext.Provider value={{ ...state, login, register, verifyCompanyCode, completeLocation, logout, clearError }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
