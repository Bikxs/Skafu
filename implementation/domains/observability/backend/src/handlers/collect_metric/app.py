"""
Lambda handler for collecting metrics
"""

import json
import os
from datetime import datetime
from typing import Dict, Any
from aws_lambda_powertools import Logger, Tracer, Metrics
from aws_lambda_powertools.utilities.typing import LambdaContext
from aws_lambda_powertools.event_handler import APIGatewayRestResolver
from aws_lambda_powertools.event_handler.exceptions import BadRequestError, InternalServerError
from aws_lambda_powertools.logging import correlation_paths
from aws_lambda_powertools.metrics import MetricUnit

# Import shared libraries
import sys
sys.path.append('/opt/python')
from skafu_shared.models import MetricAggregate, Metric, Repository
from skafu_shared.events import EventStore, EventPublisher
from skafu_shared.exceptions import SkafuException, ValidationError
from skafu_shared.utils import correlation_id, user_context, metrics_helper, logger_helper

# Initialize Powertools
logger = Logger()
tracer = Tracer()
metrics = Metrics()
app = APIGatewayRestResolver()

# Environment variables
ENVIRONMENT = os.getenv('ENVIRONMENT', 'development')
EVENT_STORE_TABLE = os.getenv('EVENT_STORE_TABLE', 'skafu-events-development')
METRICS_TABLE = os.getenv('METRICS_TABLE', 'skafu-metrics-development')
EVENT_BUS_NAME = os.getenv('EVENT_BUS_NAME', 'skafu-events-development')
ERROR_BUS_NAME = os.getenv('ERROR_BUS_NAME', 'skafu-errors-development')

# Initialize event sourcing components
event_store = EventStore(EVENT_STORE_TABLE)
event_publisher = EventPublisher(EVENT_BUS_NAME, ERROR_BUS_NAME)


class MetricRepository(Repository):
    """Repository for metric aggregates"""
    
    def _get_aggregate_type(self):
        return MetricAggregate


@app.post("/api/v1/observability/metrics")
@tracer.capture_method
def collect_metric():
    """Collect a new metric"""
    try:
        # Parse request body
        request_body = app.current_event.json_body
        
        # Extract user context from JWT token
        user_id = app.current_event.request_context.authorizer.claims.get('sub', '')
        user_context.set_user_id(user_id)
        
        # Set correlation ID
        correlation_id.set(app.current_event.headers.get('X-Correlation-Id', correlation_id.generate()))
        
        # Validate required fields
        required_fields = ['name', 'value', 'unit', 'source']
        for field in required_fields:
            if field not in request_body:
                raise BadRequestError(f"Missing required field: {field}")
        
        # Create metric
        metric = Metric(
            name=request_body['name'],
            value=float(request_body['value']),
            unit=request_body['unit'],
            source=request_body['source'],
            tags=request_body.get('tags', {}),
            timestamp=datetime.utcnow()
        )
        
        # Validate metric
        metric.validate()
        
        # Create or get metric aggregate
        aggregate_id = f"metric-{metric.name.replace(' ', '-').lower()}"
        repository = MetricRepository(event_store)
        
        aggregate = repository.get_by_id(aggregate_id)
        if not aggregate:
            aggregate = MetricAggregate(id=aggregate_id)
        
        # Collect metric
        aggregate.collect_metric(metric)
        
        # Save aggregate (this will store events)
        repository.save(aggregate)
        
        # Publish events to EventBridge
        for event in aggregate.uncommitted_events:
            event_publisher.publish_event(event, "skafu.observability")
        
        # Mark events as committed
        aggregate.mark_events_as_committed()
        
        # Record metrics
        metrics_helper.increment_counter(
            name="MetricCollected",
            dimensions={
                "metric_name": metric.name,
                "source": metric.source,
                "environment": ENVIRONMENT
            }
        )
        
        # Log event
        logger_helper.log_event(
            event_type="metric_collected",
            message=f"Metric collected: {metric.name}",
            extra={
                "metric_id": metric.id,
                "metric_name": metric.name,
                "metric_value": metric.value,
                "metric_unit": metric.unit,
                "source": metric.source
            }
        )
        
        return {
            "statusCode": 201,
            "body": {
                "message": "Metric collected successfully",
                "metric_id": metric.id,
                "aggregate_id": aggregate_id
            }
        }
        
    except ValidationError as e:
        logger_helper.log_error(e, {"operation": "collect_metric"})
        raise BadRequestError(e.message)
    
    except SkafuException as e:
        logger_helper.log_error(e, {"operation": "collect_metric"})
        raise InternalServerError(f"Failed to collect metric: {e.message}")
    
    except Exception as e:
        logger_helper.log_error(e, {"operation": "collect_metric"})
        # Publish error to error bus
        event_publisher.publish_error(e, {
            "operation": "collect_metric",
            "user_id": user_context.get_user_id(),
            "correlation_id": correlation_id.get()
        })
        raise InternalServerError("Internal server error")


@app.exception_handler(BadRequestError)
def handle_bad_request(ex: BadRequestError):
    """Handle bad request errors"""
    return {
        "statusCode": 400,
        "body": {
            "error": "BAD_REQUEST",
            "message": str(ex)
        }
    }


@app.exception_handler(InternalServerError)
def handle_internal_error(ex: InternalServerError):
    """Handle internal server errors"""
    return {
        "statusCode": 500,
        "body": {
            "error": "INTERNAL_SERVER_ERROR",
            "message": str(ex)
        }
    }


@logger.inject_lambda_context(correlation_id_path=correlation_paths.API_GATEWAY_REST)
@tracer.capture_lambda_handler
@metrics.log_metrics
def lambda_handler(event: Dict[str, Any], context: LambdaContext) -> Dict[str, Any]:
    """Lambda handler for collecting metrics"""
    
    # Add custom metrics
    metrics.add_metadata(key="environment", value=ENVIRONMENT)
    metrics.add_metadata(key="service", value="observability")
    metrics.add_metadata(key="operation", value="collect_metric")
    
    return app.resolve(event, context)