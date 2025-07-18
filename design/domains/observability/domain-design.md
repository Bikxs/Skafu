# Observability Domain Design

## Domain Overview

The Observability domain provides direct access to AWS monitoring services (CloudWatch, X-Ray, etc.) to expose metrics, logs, and traces for the Skafu platform. This design emphasizes a lean API layer that acts as a direct proxy to underlying AWS services, with minimal processing or storage of observability data within the application itself.

## Business Context

### Domain Purpose
- **Metrics Retrieval**: Fetch performance and business metrics directly from CloudWatch.
- **Distributed Tracing Analysis**: Retrieve and analyze trace data directly from AWS X-Ray.
- **Log Querying**: Query and retrieve log data directly from CloudWatch Logs.
- **Alerting Configuration**: Provide an API to configure CloudWatch Alarms.
- **Performance Analytics**: Present raw or minimally transformed data for performance analysis.

### Key Business Rules
1.  **Real-time Data Access**: Data is fetched directly from AWS services to ensure real-time insights.
2.  **No Internal Storage**: Observability data (metrics, logs, traces) is not stored or cached within the Skafu application's own databases (e.g., DynamoDB).
3.  **Minimal Transformation**: Data transformation is limited to reformatting for UI presentation (e.g., flattening structures, renaming fields, basic calculations).
4.  **Direct AWS Service Interaction**: Lambda handlers interact directly with AWS SDKs (Boto3) to query monitoring services.
5.  **Security**: Access to AWS monitoring services is controlled via IAM roles with least privilege.

## API Endpoints (Observability API Layer)

The Observability API layer will consist of several Lambda functions, each typically corresponding to a specific AWS monitoring service operation.

```
/api/observability/
├── /logs                    # CloudWatch Logs queries (e.g., get_query_results, start_query)
├── /metrics                 # CloudWatch Metrics data (e.g., get_metric_data, list_metrics)
├── /traces                  # X-Ray trace analysis (e.g., get_trace_summaries, get_batch_trace_details)
├── /errors                  # Error events from Error Bus (querying DynamoDB ErrorAnalyticsTable)
├── /dashboards             # Custom dashboard data (aggregating data from various sources for specific dashboards)
│
├── /lambda                  # Lambda function metrics (specific CloudWatch metrics for Lambda)
├── /stepfunctions          # Step Functions metrics (specific CloudWatch metrics for Step Functions)
├── /apigateway             # API Gateway metrics (specific CloudWatch metrics for API Gateway)
├── /storage                # S3 storage metrics (specific CloudWatch metrics for S3)
├── /events                 # EventBridge metrics (specific CloudWatch metrics for EventBridge)
└── /costs                  # Cost analysis data (e.g., Cost Explorer API)
```

## Implementation Details

### Lambda Handler Pattern

Each API Gateway endpoint will map to a dedicated Lambda function. These Lambda functions will:
1.  Receive the request from API Gateway.
2.  Extract parameters (e.g., time ranges, filters, metric names) from the request.
3.  Call the appropriate AWS SDK (Boto3) method for the target monitoring service.
4.  Perform minimal data reformatting for UI consumption.
5.  Return the transformed data to API Gateway.

**Example: Get CloudWatch Metrics Handler (`src/handlers/get_metrics.py`)**

```python
import json
import boto3
import os

cloudwatch_client = boto3.client('cloudwatch')

def get_metrics_handler(event, context):
    try:
        # Extract parameters from query string or request body
        params = event.get('queryStringParameters', {}) or {}
        
        namespace = params.get('namespace', 'AWS/Lambda')
        metric_name = params.get('metricName')
        start_time = params.get('startTime') # ISO 8601 format
        end_time = params.get('endTime')     # ISO 8601 format
        period = int(params.get('period', 300)) # in seconds
        dimensions = json.loads(params.get('dimensions', '{}')) # JSON string of dimensions
        
        if not metric_name or not start_time or not end_time:
            return {
                'statusCode': 400,
                'body': json.dumps({'error': 'metricName, startTime, and endTime are required'})
            }

        # Prepare dimensions for CloudWatch API
        cw_dimensions = [{'Name': k, 'Value': v} for k, v in dimensions.items()]

        # Call CloudWatch GetMetricData API
        response = cloudwatch_client.get_metric_data(
            MetricDataQueries=[
                {
                    'Id': 'm1',
                    'MetricStat': {
                        'Metric': {
                            'Namespace': namespace,
                            'MetricName': metric_name,
                            'Dimensions': cw_dimensions
                        },
                        'Period': period,
                        'Stat': 'Average', # Or Sum, Maximum, Minimum, SampleCount
                    },
                    'ReturnData': True,
                },
            ],
            StartTime=start_time,
            EndTime=end_time,
            ScanBy='TimestampAscending'
        )
        
        # Minimal transformation for UI: extract relevant data points
        transformed_data = []
        for result in response.get('MetricDataResults', []):
            for i in range(len(result.get('Timestamps', []))):
                transformed_data.append({
                    'timestamp': result['Timestamps'][i].isoformat(),
                    'value': result['Values'][i]
                })

        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps(transformed_data, default=str)
        }

    except Exception as e:
        print(f"Error fetching metrics: {e}")
        # Error handling should leverage the centralized Error Bus as per ADR-0003
        return {
            'statusCode': 500,
            'body': json.dumps({'error': 'Internal server error', 'details': str(e)})
        }

```

**Example: Get X-Ray Trace Summaries Handler (`src/handlers/get_traces.py`)**

```python
import json
import boto3
import os

xray_client = boto3.client('xray')

def get_traces_handler(event, context):
    try:
        params = event.get('queryStringParameters', {}) or {}
        
        start_time = params.get('startTime') # Unix epoch seconds or ISO 8601
        end_time = params.get('endTime')     # Unix epoch seconds or ISO 8601
        filter_expression = params.get('filterExpression') # X-Ray filter expression
        next_token = params.get('nextToken')
        
        if not start_time or not end_time:
            return {
                'statusCode': 400,
                'body': json.dumps({'error': 'startTime and endTime are required'})
            }

        # Convert ISO 8601 to Unix epoch seconds if necessary
        # (Boto3 often handles this automatically, but explicit conversion can be safer)
        # from datetime import datetime
        # start_time_epoch = datetime.fromisoformat(start_time).timestamp()
        # end_time_epoch = datetime.fromisoformat(end_time).timestamp()

        api_params = {
            'StartTime': float(start_time), # Assuming Unix epoch seconds for simplicity
            'EndTime': float(end_time),
            'TimeRangeType': 'Event' # Or 'Service'
        }
        if filter_expression:
            api_params['FilterExpression'] = filter_expression
        if next_token:
            api_params['NextToken'] = next_token

        response = xray_client.get_trace_summaries(**api_params)
        
        # Minimal transformation: just return the summaries and NextToken
        transformed_data = {
            'traceSummaries': response.get('TraceSummaries', []),
            'nextToken': response.get('NextToken')
        }

        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps(transformed_data, default=str)
        }

    except Exception as e:
        print(f"Error fetching traces: {e}")
        # Error handling should leverage the centralized Error Bus as per ADR-0003
        return {
            'statusCode': 500,
            'body': json.dumps({'error': 'Internal server error', 'details': str(e)})
        }
```

### Error Handling

Error handling within these Lambda functions should primarily focus on:
1.  Catching exceptions from AWS SDK calls.
2.  Logging the error details.
3.  Publishing a structured error event to the dedicated EventBridge Error Bus, as defined in `ADR-0003`.
4.  Returning a generic 500 Internal Server Error to the client, avoiding exposure of sensitive internal details.

### IAM Permissions

Each Lambda function will require specific IAM permissions to interact with the respective AWS monitoring service. These permissions should adhere to the principle of least privilege.

**Example IAM Policy for `get_metrics_handler`**:

```yaml
Policies:
  - Statement:
      - Effect: Allow
        Action:
          - cloudwatch:GetMetricData
          - cloudwatch:ListMetrics
        Resource: "*" # CloudWatch actions are often at '*' resource level
      - Effect: Allow
        Action:
          - logs:CreateLogGroup
          - logs:CreateLogStream
          - logs:PutLogEvents
        Resource: arn:aws:logs:*:*:*
```

### Frontend Integration

The frontend will directly call these API Gateway endpoints. The data received will be in a format suitable for direct rendering or minimal client-side processing.

## Consequences

**Good**:
*   **Simplicity**: The design is straightforward, with Lambda functions acting as thin wrappers.
*   **Real-time Data**: Direct interaction with AWS services ensures the freshest data.
*   **Reduced Complexity**: No need for complex internal data models, CQRS, or data synchronization for observability data.
*   **Cost-Effective**: Pay-per-invocation for Lambda and direct AWS service costs, no additional database costs for observability data.
*   **Scalability**: Leverages the inherent scalability of AWS monitoring services and Lambda.
*   **Maintainability**: Easier to maintain as changes in AWS APIs can be directly reflected in the Lambda functions.

**Bad**:
*   **API Call Overhead**: Each UI component might trigger multiple Lambda invocations and AWS API calls, potentially increasing latency for complex dashboards.
*   **Limited Custom Aggregation**: Complex, cross-service data aggregation or long-term trend analysis beyond what AWS services provide directly would be challenging or require client-side implementation.
*   **Rate Limiting**: Potential to hit AWS API rate limits if not managed carefully (e.g., with client-side throttling or exponential backoff).
*   **UI Responsibility**: More responsibility on the UI to handle data presentation, filtering, and potentially some aggregation.

This revised design for the Observability domain aligns with the principle of providing a lean API layer that directly exposes AWS monitoring services, with minimal internal logic or data persistence.
