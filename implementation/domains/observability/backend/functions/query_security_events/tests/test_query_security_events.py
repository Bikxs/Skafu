import json
from unittest.mock import patch, MagicMock
from datetime import datetime, timedelta, timezone

import os
import pytest

from implementation.domains.observability.backend.functions.query_security_events.src.app import handler

@pytest.fixture
def apigw_event_security_events():
    return {
        "queryStringParameters": {
            "timeRange": "24h",
            "service": "project-management",
            "severity": "HIGH",
            "correlationId": "some-correlation-id"
        }
    }

@pytest.fixture
def mock_dynamodb_table():
    with patch('implementation.domains.observability.backend.functions.query_security_events.src.app.boto3.resource') as mock_boto_resource:
        mock_table = MagicMock()
        mock_boto_resource.return_value.Table.return_value = mock_table
        yield mock_table

@pytest.fixture(autouse=True)
def mock_env_vars():
    with patch.dict(os.environ, {'ERROR_ANALYTICS_TABLE_NAME': 'skafu-error-analytics-development'}):
        yield

def test_query_security_events_success(apigw_event_security_events, mock_dynamodb_table):
    mock_dynamodb_table.scan.return_value = {
        "Items": [
            {
                "errorId": "uuid1",
                "correlationId": "some-correlation-id",
                "errorType": "ValidationError",
                "severity": "HIGH",
                "message": "Invalid input",
                "source": "project-management",
                "timestamp": (datetime.utcnow() - timedelta(hours=1)).isoformat()
            },
            {
                "errorId": "uuid2",
                "correlationId": "another-correlation-id",
                "errorType": "SystemError",
                "severity": "MEDIUM",
                "message": "Lambda error",
                "source": "template-management",
                "timestamp": datetime.utcnow().isoformat()
            }
        ]
    }

    response = handler(apigw_event_security_events, MagicMock())
    assert response['statusCode'] == 200
    body = json.loads(response['body'])
    assert "totalErrors" in body
    assert body['totalErrors'] == 2
    assert body['errorsByType']['ValidationError'] == 1
    assert body['errorsByService']['project-management'] == 1
    assert body['severityDistribution']['HIGH'] == 1

    mock_dynamodb_table.scan.assert_called_once()
    args, kwargs = mock_dynamodb_table.scan.call_args
    assert "FilterExpression" in kwargs
    assert "KeyConditionExpression" in kwargs # Because correlationId is provided

def test_query_security_events_missing_table_name(apigw_event_security_events):
    with patch.dict(os.environ, {'ERROR_ANALYTICS_TABLE_NAME': ''}):
        response = handler(apigw_event_security_events, MagicMock())
        assert response['statusCode'] == 500
        body = json.loads(response['body'])
        assert "error" in body
        assert "Table name not configured" in body['error']

def test_query_security_events_dynamodb_error(apigw_event_security_events, mock_dynamodb_table):
    mock_dynamodb_table.scan.side_effect = Exception("DynamoDB error")
    response = handler(apigw_event_security_events, MagicMock())
    assert response['statusCode'] == 500
    body = json.loads(response['body'])
    assert "error" in body
    assert "Internal server error" in body['error']
