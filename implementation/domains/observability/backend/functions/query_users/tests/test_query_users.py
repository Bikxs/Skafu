import json
from unittest.mock import patch, MagicMock
from datetime import datetime, timezone

import pytest

from src.app import handler

@pytest.fixture
def apigw_event_users():
    return {
        "queryStringParameters": {
            "userPoolId": "us-east-1_xxxxxxxxx",
            "limit": "10",
            "paginationToken": "someToken",
            "filter": "username = \"testuser\""
        }
    }

@pytest.fixture
def mock_cognito_client():
    with patch('src.app.cognito_client') as mock_client:
        yield mock_client

def test_query_users_success(apigw_event_users, mock_cognito_client):
    mock_cognito_client.list_users.return_value = {
        "Users": [
            {
                "Username": "testuser1",
                "Attributes": [
                    {"Name": "email", "Value": "test1@example.com"}
                ],
                "UserCreateDate": datetime.utcnow(),
                "UserLastModifiedDate": datetime.utcnow(),
                "Enabled": True,
                "UserStatus": "CONFIRMED"
            }
        ],
        "PaginationToken": "anotherToken"
    }

    response = handler(apigw_event_users, MagicMock())
    assert response['statusCode'] == 200
    body = json.loads(response['body'])
    assert "Users" in body
    assert len(body['Users']) == 1
    assert body['Users'][0]['Username'] == "testuser1"
    assert body['PaginationToken'] == "anotherToken"

    mock_cognito_client.list_users.assert_called_once()
    args, kwargs = mock_cognito_client.list_users.call_args
    assert kwargs['UserPoolId'] == "us-east-1_xxxxxxxxx"
    assert kwargs['Limit'] == 10
    assert kwargs['Filter'] == "username = \"testuser\""

def test_query_users_missing_user_pool_id(apigw_event_users):
    event = apigw_event_users
    event['queryStringParameters']['userPoolId'] = None # Missing parameter
    response = handler(event, MagicMock())
    assert response['statusCode'] == 400
    body = json.loads(response['body'])
    assert "error" in body
    assert "userPoolId is required" in body['error']

def test_query_users_cognito_error(apigw_event_users, mock_cognito_client):
    mock_cognito_client.list_users.side_effect = Exception("Cognito error")
    response = handler(apigw_event_users, MagicMock())
    assert response['statusCode'] == 500
    body = json.loads(response['body'])
    assert "error" in body
    assert "Internal server error" in body['error']
