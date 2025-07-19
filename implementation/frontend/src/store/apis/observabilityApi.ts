// RTK Query API slice for Observability REST API
// Handles real CloudWatch metrics, logs, traces, alerts, and cost data
// Uses Cognito JWT authentication via API Gateway

import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { fetchAuthSession } from 'aws-amplify/auth';

// Types for observability data
export interface MetricDataPoint {
  timestamp: string;
  value: number;
  unit: string;
}

export interface HealthMetrics {
  metrics: {
    request_count: MetricDataPoint[];
    error_rate: MetricDataPoint[];
    response_time: MetricDataPoint[];
    availability: MetricDataPoint[];
  };
  summary: {
    total_requests: number;
    error_percentage: number;
    avg_response_time: number;
    uptime_percentage: number;
  };
}

export interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  context?: Record<string, unknown>;
  requestId?: string;
  source?: string;
}

export interface LogsResponse {
  logs: LogEntry[];
  nextToken?: string;
  total: number;
}

export interface TraceSegment {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
  duration: number;
  http?: {
    request?: {
      method: string;
      url: string;
    };
    response?: {
      status: number;
    };
  };
  annotations?: Record<string, string>;
  metadata?: Record<string, unknown>;
}

export interface Trace {
  id: string;
  duration: number;
  segments: TraceSegment[];
}

export interface TracesResponse {
  traces: Trace[];
  nextToken?: string;
}

export interface Alert {
  id: string;
  name: string;
  description: string;
  state: 'OK' | 'ALARM' | 'INSUFFICIENT_DATA';
  threshold: number;
  metric_name: string;
  comparison_operator: string;
  created_at: string;
  updated_at: string;
}

export interface AlertsResponse {
  alerts: Alert[];
  summary: {
    total: number;
    alarm_count: number;
    ok_count: number;
    insufficient_data_count: number;
  };
}

export interface CostData {
  service: string;
  amount: number;
  currency: string;
  period: string;
}

export interface CostResponse {
  costs: CostData[];
  total: number;
  currency: string;
  period: string;
  forecast?: number;
}

// Query parameters for API calls
export interface TimeRangeParams {
  start_time: string;
  end_time: string;
}

export interface LogsParams extends TimeRangeParams {
  level?: string;
  limit?: number;
  next_token?: string;
}

export interface TracesParams extends TimeRangeParams {
  limit?: number;
  next_token?: string;
  filter_expression?: string;
}

export interface CostParams {
  start_date: string;
  end_date: string;
  granularity?: 'DAILY' | 'MONTHLY';
  group_by?: string[];
}

// Custom base query with Cognito JWT authentication
const baseQueryWithAuth = fetchBaseQuery({
  baseUrl: process.env.NEXT_PUBLIC_API_ENDPOINT,
  prepareHeaders: async (headers) => {
    try {
      // Get the current auth session with JWT tokens
      const session = await fetchAuthSession();
      const token = session.tokens?.idToken?.toString();
      
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }
      
      headers.set('Content-Type', 'application/json');
      return headers;
    } catch (error) {
      console.error('Failed to get auth session:', error);
      return headers;
    }
  },
});

// RTK Query API slice for observability endpoints
export const observabilityApi = createApi({
  reducerPath: 'observabilityApi',
  baseQuery: baseQueryWithAuth,
  tagTypes: ['Metrics', 'Logs', 'Traces', 'Alerts', 'Costs'],
  endpoints: (builder) => ({
    // Health metrics endpoint
    getHealthMetrics: builder.query<HealthMetrics, TimeRangeParams>({
      query: ({ start_time, end_time }) => ({
        url: '/api/v1/metrics/health',
        params: { start_time, end_time },
      }),
      providesTags: ['Metrics'],
    }),

    // Custom metrics endpoint
    getCustomMetrics: builder.query<HealthMetrics, TimeRangeParams & { metric_names: string[] }>({
      query: ({ start_time, end_time, metric_names }) => ({
        url: '/api/v1/metrics/custom',
        params: { 
          start_time, 
          end_time, 
          metric_names: metric_names.join(',') 
        },
      }),
      providesTags: ['Metrics'],
    }),

    // Logs endpoint
    getLogs: builder.query<LogsResponse, LogsParams>({
      query: ({ start_time, end_time, level, limit = 100, next_token }) => ({
        url: '/api/v1/logs',
        params: { 
          start_time, 
          end_time, 
          ...(level && { level }),
          limit,
          ...(next_token && { next_token })
        },
      }),
      providesTags: ['Logs'],
      // Enable polling for real-time logs
      keepUnusedDataFor: 30, // Keep data for 30 seconds
    }),

    // Traces endpoint
    getTraces: builder.query<TracesResponse, TracesParams>({
      query: ({ start_time, end_time, limit = 20, next_token, filter_expression }) => ({
        url: '/api/v1/traces',
        params: { 
          start_time, 
          end_time, 
          limit,
          ...(next_token && { next_token }),
          ...(filter_expression && { filter_expression })
        },
      }),
      providesTags: ['Traces'],
    }),

    // Single trace endpoint
    getTrace: builder.query<Trace, string>({
      query: (traceId) => `/api/v1/traces/${traceId}`,
      providesTags: (result, error, traceId) => [{ type: 'Traces', id: traceId }],
    }),

    // Alerts endpoint
    getAlerts: builder.query<AlertsResponse, void>({
      query: () => '/api/v1/alerts',
      providesTags: ['Alerts'],
    }),

    // Single alert endpoint
    getAlert: builder.query<Alert, string>({
      query: (alertId) => `/api/v1/alerts/${alertId}`,
      providesTags: (result, error, alertId) => [{ type: 'Alerts', id: alertId }],
    }),

    // Update alert state
    updateAlert: builder.mutation<Alert, { id: string; state: Alert['state'] }>({
      query: ({ id, state }) => ({
        url: `/api/v1/alerts/${id}`,
        method: 'PATCH',
        body: { state },
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'Alerts', id },
        'Alerts'
      ],
    }),

    // Cost data endpoint
    getCosts: builder.query<CostResponse, CostParams>({
      query: ({ start_date, end_date, granularity = 'DAILY', group_by = [] }) => ({
        url: '/api/v1/costs',
        params: { 
          start_date, 
          end_date, 
          granularity,
          ...(group_by.length > 0 && { group_by: group_by.join(',') })
        },
      }),
      providesTags: ['Costs'],
    }),
  }),
});

// Export hooks for components
export const {
  // Metrics hooks
  useGetHealthMetricsQuery,
  useGetCustomMetricsQuery,
  
  // Logs hooks
  useGetLogsQuery,
  useLazyGetLogsQuery, // For pagination and search
  
  // Traces hooks
  useGetTracesQuery,
  useGetTraceQuery,
  useLazyGetTracesQuery, // For pagination and filtering
  
  // Alerts hooks
  useGetAlertsQuery,
  useGetAlertQuery,
  useUpdateAlertMutation,
  
  // Costs hooks
  useGetCostsQuery,
} = observabilityApi;