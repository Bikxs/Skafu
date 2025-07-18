import json
from unittest.mock import patch, MagicMock
from datetime import datetime, timedelta
import time

import pytest

from implementation.domains.observability.backend.functions.query_logs.src.app import handler

@pytest.fixture
def apigw_event_logs():
    start_time = (datetime.utcnow() - timedelta(hours=1)).timestamp()
    end_time = datetime.utcnow().timestamp()
    return {
        "queryStringParameters": {
            "logGroupNames": "/aws/lambda/my-lambda-function",
            "queryString": "fields @timestamp, @message | sort @timestamp desc | limit 5",
            "startTime": str(int(start_time)),
            "endTime": str(int(end_time)),
            "limit": "5"
        }
    }

@pytest.fixture
def mock_logs_client():
    with patch('implementation.domains.observability.backend.functions.query_logs.src.app.boto3.client') as mock_boto_client:
        mock_client = MagicMock()
        mock_boto_client.return_value = mock_client
        yield mock_client

def test_query_logs_success(apigw_event_logs, mock_logs_client):
    mock_logs_client.start_query.return_value = {
        "queryId": "test-query-id"
    }
    mock_logs_client.get_query_results.side_effect = [
        {"status": "Running", "results": []},
        {"status": "Complete", "results": [
            [{"field": "@timestamp", "value": "2025-01-01 10:00:00.000"}, {"field": "@message", "value": "Log entry 1"}]
        ],
        "statistics": {"recordsMatched": 1, "recordsScanned": 10, "bytesProcessed": 100}
        }
    ]

    response = handler(apigw_event_logs, MagicMock())
    assert response['statusCode'] == 200
    body = json.loads(response['body'])
    assert "results" in body
    assert len(body['results']) == 1
    assert body['results'][0][0]['value'] == "2025-01-01 10:00:00.000"
    assert body['status'] == "Complete"

    mock_logs_client.start_query.assert_called_once()
    mock_logs_client.get_query_results.assert_called_with(queryId="test-query-id")

def test_query_logs_missing_parameters(apigw_event_logs):
    event = apigw_event_logs
    event['queryStringParameters']['logGroupNames'] = None # Missing parameter
    response = handler(event, MagicMock())
    assert response['statusCode'] == 400
    body = json.loads(response['body'])
    assert "error" in body
    assert "required" in body['error']

def test_query_logs_invalid_time_format(apigw_event_logs):
    event = apigw_event_logs
    event['queryStringParameters']['startTime'] = "invalid-time"
    response = handler(event, MagicMock())
    assert response['statusCode'] == 400
    body = json.loads(response['body'])
    assert "error" in body
    assert "Invalid time format" in body['error']

def test_query_logs_cloudwatch_logs_error(apigw_event_logs, mock_logs_client):
    mock_logs_client.start_query.side_effect = Exception("CloudWatch Logs error")
    response = handler(apigw_event_logs, MagicMock())
    assert response['statusCode'] == 500
    body = json.loads(response['body'])
    assert "error" in body
    assert "Internal server error" in body['error']
