import json
import os
from datetime import datetime, timezone

import boto3
from aws_lambda_powertools import Tracer
from aws_lambda_powertools import Logger
from aws_lambda_powertools.utilities.typing import LambdaContext
from aws_lambda_powertools.utilities.data_classes.api_gateway_proxy_event import APIGatewayProxyEvent

tracer = Tracer()
logger = Logger()

cost_explorer_client = boto3.client('ce')

@logger.inject_lambda_context(log_event=True)
@tracer.capture_lambda_handler
def handler(event: APIGatewayProxyEvent, context: LambdaContext):
    try:
        params = event.query_string_parameters or {}
        
        time_period_start = params.get('timePeriodStart')
        time_period_end = params.get('timePeriodEnd')
        granularity = params.get('granularity')
        metrics_str = params.get('metrics')
        group_by_str = params.get('groupBy', '{}')
        filter_str = params.get('filter', '{}')
        next_page_token = params.get('nextPageToken')

        if not all([time_period_start, time_period_end, granularity, metrics_str]):
            logger.error("Missing required parameters", timePeriodStart=time_period_start, timePeriodEnd=time_period_end, granularity=granularity, metrics=metrics_str)
            return {
                'statusCode': 400,
                'body': json.dumps({'error': 'timePeriodStart, timePeriodEnd, granularity, and metrics are required'})
            }

        metrics = metrics_str.split(',')

        api_params = {
            'TimePeriod': {
                'Start': time_period_start,
                'End': time_period_end
            },
            'Granularity': granularity,
            'Metrics': metrics
        }

        if group_by_str:
            try:
                group_by = json.loads(group_by_str)
                api_params['GroupBy'] = group_by
            except json.JSONDecodeError as e:
                logger.error("Invalid groupBy JSON", error=str(e))
                return {
                    'statusCode': 400,
                    'body': json.dumps({'error': f'Invalid groupBy JSON: {e}'})
                }
        
        if filter_str:
            try:
                filter_obj = json.loads(filter_str)
                api_params['Filter'] = filter_obj
            except json.JSONDecodeError as e:
                logger.error("Invalid filter JSON", error=str(e))
                return {
                    'statusCode': 400,
                    'body': json.dumps({'error': f'Invalid filter JSON: {e}'})
                }

        if next_page_token:
            api_params['NextPageToken'] = next_page_token

        response = cost_explorer_client.get_cost_and_usage(**api_params)
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps(response, default=str)
        }

    except Exception as e:
        logger.exception("Error fetching finance cost data")
        # In a real scenario, this would publish to the Error Bus
        return {
            'statusCode': 500,
            'body': json.dumps({'error': 'Internal server error', 'details': str(e)})
        }
