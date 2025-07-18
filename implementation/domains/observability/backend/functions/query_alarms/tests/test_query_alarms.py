import json
from unittest.mock import patch, MagicMock
from datetime import datetime, timezone

import pytest

from implementation.domains.observability.backend.functions.query_alarms.src.app import handler

@pytest.fixture
def apigw_event_alarms():
    return {
        "queryStringParameters": {
            "alarmNames": "my-alarm-1,my-alarm-2",
            "stateValue": "ALARM",
            "maxRecords": "50",
            "nextToken": "someToken"
        }
    }

@pytest.fixture
def mock_cloudwatch_client():
    with patch('implementation.domains.observability.backend.functions.query_alarms.src.app.boto3.client') as mock_boto_client:
        mock_client = MagicMock()
        mock_boto_client.return_value = mock_client
        yield mock_client

def test_query_alarms_success(apigw_event_alarms, mock_cloudwatch_client):
    mock_cloudwatch_client.describe_alarms.return_value = {
        "MetricAlarms": [
            {
                "AlarmName": "my-alarm-1",
                "StateValue": "ALARM",
                "StateUpdatedTimestamp": datetime.now(timezone.UTC)
            }
        ],
        "CompositeAlarms": [],
        "NextToken": "anotherToken"
    }

    response = handler(apigw_event_alarms, MagicMock())
    assert response['statusCode'] == 200
    body = json.loads(response['body'])
    assert "MetricAlarms" in body
    assert len(body['MetricAlarms']) == 1
    assert body['MetricAlarms'][0]['AlarmName'] == "my-alarm-1"
    assert body['NextToken'] == "anotherToken"

    mock_cloudwatch_client.describe_alarms.assert_called_once()
    args, kwargs = mock_cloudwatch_client.describe_alarms.call_args
    assert kwargs['AlarmNames'] == ["my-alarm-1", "my-alarm-2"]
    assert kwargs['StateValue'] == "ALARM"

def test_query_alarms_missing_parameters(apigw_event_alarms):
    event = apigw_event_alarms
    event['queryStringParameters'] = {} # No parameters
    response = handler(event, MagicMock())
    assert response['statusCode'] == 200 # No required parameters for describe_alarms

def test_query_alarms_cloudwatch_error(apigw_event_alarms, mock_cloudwatch_client):
    mock_cloudwatch_client.describe_alarms.side_effect = Exception("CloudWatch error")
    response = handler(apigw_event_alarms, MagicMock())
    assert response['statusCode'] == 500
    body = json.loads(response['body'])
    assert "error" in body
    assert "Internal server error" in body['error']