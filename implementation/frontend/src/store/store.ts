import { configureStore } from "@reduxjs/toolkit";
import { observabilityApi } from "./api/observabilityApi";
import { projectsApi } from "./api/projectsApi";
import { templatesApi } from "./api/templatesApi";

export const store = configureStore({
  reducer: {
    // RTK Query API slices
    [observabilityApi.reducerPath]: observabilityApi.reducer,
    [projectsApi.reducerPath]: projectsApi.reducer,
    [templatesApi.reducerPath]: templatesApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [
          // Ignore Amplify and RTK Query actions that may contain non-serializable values
          'persist/PERSIST',
          'persist/REHYDRATE',
        ],
      },
    })
      .concat(observabilityApi.middleware)
      .concat(projectsApi.middleware)
      .concat(templatesApi.middleware),
  devTools: process.env.NODE_ENV !== 'production',
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;