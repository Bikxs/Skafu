import json
from unittest.mock import patch, MagicMock
from datetime import datetime, timedelta, timezone

import pytest

from src.app import handler

@pytest.fixture
def apigw_event_traces():
    start_time = (datetime.utcnow() - timedelta(hours=1)).isoformat(timespec='seconds') + 'Z'
    end_time = datetime.utcnow().isoformat(timespec='seconds') + 'Z'
    return {
        "queryStringParameters": {
            "startTime": start_time,
            "endTime": end_time,
            "filterExpression": "service(\"my-service\")",
            "nextToken": "someToken"
        }
    }

@pytest.fixture
def mock_xray_client():
    with patch('src.app.xray_client') as mock_client:
        yield mock_client

def test_query_traces_success(apigw_event_traces, mock_xray_client):
    mock_xray_client.get_trace_summaries.return_value = {
        "TraceSummaries": [
            {
                "Id": "1-5f9f1b0e-1c2d3e4f5a6b7c8d9e0f1a2b",
                "Duration": 0.123,
                "ResponseTime": 0.123,
                "HasError": False,
                "HasFault": False,
                "HasThrottle": False,
                "IsPartial": False,
                "Annotations": {},
                "ServiceIds": [],
                "ResourceARNs": [],
                "Users": [],
                "Edges": [],
                "Origin": "AWS::Lambda::Function",
                "Http": {},
                "MatchedEventTime": datetime.utcnow()
            }
        ],
        "NextToken": "anotherToken"
    }

    response = handler(apigw_event_traces, MagicMock())
    assert response['statusCode'] == 200
    body = json.loads(response['body'])
    assert "TraceSummaries" in body
    assert len(body['TraceSummaries']) == 1
    assert body['TraceSummaries'][0]['Id'] == "1-5f9f1b0e-1c2d3e4f5a6b7c8d9e0f1a2b"
    assert body['NextToken'] == "anotherToken"

    mock_xray_client.get_trace_summaries.assert_called_once()
    args, kwargs = mock_xray_client.get_trace_summaries.call_args
    assert "StartTime" in kwargs
    assert "EndTime" in kwargs
    assert kwargs['FilterExpression'] == "service(\"my-service\")"

def test_query_traces_missing_parameters(apigw_event_traces):
    event = apigw_event_traces
    event['queryStringParameters']['startTime'] = None # Missing parameter
    response = handler(event, MagicMock())
    assert response['statusCode'] == 400
    body = json.loads(response['body'])
    assert "error" in body
    assert "required" in body['error']

def test_query_traces_invalid_date_format(apigw_event_traces):
    event = apigw_event_traces
    event['queryStringParameters']['startTime'] = "invalid-date"
    response = handler(event, MagicMock())
    assert response['statusCode'] == 400
    body = json.loads(response['body'])
    assert "error" in body
    assert "Invalid date format" in body['error']

def test_query_traces_xray_error(apigw_event_traces, mock_xray_client):
    mock_xray_client.get_trace_summaries.side_effect = Exception("X-Ray error")
    response = handler(apigw_event_traces, MagicMock())
    assert response['statusCode'] == 500
    body = json.loads(response['body'])
    assert "error" in body
    assert "Internal server error" in body['error']
