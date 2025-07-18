import json
from unittest.mock import patch, MagicMock
from datetime import datetime, timedelta, timezone

import pytest

from implementation.domains.observability.backend.functions.query_metrics.src.app import handler

@pytest.fixture
def apigw_event_metrics():
    start_time = (datetime.utcnow() - timedelta(hours=1)).isoformat(timespec='seconds') + 'Z'
    end_time = datetime.utcnow().isoformat(timespec='seconds') + 'Z'
    return {
        "queryStringParameters": {
            "namespace": "AWS/Lambda",
            "metricName": "Invocations",
            "startTime": start_time,
            "endTime": end_time,
            "period": "300",
            "stat": "Sum",
            "dimensions": '{"FunctionName": "my-test-function"}'
        }
    }

@pytest.fixture
def mock_cloudwatch_client():
    with patch('implementation.domains.observability.backend.functions.query_metrics.src.app.boto3.client') as mock_boto_client:
        mock_client = MagicMock()
        mock_boto_client.return_value = mock_client
        yield mock_client

def test_query_metrics_success(apigw_event_metrics, mock_cloudwatch_client):
    mock_cloudwatch_client.get_metric_data.return_value = {
        "MetricDataResults": [
            {
                "Id": "m1",
                "Label": "Invocations",
                "Timestamps": [
                    datetime.utcnow() - timedelta(minutes=5),
                    datetime.utcnow()
                ],
                "Values": [10.0, 15.0],
                "StatusCode": "Complete"
            }
        ],
        "Messages": []
    }

    response = handler(apigw_event_metrics, MagicMock())
    assert response['statusCode'] == 200
    body = json.loads(response['body'])
    assert "MetricDataResults" in body
    assert len(body['MetricDataResults']) == 1
    assert body['MetricDataResults'][0]['Id'] == "m1"

    mock_cloudwatch_client.get_metric_data.assert_called_once()
    args, kwargs = mock_cloudwatch_client.get_metric_data.call_args
    assert kwargs['MetricDataQueries'][0]['Metric']['Namespace'] == "AWS/Lambda"
    assert kwargs['MetricDataQueries'][0]['Metric']['MetricName'] == "Invocations"
    assert kwargs['MetricDataQueries'][0]['Metric']['Dimensions'][0]['Name'] == "FunctionName"

def test_query_metrics_missing_parameters(apigw_event_metrics):
    event = apigw_event_metrics
    event['queryStringParameters']['namespace'] = None # Missing parameter
    response = handler(event, MagicMock())
    assert response['statusCode'] == 400
    body = json.loads(response['body'])
    assert "error" in body
    assert "required" in body['error']

def test_query_metrics_invalid_date_format(apigw_event_metrics):
    event = apigw_event_metrics
    event['queryStringParameters']['startTime'] = "invalid-date"
    response = handler(event, MagicMock())
    assert response['statusCode'] == 400
    body = json.loads(response['body'])
    assert "error" in body
    assert "Invalid date format" in body['error']

def test_query_metrics_invalid_dimensions_json(apigw_event_metrics):
    event = apigw_event_metrics
    event['queryStringParameters']['dimensions'] = "not-json"
    response = handler(event, MagicMock())
    assert response['statusCode'] == 400
    body = json.loads(response['body'])
    assert "error" in body
    assert "Invalid dimensions JSON" in body['error']

def test_query_metrics_cloudwatch_error(apigw_event_metrics, mock_cloudwatch_client):
    mock_cloudwatch_client.get_metric_data.side_effect = Exception("CloudWatch error")
    response = handler(apigw_event_metrics, MagicMock())
    assert response['statusCode'] == 500
    body = json.loads(response['body'])
    assert "error" in body
    assert "Internal server error" in body['error']
