# ADR-0010: Error Bus for Observability

**Status**: 🟢 Accepted  
**Date**: 2025-01-18  
**Deciders**: Development Team

## Context and Problem Statement

We need a centralized error handling and observability system for our distributed serverless architecture that can capture, correlate, and analyze errors across multiple services while providing actionable insights for debugging and system health monitoring.

## Decision Drivers

* Centralized error collection across all microservices
* Correlation of errors with original requests and business context
* Support for distributed tracing and debugging
* Integration with existing EventBridge architecture
* Automated alerting and escalation for critical errors
* Comprehensive error analytics and trends
* Support for error recovery and retry mechanisms

## Considered Options

* **Option 1**: CloudWatch Logs with custom log parsing
* **Option 2**: Separate SQS queue for error handling
* **Option 3**: Dedicated EventBridge bus for errors
* **Option 4**: Third-party error tracking service (Sentry, Rollbar)
* **Option 5**: Custom error aggregation service

## Decision Outcome

Chosen option: **"Dedicated EventBridge bus for errors"**, because it provides native integration with our event-driven architecture, supports structured error data, enables real-time processing, and maintains consistency with our existing messaging patterns.

### Implementation Details

**Error Bus Architecture**:
```yaml
# SAM template for Error Bus
ErrorBus:
  Type: AWS::Events::EventBus
  Properties:
    Name: !Sub '${AWS::StackName}-error-bus'
    EventSourceName: skafu-error-bus
    
ErrorBusPolicy:
  Type: AWS::Events::EventBusPolicy
  Properties:
    EventBusName: !Ref ErrorBus
    StatementId: AllowCrossServiceAccess
    Statement:
      Effect: Allow
      Principal:
        AWS: !Sub '${AWS::AccountId}'
      Action: events:PutEvents
      Resource: !GetAtt ErrorBus.Arn
```

**Error Event Schema**:
```json
{
  "eventId": "uuid",
  "correlationId": "uuid",
  "timestamp": "2025-01-18T10:30:00Z",
  "version": "1.0",
  "source": "step-functions",
  "eventType": "StepFunctionExecutionFailed",
  "severity": "ERROR",
  "data": {
    "errorCode": "ValidationError",
    "errorMessage": "Project name already exists",
    "errorDetails": {
      "projectName": "E-commerce Platform",
      "userId": "user-123",
      "validationErrors": [
        {
          "field": "name",
          "code": "DUPLICATE_NAME",
          "message": "Project name must be unique"
        }
      ]
    },
    "context": {
      "service": "project-management",
      "function": "create-project-workflow",
      "executionArn": "arn:aws:states:us-east-1:123456789012:execution:CreateProject:12345",
      "input": {
        "projectName": "E-commerce Platform",
        "userId": "user-123"
      }
    },
    "stackTrace": "...",
    "requestId": "req-12345"
  },
  "metadata": {
    "environment": "production",
    "region": "us-east-1",
    "accountId": "123456789012",
    "retryCount": 2,
    "canRetry": false
  }
}
```

**Step Functions Error Handling**:
```json
{
  "Comment": "Step Function with Error Bus integration",
  "StartAt": "ProcessCommand",
  "States": {
    "ProcessCommand": {
      "Type": "Task",
      "Resource": "arn:aws:states:::lambda:invoke",
      "Parameters": {
        "FunctionName": "process-command"
      },
      "Retry": [
        {
          "ErrorEquals": ["States.TaskFailed"],
          "IntervalSeconds": 2,
          "MaxAttempts": 3,
          "BackoffRate": 2.0
        }
      ],
      "Catch": [
        {
          "ErrorEquals": ["States.ALL"],
          "Next": "PublishError",
          "ResultPath": "$.error"
        }
      ],
      "Next": "Success"
    },
    "PublishError": {
      "Type": "Task",
      "Resource": "arn:aws:states:::events:putEvents",
      "Parameters": {
        "Entries": [
          {
            "EventBusName": "skafu-error-bus",
            "Source": "step-functions",
            "DetailType": "StepFunctionExecutionFailed",
            "Detail": {
              "eventId.$": "States.UUID()",
              "correlationId.$": "$.correlationId",
              "timestamp.$": "$$.State.EnteredTime",
              "version": "1.0",
              "source": "step-functions",
              "eventType": "StepFunctionExecutionFailed",
              "severity": "ERROR",
              "data": {
                "errorCode.$": "$.error.ErrorCode",
                "errorMessage.$": "$.error.ErrorMessage",
                "errorDetails.$": "$.error.ErrorDetails",
                "context": {
                  "service": "project-management",
                  "function.$": "$$.StateMachine.Name",
                  "executionArn.$": "$$.Execution.Name",
                  "input.$": "$$.Execution.Input"
                }
              },
              "metadata": {
                "environment": "production",
                "region": "us-east-1",
                "retryCount": 3,
                "canRetry": false
              }
            }
          }
        ]
      },
      "End": true
    },
    "Success": {
      "Type": "Succeed"
    }
  }
}
```

**Lambda Error Handling**:
```python
import json
import boto3
import traceback
from datetime import datetime
from typing import Dict, Any

class ErrorBusPublisher:
    def __init__(self):
        self.eventbridge = boto3.client('events')
        self.error_bus_name = 'skafu-error-bus'
    
    def publish_error(
        self, 
        error: Exception, 
        context: Dict[str, Any],
        correlation_id: str,
        severity: str = 'ERROR',
        can_retry: bool = True
    ):
        """Publish error to Error Bus"""
        error_event = {
            'eventId': str(uuid.uuid4()),
            'correlationId': correlation_id,
            'timestamp': datetime.utcnow().isoformat(),
            'version': '1.0',
            'source': 'lambda',
            'eventType': f"{type(error).__name__}",
            'severity': severity,
            'data': {
                'errorCode': type(error).__name__,
                'errorMessage': str(error),
                'errorDetails': getattr(error, 'details', {}),
                'context': context,
                'stackTrace': traceback.format_exc()
            },
            'metadata': {
                'environment': os.environ.get('ENVIRONMENT', 'unknown'),
                'region': os.environ.get('AWS_REGION', 'unknown'),
                'canRetry': can_retry
            }
        }
        
        try:
            self.eventbridge.put_events(
                Entries=[
                    {
                        'EventBusName': self.error_bus_name,
                        'Source': 'lambda',
                        'DetailType': 'LambdaExecutionError',
                        'Detail': json.dumps(error_event)
                    }
                ]
            )
        except Exception as e:
            # Fallback to CloudWatch Logs if EventBridge fails
            print(f"Failed to publish to Error Bus: {e}")
            print(f"Original error: {json.dumps(error_event, default=str)}")

# Usage in Lambda functions
error_publisher = ErrorBusPublisher()

def lambda_handler(event, context):
    correlation_id = event.get('correlationId', str(uuid.uuid4()))
    
    try:
        # Main function logic
        result = process_request(event)
        return result
        
    except ValidationError as e:
        error_publisher.publish_error(
            error=e,
            context={
                'service': 'project-management',
                'function': context.function_name,
                'requestId': context.aws_request_id,
                'input': event
            },
            correlation_id=correlation_id,
            severity='WARNING',
            can_retry=False
        )
        raise
        
    except Exception as e:
        error_publisher.publish_error(
            error=e,
            context={
                'service': 'project-management',
                'function': context.function_name,
                'requestId': context.aws_request_id,
                'input': event
            },
            correlation_id=correlation_id,
            severity='ERROR',
            can_retry=True
        )
        raise
```

**Error Processing and Analytics**:
```python
# Error aggregation Lambda
import boto3
import json
from datetime import datetime, timedelta
from collections import defaultdict

def lambda_handler(event, context):
    """Process errors from Error Bus and generate analytics"""
    
    for record in event['Records']:
        error_data = json.loads(record['body'])
        
        # Store error in DynamoDB for analysis
        store_error_record(error_data)
        
        # Check for error patterns
        check_error_patterns(error_data)
        
        # Update error metrics
        update_error_metrics(error_data)
        
        # Trigger alerts if needed
        check_alert_conditions(error_data)

def store_error_record(error_data):
    """Store error in DynamoDB for historical analysis"""
    dynamodb = boto3.resource('dynamodb')
    table = dynamodb.Table('ErrorAnalytics')
    
    table.put_item(
        Item={
            'errorId': error_data['eventId'],
            'correlationId': error_data['correlationId'],
            'timestamp': error_data['timestamp'],
            'service': error_data['data']['context']['service'],
            'errorCode': error_data['data']['errorCode'],
            'errorMessage': error_data['data']['errorMessage'],
            'severity': error_data['severity'],
            'canRetry': error_data['metadata']['canRetry'],
            'environment': error_data['metadata']['environment'],
            'ttl': int((datetime.utcnow() + timedelta(days=90)).timestamp())
        }
    )

def check_error_patterns(error_data):
    """Detect error patterns and trends"""
    # Check for spike in similar errors
    error_code = error_data['data']['errorCode']
    service = error_data['data']['context']['service']
    
    # Query recent errors of same type
    recent_errors = query_recent_errors(error_code, service)
    
    if len(recent_errors) > 10:  # Threshold for pattern detection
        publish_pattern_alert(error_code, service, recent_errors)

def update_error_metrics(error_data):
    """Update CloudWatch metrics"""
    cloudwatch = boto3.client('cloudwatch')
    
    # Service-specific error rate
    cloudwatch.put_metric_data(
        Namespace='Skafu/Errors',
        MetricData=[
            {
                'MetricName': 'ErrorRate',
                'Dimensions': [
                    {
                        'Name': 'Service',
                        'Value': error_data['data']['context']['service']
                    },
                    {
                        'Name': 'ErrorCode',
                        'Value': error_data['data']['errorCode']
                    }
                ],
                'Value': 1,
                'Unit': 'Count'
            }
        ]
    )

def check_alert_conditions(error_data):
    """Check if error should trigger alerts"""
    severity = error_data['severity']
    service = error_data['data']['context']['service']
    
    # Critical errors trigger immediate alerts
    if severity == 'CRITICAL':
        send_immediate_alert(error_data)
    
    # High error rate triggers threshold alerts
    if is_error_rate_high(service):
        send_threshold_alert(service)
```

**Error Dashboard Integration**:
```python
# Error analytics API for observability dashboard
from flask import Flask, jsonify
import boto3
from datetime import datetime, timedelta

app = Flask(__name__)

@app.route('/api/observability/errors/summary')
def get_error_summary():
    """Get error summary for dashboard"""
    dynamodb = boto3.resource('dynamodb')
    table = dynamodb.Table('ErrorAnalytics')
    
    # Get errors from last 24 hours
    since = datetime.utcnow() - timedelta(hours=24)
    
    response = table.query(
        IndexName='TimestampIndex',
        KeyConditionExpression='timestamp > :since',
        ExpressionAttributeValues={':since': since.isoformat()}
    )
    
    errors = response['Items']
    
    # Aggregate by service and error code
    summary = defaultdict(lambda: defaultdict(int))
    for error in errors:
        summary[error['service']][error['errorCode']] += 1
    
    return jsonify({
        'totalErrors': len(errors),
        'errorsByService': dict(summary),
        'timeRange': '24h'
    })

@app.route('/api/observability/errors/trends')
def get_error_trends():
    """Get error trends over time"""
    cloudwatch = boto3.client('cloudwatch')
    
    # Get error metrics for last 7 days
    response = cloudwatch.get_metric_statistics(
        Namespace='Skafu/Errors',
        MetricName='ErrorRate',
        StartTime=datetime.utcnow() - timedelta(days=7),
        EndTime=datetime.utcnow(),
        Period=3600,  # 1 hour intervals
        Statistics=['Sum']
    )
    
    return jsonify({
        'trends': response['Datapoints'],
        'timeRange': '7d'
    })

@app.route('/api/observability/errors/correlation/<correlation_id>')
def get_error_correlation(correlation_id):
    """Get all errors for a specific correlation ID"""
    dynamodb = boto3.resource('dynamodb')
    table = dynamodb.Table('ErrorAnalytics')
    
    response = table.query(
        IndexName='CorrelationIndex',
        KeyConditionExpression='correlationId = :cid',
        ExpressionAttributeValues={':cid': correlation_id}
    )
    
    return jsonify({
        'correlationId': correlation_id,
        'errors': response['Items']
    })
```

### Alert Configuration

**CloudWatch Alarms**:
```yaml
# High error rate alarm
HighErrorRateAlarm:
  Type: AWS::CloudWatch::Alarm
  Properties:
    AlarmName: !Sub '${AWS::StackName}-high-error-rate'
    AlarmDescription: 'High error rate detected'
    MetricName: ErrorRate
    Namespace: Skafu/Errors
    Statistic: Sum
    Period: 300
    EvaluationPeriods: 2
    Threshold: 10
    ComparisonOperator: GreaterThanThreshold
    AlarmActions:
      - !Ref ErrorNotificationTopic

# Critical error alarm
CriticalErrorAlarm:
  Type: AWS::CloudWatch::Alarm
  Properties:
    AlarmName: !Sub '${AWS::StackName}-critical-error'
    AlarmDescription: 'Critical error detected'
    MetricName: ErrorRate
    Namespace: Skafu/Errors
    Statistic: Sum
    Period: 60
    EvaluationPeriods: 1
    Threshold: 1
    ComparisonOperator: GreaterThanOrEqualToThreshold
    Dimensions:
      - Name: Severity
        Value: CRITICAL
    AlarmActions:
      - !Ref CriticalErrorTopic
```

### Consequences

**Good**:
* **Centralized Collection**: All errors flow through single bus for unified processing
* **Structured Data**: Consistent error format with rich context and metadata
* **Real-time Processing**: Immediate error processing and alerting
* **Correlation**: Link errors to original requests and business context
* **Scalability**: EventBridge scales automatically with error volume
* **Integration**: Native integration with existing EventBridge architecture
* **Analytics**: Rich error analytics and trend analysis
* **Traceability**: Complete audit trail of all system errors

**Bad**:
* **Complexity**: Additional infrastructure component to manage
* **Cost**: Additional EventBridge costs for error events
* **Latency**: Small overhead for error event publishing
* **Debugging**: Complex debugging when Error Bus itself fails
* **Storage**: Need to manage error data retention and cleanup
* **Alert Fatigue**: Risk of too many alerts if not configured properly

## Error Classification

**Severity Levels**:
- **CRITICAL**: System-wide failures, data corruption, security breaches
- **ERROR**: Business logic failures, integration failures, user-facing errors
- **WARNING**: Validation failures, recoverable errors, performance issues
- **INFO**: Expected errors, user input validation, business rule violations

**Error Categories**:
- **ValidationError**: User input validation failures
- **BusinessRuleError**: Business logic constraint violations
- **IntegrationError**: External service failures
- **SystemError**: Infrastructure and technical failures
- **SecurityError**: Authentication and authorization failures

## Recovery Patterns

**Automatic Recovery**:
```python
def handle_recoverable_error(error_data):
    """Handle errors that can be automatically recovered"""
    if error_data['metadata']['canRetry']:
        # Trigger retry mechanism
        retry_operation(error_data)
    else:
        # Log for manual intervention
        log_manual_intervention_needed(error_data)
```

**Manual Recovery**:
- Error dashboard shows errors requiring manual intervention
- Runbooks linked to specific error types
- Escalation procedures for critical errors
- Recovery workflows for common failure scenarios

## Implementation Guidelines

1. **Error Context**: Include rich context in all error events
2. **Correlation**: Always include correlation IDs for tracing
3. **Structured Data**: Use consistent error event schema
4. **Severity**: Classify errors by severity and business impact
5. **Recovery**: Design for both automatic and manual recovery

## Integration Points

**With Step Functions**: Native error handling in state machines
**With Lambda**: Shared error publisher library
**With CloudWatch**: Metrics and alarms for error monitoring
**With Frontend**: Error correlation and user notifications
**With Observability**: Error analytics in monitoring dashboard

## More Information

* [AWS EventBridge Documentation](https://docs.aws.amazon.com/eventbridge/)
* [Error Handling Best Practices](https://aws.amazon.com/builders-library/avoiding-fallback-in-distributed-systems/)
* [Distributed Tracing](https://aws.amazon.com/xray/)
* Related ADRs: ADR-0002 (Event-Driven Architecture), ADR-0017 (Security Monitoring)