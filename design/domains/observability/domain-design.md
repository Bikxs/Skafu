# Observability Domain Design

## Domain Overview

The Observability domain provides comprehensive monitoring, logging, tracing, and alerting capabilities for the Skafu platform. This domain handles metrics collection, distributed tracing, health monitoring, and performance analytics across all microservices.

## Business Context

### Domain Purpose
- **Metrics Collection**: Gather performance and business metrics from all services
- **Distributed Tracing**: Track requests across service boundaries
- **Health Monitoring**: Monitor service health and availability
- **Alerting**: Proactive notification of issues and anomalies
- **Performance Analytics**: Analyze system performance and identify bottlenecks

### Key Business Rules
1. **Real-time Monitoring**: Critical metrics must be available within 30 seconds
2. **Retention Policies**: Metrics retained for 30 days, logs for 7 days, traces for 24 hours
3. **Alert Escalation**: Automated escalation based on severity and response time
4. **Data Privacy**: Sensitive information must be scrubbed from logs and traces
5. **Performance Impact**: Monitoring overhead must not exceed 5% of application performance

## Domain Model

### Aggregates and Entities

#### Metrics Aggregate
```python
class Metrics:
    def __init__(self, metrics_id: str, service_name: str, timestamp: datetime):
        self.id = metrics_id
        self.service_name = service_name
        self.timestamp = timestamp
        self.namespace = f"Skafu/{service_name}"
        self.dimensions = {}
        self.metrics = []
        self.custom_metrics = []
        self.status = MetricsStatus.ACTIVE
        self.events = []
    
    def add_metric(self, metric: Metric) -> None:
        """Add a metric to the collection"""
        if not self._is_valid_metric(metric):
            raise InvalidMetricError(f"Invalid metric: {metric.name}")
        
        self.metrics.append(metric)
        self._add_event(MetricAdded(self.id, metric.name, metric.value))
    
    def add_custom_metric(self, metric: CustomMetric) -> None:
        """Add a custom business metric"""
        if not self._is_valid_custom_metric(metric):
            raise InvalidCustomMetricError(f"Invalid custom metric: {metric.name}")
        
        self.custom_metrics.append(metric)
        self._add_event(CustomMetricAdded(self.id, metric.name, metric.value))
    
    def add_dimension(self, key: str, value: str) -> None:
        """Add a dimension for metric filtering"""
        if not key or not value:
            raise InvalidDimensionError("Dimension key and value cannot be empty")
        
        self.dimensions[key] = value
        self._add_event(DimensionAdded(self.id, key, value))
    
    def publish_metrics(self) -> None:
        """Publish metrics to CloudWatch"""
        if not self.metrics:
            raise NoMetricsError("No metrics to publish")
        
        self.status = MetricsStatus.PUBLISHING
        self._add_event(MetricsPublished(self.id, len(self.metrics)))
    
    def _is_valid_metric(self, metric: Metric) -> bool:
        """Validate metric structure"""
        return (
            metric.name and 
            metric.value is not None and 
            metric.unit in MetricUnit.values() and
            metric.timestamp <= datetime.utcnow()
        )
    
    def _is_valid_custom_metric(self, metric: CustomMetric) -> bool:
        """Validate custom metric structure"""
        return (
            metric.name and 
            metric.value is not None and 
            metric.business_context and
            metric.timestamp <= datetime.utcnow()
        )
    
    def _add_event(self, event: DomainEvent) -> None:
        """Add domain event"""
        self.events.append(event)

class Trace:
    def __init__(self, trace_id: str, service_name: str, operation_name: str):
        self.id = trace_id
        self.service_name = service_name
        self.operation_name = operation_name
        self.start_time = datetime.utcnow()
        self.end_time = None
        self.duration = None
        self.spans = []
        self.annotations = {}
        self.status = TraceStatus.ACTIVE
        self.error_count = 0
        self.events = []
    
    def add_span(self, span: Span) -> None:
        """Add a span to the trace"""
        if not self._is_valid_span(span):
            raise InvalidSpanError(f"Invalid span: {span.name}")
        
        self.spans.append(span)
        self._add_event(SpanAdded(self.id, span.name, span.duration))
    
    def add_annotation(self, key: str, value: str) -> None:
        """Add annotation to trace"""
        if not key or not value:
            raise InvalidAnnotationError("Annotation key and value cannot be empty")
        
        self.annotations[key] = value
        self._add_event(AnnotationAdded(self.id, key, value))
    
    def complete_trace(self) -> None:
        """Complete the trace"""
        if self.status != TraceStatus.ACTIVE:
            raise TraceAlreadyCompletedError("Trace already completed")
        
        self.end_time = datetime.utcnow()
        self.duration = (self.end_time - self.start_time).total_seconds()
        self.status = TraceStatus.COMPLETED
        self._add_event(TraceCompleted(self.id, self.duration))
    
    def mark_error(self, error: str) -> None:
        """Mark trace as having an error"""
        self.error_count += 1
        self.status = TraceStatus.ERROR
        self._add_event(TraceError(self.id, error))
    
    def _is_valid_span(self, span: Span) -> bool:
        """Validate span structure"""
        return (
            span.name and 
            span.start_time and 
            span.end_time and
            span.start_time <= span.end_time
        )
    
    def _add_event(self, event: DomainEvent) -> None:
        """Add domain event"""
        self.events.append(event)

class HealthCheck:
    def __init__(self, health_check_id: str, service_name: str, endpoint: str):
        self.id = health_check_id
        self.service_name = service_name
        self.endpoint = endpoint
        self.status = HealthStatus.UNKNOWN
        self.last_check = None
        self.response_time = None
        self.error_message = None
        self.consecutive_failures = 0
        self.consecutive_successes = 0
        self.uptime_percentage = 0.0
        self.events = []
    
    def perform_check(self) -> HealthCheckResult:
        """Perform health check"""
        self.last_check = datetime.utcnow()
        
        try:
            result = self._execute_health_check()
            self._handle_success(result)
            return result
        except Exception as e:
            self._handle_failure(str(e))
            raise HealthCheckFailureError(f"Health check failed: {e}")
    
    def _execute_health_check(self) -> HealthCheckResult:
        """Execute the actual health check"""
        # This would implement the actual health check logic
        start_time = datetime.utcnow()
        
        # Simulate health check execution
        health_checker = HealthChecker(self.service_name, self.endpoint)
        result = health_checker.check()
        
        end_time = datetime.utcnow()
        response_time = (end_time - start_time).total_seconds()
        
        return HealthCheckResult(
            status=result.status,
            response_time=response_time,
            details=result.details,
            timestamp=end_time
        )
    
    def _handle_success(self, result: HealthCheckResult) -> None:
        """Handle successful health check"""
        self.status = HealthStatus.HEALTHY
        self.response_time = result.response_time
        self.error_message = None
        self.consecutive_failures = 0
        self.consecutive_successes += 1
        
        self._add_event(HealthCheckSucceeded(self.id, result.response_time))
    
    def _handle_failure(self, error: str) -> None:
        """Handle failed health check"""
        self.status = HealthStatus.UNHEALTHY
        self.error_message = error
        self.consecutive_successes = 0
        self.consecutive_failures += 1
        
        self._add_event(HealthCheckFailed(self.id, error))
    
    def _add_event(self, event: DomainEvent) -> None:
        """Add domain event"""
        self.events.append(event)

class MetricsStatus(Enum):
    ACTIVE = "active"
    PUBLISHING = "publishing"
    PUBLISHED = "published"
    FAILED = "failed"

class TraceStatus(Enum):
    ACTIVE = "active"
    COMPLETED = "completed"
    ERROR = "error"
    TIMEOUT = "timeout"

class HealthStatus(Enum):
    HEALTHY = "healthy"
    UNHEALTHY = "unhealthy"
    UNKNOWN = "unknown"
    DEGRADED = "degraded"
```

### Value Objects

```python
class Metric:
    def __init__(self, name: str, value: float, unit: str, timestamp: datetime = None):
        self.name = name
        self.value = value
        self.unit = unit
        self.timestamp = timestamp or datetime.utcnow()
        self.dimensions = {}
    
    def add_dimension(self, key: str, value: str) -> None:
        """Add dimension to metric"""
        self.dimensions[key] = value
    
    def __eq__(self, other):
        if not isinstance(other, Metric):
            return False
        return (
            self.name == other.name and 
            self.value == other.value and 
            self.unit == other.unit
        )

class CustomMetric:
    def __init__(self, name: str, value: float, business_context: str, timestamp: datetime = None):
        self.name = name
        self.value = value
        self.business_context = business_context
        self.timestamp = timestamp or datetime.utcnow()
        self.tags = {}
    
    def add_tag(self, key: str, value: str) -> None:
        """Add tag to custom metric"""
        self.tags[key] = value

class Span:
    def __init__(self, name: str, start_time: datetime, end_time: datetime):
        self.name = name
        self.start_time = start_time
        self.end_time = end_time
        self.duration = (end_time - start_time).total_seconds()
        self.tags = {}
        self.logs = []
    
    def add_tag(self, key: str, value: str) -> None:
        """Add tag to span"""
        self.tags[key] = value
    
    def add_log(self, message: str, level: str = "INFO") -> None:
        """Add log entry to span"""
        self.logs.append({
            "message": message,
            "level": level,
            "timestamp": datetime.utcnow().isoformat()
        })

class HealthCheckResult:
    def __init__(self, status: HealthStatus, response_time: float, details: dict, timestamp: datetime):
        self.status = status
        self.response_time = response_time
        self.details = details
        self.timestamp = timestamp
        self.is_healthy = status == HealthStatus.HEALTHY

class MetricUnit:
    COUNT = "Count"
    SECONDS = "Seconds"
    MILLISECONDS = "Milliseconds"
    BYTES = "Bytes"
    KILOBYTES = "Kilobytes"
    MEGABYTES = "Megabytes"
    PERCENT = "Percent"
    
    @classmethod
    def values(cls):
        return [cls.COUNT, cls.SECONDS, cls.MILLISECONDS, cls.BYTES, 
                cls.KILOBYTES, cls.MEGABYTES, cls.PERCENT]

class AlertSeverity:
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    INFO = "info"

class AlertRule:
    def __init__(self, rule_id: str, name: str, condition: str, threshold: float, severity: str):
        self.id = rule_id
        self.name = name
        self.condition = condition  # "greater_than", "less_than", "equal_to"
        self.threshold = threshold
        self.severity = severity
        self.enabled = True
        self.evaluation_periods = 2
        self.datapoints_to_alarm = 2
```

## Domain Services

### CloudWatch Metrics Service

```python
class CloudWatchMetricsService:
    def __init__(self):
        self.cloudwatch = boto3.client('cloudwatch')
        self.namespace = 'Skafu'
        self.batch_size = 20
        self.metrics_buffer = []
    
    def publish_metrics(self, metrics: List[Metric], dimensions: Dict[str, str] = None) -> None:
        """Publish metrics to CloudWatch"""
        try:
            metric_data = self._prepare_metric_data(metrics, dimensions)
            
            # Send metrics in batches
            for i in range(0, len(metric_data), self.batch_size):
                batch = metric_data[i:i + self.batch_size]
                
                self.cloudwatch.put_metric_data(
                    Namespace=self.namespace,
                    MetricData=batch
                )
                
        except Exception as e:
            raise MetricsPublishingError(f"Failed to publish metrics: {e}")
    
    def publish_custom_metrics(self, custom_metrics: List[CustomMetric], service_name: str) -> None:
        """Publish custom business metrics"""
        try:
            metric_data = []
            
            for metric in custom_metrics:
                data = {
                    'MetricName': metric.name,
                    'Value': metric.value,
                    'Unit': 'Count',
                    'Timestamp': metric.timestamp,
                    'Dimensions': [
                        {
                            'Name': 'ServiceName',
                            'Value': service_name
                        },
                        {
                            'Name': 'BusinessContext',
                            'Value': metric.business_context
                        }
                    ]
                }
                
                # Add custom tags as dimensions
                for key, value in metric.tags.items():
                    data['Dimensions'].append({
                        'Name': key,
                        'Value': value
                    })
                
                metric_data.append(data)
            
            # Send custom metrics in batches
            for i in range(0, len(metric_data), self.batch_size):
                batch = metric_data[i:i + self.batch_size]
                
                self.cloudwatch.put_metric_data(
                    Namespace=f"{self.namespace}/CustomMetrics",
                    MetricData=batch
                )
                
        except Exception as e:
            raise CustomMetricsPublishingError(f"Failed to publish custom metrics: {e}")
    
    def create_alarm(self, alarm_rule: AlertRule, metric_name: str, dimensions: Dict[str, str]) -> str:
        """Create CloudWatch alarm"""
        try:
            alarm_name = f"{self.namespace}-{alarm_rule.name}"
            
            self.cloudwatch.put_metric_alarm(
                AlarmName=alarm_name,
                ComparisonOperator=self._get_comparison_operator(alarm_rule.condition),
                EvaluationPeriods=alarm_rule.evaluation_periods,
                MetricName=metric_name,
                Namespace=self.namespace,
                Period=300,
                Statistic='Average',
                Threshold=alarm_rule.threshold,
                ActionsEnabled=True,
                AlarmActions=[
                    self._get_sns_topic_arn(alarm_rule.severity)
                ],
                AlarmDescription=f"Alarm for {metric_name} - {alarm_rule.name}",
                Dimensions=[
                    {
                        'Name': key,
                        'Value': value
                    } for key, value in dimensions.items()
                ],
                Unit='Count'
            )
            
            return alarm_name
            
        except Exception as e:
            raise AlarmCreationError(f"Failed to create alarm: {e}")
    
    def _prepare_metric_data(self, metrics: List[Metric], dimensions: Dict[str, str]) -> List[Dict]:
        """Prepare metric data for CloudWatch"""
        metric_data = []
        
        for metric in metrics:
            data = {
                'MetricName': metric.name,
                'Value': metric.value,
                'Unit': metric.unit,
                'Timestamp': metric.timestamp
            }
            
            # Add dimensions
            if dimensions:
                data['Dimensions'] = [
                    {
                        'Name': key,
                        'Value': value
                    } for key, value in dimensions.items()
                ]
            
            # Add metric-specific dimensions
            if metric.dimensions:
                if 'Dimensions' not in data:
                    data['Dimensions'] = []
                
                for key, value in metric.dimensions.items():
                    data['Dimensions'].append({
                        'Name': key,
                        'Value': value
                    })
            
            metric_data.append(data)
        
        return metric_data
    
    def _get_comparison_operator(self, condition: str) -> str:
        """Get CloudWatch comparison operator"""
        operators = {
            'greater_than': 'GreaterThanThreshold',
            'less_than': 'LessThanThreshold',
            'equal_to': 'EqualToThreshold'
        }
        return operators.get(condition, 'GreaterThanThreshold')
    
    def _get_sns_topic_arn(self, severity: str) -> str:
        """Get SNS topic ARN for alert severity"""
        topics = {
            'critical': f"arn:aws:sns:{os.environ['AWS_REGION']}:{os.environ['AWS_ACCOUNT_ID']}:skafu-critical-alerts",
            'high': f"arn:aws:sns:{os.environ['AWS_REGION']}:{os.environ['AWS_ACCOUNT_ID']}:skafu-high-alerts",
            'medium': f"arn:aws:sns:{os.environ['AWS_REGION']}:{os.environ['AWS_ACCOUNT_ID']}:skafu-medium-alerts",
            'low': f"arn:aws:sns:{os.environ['AWS_REGION']}:{os.environ['AWS_ACCOUNT_ID']}:skafu-low-alerts"
        }
        return topics.get(severity, topics['medium'])
```

### X-Ray Tracing Service

```python
class XRayTracingService:
    def __init__(self):
        self.xray = boto3.client('xray')
        self.service_name = os.environ.get('POWERTOOLS_SERVICE_NAME', 'skafu')
        self.version = os.environ.get('VERSION', 'latest')
    
    def create_trace(self, operation_name: str, trace_id: str = None) -> Trace:
        """Create a new trace"""
        if not trace_id:
            trace_id = self._generate_trace_id()
        
        trace = Trace(trace_id, self.service_name, operation_name)
        
        # Add service metadata
        trace.add_annotation('service.name', self.service_name)
        trace.add_annotation('service.version', self.version)
        trace.add_annotation('operation.name', operation_name)
        
        return trace
    
    def add_span_to_trace(self, trace: Trace, span_name: str, start_time: datetime, end_time: datetime) -> None:
        """Add span to existing trace"""
        span = Span(span_name, start_time, end_time)
        
        # Add default tags
        span.add_tag('service.name', self.service_name)
        span.add_tag('service.version', self.version)
        
        trace.add_span(span)
    
    def send_trace_segment(self, trace: Trace) -> None:
        """Send trace segment to X-Ray"""
        try:
            segment = self._create_segment(trace)
            
            self.xray.put_trace_segments(
                TraceSegmentDocuments=[
                    json.dumps(segment)
                ]
            )
            
        except Exception as e:
            raise TraceSendingError(f"Failed to send trace segment: {e}")
    
    def get_trace_summary(self, trace_id: str) -> Dict[str, Any]:
        """Get trace summary from X-Ray"""
        try:
            response = self.xray.get_trace_summaries(
                FilterExpression=f'id("{trace_id}")'
            )
            
            if response['TraceSummaries']:
                return response['TraceSummaries'][0]
            else:
                return {}
                
        except Exception as e:
            raise TraceRetrievalError(f"Failed to get trace summary: {e}")
    
    def _create_segment(self, trace: Trace) -> Dict[str, Any]:
        """Create X-Ray segment from trace"""
        segment = {
            'id': self._generate_segment_id(),
            'trace_id': trace.id,
            'name': trace.service_name,
            'start_time': trace.start_time.timestamp(),
            'end_time': trace.end_time.timestamp() if trace.end_time else datetime.utcnow().timestamp(),
            'service': {
                'name': self.service_name,
                'version': self.version
            },
            'annotations': trace.annotations,
            'subsegments': []
        }
        
        # Add spans as subsegments
        for span in trace.spans:
            subsegment = {
                'id': self._generate_segment_id(),
                'name': span.name,
                'start_time': span.start_time.timestamp(),
                'end_time': span.end_time.timestamp(),
                'metadata': {
                    'tags': span.tags,
                    'logs': span.logs
                }
            }
            segment['subsegments'].append(subsegment)
        
        # Add error information
        if trace.error_count > 0:
            segment['error'] = True
            segment['fault'] = trace.error_count > 0
        
        return segment
    
    def _generate_trace_id(self) -> str:
        """Generate X-Ray trace ID"""
        import time
        import random
        
        timestamp = int(time.time())
        random_bytes = random.getrandbits(96)
        
        return f"1-{timestamp:08x}-{random_bytes:024x}"
    
    def _generate_segment_id(self) -> str:
        """Generate X-Ray segment ID"""
        import random
        return f"{random.getrandbits(64):016x}"
```

### Health Check Service

```python
class HealthCheckService:
    def __init__(self):
        self.health_checks = {}
        self.check_interval = 30  # seconds
        self.timeout = 5  # seconds
        self.max_retries = 3
    
    def register_health_check(self, service_name: str, endpoint: str, check_type: str = "http") -> str:
        """Register a health check for a service"""
        health_check_id = f"{service_name}-{check_type}"
        
        health_check = HealthCheck(health_check_id, service_name, endpoint)
        self.health_checks[health_check_id] = health_check
        
        return health_check_id
    
    def perform_health_check(self, health_check_id: str) -> HealthCheckResult:
        """Perform health check for a service"""
        if health_check_id not in self.health_checks:
            raise HealthCheckNotFoundError(f"Health check {health_check_id} not found")
        
        health_check = self.health_checks[health_check_id]
        return health_check.perform_check()
    
    def perform_all_health_checks(self) -> Dict[str, HealthCheckResult]:
        """Perform all registered health checks"""
        results = {}
        
        for health_check_id, health_check in self.health_checks.items():
            try:
                result = health_check.perform_check()
                results[health_check_id] = result
            except Exception as e:
                results[health_check_id] = HealthCheckResult(
                    status=HealthStatus.UNHEALTHY,
                    response_time=0.0,
                    details={'error': str(e)},
                    timestamp=datetime.utcnow()
                )
        
        return results
    
    def get_service_health_summary(self) -> Dict[str, Any]:
        """Get overall service health summary"""
        results = self.perform_all_health_checks()
        
        healthy_count = sum(1 for result in results.values() if result.is_healthy)
        total_count = len(results)
        
        overall_status = HealthStatus.HEALTHY if healthy_count == total_count else HealthStatus.UNHEALTHY
        
        return {
            'overall_status': overall_status,
            'healthy_services': healthy_count,
            'total_services': total_count,
            'health_percentage': (healthy_count / total_count) * 100 if total_count > 0 else 0,
            'individual_checks': {
                check_id: {
                    'status': result.status,
                    'response_time': result.response_time,
                    'last_check': result.timestamp.isoformat()
                }
                for check_id, result in results.items()
            }
        }

class HealthChecker:
    def __init__(self, service_name: str, endpoint: str):
        self.service_name = service_name
        self.endpoint = endpoint
        self.timeout = 5
    
    def check(self) -> HealthCheckResult:
        """Execute health check"""
        try:
            import requests
            
            response = requests.get(
                self.endpoint,
                timeout=self.timeout,
                headers={'User-Agent': f'Skafu-HealthChecker/{self.service_name}'}
            )
            
            if response.status_code == 200:
                return HealthCheckResult(
                    status=HealthStatus.HEALTHY,
                    response_time=response.elapsed.total_seconds(),
                    details={'status_code': response.status_code},
                    timestamp=datetime.utcnow()
                )
            else:
                return HealthCheckResult(
                    status=HealthStatus.UNHEALTHY,
                    response_time=response.elapsed.total_seconds(),
                    details={'status_code': response.status_code, 'error': 'Non-200 status code'},
                    timestamp=datetime.utcnow()
                )
                
        except Exception as e:
            return HealthCheckResult(
                status=HealthStatus.UNHEALTHY,
                response_time=0.0,
                details={'error': str(e)},
                timestamp=datetime.utcnow()
            )
```

## Domain Events

### Event Definitions

```python
class MetricAdded(DomainEvent):
    def __init__(self, metrics_id: str, metric_name: str, value: float):
        super().__init__()
        self.metrics_id = metrics_id
        self.metric_name = metric_name
        self.value = value

class CustomMetricAdded(DomainEvent):
    def __init__(self, metrics_id: str, metric_name: str, value: float):
        super().__init__()
        self.metrics_id = metrics_id
        self.metric_name = metric_name
        self.value = value

class MetricsPublished(DomainEvent):
    def __init__(self, metrics_id: str, metric_count: int):
        super().__init__()
        self.metrics_id = metrics_id
        self.metric_count = metric_count

class TraceCompleted(DomainEvent):
    def __init__(self, trace_id: str, duration: float):
        super().__init__()
        self.trace_id = trace_id
        self.duration = duration

class TraceError(DomainEvent):
    def __init__(self, trace_id: str, error_message: str):
        super().__init__()
        self.trace_id = trace_id
        self.error_message = error_message

class HealthCheckSucceeded(DomainEvent):
    def __init__(self, health_check_id: str, response_time: float):
        super().__init__()
        self.health_check_id = health_check_id
        self.response_time = response_time

class HealthCheckFailed(DomainEvent):
    def __init__(self, health_check_id: str, error_message: str):
        super().__init__()
        self.health_check_id = health_check_id
        self.error_message = error_message

class AlertTriggered(DomainEvent):
    def __init__(self, alert_id: str, severity: str, message: str):
        super().__init__()
        self.alert_id = alert_id
        self.severity = severity
        self.message = message

class PerformanceThresholdExceeded(DomainEvent):
    def __init__(self, service_name: str, metric_name: str, threshold: float, actual_value: float):
        super().__init__()
        self.service_name = service_name
        self.metric_name = metric_name
        self.threshold = threshold
        self.actual_value = actual_value
```

## Application Services

### Observability Service

```python
class ObservabilityService:
    def __init__(self, metrics_service: CloudWatchMetricsService, 
                 tracing_service: XRayTracingService, 
                 health_service: HealthCheckService):
        self.metrics_service = metrics_service
        self.tracing_service = tracing_service
        self.health_service = health_service
        self.alert_rules = {}
    
    def record_business_metric(self, service_name: str, metric_name: str, 
                             value: float, business_context: str, 
                             tags: Dict[str, str] = None) -> None:
        """Record a business metric"""
        custom_metric = CustomMetric(metric_name, value, business_context)
        
        if tags:
            for key, value in tags.items():
                custom_metric.add_tag(key, value)
        
        self.metrics_service.publish_custom_metrics([custom_metric], service_name)
    
    def record_performance_metric(self, service_name: str, operation_name: str, 
                                duration: float, success: bool) -> None:
        """Record a performance metric"""
        metrics = [
            Metric(f"{operation_name}_duration", duration, MetricUnit.MILLISECONDS),
            Metric(f"{operation_name}_success", 1 if success else 0, MetricUnit.COUNT)
        ]
        
        dimensions = {
            'ServiceName': service_name,
            'OperationName': operation_name
        }
        
        self.metrics_service.publish_metrics(metrics, dimensions)
    
    def start_trace(self, service_name: str, operation_name: str) -> str:
        """Start a new trace"""
        trace = self.tracing_service.create_trace(operation_name)
        return trace.id
    
    def end_trace(self, trace_id: str) -> None:
        """End a trace"""
        # This would be implemented with actual trace storage
        pass
    
    def check_service_health(self, service_name: str) -> HealthCheckResult:
        """Check health of a specific service"""
        health_check_id = f"{service_name}-http"
        return self.health_service.perform_health_check(health_check_id)
    
    def get_system_health_overview(self) -> Dict[str, Any]:
        """Get overall system health"""
        return self.health_service.get_service_health_summary()
    
    def create_alert_rule(self, rule_name: str, metric_name: str, 
                         condition: str, threshold: float, severity: str) -> str:
        """Create a new alert rule"""
        rule_id = f"{rule_name}-{metric_name}"
        
        alert_rule = AlertRule(rule_id, rule_name, condition, threshold, severity)
        self.alert_rules[rule_id] = alert_rule
        
        # Create CloudWatch alarm
        dimensions = {'ServiceName': 'skafu'}
        alarm_name = self.metrics_service.create_alarm(alert_rule, metric_name, dimensions)
        
        return rule_id
    
    def get_performance_dashboard_data(self, service_name: str = None) -> Dict[str, Any]:
        """Get performance dashboard data"""
        return {
            'system_health': self.get_system_health_overview(),
            'recent_traces': self._get_recent_traces(service_name),
            'error_rates': self._get_error_rates(service_name),
            'response_times': self._get_response_times(service_name),
            'throughput': self._get_throughput_metrics(service_name)
        }
    
    def _get_recent_traces(self, service_name: str = None) -> List[Dict[str, Any]]:
        """Get recent traces for service"""
        # This would query X-Ray for recent traces
        return []
    
    def _get_error_rates(self, service_name: str = None) -> Dict[str, float]:
        """Get error rates for service"""
        # This would query CloudWatch for error metrics
        return {}
    
    def _get_response_times(self, service_name: str = None) -> Dict[str, float]:
        """Get response times for service"""
        # This would query CloudWatch for latency metrics
        return {}
    
    def _get_throughput_metrics(self, service_name: str = None) -> Dict[str, float]:
        """Get throughput metrics for service"""
        # This would query CloudWatch for throughput metrics
        return {}
```

## Integration Points

### Event Handlers

```python
class ObservabilityEventHandler:
    def __init__(self, observability_service: ObservabilityService):
        self.observability_service = observability_service
    
    def handle_project_created(self, event: ProjectCreated) -> None:
        """Handle project created event"""
        self.observability_service.record_business_metric(
            'project-management',
            'project_created',
            1,
            'project_lifecycle',
            {'template_id': event.template_id}
        )
    
    def handle_deployment_completed(self, event: DeploymentCompleted) -> None:
        """Handle deployment completed event"""
        self.observability_service.record_business_metric(
            'github-integration',
            'deployment_completed',
            1,
            'deployment_lifecycle',
            {'project_id': event.project_id, 'success': str(event.success)}
        )
    
    def handle_template_rendered(self, event: TemplateRendered) -> None:
        """Handle template rendered event"""
        self.observability_service.record_business_metric(
            'template-management',
            'template_rendered',
            1,
            'template_usage',
            {'template_id': event.template_id, 'file_count': str(len(event.output_files))}
        )
    
    def handle_ai_analysis_completed(self, event: AIAnalysisCompleted) -> None:
        """Handle AI analysis completed event"""
        self.observability_service.record_business_metric(
            'ai-integration',
            'ai_analysis_completed',
            1,
            'ai_usage',
            {
                'analysis_type': event.analysis_type,
                'confidence_score': str(event.confidence_score),
                'recommendations_count': str(len(event.recommendations))
            }
        )
```

### Middleware Integration

```python
class ObservabilityMiddleware:
    def __init__(self, observability_service: ObservabilityService):
        self.observability_service = observability_service
    
    def lambda_handler_wrapper(self, handler):
        """Wrapper for Lambda handlers to add observability"""
        def wrapper(event, context):
            start_time = datetime.utcnow()
            operation_name = context.function_name
            service_name = os.environ.get('POWERTOOLS_SERVICE_NAME', 'skafu')
            
            # Start trace
            trace_id = self.observability_service.start_trace(service_name, operation_name)
            
            try:
                # Execute handler
                result = handler(event, context)
                
                # Record success metrics
                end_time = datetime.utcnow()
                duration = (end_time - start_time).total_seconds() * 1000  # Convert to ms
                
                self.observability_service.record_performance_metric(
                    service_name, operation_name, duration, True
                )
                
                return result
                
            except Exception as e:
                # Record error metrics
                end_time = datetime.utcnow()
                duration = (end_time - start_time).total_seconds() * 1000
                
                self.observability_service.record_performance_metric(
                    service_name, operation_name, duration, False
                )
                
                raise
            finally:
                # End trace
                self.observability_service.end_trace(trace_id)
        
        return wrapper
```

This Observability domain design provides comprehensive monitoring, tracing, and alerting capabilities that integrate seamlessly with the other domains while maintaining high performance and reliability standards.