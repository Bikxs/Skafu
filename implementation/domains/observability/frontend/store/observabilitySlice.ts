// Observability domain Redux slice for local state management
// Handles UI state specific to observability features

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { ObservabilityState, TimeRangeParams, SearchFilter } from '../types';

const initialState: ObservabilityState = {
  selectedTimeRange: {
    start_time: new Date(Date.now() - 60 * 60 * 1000).toISOString(), // 1 hour ago
    end_time: new Date().toISOString(),
  },
  autoRefreshEnabled: true,
  refreshInterval: 30, // seconds
  selectedFilters: {},
  selectedMetrics: ['request_count', 'error_rate', 'response_time', 'availability'],
  selectedLogLevel: 'INFO',
  selectedTraceFilter: '',
};

const observabilitySlice = createSlice({
  name: 'observability',
  initialState,
  reducers: {
    // Time range management
    setTimeRange: (state, action: PayloadAction<TimeRangeParams>) => {
      state.selectedTimeRange = action.payload;
    },

    setTimeRangePreset: (state, action: PayloadAction<'1h' | '6h' | '24h' | '7d' | '30d'>) => {
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
          return;
      }
      
      state.selectedTimeRange = {
        start_time: start.toISOString(),
        end_time: now.toISOString(),
      };
    },

    // Auto-refresh management
    setAutoRefresh: (state, action: PayloadAction<boolean>) => {
      state.autoRefreshEnabled = action.payload;
    },

    setRefreshInterval: (state, action: PayloadAction<number>) => {
      state.refreshInterval = action.payload;
    },

    // Filter management
    setFilter: (state, action: PayloadAction<{ key: string; values: string[] }>) => {
      state.selectedFilters[action.payload.key] = action.payload.values;
    },

    removeFilter: (state, action: PayloadAction<string>) => {
      delete state.selectedFilters[action.payload];
    },

    clearAllFilters: (state) => {
      state.selectedFilters = {};
    },

    // Metrics selection
    setSelectedMetrics: (state, action: PayloadAction<string[]>) => {
      state.selectedMetrics = action.payload;
    },

    toggleMetric: (state, action: PayloadAction<string>) => {
      const metric = action.payload;
      const index = state.selectedMetrics.indexOf(metric);
      
      if (index === -1) {
        state.selectedMetrics.push(metric);
      } else {
        state.selectedMetrics.splice(index, 1);
      }
    },

    // Logs filtering
    setLogLevel: (state, action: PayloadAction<string>) => {
      state.selectedLogLevel = action.payload;
    },

    // Traces filtering
    setTraceFilter: (state, action: PayloadAction<string>) => {
      state.selectedTraceFilter = action.payload;
    },

    // Reset to defaults
    resetObservabilityState: () => initialState,
  },
});

export const {
  // Time range actions
  setTimeRange,
  setTimeRangePreset,
  
  // Auto-refresh actions
  setAutoRefresh,
  setRefreshInterval,
  
  // Filter actions
  setFilter,
  removeFilter,
  clearAllFilters,
  
  // Metrics actions
  setSelectedMetrics,
  toggleMetric,
  
  // Logs actions
  setLogLevel,
  
  // Traces actions
  setTraceFilter,
  
  // Reset actions
  resetObservabilityState,
} = observabilitySlice.actions;

export default observabilitySlice.reducer;

// Selectors
export const selectObservability = (state: { observability: ObservabilityState }) => state.observability;
export const selectTimeRange = (state: { observability: ObservabilityState }) => state.observability.selectedTimeRange;
export const selectAutoRefresh = (state: { observability: ObservabilityState }) => state.observability.autoRefreshEnabled;
export const selectRefreshInterval = (state: { observability: ObservabilityState }) => state.observability.refreshInterval;
export const selectFilters = (state: { observability: ObservabilityState }) => state.observability.selectedFilters;
export const selectSelectedMetrics = (state: { observability: ObservabilityState }) => state.observability.selectedMetrics;
export const selectLogLevel = (state: { observability: ObservabilityState }) => state.observability.selectedLogLevel;
export const selectTraceFilter = (state: { observability: ObservabilityState }) => state.observability.selectedTraceFilter;