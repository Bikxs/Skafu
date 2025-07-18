import json
import time

import boto3
from aws_lambda_powertools import Tracer
from aws_lambda_powertools import Logger
from aws_lambda_powertools.utilities.typing import LambdaContext
from aws_lambda_powertools.utilities.data_classes.api_gateway_proxy_event import (
    APIGatewayProxyEvent
)

tracer = Tracer()
logger = Logger()

logs_client = boto3.client('logs')

@logger.inject_lambda_context(log_event=True)
@tracer.capture_lambda_handler
def handler(event: APIGatewayProxyEvent, context: LambdaContext):
    try:
        # Handle both APIGatewayProxyEvent and plain dict for tests
        if hasattr(event, 'query_string_parameters'):
            params = event.query_string_parameters or {}
        else:
            params = event.get('queryStringParameters', {}) or {}

        log_group_names_str = params.get('logGroupNames')
        query_string = params.get('queryString')
        start_time_epoch = params.get('startTime')
        end_time_epoch = params.get('endTime')
        limit = int(params.get('limit', 1000))

        if not all([log_group_names_str, query_string, start_time_epoch, end_time_epoch]):
            logger.error("Missing required parameters")
            return {
                'statusCode': 400,
                'body': json.dumps({
                    'error': 'logGroupNames, queryString, startTime, and endTime are required'
                })
            }

        log_group_names = log_group_names_str.split(',')

        try:
            start_time = int(float(start_time_epoch))
            end_time = int(float(end_time_epoch))
        except ValueError as e:
            logger.error("Invalid time format", error=str(e))
            return {
                'statusCode': 400,
                'body': json.dumps({'error': f'Invalid time format: {e}. Use Unix epoch seconds.'})
            }

        # Start the query
        start_query_response = logs_client.start_query(
            logGroupNames=log_group_names,
            startTime=start_time,
            endTime=end_time,
            queryString=query_string,
            limit=limit
        )

        query_id = start_query_response['queryId']

        # Poll for query results
        response = {}
        status = 'Running'
        while status in ['Running', 'Scheduled']:
            time.sleep(1) # Wait for 1 second before polling again
            response = logs_client.get_query_results(queryId=query_id)
            status = response['status']

        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'results': response.get('results', []),
                'statistics': response.get('statistics', {}),
                'status': status
            }, default=str)
        }

    except Exception as e:
        logger.exception("Error querying logs")
        # In a real scenario, this would publish to the Error Bus
        return {
            'statusCode': 500,
            'body': json.dumps({'error': 'Internal server error', 'details': str(e)})
        }
