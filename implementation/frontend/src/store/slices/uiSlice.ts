// UI state management slice
// Handles navigation, loading states, modals, themes, and global UI state

import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type NavigationSection = 
  | 'dashboard' 
  | 'metrics' 
  | 'logs' 
  | 'traces' 
  | 'alerts' 
  | 'costs' 
  | 'projects' 
  | 'templates' 
  | 'settings';

export type Theme = 'light' | 'dark' | 'system';

export interface Modal {
  id: string;
  isOpen: boolean;
  data?: unknown;
}

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  autoClose?: boolean;
  duration?: number; // in milliseconds
  timestamp: string;
}

export interface LoadingState {
  [key: string]: boolean;
}

export interface UIState {
  // Navigation
  activeSection: NavigationSection;
  sidebarCollapsed: boolean;
  breadcrumbs: Array<{ label: string; href?: string }>;
  
  // Theme and appearance
  theme: Theme;
  
  // Loading states
  loadingStates: LoadingState;
  
  // Modals
  modals: Modal[];
  
  // Notifications/Toasts
  notifications: Notification[];
  
  // Global UI flags
  isOffline: boolean;
  lastSyncTime: string | null;
  
  // Data refresh intervals (in seconds)
  refreshIntervals: {
    metrics: number;
    logs: number;
    traces: number;
    alerts: number;
  };
  
  // Filter states for observability views
  timeRange: {
    start: string;
    end: string;
    preset: '1h' | '6h' | '24h' | '7d' | '30d' | 'custom';
  };
  
  // Search and filtering
  searchQuery: string;
  activeFilters: Record<string, string[]>;
}

const initialState: UIState = {
  // Navigation
  activeSection: 'dashboard',
  sidebarCollapsed: false,
  breadcrumbs: [{ label: 'Dashboard' }],
  
  // Theme
  theme: 'system',
  
  // Loading states
  loadingStates: {},
  
  // Modals
  modals: [],
  
  // Notifications
  notifications: [],
  
  // Global UI flags
  isOffline: false,
  lastSyncTime: null,
  
  // Data refresh intervals (in seconds)
  refreshIntervals: {
    metrics: 30,
    logs: 10,
    traces: 60,
    alerts: 30,
  },
  
  // Default time range (last 1 hour)
  timeRange: {
    start: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    end: new Date().toISOString(),
    preset: '1h',
  },
  
  // Search and filtering
  searchQuery: '',
  activeFilters: {},
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    // Navigation actions
    setActiveSection: (state, action: PayloadAction<NavigationSection>) => {
      state.activeSection = action.payload;
      // Update breadcrumbs based on section
      switch (action.payload) {
        case 'dashboard':
          state.breadcrumbs = [{ label: 'Dashboard' }];
          break;
        case 'metrics':
          state.breadcrumbs = [{ label: 'Observability' }, { label: 'Metrics' }];
          break;
        case 'logs':
          state.breadcrumbs = [{ label: 'Observability' }, { label: 'Logs' }];
          break;
        case 'traces':
          state.breadcrumbs = [{ label: 'Observability' }, { label: 'Traces' }];
          break;
        case 'alerts':
          state.breadcrumbs = [{ label: 'Observability' }, { label: 'Alerts' }];
          break;
        case 'costs':
          state.breadcrumbs = [{ label: 'Observability' }, { label: 'Costs' }];
          break;
        case 'projects':
          state.breadcrumbs = [{ label: 'Project Management' }, { label: 'Projects' }];
          break;
        case 'templates':
          state.breadcrumbs = [{ label: 'Project Management' }, { label: 'Templates' }];
          break;
        case 'settings':
          state.breadcrumbs = [{ label: 'Settings' }];
          break;
      }
    },

    toggleSidebar: (state) => {
      state.sidebarCollapsed = !state.sidebarCollapsed;
    },

    setSidebarCollapsed: (state, action: PayloadAction<boolean>) => {
      state.sidebarCollapsed = action.payload;
    },

    setBreadcrumbs: (state, action: PayloadAction<Array<{ label: string; href?: string }>>) => {
      state.breadcrumbs = action.payload;
    },

    // Theme actions
    setTheme: (state, action: PayloadAction<Theme>) => {
      state.theme = action.payload;
    },

    // Loading state actions
    setLoading: (state, action: PayloadAction<{ key: string; isLoading: boolean }>) => {
      state.loadingStates[action.payload.key] = action.payload.isLoading;
    },

    clearAllLoading: (state) => {
      state.loadingStates = {};
    },

    // Modal actions
    openModal: (state, action: PayloadAction<{ id: string; data?: unknown }>) => {
      const existingModal = state.modals.find(m => m.id === action.payload.id);
      if (existingModal) {
        existingModal.isOpen = true;
        existingModal.data = action.payload.data;
      } else {
        state.modals.push({
          id: action.payload.id,
          isOpen: true,
          data: action.payload.data,
        });
      }
    },

    closeModal: (state, action: PayloadAction<string>) => {
      const modal = state.modals.find(m => m.id === action.payload);
      if (modal) {
        modal.isOpen = false;
      }
    },

    closeAllModals: (state) => {
      state.modals.forEach(modal => {
        modal.isOpen = false;
      });
    },

    // Notification actions
    addNotification: (state, action: PayloadAction<Omit<Notification, 'id' | 'timestamp'>>) => {
      const notification: Notification = {
        ...action.payload,
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
      };
      state.notifications.push(notification);
    },

    removeNotification: (state, action: PayloadAction<string>) => {
      state.notifications = state.notifications.filter(n => n.id !== action.payload);
    },

    clearAllNotifications: (state) => {
      state.notifications = [];
    },

    // Global UI state actions
    setOfflineStatus: (state, action: PayloadAction<boolean>) => {
      state.isOffline = action.payload;
    },

    setLastSyncTime: (state, action: PayloadAction<string>) => {
      state.lastSyncTime = action.payload;
    },

    // Refresh interval actions
    setRefreshInterval: (state, action: PayloadAction<{ type: keyof UIState['refreshIntervals']; interval: number }>) => {
      state.refreshIntervals[action.payload.type] = action.payload.interval;
    },

    // Time range actions
    setTimeRange: (state, action: PayloadAction<UIState['timeRange']>) => {
      state.timeRange = action.payload;
    },

    setTimeRangePreset: (state, action: PayloadAction<UIState['timeRange']['preset']>) => {
      const now = new Date();
      let start: Date;
      
      switch (action.payload) {
        case '1h':
          start = new Date(now.getTime() - 60 * 60 * 1000);
          break;
        case '6h':
          start = new Date(now.getTime() - 6 * 60 * 60 * 1000);
          break;
        case '24h':
          start = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case '7d':
          start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        default:
          return; // Don't update for 'custom'
      }
      
      state.timeRange = {
        start: start.toISOString(),
        end: now.toISOString(),
        preset: action.payload,
      };
    },

    // Search and filter actions
    setSearchQuery: (state, action: PayloadAction<string>) => {
      state.searchQuery = action.payload;
    },

    setFilter: (state, action: PayloadAction<{ key: string; values: string[] }>) => {
      state.activeFilters[action.payload.key] = action.payload.values;
    },

    clearFilter: (state, action: PayloadAction<string>) => {
      delete state.activeFilters[action.payload];
    },

    clearAllFilters: (state) => {
      state.activeFilters = {};
      state.searchQuery = '';
    },
  },
});

export const {
  // Navigation
  setActiveSection,
  toggleSidebar,
  setSidebarCollapsed,
  setBreadcrumbs,
  
  // Theme
  setTheme,
  
  // Loading
  setLoading,
  clearAllLoading,
  
  // Modals
  openModal,
  closeModal,
  closeAllModals,
  
  // Notifications
  addNotification,
  removeNotification,
  clearAllNotifications,
  
  // Global UI
  setOfflineStatus,
  setLastSyncTime,
  
  // Refresh intervals
  setRefreshInterval,
  
  // Time range
  setTimeRange,
  setTimeRangePreset,
  
  // Search and filters
  setSearchQuery,
  setFilter,
  clearFilter,
  clearAllFilters,
} = uiSlice.actions;

export default uiSlice.reducer;

// Selectors
export const selectUI = (state: { ui: UIState }) => state.ui;
export const selectActiveSection = (state: { ui: UIState }) => state.ui.activeSection;
export const selectSidebarCollapsed = (state: { ui: UIState }) => state.ui.sidebarCollapsed;
export const selectBreadcrumbs = (state: { ui: UIState }) => state.ui.breadcrumbs;
export const selectTheme = (state: { ui: UIState }) => state.ui.theme;
export const selectLoadingStates = (state: { ui: UIState }) => state.ui.loadingStates;
export const selectModals = (state: { ui: UIState }) => state.ui.modals;
export const selectNotifications = (state: { ui: UIState }) => state.ui.notifications;
export const selectTimeRange = (state: { ui: UIState }) => state.ui.timeRange;
export const selectSearchQuery = (state: { ui: UIState }) => state.ui.searchQuery;
export const selectActiveFilters = (state: { ui: UIState }) => state.ui.activeFilters;

// Helper selectors
export const selectIsLoading = (key: string) => (state: { ui: UIState }) => 
  state.ui.loadingStates[key] || false;

export const selectModalState = (id: string) => (state: { ui: UIState }) =>
  state.ui.modals.find(m => m.id === id);

export const selectRefreshInterval = (type: keyof UIState['refreshIntervals']) => (state: { ui: UIState }) =>
  state.ui.refreshIntervals[type];