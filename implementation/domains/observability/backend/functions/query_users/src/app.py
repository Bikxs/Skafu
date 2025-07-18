import json
import os

import boto3
from aws_lambda_powertools import Tracer
from aws_lambda_powertools import Logger
from aws_lambda_powertools.utilities.typing import LambdaContext
from aws_lambda_powertools.utilities.data_classes.api_gateway_proxy_event import APIGatewayProxyEvent

tracer = Tracer()
logger = Logger()

cognito_client = boto3.client('cognito-idp')

@logger.inject_lambda_context(log_event=True)
@tracer.capture_lambda_handler
def handler(event: APIGatewayProxyEvent, context: LambdaContext):
    try:
        params = event.query_string_parameters or {}
        
        user_pool_id = params.get('userPoolId')
        limit = int(params.get('limit', 60))
        pagination_token = params.get('paginationToken')
        filter_string = params.get('filter')

        if not user_pool_id:
            logger.error("Missing required parameter: userPoolId")
            return {
                'statusCode': 400,
                'body': json.dumps({'error': 'userPoolId is required'})
            }

        api_params = {
            'UserPoolId': user_pool_id,
            'Limit': limit
        }
        if pagination_token:
            api_params['PaginationToken'] = pagination_token
        if filter_string:
            api_params['Filter'] = filter_string

        response = cognito_client.list_users(**api_params)
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps(response, default=str)
        }

    except Exception as e:
        logger.exception("Error fetching users")
        # In a real scenario, this would publish to the Error Bus
        return {
            'statusCode': 500,
            'body': json.dumps({'error': 'Internal server error', 'details': str(e)})
        }
