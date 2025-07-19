// Export all observability-related types

// Error Event types (from Amplify Data)
export type { ErrorEvent, EventBridgeEvent, CreateErrorEventInput } from '../../../frontend/src/store/apis/amplifyDataApi';

// Observability API types (from REST API)
export type {
  MetricDataPoint,
  HealthMetrics,
  LogEntry,
  LogsResponse,
  TraceSegment,
  Trace,
  TracesResponse,
  Alert,
  AlertsResponse,
  CostData,
  CostResponse,
  TimeRangeParams,
  LogsParams,
  TracesParams,
  CostParams,
} from '../../../frontend/src/store/apis/observabilityApi';

// Domain-specific component props
export interface DashboardProps {
  timeRange?: TimeRangeParams;
  refreshInterval?: number;
}

export interface MetricsViewerProps {
  metricNames?: string[];
  timeRange: TimeRangeParams;
  autoRefresh?: boolean;
}

export interface LogsViewerProps {
  level?: string;
  timeRange: TimeRangeParams;
  searchQuery?: string;
  autoRefresh?: boolean;
}

export interface TracesViewerProps {
  timeRange: TimeRangeParams;
  filterExpression?: string;
  autoRefresh?: boolean;
}

export interface AlertsPanelProps {
  showOnlyAlarms?: boolean;
  autoRefresh?: boolean;
}

export interface ErrorEventsViewerProps {
  limit?: number;
  autoRefresh?: boolean;
  showDetails?: boolean;
}

// State management types
export interface ObservabilityState {
  selectedTimeRange: TimeRangeParams;
  autoRefreshEnabled: boolean;
  refreshInterval: number;
  selectedFilters: Record<string, string[]>;
  selectedMetrics: string[];
  selectedLogLevel: string;
  selectedTraceFilter: string;
}

// Chart and visualization types
export interface ChartDataPoint {
  timestamp: string;
  value: number;
  label?: string;
}

export interface ChartSeries {
  name: string;
  data: ChartDataPoint[];
  color?: string;
  unit?: string;
}

export interface AlertSeverity {
  level: 'low' | 'medium' | 'high' | 'critical';
  color: string;
  icon: string;
}

// Filter and search types
export interface FilterOption {
  label: string;
  value: string;
  count?: number;
}

export interface SearchFilter {
  field: string;
  operator: 'equals' | 'contains' | 'starts_with' | 'greater_than' | 'less_than';
  value: string;
}

// Real-time subscription types
export interface SubscriptionConfig {
  enabled: boolean;
  interval: number;
  maxItems: number;
}

// Export utility types
export type TimePreset = '1h' | '6h' | '24h' | '7d' | '30d' | 'custom';
export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'FATAL';
export type AlertState = 'OK' | 'ALARM' | 'INSUFFICIENT_DATA';
export type MetricUnit = 'Count' | 'Percent' | 'Seconds' | 'Milliseconds' | 'Bytes' | 'Kilobytes' | 'Megabytes' | 'Gigabytes';