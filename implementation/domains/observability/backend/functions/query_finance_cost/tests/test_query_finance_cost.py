import json
from unittest.mock import patch, MagicMock
from datetime import datetime, timedelta, timezone

import pytest

from implementation.domains.observability.backend.functions.query_finance_cost.src.app import handler

@pytest.fixture
def apigw_event_finance_cost():
    start_date = (datetime.utcnow() - timedelta(days=30)).strftime('%Y-%m-%d')
    end_date = datetime.utcnow().strftime('%Y-%m-%d')
    return {
        "queryStringParameters": {
            "timePeriodStart": start_date,
            "timePeriodEnd": end_date,
            "granularity": "MONTHLY",
            "metrics": "BlendedCost",
            "groupBy": '[{"Type": "DIMENSION", "Key": "SERVICE"}]',
            "filter": '{"Dimensions": {"Key": "REGION", "Values": ["us-east-1"]}}',
            "nextPageToken": "someToken"
        }
    }

@pytest.fixture
def mock_cost_explorer_client():
    with patch('implementation.domains.observability.backend.functions.query_finance_cost.src.app.boto3.client') as mock_boto_client:
        mock_client = MagicMock()
        mock_boto_client.return_value = mock_client
        yield mock_client

def test_query_finance_cost_success(apigw_event_finance_cost, mock_cost_explorer_client):
    mock_cost_explorer_client.get_cost_and_usage.return_value = {
        "ResultsByTime": [
            {
                "TimePeriod": {"Start": "2025-06-01", "End": "2025-07-01"},
                "Total": {"BlendedCost": {"Amount": "450.00", "Unit": "USD"}},
                "Groups": [],
                "Estimated": False
            }
        ],
        "DimensionValueAttributes": [],
        "GroupDefinitions": [],
        "NextPageToken": "anotherToken"
    }

    response = handler(apigw_event_finance_cost, MagicMock())
    assert response['statusCode'] == 200
    body = json.loads(response['body'])
    assert "ResultsByTime" in body
    assert len(body['ResultsByTime']) == 1
    assert body['ResultsByTime'][0]['Total']['BlendedCost']['Amount'] == "450.00"
    assert body['NextPageToken'] == "anotherToken"

    mock_cost_explorer_client.get_cost_and_usage.assert_called_once()
    args, kwargs = mock_cost_explorer_client.get_cost_and_usage.call_args
    assert kwargs['TimePeriod']['Start'] == apigw_event_finance_cost['queryStringParameters']['timePeriodStart']
    assert kwargs['Granularity'] == "MONTHLY"
    assert kwargs['Metrics'] == ["BlendedCost"]

def test_query_finance_cost_missing_parameters(apigw_event_finance_cost):
    event = apigw_event_finance_cost
    event['queryStringParameters']['granularity'] = None # Missing parameter
    response = handler(event, MagicMock())
    assert response['statusCode'] == 400
    body = json.loads(response['body'])
    assert "error" in body
    assert "required" in body['error']

def test_query_finance_cost_invalid_group_by_json(apigw_event_finance_cost):
    event = apigw_event_finance_cost
    event['queryStringParameters']['groupBy'] = "not-json"
    response = handler(event, MagicMock())
    assert response['statusCode'] == 400
    body = json.loads(response['body'])
    assert "error" in body
    assert "Invalid groupBy JSON" in body['error']

def test_query_finance_cost_invalid_filter_json(apigw_event_finance_cost):
    event = apigw_event_finance_cost
    event['queryStringParameters']['filter'] = "not-json"
    response = handler(event, MagicMock())
    assert response['statusCode'] == 400
    body = json.loads(response['body'])
    assert "error" in body
    assert "Invalid filter JSON" in body['error']

def test_query_finance_cost_ce_error(apigw_event_finance_cost, mock_cost_explorer_client):
    mock_cost_explorer_client.get_cost_and_usage.side_effect = Exception("Cost Explorer error")
    response = handler(apigw_event_finance_cost, MagicMock())
    assert response['statusCode'] == 500
    body = json.loads(response['body'])
    assert "error" in body
    assert "Internal server error" in body['error']
