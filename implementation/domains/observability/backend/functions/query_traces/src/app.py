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

xray_client = boto3.client('xray')

@logger.inject_lambda_context(log_event=True)
@tracer.capture_lambda_handler
def handler(event: APIGatewayProxyEvent, context: LambdaContext):
    try:
        # Handle both APIGatewayProxyEvent and plain dict for tests
        if hasattr(event, 'query_string_parameters'):
            params = event.query_string_parameters or {}
        else:
            params = event.get('queryStringParameters', {}) or {}

        start_time_str = params.get('startTime')
        end_time_str = params.get('endTime')
        filter_expression = params.get('filterExpression')
        next_token = params.get('nextToken')

        if not start_time_str or not end_time_str:
            logger.error("Missing required parameters")
            return {
                'statusCode': 400,
                'body': json.dumps({'error': 'startTime and endTime are required'})
            }

        try:
            # Convert ISO 8601 to Unix epoch seconds
            start_time = datetime.fromisoformat(start_time_str.replace('Z', '+00:00')).timestamp()
            end_time = datetime.fromisoformat(end_time_str.replace('Z', '+00:00')).timestamp()
        except ValueError as e:
            logger.error("Invalid date format", error=str(e))
            return {
                'statusCode': 400,
                'body': json.dumps({'error': f'Invalid date format: {e}. Use ISO 8601 format.'})
            }

        api_params = {
            'StartTime': start_time,
            'EndTime': end_time,
            'TimeRangeType': 'Event' # Or 'Service' depending on desired behavior
        }
        if filter_expression:
            api_params['FilterExpression'] = filter_expression
        if next_token:
            api_params['NextToken'] = next_token

        response = xray_client.get_trace_summaries(**api_params)

        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps(response, default=str)
        }

    except Exception as e:
        logger.exception("Error fetching traces")
        # In a real scenario, this would publish to the Error Bus
        return {
            'statusCode': 500,
            'body': json.dumps({'error': 'Internal server error', 'details': str(e)})
        }
