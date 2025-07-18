import json
import os

import boto3
from aws_lambda_powertools import Tracer
from aws_lambda_powertools import Logger
from aws_lambda_powertools.utilities.typing import LambdaContext
from aws_lambda_powertools.utilities.data_classes.api_gateway_proxy_event import APIGatewayProxyEvent

tracer = Tracer()
logger = Logger()

cloudwatch_client = boto3.client('cloudwatch')

@logger.inject_lambda_context(log_event=True)
@tracer.capture_lambda_handler
def handler(event: APIGatewayProxyEvent, context: LambdaContext):
    try:
        params = event.query_string_parameters or {}
        
        alarm_names_str = params.get('alarmNames')
        alarm_name_prefix = params.get('alarmNamePrefix')
        state_value = params.get('stateValue')
        action_prefix = params.get('actionPrefix')
        max_records = int(params.get('maxRecords', 100))
        next_token = params.get('nextToken')

        api_params = {
            'MaxRecords': max_records
        }
        if alarm_names_str:
            api_params['AlarmNames'] = alarm_names_str.split(',')
        if alarm_name_prefix:
            api_params['AlarmNamePrefix'] = alarm_name_prefix
        if state_value:
            api_params['StateValue'] = state_value
        if action_prefix:
            api_params['ActionPrefix'] = action_prefix
        if next_token:
            api_params['NextToken'] = next_token

        response = cloudwatch_client.describe_alarms(**api_params)
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps(response, default=str)
        }

    except Exception as e:
        logger.exception("Error fetching alarms")
        # In a real scenario, this would publish to the Error Bus
        return {
            'statusCode': 500,
            'body': json.dumps({'error': 'Internal server error', 'details': str(e)})
        }
