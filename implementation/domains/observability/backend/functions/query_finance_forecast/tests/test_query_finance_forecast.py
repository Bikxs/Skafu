import json
from unittest.mock import patch, MagicMock
from datetime import datetime, timedelta, timezone

import pytest

from implementation.domains.observability.backend.functions.query_finance_forecast.src.app import handler

@pytest.fixture
def apigw_event_finance_forecast():
    start_date = datetime.utcnow().strftime('%Y-%m-%d')
    end_date = (datetime.utcnow() + timedelta(days=30)).strftime('%Y-%m-%d')
    return {
        "queryStringParameters": {
            "timePeriodStart": start_date,
            "timePeriodEnd": end_date,
            "granularity": "MONTHLY",
            "metric": "BLENDED_COST",
            "filter": '{"Dimensions": {"Key": "REGION", "Values": ["us-east-1"]}}'
        }
    }

@pytest.fixture
def mock_cost_explorer_client():
    with patch('implementation.domains.observability.backend.functions.query_finance_forecast.src.app.boto3.client') as mock_boto_client:
        mock_client = MagicMock()
        mock_boto_client.return_value = mock_client
        yield mock_client

def test_query_finance_forecast_success(apigw_event_finance_forecast, mock_cost_explorer_client):
    mock_cost_explorer_client.get_cost_forecast.return_value = {
        "ForecastResultsByTime": [
            {
                "TimePeriod": {"Start": "2025-07-18", "End": "2025-07-19"},
                "MeanValue": "10.50",
                "PredictionIntervalLowerBound": "9.00",
                "PredictionIntervalUpperBound": "12.00"
            }
        ],
        "Total": {"Amount": "123.45", "Unit": "USD"}
    }

    response = handler(apigw_event_finance_forecast, MagicMock())
    assert response['statusCode'] == 200
    body = json.loads(response['body'])
    assert "ForecastResultsByTime" in body
    assert len(body['ForecastResultsByTime']) == 1
    assert body['ForecastResultsByTime'][0]['MeanValue'] == "10.50"

    mock_cost_explorer_client.get_cost_forecast.assert_called_once()
    args, kwargs = mock_cost_explorer_client.get_cost_forecast.call_args
    assert kwargs['TimePeriod']['Start'] == apigw_event_finance_forecast['queryStringParameters']['timePeriodStart']
    assert kwargs['Granularity'] == "MONTHLY"
    assert kwargs['Metric'] == "BLENDED_COST"

def test_query_finance_forecast_missing_parameters(apigw_event_finance_forecast):
    event = apigw_event_finance_forecast
    event['queryStringParameters']['metric'] = None # Missing parameter
    response = handler(event, MagicMock())
    assert response['statusCode'] == 400
    body = json.loads(response['body'])
    assert "error" in body
    assert "required" in body['error']

def test_query_finance_forecast_invalid_filter_json(apigw_event_finance_forecast):
    event = apigw_event_finance_forecast
    event['queryStringParameters']['filter'] = "not-json"
    response = handler(event, MagicMock())
    assert response['statusCode'] == 400
    body = json.loads(response['body'])
    assert "error" in body
    assert "Invalid filter JSON" in body['error']

def test_query_finance_forecast_ce_error(apigw_event_finance_forecast, mock_cost_explorer_client):
    mock_cost_explorer_client.get_cost_forecast.side_effect = Exception("Cost Explorer error")
    response = handler(apigw_event_finance_forecast, MagicMock())
    assert response['statusCode'] == 500
    body = json.loads(response['body'])
    assert "error" in body
    assert "Internal server error" in body['error']
