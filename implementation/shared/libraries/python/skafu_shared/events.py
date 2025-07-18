"""
Event handling utilities for Skafu event sourcing
"""

import json
import uuid
from datetime import datetime
from typing import Dict, Any, Optional, List
from dataclasses import dataclass, asdict
from aws_lambda_powertools import Logger, Tracer
from aws_lambda_powertools.utilities.typing import LambdaContext
import boto3
from botocore.exceptions import ClientError

from .utils import correlation_id
from .exceptions import SkafuException

logger = Logger()
tracer = Tracer()

@dataclass
class Event:
    """Base event class for event sourcing"""
    event_id: str
    event_type: str
    aggregate_id: str
    event_data: Dict[str, Any]
    correlation_id: str
    timestamp: str
    version: str = "1.0"
    metadata: Optional[Dict[str, Any]] = None
    
    def __post_init__(self):
        if not self.event_id:
            self.event_id = str(uuid.uuid4())
        if not self.timestamp:
            self.timestamp = datetime.utcnow().isoformat()
        if not self.correlation_id:
            self.correlation_id = correlation_id.get()
        if self.metadata is None:
            self.metadata = {}
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert event to dictionary"""
        return asdict(self)
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'Event':
        """Create event from dictionary"""
        return cls(**data)


class EventStore:
    """DynamoDB-based event store implementation"""
    
    def __init__(self, table_name: str):
        self.table_name = table_name
        self.dynamodb = boto3.resource('dynamodb')
        self.table = self.dynamodb.Table(table_name)
        self.logger = logger
    
    @tracer.capture_method
    def append_event(self, event: Event, expected_version: Optional[int] = None) -> None:
        """Append event to the event store"""
        try:
            # Get current sequence number
            sequence_number = self._get_next_sequence_number(event.aggregate_id)
            
            # Create item
            item = {
                'aggregateId': event.aggregate_id,
                'eventSequence': f"{sequence_number:010d}",
                'eventId': event.event_id,
                'eventType': event.event_type,
                'eventData': event.event_data,
                'correlationId': event.correlation_id,
                'timestamp': event.timestamp,
                'version': event.version,
                'metadata': event.metadata or {}
            }
            
            # Add optimistic locking if expected version provided
            condition_expression = None
            if expected_version is not None:
                condition_expression = "attribute_not_exists(aggregateId) OR eventSequence < :expected_version"
                item['ExpressionAttributeValues'] = {':expected_version': f"{expected_version:010d}"}
            
            # Store event
            self.table.put_item(
                Item=item,
                ConditionExpression=condition_expression
            )
            
            self.logger.info(
                "Event appended to store",
                extra={
                    "event_id": event.event_id,
                    "event_type": event.event_type,
                    "aggregate_id": event.aggregate_id,
                    "sequence_number": sequence_number
                }
            )
            
        except ClientError as e:
            if e.response['Error']['Code'] == 'ConditionalCheckFailedException':
                raise SkafuException(f"Concurrency conflict for aggregate {event.aggregate_id}")
            raise SkafuException(f"Failed to append event: {str(e)}")
    
    @tracer.capture_method
    def get_events(self, aggregate_id: str, from_sequence: Optional[int] = None) -> List[Event]:
        """Get events for an aggregate"""
        try:
            query_kwargs = {
                'KeyConditionExpression': 'aggregateId = :aggregate_id',
                'ExpressionAttributeValues': {':aggregate_id': aggregate_id}
            }
            
            if from_sequence is not None:
                query_kwargs['KeyConditionExpression'] += ' AND eventSequence >= :from_seq'
                query_kwargs['ExpressionAttributeValues'][':from_seq'] = f"{from_sequence:010d}"
            
            response = self.table.query(**query_kwargs)
            
            events = []
            for item in response['Items']:
                event = Event(
                    event_id=item['eventId'],
                    event_type=item['eventType'],
                    aggregate_id=item['aggregateId'],
                    event_data=item['eventData'],
                    correlation_id=item['correlationId'],
                    timestamp=item['timestamp'],
                    version=item.get('version', '1.0'),
                    metadata=item.get('metadata', {})
                )
                events.append(event)
            
            return events
            
        except ClientError as e:
            raise SkafuException(f"Failed to get events for aggregate {aggregate_id}: {str(e)}")
    
    def _get_next_sequence_number(self, aggregate_id: str) -> int:
        """Get the next sequence number for an aggregate"""
        try:
            response = self.table.query(
                KeyConditionExpression='aggregateId = :aggregate_id',
                ExpressionAttributeValues={':aggregate_id': aggregate_id},
                ScanIndexForward=False,
                Limit=1
            )
            
            if response['Items']:
                last_sequence = response['Items'][0]['eventSequence']
                return int(last_sequence) + 1
            else:
                return 1
                
        except ClientError as e:
            raise SkafuException(f"Failed to get sequence number: {str(e)}")


class EventPublisher:
    """EventBridge event publisher"""
    
    def __init__(self, event_bus_name: str, error_bus_name: str):
        self.event_bus_name = event_bus_name
        self.error_bus_name = error_bus_name
        self.events_client = boto3.client('events')
        self.logger = logger
    
    @tracer.capture_method
    def publish_event(self, event: Event, source: str = "skafu") -> None:
        """Publish event to EventBridge"""
        try:
            event_entry = {
                'Source': source,
                'DetailType': event.event_type,
                'Detail': json.dumps(event.to_dict()),
                'EventBusName': self.event_bus_name,
                'Resources': [event.aggregate_id]
            }
            
            response = self.events_client.put_events(Entries=[event_entry])
            
            if response['FailedEntryCount'] > 0:
                failed_entry = response['Entries'][0]
                raise SkafuException(f"Failed to publish event: {failed_entry.get('ErrorMessage', 'Unknown error')}")
            
            self.logger.info(
                "Event published to EventBridge",
                extra={
                    "event_id": event.event_id,
                    "event_type": event.event_type,
                    "source": source,
                    "event_bus": self.event_bus_name
                }
            )
            
        except ClientError as e:
            self._publish_error(event, str(e))
            raise SkafuException(f"Failed to publish event: {str(e)}")
    
    @tracer.capture_method
    def publish_error(self, error: Exception, context: Dict[str, Any]) -> None:
        """Publish error to error bus"""
        try:
            error_event = {
                'error_type': type(error).__name__,
                'error_message': str(error),
                'context': context,
                'timestamp': datetime.utcnow().isoformat(),
                'correlation_id': correlation_id.get()
            }
            
            event_entry = {
                'Source': 'skafu.error',
                'DetailType': 'Error Occurred',
                'Detail': json.dumps(error_event),
                'EventBusName': self.error_bus_name
            }
            
            self.events_client.put_events(Entries=[event_entry])
            
        except ClientError as e:
            self.logger.error(f"Failed to publish error to error bus: {str(e)}")
    
    def _publish_error(self, original_event: Event, error_message: str) -> None:
        """Publish error for failed event publication"""
        error_context = {
            'original_event_id': original_event.event_id,
            'original_event_type': original_event.event_type,
            'aggregate_id': original_event.aggregate_id,
            'error_message': error_message
        }
        
        self.publish_error(
            SkafuException(f"Failed to publish event: {error_message}"),
            error_context
        )


class EventHandler:
    """Base class for event handlers"""
    
    def __init__(self, event_store: EventStore, event_publisher: EventPublisher):
        self.event_store = event_store
        self.event_publisher = event_publisher
        self.logger = logger
    
    @tracer.capture_method
    def handle_event(self, event: Event, context: LambdaContext) -> None:
        """Handle incoming event"""
        try:
            correlation_id.set(event.correlation_id)
            
            self.logger.info(
                "Processing event",
                extra={
                    "event_id": event.event_id,
                    "event_type": event.event_type,
                    "aggregate_id": event.aggregate_id
                }
            )
            
            # Template method - override in subclasses
            self._handle_event_impl(event, context)
            
        except Exception as e:
            self.logger.error(
                "Error handling event",
                extra={
                    "event_id": event.event_id,
                    "event_type": event.event_type,
                    "error": str(e)
                }
            )
            
            # Publish error
            self.event_publisher.publish_error(e, {
                'event_id': event.event_id,
                'event_type': event.event_type,
                'aggregate_id': event.aggregate_id,
                'handler': self.__class__.__name__
            })
            
            raise
    
    def _handle_event_impl(self, event: Event, context: LambdaContext) -> None:
        """Override this method in subclasses"""
        raise NotImplementedError("Subclasses must implement _handle_event_impl")