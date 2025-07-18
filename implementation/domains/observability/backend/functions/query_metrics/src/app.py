import json
from datetime import datetime

import boto3
from aws_lambda_powertools import Tracer
from aws_lambda_powertools import Logger
from aws_lambda_powertools.utilities.typing import LambdaContext
from aws_lambda_powertools.utilities.data_classes.api_gateway_proxy_event import (
    APIGatewayProxyEvent
)

tracer = Tracer()
logger = Logger()

cloudwatch_client = boto3.client('cloudwatch')

@logger.inject_lambda_context(log_event=True)
@tracer.capture_lambda_handler
def handler(event: APIGatewayProxyEvent, context: LambdaContext):
    try:
        # Extract parameters from query string
        # Handle both APIGatewayProxyEvent and plain dict for tests
        if hasattr(event, 'query_string_parameters'):
            params = event.query_string_parameters or {}
        else:
            params = event.get('queryStringParameters', {}) or {}

        namespace = params.get('namespace')
        metric_name = params.get('metricName')
        start_time_str = params.get('startTime')
        end_time_str = params.get('endTime')
        period = int(params.get('period', 300))
        stat = params.get('stat', 'Average')
        dimensions_str = params.get('dimensions', '{}')

        if not all([namespace, metric_name, start_time_str, end_time_str]):
            logger.error("Missing required parameters")
            return {
                'statusCode': 400,
                'body': json.dumps({
                    'error': 'namespace, metricName, startTime, and endTime are required'
                })
            }

        try:
            start_time = datetime.fromisoformat(start_time_str.replace('Z', '+00:00'))
            end_time = datetime.fromisoformat(end_time_str.replace('Z', '+00:00'))
        except ValueError as e:
            logger.error("Invalid date format", error=str(e))
            return {
                'statusCode': 400,
                'body': json.dumps({'error': f'Invalid date format: {e}. Use ISO 8601 format.'})
            }

        try:
            dimensions = json.loads(dimensions_str)
            cw_dimensions = [{'Name': k, 'Value': v} for k, v in dimensions.items()]
        except json.JSONDecodeError as e:
            logger.error("Invalid dimensions JSON", error=str(e))
            return {
                'statusCode': 400,
                'body': json.dumps({'error': f'Invalid dimensions JSON: {e}'})
            }

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
                        'Stat': stat,
                    },
                    'ReturnData': True,
                },
            ],
            StartTime=start_time,
            EndTime=end_time,
            ScanBy='TimestampAscending'
        )

        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps(response, default=str) # default=str to handle datetime objects
        }

    except Exception as e:
        logger.exception("Error fetching metrics")
        # In a real scenario, this would publish to the Error Bus
        return {
            'statusCode': 500,
            'body': json.dumps({'error': 'Internal server error', 'details': str(e)})
        }
