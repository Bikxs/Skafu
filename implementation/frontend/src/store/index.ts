// Redux Toolkit store configuration with dual API pattern support
// 
// DUAL API ARCHITECTURE:
// 1. Amplify Data API: GraphQL AppSync with API Key (mock data for projects, templates, users)
// 2. Observability API: REST API Gateway with Cognito JWT (real CloudWatch metrics)

import { configureStore } from '@reduxjs/toolkit';
import { amplifyDataApi } from './apis/amplifyDataApi';
import { observabilityApi } from './apis/observabilityApi';
import authReducer from './slices/authSlice';
import uiReducer from './slices/uiSlice';

// Import domain slices
import observabilityReducer from '../../domains/observability/frontend/store/observabilitySlice';

export const store = configureStore({
  reducer: {
    // API slices
    [amplifyDataApi.reducerPath]: amplifyDataApi.reducer,
    [observabilityApi.reducerPath]: observabilityApi.reducer,
    
    // Feature slices
    auth: authReducer,
    ui: uiReducer,
    
    // Domain slices
    observability: observabilityReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these action types in serializable check
        ignoredActions: [
          'persist/PERSIST',
          'persist/REHYDRATE',
          'persist/REGISTER',
        ],
        // Ignore these field paths in all actions
        ignoredActionsPaths: ['meta.arg', 'payload.timestamp'],
        // Ignore these paths in the state
        ignoredPaths: ['amplifyDataApi', 'observabilityApi'],
      },
    })
      .concat(amplifyDataApi.middleware)
      .concat(observabilityApi.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// Export hooks for typed usage
export { useAppDispatch, useAppSelector } from './hooks';