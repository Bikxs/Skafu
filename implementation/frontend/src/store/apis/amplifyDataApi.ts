// RTK Query API slice for Amplify Data (AppSync GraphQL)
// Handles real-time error events from EventBridge
// Uses user-based authorization for reads and API Key for writes

import { createApi, fakeBaseQuery } from '@reduxjs/toolkit/query/react';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../../amplify/data/resource';

// Initialize Amplify Data client
const client = generateClient<Schema>();

// Types based on Amplify Data schema
export type ErrorEvent = Schema['ErrorEvent']['type'];

// EventBridge event payload structure (stored as JSON in eventPayload field)
export type EventBridgeEvent = {
  version: string;
  id: string;
  'detail-type': string;
  source: string;
  account: string;
  time: string;
  region: string;
  detail: Record<string, unknown>;
  resources?: string[];
  'replay-name'?: string;
};

export type CreateErrorEventInput = {
  eventPayload: EventBridgeEvent;
};

// RTK Query API slice using Amplify Data client
export const amplifyDataApi = createApi({
  reducerPath: 'amplifyDataApi',
  baseQuery: fakeBaseQuery(),
  tagTypes: ['ErrorEvent'],
  endpoints: (builder) => ({
    // Get all error events with optional filtering
    getErrorEvents: builder.query<ErrorEvent[], { limit?: number; nextToken?: string }>({
      queryFn: async ({ limit = 50, nextToken } = {}) => {
        try {
          const { data: errorEvents } = await client.models.ErrorEvent.list({
            limit,
            nextToken,
          });
          return { data: errorEvents };
        } catch (error) {
          return { error: { status: 'FETCH_ERROR', error: String(error) } };
        }
      },
      providesTags: ['ErrorEvent'],
      // Enable real-time subscriptions for live error streaming
      keepUnusedDataFor: 60, // Keep data for 1 minute for real-time updates
    }),

    // Get a specific error event by ID
    getErrorEvent: builder.query<ErrorEvent, string>({
      queryFn: async (id) => {
        try {
          const { data: errorEvent } = await client.models.ErrorEvent.get({ id });
          if (!errorEvent) {
            return { error: { status: 'NOT_FOUND', error: 'Error event not found' } };
          }
          return { data: errorEvent };
        } catch (error) {
          return { error: { status: 'FETCH_ERROR', error: String(error) } };
        }
      },
      providesTags: (result, error, id) => [{ type: 'ErrorEvent', id }],
    }),

    // Create new error event (used by EventBridge consumer with API Key)
    createErrorEvent: builder.mutation<ErrorEvent, CreateErrorEventInput>({
      queryFn: async (newErrorEvent) => {
        try {
          const { data: errorEvent } = await client.models.ErrorEvent.create(newErrorEvent);
          if (!errorEvent) {
            return { error: { status: 'CREATE_ERROR', error: 'Failed to create error event' } };
          }
          return { data: errorEvent };
        } catch (error) {
          return { error: { status: 'CREATE_ERROR', error: String(error) } };
        }
      },
      invalidatesTags: ['ErrorEvent'],
    }),

    // Subscribe to real-time error events
    subscribeToErrorEvents: builder.query<ErrorEvent[], void>({
      queryFn: () => ({ data: [] }), // Initial empty data
      async onCacheEntryAdded(arg, { updateCachedData, cacheDataLoaded, cacheEntryRemoved }) {
        try {
          // Wait for the initial query to resolve before setting up subscription
          await cacheDataLoaded;

          // Set up real-time subscription to new error events
          const subscription = client.models.ErrorEvent.onCreate().subscribe({
            next: (newErrorEvent) => {
              updateCachedData((draft) => {
                // Add new error event to the beginning of the list
                draft.unshift(newErrorEvent);
                // Keep only the latest 100 events in cache
                if (draft.length > 100) {
                  draft.splice(100);
                }
              });
            },
            error: (error) => {
              console.error('Error event subscription error:', error);
            },
          });

          // Clean up subscription when cache entry is removed
          await cacheEntryRemoved;
          subscription.unsubscribe();
        } catch (error) {
          console.error('Failed to set up error event subscription:', error);
        }
      },
      providesTags: ['ErrorEvent'],
    }),
  }),
});

// Export hooks for components
export const {
  // Error Event hooks for real-time error streaming
  useGetErrorEventsQuery,
  useGetErrorEventQuery,
  useCreateErrorEventMutation,
  useSubscribeToErrorEventsQuery,
} = amplifyDataApi;