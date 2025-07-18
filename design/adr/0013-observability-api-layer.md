# ADR-0013: Observability API Layer

**Status**: 🟢 Accepted  
**Date**: 2025-01-18  
**Deciders**: Development Team

## Context and Problem Statement

We need to provide comprehensive visibility into system operations, performance, and health through a unified API layer that exposes AWS service data, application metrics, and operational information to support effective monitoring, debugging, and decision-making.

## Decision Drivers

* Need for comprehensive system visibility and monitoring
* Support for debugging and troubleshooting complex issues
* Integration with existing API Gateway and Lambda architecture
* Real-time access to operational data and metrics
* Support for dashboard and alerting integrations
* Cost-effective approach to observability data access
* Security and access control for sensitive operational data

## Considered Options

* **Option 1**: Direct frontend integration with AWS services
* **Option 2**: Dedicated observability API layer with Lambda functions
* **Option 3**: Third-party observability platform integration
* **Option 4**: Custom observability service with data aggregation
* **Option 5**: Hybrid approach with cached data and real-time APIs

## Decision Outcome

Chosen option: **"Dedicated observability API layer with Lambda functions"**, because it provides unified access to diverse AWS services, enables custom data transformation, maintains security boundaries, and integrates seamlessly with our existing architecture.

### Implementation Details

**API Structure**:
```
/api/observability/
├── /logs                    # CloudWatch Logs
├── /metrics                 # CloudWatch Metrics
├── /alarms                  # CloudWatch Alarms
├── /traces                  # X-Ray Traces
├── /stacks                  # CloudFormation Stacks
├── /lambda                  # Lambda Functions
├── /stepfunctions          # Step Functions
├── /apigateway             # API Gateway
├── /storage                # S3 Storage
├── /users                  # Cognito Users
├── /parameters             # SSM Parameters
├── /events                 # EventBridge Events
├── /costs                  # AWS Cost Explorer
├── /errors                 # Error Events
└── /security               # Security Events
```

**Lambda Function Architecture**:
```python
# observability_lambda.py
import boto3
import json
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional

class ObservabilityService:
    def __init__(self):
        self.cloudwatch_logs = boto3.client('logs')
        self.cloudwatch_metrics = boto3.client('cloudwatch')
        self.xray = boto3.client('xray')
        self.lambda_client = boto3.client('lambda')
        self.stepfunctions = boto3.client('stepfunctions')
        self.apigateway = boto3.client('apigateway')
        self.s3 = boto3.client('s3')
        self.cognito = boto3.client('cognito-idp')
        self.ssm = boto3.client('ssm')
        self.events = boto3.client('events')
        self.ce = boto3.client('ce')  # Cost Explorer
        self.dynamodb = boto3.resource('dynamodb')
    
    def get_logs(self, log_group: str, start_time: str, end_time: str, 
                 filter_pattern: str = None, limit: int = 100) -> Dict[str, Any]:
        """Get CloudWatch logs with filtering"""
        try:
            start_timestamp = int(datetime.fromisoformat(start_time.replace('Z', '+00:00')).timestamp() * 1000)
            end_timestamp = int(datetime.fromisoformat(end_time.replace('Z', '+00:00')).timestamp() * 1000)
            
            kwargs = {
                'logGroupName': log_group,
                'startTime': start_timestamp,
                'endTime': end_timestamp,
                'limit': min(limit, 1000)  # AWS limit
            }
            
            if filter_pattern:
                kwargs['filterPattern'] = filter_pattern
            
            response = self.cloudwatch_logs.filter_log_events(**kwargs)
            
            # Transform events for frontend consumption
            events = []
            for event in response.get('events', []):
                events.append({
                    'timestamp': datetime.fromtimestamp(event['timestamp'] / 1000).isoformat(),
                    'message': event['message'],
                    'logStream': event.get('logStreamName'),
                    'eventId': event.get('eventId')
                })
            
            return {
                'events': events,
                'nextToken': response.get('nextToken'),
                'searchedLogStreams': response.get('searchedLogStreams', [])
            }
            
        except Exception as e:
            raise Exception(f"Error retrieving logs: {e}")
    
    def get_metrics(self, namespace: str, metric_name: str, 
                   start_time: str, end_time: str, period: int = 300,
                   dimensions: List[Dict] = None) -> Dict[str, Any]:
        """Get CloudWatch metrics"""
        try:
            start_timestamp = datetime.fromisoformat(start_time.replace('Z', '+00:00'))
            end_timestamp = datetime.fromisoformat(end_time.replace('Z', '+00:00'))
            
            kwargs = {
                'Namespace': namespace,
                'MetricName': metric_name,
                'StartTime': start_timestamp,
                'EndTime': end_timestamp,
                'Period': period,
                'Statistics': ['Average', 'Sum', 'Maximum', 'Minimum']
            }
            
            if dimensions:
                kwargs['Dimensions'] = dimensions
            
            response = self.cloudwatch_metrics.get_metric_statistics(**kwargs)
            
            # Sort by timestamp
            datapoints = sorted(response['Datapoints'], key=lambda x: x['Timestamp'])
            
            return {
                'metricName': metric_name,
                'namespace': namespace,
                'datapoints': [
                    {
                        'timestamp': dp['Timestamp'].isoformat(),
                        'average': dp.get('Average'),
                        'sum': dp.get('Sum'),
                        'maximum': dp.get('Maximum'),
                        'minimum': dp.get('Minimum')
                    }
                    for dp in datapoints
                ]
            }
            
        except Exception as e:
            raise Exception(f"Error retrieving metrics: {e}")
    
    def get_lambda_metrics(self, function_name: str = None) -> Dict[str, Any]:
        """Get Lambda function metrics and information"""
        try:
            functions = []
            
            if function_name:
                # Get specific function
                response = self.lambda_client.get_function(FunctionName=function_name)
                functions.append(response['Configuration'])
            else:
                # Get all functions
                paginator = self.lambda_client.get_paginator('list_functions')
                for page in paginator.paginate():
                    functions.extend(page['Functions'])
            
            # Get metrics for each function
            function_metrics = []
            for func in functions:
                metrics = self._get_lambda_function_metrics(func['FunctionName'])
                function_metrics.append({
                    'functionName': func['FunctionName'],
                    'runtime': func['Runtime'],
                    'memorySize': func['MemorySize'],
                    'timeout': func['Timeout'],
                    'lastModified': func['LastModified'],
                    'codeSize': func['CodeSize'],
                    'metrics': metrics
                })
            
            return {
                'functions': function_metrics,
                'totalFunctions': len(function_metrics)
            }
            
        except Exception as e:
            raise Exception(f"Error retrieving Lambda metrics: {e}")
    
    def _get_lambda_function_metrics(self, function_name: str) -> Dict[str, Any]:
        """Get metrics for a specific Lambda function"""
        end_time = datetime.utcnow()
        start_time = end_time - timedelta(hours=24)
        
        metrics = {}
        
        # Get invocation count
        invocations = self.cloudwatch_metrics.get_metric_statistics(
            Namespace='AWS/Lambda',
            MetricName='Invocations',
            Dimensions=[{'Name': 'FunctionName', 'Value': function_name}],
            StartTime=start_time,
            EndTime=end_time,
            Period=3600,
            Statistics=['Sum']
        )
        
        # Get error count
        errors = self.cloudwatch_metrics.get_metric_statistics(
            Namespace='AWS/Lambda',
            MetricName='Errors',
            Dimensions=[{'Name': 'FunctionName', 'Value': function_name}],
            StartTime=start_time,
            EndTime=end_time,
            Period=3600,
            Statistics=['Sum']
        )
        
        # Get duration
        duration = self.cloudwatch_metrics.get_metric_statistics(
            Namespace='AWS/Lambda',
            MetricName='Duration',
            Dimensions=[{'Name': 'FunctionName', 'Value': function_name}],
            StartTime=start_time,
            EndTime=end_time,
            Period=3600,
            Statistics=['Average']
        )
        
        total_invocations = sum(dp['Sum'] for dp in invocations['Datapoints'])
        total_errors = sum(dp['Sum'] for dp in errors['Datapoints'])
        avg_duration = sum(dp['Average'] for dp in duration['Datapoints']) / max(len(duration['Datapoints']), 1)
        
        return {
            'invocations24h': total_invocations,
            'errors24h': total_errors,
            'errorRate': (total_errors / max(total_invocations, 1)) * 100,
            'avgDuration': avg_duration
        }
    
    def get_stepfunctions_metrics(self) -> Dict[str, Any]:
        """Get Step Functions execution metrics"""
        try:
            # List state machines
            response = self.stepfunctions.list_state_machines()
            state_machines = response['stateMachines']
            
            execution_metrics = []
            for sm in state_machines:
                # Get recent executions
                executions = self.stepfunctions.list_executions(
                    stateMachineArn=sm['stateMachineArn'],
                    maxResults=100
                )
                
                # Calculate metrics
                total_executions = len(executions['executions'])
                successful = len([e for e in executions['executions'] if e['status'] == 'SUCCEEDED'])
                failed = len([e for e in executions['executions'] if e['status'] == 'FAILED'])
                
                execution_metrics.append({
                    'stateMachineName': sm['name'],
                    'stateMachineArn': sm['stateMachineArn'],
                    'totalExecutions': total_executions,
                    'successfulExecutions': successful,
                    'failedExecutions': failed,
                    'successRate': (successful / max(total_executions, 1)) * 100,
                    'lastExecution': executions['executions'][0]['startDate'].isoformat() if executions['executions'] else None
                })
            
            return {
                'stateMachines': execution_metrics,
                'totalStateMachines': len(state_machines)
            }
            
        except Exception as e:
            raise Exception(f"Error retrieving Step Functions metrics: {e}")
    
    def get_api_gateway_metrics(self) -> Dict[str, Any]:
        """Get API Gateway metrics"""
        try:
            # Get REST APIs
            apis = self.apigateway.get_rest_apis()
            
            api_metrics = []
            for api in apis['items']:
                # Get API stages
                stages = self.apigateway.get_stages(restApiId=api['id'])
                
                for stage in stages['item']:
                    # Get metrics for this API stage
                    metrics = self._get_api_stage_metrics(api['id'], stage['stageName'])
                    
                    api_metrics.append({
                        'apiId': api['id'],
                        'apiName': api['name'],
                        'stageName': stage['stageName'],
                        'metrics': metrics
                    })
            
            return {
                'apis': api_metrics,
                'totalApis': len(apis['items'])
            }
            
        except Exception as e:
            raise Exception(f"Error retrieving API Gateway metrics: {e}")
    
    def _get_api_stage_metrics(self, api_id: str, stage_name: str) -> Dict[str, Any]:
        """Get metrics for API Gateway stage"""
        end_time = datetime.utcnow()
        start_time = end_time - timedelta(hours=24)
        
        # Get request count
        requests = self.cloudwatch_metrics.get_metric_statistics(
            Namespace='AWS/ApiGateway',
            MetricName='Count',
            Dimensions=[
                {'Name': 'ApiName', 'Value': api_id},
                {'Name': 'Stage', 'Value': stage_name}
            ],
            StartTime=start_time,
            EndTime=end_time,
            Period=3600,
            Statistics=['Sum']
        )
        
        # Get 4XX errors
        errors_4xx = self.cloudwatch_metrics.get_metric_statistics(
            Namespace='AWS/ApiGateway',
            MetricName='4XXError',
            Dimensions=[
                {'Name': 'ApiName', 'Value': api_id},
                {'Name': 'Stage', 'Value': stage_name}
            ],
            StartTime=start_time,
            EndTime=end_time,
            Period=3600,
            Statistics=['Sum']
        )
        
        # Get 5XX errors
        errors_5xx = self.cloudwatch_metrics.get_metric_statistics(
            Namespace='AWS/ApiGateway',
            MetricName='5XXError',
            Dimensions=[
                {'Name': 'ApiName', 'Value': api_id},
                {'Name': 'Stage', 'Value': stage_name}
            ],
            StartTime=start_time,
            EndTime=end_time,
            Period=3600,
            Statistics=['Sum']
        )
        
        total_requests = sum(dp['Sum'] for dp in requests['Datapoints'])
        total_4xx = sum(dp['Sum'] for dp in errors_4xx['Datapoints'])
        total_5xx = sum(dp['Sum'] for dp in errors_5xx['Datapoints'])
        
        return {
            'requests24h': total_requests,
            'errors4xx': total_4xx,
            'errors5xx': total_5xx,
            'errorRate': ((total_4xx + total_5xx) / max(total_requests, 1)) * 100
        }
    
    def get_storage_metrics(self) -> Dict[str, Any]:
        """Get S3 storage metrics"""
        try:
            # List buckets
            buckets = self.s3.list_buckets()
            
            bucket_metrics = []
            for bucket in buckets['Buckets']:
                bucket_name = bucket['Name']
                
                # Get bucket size (from CloudWatch)
                size_metrics = self.cloudwatch_metrics.get_metric_statistics(
                    Namespace='AWS/S3',
                    MetricName='BucketSizeBytes',
                    Dimensions=[
                        {'Name': 'BucketName', 'Value': bucket_name},
                        {'Name': 'StorageType', 'Value': 'StandardStorage'}
                    ],
                    StartTime=datetime.utcnow() - timedelta(days=2),
                    EndTime=datetime.utcnow(),
                    Period=86400,
                    Statistics=['Average']
                )
                
                # Get object count
                object_metrics = self.cloudwatch_metrics.get_metric_statistics(
                    Namespace='AWS/S3',
                    MetricName='NumberOfObjects',
                    Dimensions=[
                        {'Name': 'BucketName', 'Value': bucket_name},
                        {'Name': 'StorageType', 'Value': 'AllStorageTypes'}
                    ],
                    StartTime=datetime.utcnow() - timedelta(days=2),
                    EndTime=datetime.utcnow(),
                    Period=86400,
                    Statistics=['Average']
                )
                
                size_bytes = size_metrics['Datapoints'][-1]['Average'] if size_metrics['Datapoints'] else 0
                object_count = object_metrics['Datapoints'][-1]['Average'] if object_metrics['Datapoints'] else 0
                
                bucket_metrics.append({
                    'bucketName': bucket_name,
                    'creationDate': bucket['CreationDate'].isoformat(),
                    'sizeBytes': size_bytes,
                    'objectCount': object_count
                })
            
            return {
                'buckets': bucket_metrics,
                'totalBuckets': len(buckets['Buckets'])
            }
            
        except Exception as e:
            raise Exception(f"Error retrieving storage metrics: {e}")
    
    def get_error_events(self, correlation_id: str = None, service: str = None, 
                        time_range: str = '1h') -> Dict[str, Any]:
        """Get error events from Error Bus"""
        try:
            # Parse time range
            if time_range == '1h':
                start_time = datetime.utcnow() - timedelta(hours=1)
            elif time_range == '24h':
                start_time = datetime.utcnow() - timedelta(hours=24)
            elif time_range == '7d':
                start_time = datetime.utcnow() - timedelta(days=7)
            else:
                start_time = datetime.utcnow() - timedelta(hours=1)
            
            # Query error events from DynamoDB
            table = self.dynamodb.Table('ErrorAnalytics')
            
            if correlation_id:
                # Query by correlation ID
                response = table.query(
                    IndexName='CorrelationIndex',
                    KeyConditionExpression='correlationId = :cid',
                    ExpressionAttributeValues={':cid': correlation_id}
                )
            else:
                # Scan with filters
                filter_expression = '#timestamp > :start_time'
                expression_values = {':start_time': start_time.isoformat()}
                
                if service:
                    filter_expression += ' AND #service = :service'
                    expression_values[':service'] = service
                
                response = table.scan(
                    FilterExpression=filter_expression,
                    ExpressionAttributeNames={
                        '#timestamp': 'timestamp',
                        '#service': 'service'
                    },
                    ExpressionAttributeValues=expression_values,
                    Limit=100
                )
            
            return {
                'errors': response['Items'],
                'totalErrors': len(response['Items']),
                'timeRange': time_range
            }
            
        except Exception as e:
            raise Exception(f"Error retrieving error events: {e}")

# API Gateway Lambda handler
def lambda_handler(event, context):
    """API Gateway handler for observability endpoints"""
    observability_service = ObservabilityService()
    
    try:
        # Parse request
        http_method = event['httpMethod']
        path = event['path']
        query_params = event.get('queryStringParameters', {}) or {}
        
        # Route to appropriate handler
        if path == '/api/observability/logs':
            return handle_logs_request(observability_service, query_params)
        elif path == '/api/observability/metrics':
            return handle_metrics_request(observability_service, query_params)
        elif path == '/api/observability/lambda':
            return handle_lambda_request(observability_service, query_params)
        elif path == '/api/observability/stepfunctions':
            return handle_stepfunctions_request(observability_service, query_params)
        elif path == '/api/observability/apigateway':
            return handle_apigateway_request(observability_service, query_params)
        elif path == '/api/observability/storage':
            return handle_storage_request(observability_service, query_params)
        elif path == '/api/observability/errors':
            return handle_errors_request(observability_service, query_params)
        else:
            return {
                'statusCode': 404,
                'body': json.dumps({'error': 'Endpoint not found'})
            }
            
    except Exception as e:
        return {
            'statusCode': 500,
            'body': json.dumps({
                'error': 'Internal server error',
                'message': str(e)
            })
        }

def handle_logs_request(service, params):
    """Handle logs endpoint request"""
    log_group = params.get('logGroup')
    start_time = params.get('startTime')
    end_time = params.get('endTime')
    filter_pattern = params.get('filterPattern')
    limit = int(params.get('limit', 100))
    
    if not all([log_group, start_time, end_time]):
        return {
            'statusCode': 400,
            'body': json.dumps({'error': 'Missing required parameters'})
        }
    
    result = service.get_logs(log_group, start_time, end_time, filter_pattern, limit)
    
    return {
        'statusCode': 200,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        },
        'body': json.dumps(result, default=str)
    }

def handle_metrics_request(service, params):
    """Handle metrics endpoint request"""
    namespace = params.get('namespace')
    metric_name = params.get('metricName')
    start_time = params.get('startTime')
    end_time = params.get('endTime')
    period = int(params.get('period', 300))
    
    if not all([namespace, metric_name, start_time, end_time]):
        return {
            'statusCode': 400,
            'body': json.dumps({'error': 'Missing required parameters'})
        }
    
    result = service.get_metrics(namespace, metric_name, start_time, end_time, period)
    
    return {
        'statusCode': 200,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        },
        'body': json.dumps(result, default=str)
    }

def handle_lambda_request(service, params):
    """Handle Lambda metrics request"""
    function_name = params.get('functionName')
    result = service.get_lambda_metrics(function_name)
    
    return {
        'statusCode': 200,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        },
        'body': json.dumps(result, default=str)
    }

def handle_errors_request(service, params):
    """Handle error events request"""
    correlation_id = params.get('correlationId')
    service_name = params.get('service')
    time_range = params.get('timeRange', '1h')
    
    result = service.get_error_events(correlation_id, service_name, time_range)
    
    return {
        'statusCode': 200,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        },
        'body': json.dumps(result, default=str)
    }
```

### Frontend Integration

**Redux Observability Slice**:
```typescript
// observabilitySlice.ts
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { apiClient } from '../utils/apiClient';

interface ObservabilityState {
  logs: any[];
  metrics: any[];
  lambda: any[];
  stepfunctions: any[];
  apigateway: any[];
  storage: any[];
  errors: any[];
  loading: {
    logs: boolean;
    metrics: boolean;
    lambda: boolean;
    stepfunctions: boolean;
    apigateway: boolean;
    storage: boolean;
    errors: boolean;
  };
  error: string | null;
}

const initialState: ObservabilityState = {
  logs: [],
  metrics: [],
  lambda: [],
  stepfunctions: [],
  apigateway: [],
  storage: [],
  errors: [],
  loading: {
    logs: false,
    metrics: false,
    lambda: false,
    stepfunctions: false,
    apigateway: false,
    storage: false,
    errors: false
  },
  error: null
};

export const fetchLogs = createAsyncThunk(
  'observability/fetchLogs',
  async (params: {
    logGroup: string;
    startTime: string;
    endTime: string;
    filterPattern?: string;
    limit?: number;
  }) => {
    const response = await apiClient.get('/api/observability/logs', { params });
    return response.data;
  }
);

export const fetchMetrics = createAsyncThunk(
  'observability/fetchMetrics',
  async (params: {
    namespace: string;
    metricName: string;
    startTime: string;
    endTime: string;
    period?: number;
  }) => {
    const response = await apiClient.get('/api/observability/metrics', { params });
    return response.data;
  }
);

export const fetchLambdaMetrics = createAsyncThunk(
  'observability/fetchLambdaMetrics',
  async (functionName?: string) => {
    const params = functionName ? { functionName } : {};
    const response = await apiClient.get('/api/observability/lambda', { params });
    return response.data;
  }
);

export const fetchErrorEvents = createAsyncThunk(
  'observability/fetchErrorEvents',
  async (params: {
    correlationId?: string;
    service?: string;
    timeRange?: string;
  }) => {
    const response = await apiClient.get('/api/observability/errors', { params });
    return response.data;
  }
);

const observabilitySlice = createSlice({
  name: 'observability',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearLogs: (state) => {
      state.logs = [];
    },
    clearMetrics: (state) => {
      state.metrics = [];
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchLogs.pending, (state) => {
        state.loading.logs = true;
        state.error = null;
      })
      .addCase(fetchLogs.fulfilled, (state, action) => {
        state.loading.logs = false;
        state.logs = action.payload.events;
      })
      .addCase(fetchLogs.rejected, (state, action) => {
        state.loading.logs = false;
        state.error = action.error.message || 'Failed to fetch logs';
      })
      .addCase(fetchMetrics.pending, (state) => {
        state.loading.metrics = true;
        state.error = null;
      })
      .addCase(fetchMetrics.fulfilled, (state, action) => {
        state.loading.metrics = false;
        state.metrics = action.payload.datapoints;
      })
      .addCase(fetchMetrics.rejected, (state, action) => {
        state.loading.metrics = false;
        state.error = action.error.message || 'Failed to fetch metrics';
      });
  }
});

export const { clearError, clearLogs, clearMetrics } = observabilitySlice.actions;
export default observabilitySlice.reducer;
```

### Consequences

**Good**:
* **Unified Access**: Single API layer for all observability data
* **Custom Filtering**: Intelligent filtering and data transformation
* **Security**: Proper authentication and authorization controls
* **Performance**: Optimized data retrieval with caching opportunities
* **Integration**: Seamless integration with existing architecture
* **Flexibility**: Easy to extend with new data sources
* **Cost Control**: Efficient API usage and data transfer

**Bad**:
* **Complexity**: Additional Lambda functions and API endpoints to maintain
* **Latency**: Additional network hop for data retrieval
* **Cost**: Lambda execution costs for data processing
* **Maintenance**: Need to keep up with AWS service API changes
* **Debugging**: More complex debugging when observability APIs fail
* **Rate Limits**: Need to handle AWS service rate limits

## Implementation Guidelines

1. **Data Filtering**: Always implement intelligent filtering to reduce data transfer
2. **Caching**: Cache frequently accessed data where appropriate
3. **Error Handling**: Robust error handling for AWS service failures
4. **Security**: Implement proper authentication and authorization
5. **Performance**: Optimize API responses and data transformation

## More Information

* [AWS CloudWatch API Documentation](https://docs.aws.amazon.com/cloudwatch/)
* [AWS Lambda Monitoring](https://docs.aws.amazon.com/lambda/latest/dg/monitoring-metrics.html)
* [API Gateway Monitoring](https://docs.aws.amazon.com/apigateway/latest/developerguide/monitoring-cloudwatch.html)
* Related ADRs: ADR-0006 (Frontend Architecture), ADR-0010 (Error Bus)