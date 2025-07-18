import json
import os
from datetime import datetime

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
        metric = params.get('metric')
        filter_str = params.get('filter', '{}')

        if not all([time_period_start, time_period_end, granularity, metric]):
            logger.error("Missing required parameters", timePeriodStart=time_period_start, timePeriodEnd=time_period_end, granularity=granularity, metric=metric)
            return {
                'statusCode': 400,
                'body': json.dumps({'error': 'timePeriodStart, timePeriodEnd, granularity, and metric are required'})
            }

        api_params = {
            'TimePeriod': {
                'Start': time_period_start,
                'End': time_period_end
            },
            'Granularity': granularity,
            'Metric': metric
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

        response = cost_explorer_client.get_cost_forecast(**api_params)
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps(response, default=str)
        }

    except Exception as e:
        logger.exception("Error fetching finance forecast data")
        # In a real scenario, this would publish to the Error Bus
        return {
            'statusCode': 500,
            'body': json.dumps({'error': 'Internal server error', 'details': str(e)})
        }
