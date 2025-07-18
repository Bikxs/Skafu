# State Management Architecture

## Overview

This document defines the state management architecture for the Skafu platform frontend, built on Redux Toolkit (RTK) with RTK Query for API state management. The architecture provides predictable state management, optimistic updates, caching, and real-time synchronization.

## Redux Store Architecture

### Store Configuration

```typescript
// src/store/index.ts
import { configureStore } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';
import { persistStore, persistReducer } from 'redux-persist';
import storage from 'redux-persist/lib/storage';
import { combineReducers } from '@reduxjs/toolkit';

// API slices
import { projectsApi } from './api/projectsApi';
import { templatesApi } from './api/templatesApi';
import { authApi } from './api/authApi';
import { aiApi } from './api/aiApi';
import { githubApi } from './api/githubApi';
import { monitoringApi } from './api/monitoringApi';

// State slices
import authSlice from './slices/authSlice';
import uiSlice from './slices/uiSlice';
import settingsSlice from './slices/settingsSlice';
import notificationsSlice from './slices/notificationsSlice';
import websocketSlice from './slices/websocketSlice';

// Middleware
import { authMiddleware } from './middleware/authMiddleware';
import { errorMiddleware } from './middleware/errorMiddleware';
import { websocketMiddleware } from './middleware/websocketMiddleware';

const rootReducer = combineReducers({
  // API slices
  [projectsApi.reducerPath]: projectsApi.reducer,
  [templatesApi.reducerPath]: templatesApi.reducer,
  [authApi.reducerPath]: authApi.reducer,
  [aiApi.reducerPath]: aiApi.reducer,
  [githubApi.reducerPath]: githubApi.reducer,
  [monitoringApi.reducerPath]: monitoringApi.reducer,
  
  // State slices
  auth: authSlice,
  ui: uiSlice,
  settings: settingsSlice,
  notifications: notificationsSlice,
  websocket: websocketSlice,
});

const persistConfig = {
  key: 'root',
  storage,
  whitelist: ['auth', 'settings'], // Only persist auth and settings
  blacklist: [
    projectsApi.reducerPath,
    templatesApi.reducerPath,
    authApi.reducerPath,
    aiApi.reducerPath,
    githubApi.reducerPath,
    monitoringApi.reducerPath,
  ],
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
      },
    })
      .concat(
        // RTK Query middleware
        projectsApi.middleware,
        templatesApi.middleware,
        authApi.middleware,
        aiApi.middleware,
        githubApi.middleware,
        monitoringApi.middleware,
        
        // Custom middleware
        authMiddleware,
        errorMiddleware,
        websocketMiddleware,
      ),
  devTools: process.env.NODE_ENV !== 'production',
});

export const persistor = persistStore(store);

// Setup listeners for RTK Query
setupListeners(store.dispatch);

// Export types
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
```

### Typed Hooks

```typescript
// src/hooks/redux.ts
import { useDispatch, useSelector, TypedUseSelectorHook } from 'react-redux';
import type { RootState, AppDispatch } from '../store';

export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
```

## API State Management with RTK Query

### Base API Configuration

```typescript
// src/store/api/baseApi.ts
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { RootState } from '../index';

const baseQuery = fetchBaseQuery({
  baseUrl: process.env.REACT_APP_API_URL || '/api',
  prepareHeaders: (headers, { getState }) => {
    const token = (getState() as RootState).auth.token;
    if (token) {
      headers.set('authorization', `Bearer ${token}`);
    }
    headers.set('content-type', 'application/json');
    return headers;
  },
});

// Enhanced base query with authentication and error handling
const baseQueryWithAuth = async (args: any, api: any, extraOptions: any) => {
  const result = await baseQuery(args, api, extraOptions);
  
  if (result.error && result.error.status === 401) {
    // Token expired or invalid, redirect to login
    api.dispatch({ type: 'auth/logout' });
    window.location.href = '/login';
  }
  
  return result;
};

export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithAuth,
  tagTypes: [
    'Project',
    'Template',
    'User',
    'Organization',
    'AIAnalysis',
    'GitHubRepo',
    'Metrics',
    'Activity',
    'Deployment',
    'Settings',
  ],
  endpoints: () => ({}),
});
```

### Projects API

```typescript
// src/store/api/projectsApi.ts
import { baseApi } from './baseApi';
import { Project, CreateProjectRequest, UpdateProjectRequest } from '../../types/project';

export const projectsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // Get all projects
    getProjects: builder.query<{
      projects: Project[];
      pagination: {
        page: number;
        limit: number;
        total: number;
        pages: number;
      };
    }, {
      search?: string;
      status?: string;
      template?: string;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
      page?: number;
      limit?: number;
      filter?: string;
    }>({
      query: (params) => ({
        url: '/projects',
        params,
      }),
      providesTags: ['Project'],
      // Transform response to normalize data
      transformResponse: (response: any) => ({
        projects: response.data.projects,
        pagination: response.data.pagination,
      }),
    }),
    
    // Get single project
    getProject: builder.query<Project, string>({
      query: (id) => `/projects/${id}`,
      providesTags: (result, error, id) => [{ type: 'Project', id }],
      transformResponse: (response: any) => response.data,
    }),
    
    // Create project
    createProject: builder.mutation<Project, CreateProjectRequest>({
      query: (project) => ({
        url: '/projects',
        method: 'POST',
        body: project,
      }),
      invalidatesTags: ['Project'],
      transformResponse: (response: any) => response.data,
      // Optimistic update
      onQueryStarted: async (project, { dispatch, queryFulfilled }) => {
        const tempId = `temp-${Date.now()}`;
        const tempProject: Project = {
          ...project,
          id: tempId,
          status: 'draft',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        
        // Optimistically update the projects list
        const patchResult = dispatch(
          projectsApi.util.updateQueryData('getProjects', {}, (draft) => {
            draft.projects.unshift(tempProject);
          })
        );
        
        try {
          const { data } = await queryFulfilled;
          // Replace temp project with real project
          dispatch(
            projectsApi.util.updateQueryData('getProjects', {}, (draft) => {
              const index = draft.projects.findIndex(p => p.id === tempId);
              if (index !== -1) {
                draft.projects[index] = data;
              }
            })
          );
        } catch {
          // Rollback on error
          patchResult.undo();
        }
      },
    }),
    
    // Update project
    updateProject: builder.mutation<Project, { id: string; updates: UpdateProjectRequest }>({
      query: ({ id, updates }) => ({
        url: `/projects/${id}`,
        method: 'PUT',
        body: updates,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Project', id }],
      transformResponse: (response: any) => response.data,
      // Optimistic update
      onQueryStarted: async ({ id, updates }, { dispatch, queryFulfilled }) => {
        const patchResult = dispatch(
          projectsApi.util.updateQueryData('getProject', id, (draft) => {
            Object.assign(draft, updates);
          })
        );
        
        try {
          await queryFulfilled;
        } catch {
          patchResult.undo();
        }
      },
    }),
    
    // Delete project
    deleteProject: builder.mutation<void, string>({
      query: (id) => ({
        url: `/projects/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Project'],
      // Optimistic update
      onQueryStarted: async (id, { dispatch, queryFulfilled }) => {
        const patchResult = dispatch(
          projectsApi.util.updateQueryData('getProjects', {}, (draft) => {
            draft.projects = draft.projects.filter(p => p.id !== id);
          })
        );
        
        try {
          await queryFulfilled;
        } catch {
          patchResult.undo();
        }
      },
    }),
    
    // Deploy project
    deployProject: builder.mutation<{ deploymentId: string }, { id: string; environment: string }>({
      query: ({ id, environment }) => ({
        url: `/projects/${id}/deploy`,
        method: 'POST',
        body: { environment },
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Project', id }],
      transformResponse: (response: any) => response.data,
    }),
    
    // Get project activity
    getProjectActivity: builder.query<any[], string>({
      query: (id) => `/projects/${id}/activity`,
      providesTags: (result, error, id) => [{ type: 'Activity', id }],
      transformResponse: (response: any) => response.data,
    }),
    
    // Get project deployments
    getProjectDeployments: builder.query<any[], string>({
      query: (id) => `/projects/${id}/deployments`,
      providesTags: (result, error, id) => [{ type: 'Deployment', id }],
      transformResponse: (response: any) => response.data,
    }),
  }),
});

export const {
  useGetProjectsQuery,
  useGetProjectQuery,
  useCreateProjectMutation,
  useUpdateProjectMutation,
  useDeleteProjectMutation,
  useDeployProjectMutation,
  useGetProjectActivityQuery,
  useGetProjectDeploymentsQuery,
} = projectsApi;
```

### Templates API

```typescript
// src/store/api/templatesApi.ts
import { baseApi } from './baseApi';
import { Template, CreateTemplateRequest } from '../../types/template';

export const templatesApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // Get all templates
    getTemplates: builder.query<{
      templates: Template[];
      pagination: any;
    }, {
      search?: string;
      category?: string;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
      page?: number;
      limit?: number;
      filter?: 'all' | 'my' | 'featured';
    }>({
      query: (params) => ({
        url: '/templates',
        params,
      }),
      providesTags: ['Template'],
      transformResponse: (response: any) => ({
        templates: response.data.templates,
        pagination: response.data.pagination,
      }),
    }),
    
    // Get single template
    getTemplate: builder.query<Template, string>({
      query: (id) => `/templates/${id}`,
      providesTags: (result, error, id) => [{ type: 'Template', id }],
      transformResponse: (response: any) => response.data,
    }),
    
    // Create template
    createTemplate: builder.mutation<Template, CreateTemplateRequest>({
      query: (template) => ({
        url: '/templates',
        method: 'POST',
        body: template,
      }),
      invalidatesTags: ['Template'],
      transformResponse: (response: any) => response.data,
    }),
    
    // Use template (create project from template)
    useTemplate: builder.mutation<Project, { templateId: string; projectName: string; description?: string }>({
      query: ({ templateId, projectName, description }) => ({
        url: `/templates/${templateId}/use`,
        method: 'POST',
        body: { projectName, description },
      }),
      invalidatesTags: ['Project'],
      transformResponse: (response: any) => response.data,
    }),
    
    // Get template categories
    getTemplateCategories: builder.query<string[], void>({
      query: () => '/templates/categories',
      transformResponse: (response: any) => response.data,
    }),
  }),
});

export const {
  useGetTemplatesQuery,
  useGetTemplateQuery,
  useCreateTemplateMutation,
  useUseTemplateMutation,
  useGetTemplateCategoriesQuery,
} = templatesApi;
```

### Authentication API

```typescript
// src/store/api/authApi.ts
import { baseApi } from './baseApi';
import { User, LoginRequest, RegisterRequest } from '../../types/auth';

export const authApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // Login
    login: builder.mutation<{
      user: User;
      token: string;
      refreshToken: string;
    }, LoginRequest>({
      query: (credentials) => ({
        url: '/auth/login',
        method: 'POST',
        body: credentials,
      }),
      transformResponse: (response: any) => response.data,
    }),
    
    // Register
    register: builder.mutation<{
      user: User;
      token: string;
      refreshToken: string;
    }, RegisterRequest>({
      query: (userData) => ({
        url: '/auth/register',
        method: 'POST',
        body: userData,
      }),
      transformResponse: (response: any) => response.data,
    }),
    
    // Refresh token
    refreshToken: builder.mutation<{
      token: string;
      refreshToken: string;
    }, { refreshToken: string }>({
      query: ({ refreshToken }) => ({
        url: '/auth/refresh',
        method: 'POST',
        body: { refreshToken },
      }),
      transformResponse: (response: any) => response.data,
    }),
    
    // Logout
    logout: builder.mutation<void, void>({
      query: () => ({
        url: '/auth/logout',
        method: 'POST',
      }),
    }),
    
    // Get current user
    getCurrentUser: builder.query<User, void>({
      query: () => '/auth/me',
      providesTags: ['User'],
      transformResponse: (response: any) => response.data,
    }),
    
    // Update profile
    updateProfile: builder.mutation<User, Partial<User>>({
      query: (updates) => ({
        url: '/auth/profile',
        method: 'PUT',
        body: updates,
      }),
      invalidatesTags: ['User'],
      transformResponse: (response: any) => response.data,
    }),
    
    // Change password
    changePassword: builder.mutation<void, {
      currentPassword: string;
      newPassword: string;
    }>({
      query: (passwords) => ({
        url: '/auth/change-password',
        method: 'PUT',
        body: passwords,
      }),
    }),
    
    // Forgot password
    forgotPassword: builder.mutation<void, { email: string }>({
      query: ({ email }) => ({
        url: '/auth/forgot-password',
        method: 'POST',
        body: { email },
      }),
    }),
    
    // Reset password
    resetPassword: builder.mutation<void, {
      token: string;
      password: string;
    }>({
      query: ({ token, password }) => ({
        url: '/auth/reset-password',
        method: 'POST',
        body: { token, password },
      }),
    }),
  }),
});

export const {
  useLoginMutation,
  useRegisterMutation,
  useRefreshTokenMutation,
  useLogoutMutation,
  useGetCurrentUserQuery,
  useUpdateProfileMutation,
  useChangePasswordMutation,
  useForgotPasswordMutation,
  useResetPasswordMutation,
} = authApi;
```

## Local State Management

### Authentication Slice

```typescript
// src/store/slices/authSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { User } from '../../types/auth';

interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  token: null,
  refreshToken: null,
  isAuthenticated: false,
  loading: false,
  error: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    loginStart: (state) => {
      state.loading = true;
      state.error = null;
    },
    loginSuccess: (state, action: PayloadAction<{
      user: User;
      token: string;
      refreshToken: string;
    }>) => {
      state.loading = false;
      state.error = null;
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.refreshToken = action.payload.refreshToken;
      state.isAuthenticated = true;
    },
    loginFailure: (state, action: PayloadAction<string>) => {
      state.loading = false;
      state.error = action.payload;
      state.user = null;
      state.token = null;
      state.refreshToken = null;
      state.isAuthenticated = false;
    },
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.refreshToken = null;
      state.isAuthenticated = false;
      state.loading = false;
      state.error = null;
    },
    updateUser: (state, action: PayloadAction<Partial<User>>) => {
      if (state.user) {
        state.user = { ...state.user, ...action.payload };
      }
    },
    clearError: (state) => {
      state.error = null;
    },
  },
});

export const {
  loginStart,
  loginSuccess,
  loginFailure,
  logout,
  updateUser,
  clearError,
} = authSlice.actions;

export default authSlice.reducer;
```

### UI Slice

```typescript
// src/store/slices/uiSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface UIState {
  sidebarOpen: boolean;
  theme: 'light' | 'dark';
  language: string;
  notifications: {
    enabled: boolean;
    sound: boolean;
    desktop: boolean;
  };
  preferences: {
    compactMode: boolean;
    animationsEnabled: boolean;
    autoSave: boolean;
  };
  loading: {
    global: boolean;
    components: Record<string, boolean>;
  };
  modals: {
    [key: string]: {
      open: boolean;
      data?: any;
    };
  };
}

const initialState: UIState = {
  sidebarOpen: true,
  theme: 'light',
  language: 'en',
  notifications: {
    enabled: true,
    sound: true,
    desktop: true,
  },
  preferences: {
    compactMode: false,
    animationsEnabled: true,
    autoSave: true,
  },
  loading: {
    global: false,
    components: {},
  },
  modals: {},
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    toggleSidebar: (state) => {
      state.sidebarOpen = !state.sidebarOpen;
    },
    setSidebarOpen: (state, action: PayloadAction<boolean>) => {
      state.sidebarOpen = action.payload;
    },
    setTheme: (state, action: PayloadAction<'light' | 'dark'>) => {
      state.theme = action.payload;
    },
    setLanguage: (state, action: PayloadAction<string>) => {
      state.language = action.payload;
    },
    updateNotificationSettings: (state, action: PayloadAction<Partial<UIState['notifications']>>) => {
      state.notifications = { ...state.notifications, ...action.payload };
    },
    updatePreferences: (state, action: PayloadAction<Partial<UIState['preferences']>>) => {
      state.preferences = { ...state.preferences, ...action.payload };
    },
    setGlobalLoading: (state, action: PayloadAction<boolean>) => {
      state.loading.global = action.payload;
    },
    setComponentLoading: (state, action: PayloadAction<{ component: string; loading: boolean }>) => {
      state.loading.components[action.payload.component] = action.payload.loading;
    },
    openModal: (state, action: PayloadAction<{ modal: string; data?: any }>) => {
      state.modals[action.payload.modal] = {
        open: true,
        data: action.payload.data,
      };
    },
    closeModal: (state, action: PayloadAction<string>) => {
      state.modals[action.payload] = {
        open: false,
        data: undefined,
      };
    },
    closeAllModals: (state) => {
      Object.keys(state.modals).forEach(modal => {
        state.modals[modal] = {
          open: false,
          data: undefined,
        };
      });
    },
  },
});

export const {
  toggleSidebar,
  setSidebarOpen,
  setTheme,
  setLanguage,
  updateNotificationSettings,
  updatePreferences,
  setGlobalLoading,
  setComponentLoading,
  openModal,
  closeModal,
  closeAllModals,
} = uiSlice.actions;

export default uiSlice.reducer;
```

### Notifications Slice

```typescript
// src/store/slices/notificationsSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { v4 as uuidv4 } from 'uuid';

interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: number;
  duration?: number;
  persistent?: boolean;
  actions?: {
    label: string;
    action: string;
  }[];
}

interface NotificationsState {
  notifications: Notification[];
  unreadCount: number;
}

const initialState: NotificationsState = {
  notifications: [],
  unreadCount: 0,
};

const notificationsSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    addNotification: (state, action: PayloadAction<Omit<Notification, 'id' | 'timestamp'>>) => {
      const notification: Notification = {
        ...action.payload,
        id: uuidv4(),
        timestamp: Date.now(),
      };
      
      state.notifications.unshift(notification);
      state.unreadCount += 1;
      
      // Auto-remove non-persistent notifications after duration
      if (!notification.persistent && notification.duration !== -1) {
        setTimeout(() => {
          // This would need to be handled by middleware
        }, notification.duration || 5000);
      }
    },
    removeNotification: (state, action: PayloadAction<string>) => {
      const index = state.notifications.findIndex(n => n.id === action.payload);
      if (index !== -1) {
        state.notifications.splice(index, 1);
        if (state.unreadCount > 0) {
          state.unreadCount -= 1;
        }
      }
    },
    clearAllNotifications: (state) => {
      state.notifications = [];
      state.unreadCount = 0;
    },
    markAsRead: (state, action: PayloadAction<string>) => {
      const notification = state.notifications.find(n => n.id === action.payload);
      if (notification && state.unreadCount > 0) {
        state.unreadCount -= 1;
      }
    },
    markAllAsRead: (state) => {
      state.unreadCount = 0;
    },
  },
});

export const {
  addNotification,
  removeNotification,
  clearAllNotifications,
  markAsRead,
  markAllAsRead,
} = notificationsSlice.actions;

export default notificationsSlice.reducer;
```

## Custom Hooks

### useAuth Hook

```typescript
// src/hooks/useAuth.ts
import { useAppDispatch, useAppSelector } from './redux';
import { useLoginMutation, useRegisterMutation, useLogoutMutation } from '../store/api/authApi';
import { loginStart, loginSuccess, loginFailure, logout as logoutAction } from '../store/slices/authSlice';
import { addNotification } from '../store/slices/notificationsSlice';

export const useAuth = () => {
  const dispatch = useAppDispatch();
  const authState = useAppSelector(state => state.auth);
  
  const [loginMutation] = useLoginMutation();
  const [registerMutation] = useRegisterMutation();
  const [logoutMutation] = useLogoutMutation();
  
  const login = async (email: string, password: string, rememberMe: boolean = false) => {
    dispatch(loginStart());
    
    try {
      const result = await loginMutation({ email, password, rememberMe }).unwrap();
      
      dispatch(loginSuccess(result));
      dispatch(addNotification({
        type: 'success',
        title: 'Welcome back!',
        message: 'You have successfully logged in.',
        duration: 3000,
      }));
      
      return result;
    } catch (error: any) {
      const errorMessage = error.data?.message || 'Login failed. Please try again.';
      dispatch(loginFailure(errorMessage));
      dispatch(addNotification({
        type: 'error',
        title: 'Login Failed',
        message: errorMessage,
        duration: 5000,
      }));
      
      throw error;
    }
  };
  
  const register = async (userData: any) => {
    dispatch(loginStart());
    
    try {
      const result = await registerMutation(userData).unwrap();
      
      dispatch(loginSuccess(result));
      dispatch(addNotification({
        type: 'success',
        title: 'Welcome to Skafu!',
        message: 'Your account has been created successfully.',
        duration: 5000,
      }));
      
      return result;
    } catch (error: any) {
      const errorMessage = error.data?.message || 'Registration failed. Please try again.';
      dispatch(loginFailure(errorMessage));
      dispatch(addNotification({
        type: 'error',
        title: 'Registration Failed',
        message: errorMessage,
        duration: 5000,
      }));
      
      throw error;
    }
  };
  
  const logout = async () => {
    try {
      await logoutMutation().unwrap();
    } catch (error) {
      // Log error but continue with logout
      console.error('Logout API call failed:', error);
    }
    
    dispatch(logoutAction());
    dispatch(addNotification({
      type: 'info',
      title: 'Logged Out',
      message: 'You have been logged out successfully.',
      duration: 3000,
    }));
  };
  
  return {
    ...authState,
    login,
    register,
    logout,
  };
};
```

### useNotifications Hook

```typescript
// src/hooks/useNotifications.ts
import { useAppDispatch, useAppSelector } from './redux';
import { 
  addNotification, 
  removeNotification, 
  clearAllNotifications, 
  markAsRead, 
  markAllAsRead 
} from '../store/slices/notificationsSlice';

export const useNotifications = () => {
  const dispatch = useAppDispatch();
  const { notifications, unreadCount } = useAppSelector(state => state.notifications);
  
  const showNotification = (notification: any) => {
    dispatch(addNotification(notification));
  };
  
  const showSuccess = (title: string, message: string, duration?: number) => {
    dispatch(addNotification({
      type: 'success',
      title,
      message,
      duration,
    }));
  };
  
  const showError = (title: string, message: string, duration?: number) => {
    dispatch(addNotification({
      type: 'error',
      title,
      message,
      duration: duration || 5000,
    }));
  };
  
  const showWarning = (title: string, message: string, duration?: number) => {
    dispatch(addNotification({
      type: 'warning',
      title,
      message,
      duration,
    }));
  };
  
  const showInfo = (title: string, message: string, duration?: number) => {
    dispatch(addNotification({
      type: 'info',
      title,
      message,
      duration,
    }));
  };
  
  const removeNotificationById = (id: string) => {
    dispatch(removeNotification(id));
  };
  
  const clearAll = () => {
    dispatch(clearAllNotifications());
  };
  
  const markNotificationAsRead = (id: string) => {
    dispatch(markAsRead(id));
  };
  
  const markAllNotificationsAsRead = () => {
    dispatch(markAllAsRead());
  };
  
  return {
    notifications,
    unreadCount,
    showNotification,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    removeNotification: removeNotificationById,
    clearAll,
    markAsRead: markNotificationAsRead,
    markAllAsRead: markAllNotificationsAsRead,
  };
};
```

## Middleware

### Authentication Middleware

```typescript
// src/store/middleware/authMiddleware.ts
import { Middleware } from '@reduxjs/toolkit';
import { logout } from '../slices/authSlice';

export const authMiddleware: Middleware = (store) => (next) => (action) => {
  // Handle token expiration
  if (action.type.endsWith('/rejected') && action.payload?.status === 401) {
    store.dispatch(logout());
    window.location.href = '/login';
  }
  
  return next(action);
};
```

### Error Middleware

```typescript
// src/store/middleware/errorMiddleware.ts
import { Middleware } from '@reduxjs/toolkit';
import { addNotification } from '../slices/notificationsSlice';

export const errorMiddleware: Middleware = (store) => (next) => (action) => {
  // Handle API errors
  if (action.type.endsWith('/rejected') && action.payload?.status >= 500) {
    store.dispatch(addNotification({
      type: 'error',
      title: 'Server Error',
      message: 'Something went wrong on our end. Please try again later.',
      duration: 5000,
    }));
  }
  
  return next(action);
};
```

This comprehensive state management architecture provides:

1. **Centralized State Management**: All application state in one place
2. **Optimistic Updates**: Immediate UI feedback with rollback on errors
3. **Caching**: Intelligent caching and invalidation with RTK Query
4. **Real-time Updates**: WebSocket integration for live data
5. **Offline Support**: Persistence and offline capabilities
6. **Type Safety**: Full TypeScript support throughout
7. **Developer Experience**: Redux DevTools and time-travel debugging
8. **Error Handling**: Comprehensive error management and user feedback
9. **Performance**: Optimized re-renders and data fetching
10. **Scalability**: Modular architecture that grows with the application