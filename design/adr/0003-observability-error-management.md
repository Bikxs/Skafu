# ADR-0003: Observability and Error Management Architecture

**Status**: 🟢 Accepted  
**Date**: 2025-01-18  
**Deciders**: Development Team  
**Supersedes**: ADR-0010 (Error Bus), ADR-0013 (Observability API Layer)

## Context and Problem Statement

We need a comprehensive observability and error management system that:
- Provides visibility into distributed serverless operations
- Centralizes error handling across all microservices
- Exposes AWS service metrics through a unified API
- Supports debugging, monitoring, and operational decision-making
- Enables correlation of errors with business context
- Integrates with our event-driven architecture

## Decision Drivers

* Need for centralized error collection and correlation
* Requirement for comprehensive system visibility
* Support for debugging complex distributed issues
* Real-time access to operational metrics
* Integration with existing EventBridge architecture
* Cost-effective observability data access
* Security and access control for sensitive data
* Automated alerting for critical errors

## Considered Options

### Error Management Options
* CloudWatch Logs with custom log parsing
* Separate SQS queue for error handling
* Dedicated EventBridge bus for errors
* Third-party error tracking service (Sentry, Rollbar)
* Custom error aggregation service

### Observability API Options
* Direct frontend integration with AWS services
* Dedicated observability API layer with Lambda functions
* Third-party observability platform integration
* Custom observability service with data aggregation
* Hybrid approach with cached data and real-time APIs

## Decision Outcome

Chosen options:
1. **Dedicated EventBridge bus for errors** for centralized error management
2. **Dedicated observability API layer with Lambda functions** for unified metrics access

This combination provides native integration, structured data handling, real-time processing, and maintains consistency with our architecture.

### Implementation Details

**Error Management Architecture**:

```yaml
# Error Bus Configuration
ErrorBus:
  Type: AWS::Events::EventBus
  Properties:
    Name: !Sub 'skafu-errors-${Environment}'
    Description: Centralized error event bus
    
ErrorAnalyticsTable:
  Type: AWS::DynamoDB::Table
  Properties:
    TableName: !Sub 'skafu-error-analytics-${Environment}'
    AttributeDefinitions:
      - AttributeName: errorId
        AttributeType: S
      - AttributeName: timestamp
        AttributeType: S
      - AttributeName: correlationId
        AttributeType: S
    KeySchema:
      - AttributeName: errorId
        KeyType: HASH
      - AttributeName: timestamp
        KeyType: RANGE
    GlobalSecondaryIndexes:
      - IndexName: CorrelationIndex
        KeySchema:
          - AttributeName: correlationId
            KeyType: HASH
    TimeToLiveSpecification:
      AttributeName: ttl
      Enabled: true
```

**Error Event Structure**:
```json
{
  "version": "0",
  "id": "error-event-id",
  "detail-type": "Application Error",
  "source": "skafu.service.name",
  "time": "2025-01-18T12:00:00Z",
  "region": "us-east-1",
  "detail": {
    "errorId": "uuid",
    "correlationId": "request-correlation-id",
    "errorType": "ValidationError|SystemError|IntegrationError",
    "severity": "LOW|MEDIUM|HIGH|CRITICAL",
    "message": "Human-readable error message",
    "stackTrace": "Full stack trace if available",
    "context": {
      "userId": "user-id",
      "functionName": "lambda-function-name",
      "apiPath": "/api/v1/resource",
      "httpMethod": "POST"
    },
    "metadata": {
      "retryCount": 0,
      "isRetryable": true,
      "originalEvent": {}
    }
  }
}
```

**Error Processing Flow**:
```python
# Error handler utility
class ErrorHandler:
    def __init__(self, error_bus_name: str):
        self.events_client = boto3.client('events')
        self.error_bus_name = error_bus_name
        
    def handle_error(self, error: Exception, context: Dict[str, Any]) -> None:
        error_event = {
            'Source': f'skafu.{context.get("service", "unknown")}',
            'DetailType': 'Application Error',
            'Detail': json.dumps({
                'errorId': str(uuid.uuid4()),
                'correlationId': context.get('correlationId', ''),
                'errorType': type(error).__name__,
                'severity': self._determine_severity(error),
                'message': str(error),
                'stackTrace': traceback.format_exc(),
                'context': context,
                'timestamp': datetime.utcnow().isoformat()
            }),
            'EventBusName': self.error_bus_name
        }
        
        self.events_client.put_events(Entries=[error_event])
```

**Observability API Layer**:

```
/api/observability/
├── /logs                    # CloudWatch Logs queries
├── /metrics                 # CloudWatch Metrics data
├── /traces                  # X-Ray trace analysis
├── /errors                  # Error events from Error Bus
├── /dashboards             # Custom dashboard data
│
├── /lambda                  # Lambda function metrics
├── /stepfunctions          # Step Functions metrics
├── /apigateway             # API Gateway metrics
├── /storage                # S3 storage metrics
├── /events                 # EventBridge metrics
└── /costs                  # Cost analysis data
```

**Observability Service Implementation**:

```python
# Base observability service class
class ObservabilityService:
    def __init__(self):
        self.cloudwatch_logs = boto3.client('logs')
        self.cloudwatch_metrics = boto3.client('cloudwatch')
        self.xray = boto3.client('xray')
        self.dynamodb = boto3.resource('dynamodb')
        self._init_other_clients()
    
    
    
    @tracer.capture_method
    def get_error_analytics(self, time_range: str, filters: Dict) -> Dict[str, Any]:
        """Get error analytics from Error Bus data"""
        
        table = self.dynamodb.Table('skafu-error-analytics')
        
        # Build query based on filters
        if filters.get('correlationId'):
            response = table.query(
                IndexName='CorrelationIndex',
                KeyConditionExpression=Key('correlationId').eq(filters['correlationId'])
            )
        else:
            # Scan with filters (consider using GSI for better performance)
            response = table.scan(
                FilterExpression=self._build_filter_expression(filters),
                Limit=1000
            )
        
        # Aggregate error data
        errors_by_type = {}
        errors_by_service = {}
        severity_distribution = {'LOW': 0, 'MEDIUM': 0, 'HIGH': 0, 'CRITICAL': 0}
        
        for item in response['Items']:
            error_type = item.get('errorType', 'Unknown')
            service = item.get('source', 'Unknown')
            severity = item.get('severity', 'MEDIUM')
            
            errors_by_type[error_type] = errors_by_type.get(error_type, 0) + 1
            errors_by_service[service] = errors_by_service.get(service, 0) + 1
            severity_distribution[severity] += 1
        
        return {
            'totalErrors': len(response['Items']),
            'errorsByType': errors_by_type,
            'errorsByService': errors_by_service,
            'severityDistribution': severity_distribution,
            'errors': response['Items'][:100]  # Limit detailed results
        }
```

**Lambda Handler Pattern**:

```python
# Observability API Lambda handler
@logger.inject_lambda_context(correlation_id_path=correlation_paths.API_GATEWAY_REST)
@tracer.capture_lambda_handler
def lambda_handler(event, context):
    """Main handler for observability API endpoints"""
    
    try:
        # Initialize service
        service = ObservabilityService()
        
        # Extract path and parameters
        path = event['path']
        params = event.get('queryStringParameters', {}) or {}
        
        # Route to appropriate handler
        if path == '/api/observability/errors':
            result = service.get_error_analytics(
                time_range=params.get('timeRange', '1h'),
                filters=params
            )
        elif path == '/api/observability/metrics':
            result = service.get_metrics(
                namespace=params['namespace'],
                metric_name=params['metricName'],
                start_time=params['startTime'],
                end_time=params['endTime']
            )
        # ... other endpoints
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps(result, default=str)
        }
        
    except Exception as e:
        # Send error to Error Bus
        error_handler.handle_error(e, {
            'service': 'observability-api',
            'path': event.get('path'),
            'correlationId': logger.get_correlation_id()
        })
        
        return {
            'statusCode': 500,
            'body': json.dumps({
                'error': 'Internal server error',
                'correlationId': logger.get_correlation_id()
            })
        }
```

**Frontend Integration**:

```typescript
// Redux slice for observability

```

### Error Correlation and Debugging

**Correlation Strategy**:
1. Generate correlation ID at API Gateway
2. Pass correlation ID through all service calls
3. Include correlation ID in all error events
4. Query errors by correlation ID for full request trace

**Debugging Workflow**:
1. User reports issue with correlation ID
2. Query Error Bus by correlation ID
3. View all related errors across services
4. Analyze error sequence and root cause
5. Access related logs and traces

### Alerting and Automation

**CloudWatch Alarms**:
```yaml
CriticalErrorAlarm:
  Type: AWS::CloudWatch::Alarm
  Properties:
    AlarmName: !Sub '${ServiceName}-critical-errors'
    MetricName: ErrorCount
    Namespace: SkafuErrors
    Dimensions:
      - Name: Severity
        Value: CRITICAL
    Statistic: Sum
    Period: 300
    EvaluationPeriods: 1
    Threshold: 1
    TreatMissingData: notBreaching
    AlarmActions:
      - !Ref SNSAlertTopic
```

**Automated Response**:
- Critical errors trigger immediate alerts
- High error rates trigger auto-scaling
- Repeated errors trigger circuit breakers
- Error patterns trigger runbook automation

### Consequences

**Good**:
* **Centralized visibility**: Single source of truth for system health
* **Error correlation**: Track errors across distributed services
* **Custom filtering**: Intelligent data transformation and filtering
* **Real-time monitoring**: Live system status and metrics
* **Debugging efficiency**: Faster root cause analysis
* **Cost control**: Optimized API usage and data transfer
* **Security**: Proper access control for sensitive data
* **Integration**: Seamless fit with existing architecture

**Bad**:
* **Additional complexity**: More Lambda functions and APIs to maintain
* **Latency**: Extra network hop for data retrieval
* **Cost**: Lambda execution costs for data processing
* **Maintenance**: Need to keep up with AWS API changes
* **Rate limits**: Must handle AWS service quotas
* **Learning curve**: Team needs observability expertise

## Implementation Guidelines

1. **Error Handling**: All services must use the error handler utility
2. **Correlation IDs**: Always propagate correlation IDs through requests
3. **Data Filtering**: Implement intelligent filtering to reduce data transfer
4. **Caching Strategy**: Cache frequently accessed metrics where appropriate
5. **Security**: Implement proper authentication and authorization
6. **Performance**: Optimize queries and use pagination for large datasets
7. **Monitoring**: Monitor the monitoring system itself

## More Information

* [AWS CloudWatch Documentation](https://docs.aws.amazon.com/cloudwatch/)
* [AWS X-Ray Documentation](https://docs.aws.amazon.com/xray/)
* [EventBridge Documentation](https://docs.aws.amazon.com/eventbridge/)
* [Distributed Tracing Best Practices](https://aws.amazon.com/builders-library/instrumenting-distributed-systems-for-operational-visibility/)
* Related ADRs: ADR-0001 (Core Architecture), ADR-0004 (Security Architecture)