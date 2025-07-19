// Public API exports for observability domain

// Components
export { ErrorEventsViewer } from './components/ErrorEventsViewer';

// Pages
export { ObservabilityDashboard } from './pages/ObservabilityDashboard';
export { ErrorEventsPage } from './pages/ErrorEventsPage';

// Store
export { default as observabilitySlice } from './store/observabilitySlice';
export {
  setTimeRange,
  setTimeRangePreset,
  setAutoRefresh,
  setRefreshInterval,
  setFilter,
  removeFilter,
  clearAllFilters,
  setSelectedMetrics,
  toggleMetric,
  setLogLevel,
  setTraceFilter,
  resetObservabilityState,
  selectObservability,
  selectTimeRange,
  selectAutoRefresh,
  selectRefreshInterval,
  selectFilters,
  selectSelectedMetrics,
  selectLogLevel,
  selectTraceFilter,
} from './store/observabilitySlice';

// Types
export type {
  ErrorEvent,
  EventBridgeEvent,
  CreateErrorEventInput,
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
  DashboardProps,
  MetricsViewerProps,
  LogsViewerProps,
  TracesViewerProps,
  AlertsPanelProps,
  ErrorEventsViewerProps,
  ObservabilityState,
  ChartDataPoint,
  ChartSeries,
  AlertSeverity,
  FilterOption,
  SearchFilter,
  SubscriptionConfig,
  TimePreset,
  LogLevel,
  AlertState,
  MetricUnit,
} from './types';