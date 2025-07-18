import json
import os
from datetime import datetime, timedelta, timezone

import boto3
from boto3.dynamodb.conditions import Key
from aws_lambda_powertools import Tracer
from aws_lambda_powertools import Logger
from aws_lambda_powertools.utilities.typing import LambdaContext
from aws_lambda_powertools.utilities.data_classes.api_gateway_proxy_event import APIGatewayProxyEvent

tracer = Tracer()
logger = Logger()

dynamodb = boto3.resource('dynamodb')

@logger.inject_lambda_context(log_event=True)
@tracer.capture_lambda_handler
def handler(event: APIGatewayProxyEvent, context: LambdaContext):
    try:
        params = event.query_string_parameters or {}
        
        time_range = params.get('timeRange', '1h')
        service = params.get('service')
        severity = params.get('severity')
        correlation_id = params.get('correlationId')

        error_analytics_table_name = os.environ.get('ERROR_ANALYTICS_TABLE_NAME')
        if not error_analytics_table_name:
            logger.error("ERROR_ANALYTICS_TABLE_NAME environment variable not set.")
            return {
                'statusCode': 500,
                'body': json.dumps({'error': 'Internal server error: Table name not configured.'})
            }
        table = dynamodb.Table(error_analytics_table_name)

        # Calculate time period for query
        end_time = datetime.utcnow()
        if time_range == '1h':
            start_time = end_time - timedelta(hours=1)
        elif time_range == '24h':
            start_time = end_time - timedelta(hours=24)
        elif time_range == '7d':
            start_time = end_time - timedelta(days=7)
        else:
            start_time = datetime.min # Query all if time_range is invalid or not provided

        # Build query based on filters
        # This is a simplified example. For complex filtering, consider DynamoDB scan with FilterExpression
        # or more advanced query patterns with GSIs if needed.
        query_params = {
            'IndexName': 'CorrelationIndex',
            'KeyConditionExpression': Key('correlationId').eq(correlation_id)
        } if correlation_id else {}

        # For other filters (service, severity, time range), we'll use scan for simplicity
        # In a production system, for large datasets, consider adding GSIs for these filters
        # or using CloudWatch Logs Insights for more flexible querying of error logs.
        response = table.scan(
            FilterExpression=self._build_filter_expression(start_time, end_time, service, severity),
            **query_params
        )
        items = response.get('Items', [])

        # Aggregate error data (basic aggregation as per ADR-0003 example)
        errors_by_type = {}
        errors_by_service = {}
        severity_distribution = {'LOW': 0, 'MEDIUM': 0, 'HIGH': 0, 'CRITICAL': 0}
        
        for item in items:
            error_type = item.get('errorType', 'Unknown')
            service_name = item.get('source', 'Unknown')
            item_severity = item.get('severity', 'MEDIUM')
            
            errors_by_type[error_type] = errors_by_type.get(error_type, 0) + 1
            errors_by_service[service_name] = errors_by_service.get(service_name, 0) + 1
            severity_distribution[item_severity] = severity_distribution.get(item_severity, 0) + 1

        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'totalErrors': len(items),
                'errorsByType': errors_by_type,
                'errorsByService': errors_by_service,
                'severityDistribution': severity_distribution,
                'errors': items # Return raw items for now
            }, default=str)
        }

    except Exception as e:
        logger.exception("Error fetching security events")
        # In a real scenario, this would publish to the Error Bus
        return {
            'statusCode': 500,
            'body': json.dumps({'error': 'Internal server error', 'details': str(e)})
        }

@tracer.capture_method
def _build_filter_expression(start_time, end_time, service, severity):
    from boto3.dynamodb.conditions import Attr
    filter_expression = None

    # Filter by timestamp (assuming 'timestamp' attribute exists and is sortable)
    if start_time and end_time:
        filter_expression = Key('timestamp').between(start_time.isoformat(), end_time.isoformat())

    if service:
        if filter_expression:
            filter_expression = filter_expression & Attr('source').eq(service)
        else:
            filter_expression = Attr('source').eq(service)

    if severity:
        if filter_expression:
            filter_expression = filter_expression & Attr('severity').eq(severity)
        else:
            filter_expression = Attr('severity').eq(severity)

    return filter_expression
