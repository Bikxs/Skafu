// Authentication state management slice
// Handles Cognito authentication state and user session

import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface User {
  id: string;
  username: string;
  email: string;
  name?: string;
  given_name?: string;
  family_name?: string;
  groups?: string[]; // Cognito User Pool Groups: Admin, Developer, Viewer
}

export interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
  error: string | null;
  lastLoginTime: string | null;
  sessionExpiresAt: string | null;
}

const initialState: AuthState = {
  isAuthenticated: false,
  isLoading: true, // Start with loading true to check existing session
  user: null,
  error: null,
  lastLoginTime: null,
  sessionExpiresAt: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    // Set loading state
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },

    // User sign-in success
    signInSuccess: (state, action: PayloadAction<{ user: User; expiresAt: string }>) => {
      state.isAuthenticated = true;
      state.isLoading = false;
      state.user = action.payload.user;
      state.error = null;
      state.lastLoginTime = new Date().toISOString();
      state.sessionExpiresAt = action.payload.expiresAt;
    },

    // User sign-in failure
    signInFailure: (state, action: PayloadAction<string>) => {
      state.isAuthenticated = false;
      state.isLoading = false;
      state.user = null;
      state.error = action.payload;
      state.lastLoginTime = null;
      state.sessionExpiresAt = null;
    },

    // User sign-out
    signOut: (state) => {
      state.isAuthenticated = false;
      state.isLoading = false;
      state.user = null;
      state.error = null;
      state.lastLoginTime = null;
      state.sessionExpiresAt = null;
    },

    // Session refresh
    refreshSession: (state, action: PayloadAction<{ expiresAt: string }>) => {
      state.sessionExpiresAt = action.payload.expiresAt;
      state.error = null;
    },

    // Clear auth error
    clearError: (state) => {
      state.error = null;
    },

    // Update user profile
    updateUserProfile: (state, action: PayloadAction<Partial<User>>) => {
      if (state.user) {
        state.user = { ...state.user, ...action.payload };
      }
    },
  },
});

export const {
  setLoading,
  signInSuccess,
  signInFailure,
  signOut,
  refreshSession,
  clearError,
  updateUserProfile,
} = authSlice.actions;

export default authSlice.reducer;

// Selectors
export const selectAuth = (state: { auth: AuthState }) => state.auth;
export const selectUser = (state: { auth: AuthState }) => state.auth.user;
export const selectIsAuthenticated = (state: { auth: AuthState }) => state.auth.isAuthenticated;
export const selectAuthLoading = (state: { auth: AuthState }) => state.auth.isLoading;
export const selectAuthError = (state: { auth: AuthState }) => state.auth.error;

// Helper selectors
export const selectUserGroups = (state: { auth: AuthState }) => state.auth.user?.groups || [];
export const selectIsAdmin = (state: { auth: AuthState }) => 
  state.auth.user?.groups?.includes('Admin') || false;
export const selectIsDeveloper = (state: { auth: AuthState }) => 
  state.auth.user?.groups?.includes('Developer') || false;
export const selectIsViewer = (state: { auth: AuthState }) => 
  state.auth.user?.groups?.includes('Viewer') || false;

// Check if session is expired or expiring soon
export const selectIsSessionExpired = (state: { auth: AuthState }) => {
  if (!state.auth.sessionExpiresAt || !state.auth.isAuthenticated) return false;
  const expiresAt = new Date(state.auth.sessionExpiresAt);
  const now = new Date();
  return now >= expiresAt;
};

export const selectIsSessionExpiringSoon = (state: { auth: AuthState }) => {
  if (!state.auth.sessionExpiresAt || !state.auth.isAuthenticated) return false;
  const expiresAt = new Date(state.auth.sessionExpiresAt);
  const now = new Date();
  const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);
  return fiveMinutesFromNow >= expiresAt;
};