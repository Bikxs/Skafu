import { createApi } from "@reduxjs/toolkit/query/react";
import { observabilityBaseQuery } from "./baseQuery";

// Types for observability data
export interface MetricDataPoint {
  timestamp: string;
  value: number;
  unit?: string;
}

export interface MetricsResponse {
  MetricDataResults: {
    Id: string;
    Label: string;
    Timestamps: string[];
    Values: number[];
    StatusCode: string;
  }[];
}

export interface LogEvent {
  timestamp: number;
  message: string;
  logStreamName: string;
}

export interface LogsResponse {
  events: LogEvent[];
  nextToken?: string;
}

export interface TraceData {
  Id: string;
  Duration: number;
  ResponseTime: number;
  HasError: boolean;
  HasFault: boolean;
  HasThrottle: boolean;
  Users: string[];
  ServiceIds: string[];
}

export interface TracesResponse {
  TraceSummaries: TraceData[];
  NextToken?: string;
}

export interface AlarmData {
  AlarmName: string;
  AlarmDescription?: string;
  StateValue: 'OK' | 'ALARM' | 'INSUFFICIENT_DATA';
  StateReason: string;
  StateUpdatedTimestamp: string;
  MetricName: string;
  Namespace: string;
  ComparisonOperator: string;
  Threshold: number;
}

export interface AlarmsResponse {
  MetricAlarms: AlarmData[];
}

export interface CostData {
  TimePeriod: {
    Start: string;
    End: string;
  };
  Total: {
    BlendedCost: {
      Amount: string;
      Unit: string;
    };
  };
  Groups: Array<{ Key: string; Value: string }>;
}

export interface CostResponse {
  ResultsByTime: CostData[];
}

export interface UserData {
  Username: string;
  UserStatus: string;
  Enabled: boolean;
  UserCreateDate: string;
  UserLastModifiedDate: string;
  Attributes: { Name: string; Value: string }[];
}

export interface UsersResponse {
  Users: UserData[];
}

// RTK Query API definition for real observability endpoints
export const observabilityApi = createApi({
  reducerPath: 'observabilityApi',
  baseQuery: observabilityBaseQuery,
  tagTypes: ['Metrics', 'Logs', 'Traces', 'Alarms', 'Cost', 'Users'],
  endpoints: (builder) => ({
    // Real CloudWatch Metrics
    getMetrics: builder.query<MetricsResponse, {
      MetricName: string;
      Namespace: string;
      StartTime: string;
      EndTime: string;
      Period?: number;
      Statistics?: string[];
    }>({
      query: (params) => ({
        url: '/metrics',
        params,
      }),
      providesTags: ['Metrics'],
    }),

    // Real CloudWatch Logs
    getLogs: builder.query<LogsResponse, {
      logGroupName: string;
      startTime?: number;
      endTime?: number;
      filterPattern?: string;
      nextToken?: string;
    }>({
      query: (params) => ({
        url: '/logs',
        params,
      }),
      providesTags: ['Logs'],
    }),

    // Real X-Ray Traces
    getTraces: builder.query<TracesResponse, {
      StartTime: string;
      EndTime: string;
      NextToken?: string;
    }>({
      query: (params) => ({
        url: '/traces',
        params,
      }),
      providesTags: ['Traces'],
    }),

    // Real CloudWatch Alarms
    getAlarms: builder.query<AlarmsResponse, {
      StateValue?: 'OK' | 'ALARM' | 'INSUFFICIENT_DATA';
      AlarmNamePrefix?: string;
    }>({
      query: (params) => ({
        url: '/alarms',
        params,
      }),
      providesTags: ['Alarms'],
    }),

    // Real Cost Explorer data
    getCost: builder.query<CostResponse, {
      StartDate: string;
      EndDate: string;
      Granularity: 'DAILY' | 'MONTHLY';
      Metrics: string[];
    }>({
      query: (params) => ({
        url: '/finance/cost',
        params,
      }),
      providesTags: ['Cost'],
    }),

    // Real Cognito Users
    getUsers: builder.query<UsersResponse, {
      UserPoolId: string;
      Limit?: number;
      PaginationToken?: string;
    }>({
      query: (params) => ({
        url: '/users',
        params,
      }),
      providesTags: ['Users'],
    }),
  }),
});

export const {
  useGetMetricsQuery,
  useGetLogsQuery,
  useGetTracesQuery,
  useGetAlarmsQuery,
  useGetCostQuery,
  useGetUsersQuery,
} = observabilityApi;