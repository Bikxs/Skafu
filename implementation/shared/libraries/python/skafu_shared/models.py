"""
Base models and aggregate root for Skafu domains
"""

import uuid
from datetime import datetime
from typing import Dict, Any, List, Optional, Type, TypeVar
from dataclasses import dataclass, field
from abc import ABC, abstractmethod
from aws_lambda_powertools import Logger

from .events import Event, EventStore
from .exceptions import SkafuException, ValidationError

logger = Logger()

T = TypeVar('T', bound='AggregateRoot')


@dataclass
class BaseModel:
    """Base model with common attributes"""
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = field(default_factory=datetime.utcnow)
    updated_at: datetime = field(default_factory=datetime.utcnow)
    version: int = field(default=1)
    
    def __post_init__(self):
        """Validate model after initialization"""
        self.validate()
    
    def validate(self) -> None:
        """Validate model data - override in subclasses"""
        if not self.id:
            raise ValidationError("Model ID is required")
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert model to dictionary"""
        result = {}
        for key, value in self.__dict__.items():
            if isinstance(value, datetime):
                result[key] = value.isoformat()
            elif isinstance(value, BaseModel):
                result[key] = value.to_dict()
            elif isinstance(value, list):
                result[key] = [
                    item.to_dict() if isinstance(item, BaseModel) else item
                    for item in value
                ]
            else:
                result[key] = value
        return result
    
    @classmethod
    def from_dict(cls: Type[T], data: Dict[str, Any]) -> T:
        """Create model from dictionary"""
        # Convert datetime strings back to datetime objects
        for key, value in data.items():
            if key.endswith('_at') and isinstance(value, str):
                try:
                    data[key] = datetime.fromisoformat(value)
                except ValueError:
                    pass
        
        return cls(**data)


class AggregateRoot(BaseModel, ABC):
    """Base aggregate root for event sourcing"""
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self._uncommitted_events: List[Event] = []
        self._version = 0
    
    @property
    def uncommitted_events(self) -> List[Event]:
        """Get uncommitted events"""
        return self._uncommitted_events.copy()
    
    def mark_events_as_committed(self) -> None:
        """Mark all uncommitted events as committed"""
        self._uncommitted_events.clear()
    
    def apply_event(self, event: Event) -> None:
        """Apply event to aggregate"""
        self._apply_event(event)
        self._version += 1
    
    def raise_event(self, event_type: str, event_data: Dict[str, Any], metadata: Optional[Dict[str, Any]] = None) -> None:
        """Raise a new domain event"""
        event = Event(
            event_id=str(uuid.uuid4()),
            event_type=event_type,
            aggregate_id=self.id,
            event_data=event_data,
            correlation_id="",  # Will be set by event handler
            timestamp=datetime.utcnow().isoformat(),
            version="1.0",
            metadata=metadata or {}
        )
        
        self._uncommitted_events.append(event)
        self.apply_event(event)
    
    @abstractmethod
    def _apply_event(self, event: Event) -> None:
        """Apply event to aggregate state - implement in subclasses"""
        pass
    
    @classmethod
    def from_history(cls: Type[T], events: List[Event]) -> T:
        """Reconstruct aggregate from event history"""
        if not events:
            raise SkafuException("Cannot reconstruct aggregate from empty event history")
        
        # Create aggregate instance
        aggregate = cls()
        aggregate.id = events[0].aggregate_id
        
        # Apply all events
        for event in events:
            aggregate.apply_event(event)
        
        # Clear uncommitted events (these are from history)
        aggregate._uncommitted_events.clear()
        
        return aggregate


class Repository(ABC):
    """Base repository for aggregate persistence"""
    
    def __init__(self, event_store: EventStore):
        self.event_store = event_store
        self.logger = logger
    
    @abstractmethod
    def _get_aggregate_type(self) -> Type[AggregateRoot]:
        """Get the aggregate type this repository handles"""
        pass
    
    def get_by_id(self, aggregate_id: str) -> Optional[AggregateRoot]:
        """Get aggregate by ID"""
        try:
            events = self.event_store.get_events(aggregate_id)
            if not events:
                return None
            
            aggregate_type = self._get_aggregate_type()
            return aggregate_type.from_history(events)
            
        except Exception as e:
            self.logger.error(f"Failed to get aggregate {aggregate_id}: {str(e)}")
            raise SkafuException(f"Failed to get aggregate: {str(e)}")
    
    def save(self, aggregate: AggregateRoot, expected_version: Optional[int] = None) -> None:
        """Save aggregate to event store"""
        try:
            # Save all uncommitted events
            for event in aggregate.uncommitted_events:
                self.event_store.append_event(event, expected_version)
            
            # Mark events as committed
            aggregate.mark_events_as_committed()
            
            self.logger.info(
                "Aggregate saved",
                extra={
                    "aggregate_id": aggregate.id,
                    "aggregate_type": type(aggregate).__name__,
                    "version": aggregate.version
                }
            )
            
        except Exception as e:
            self.logger.error(f"Failed to save aggregate {aggregate.id}: {str(e)}")
            raise SkafuException(f"Failed to save aggregate: {str(e)}")


# Domain-specific models for Observability Domain

@dataclass
class Metric(BaseModel):
    """Metric model for observability domain"""
    name: str = ""
    value: float = 0.0
    unit: str = ""
    tags: Dict[str, str] = field(default_factory=dict)
    timestamp: datetime = field(default_factory=datetime.utcnow)
    source: str = ""
    
    def validate(self) -> None:
        """Validate metric data"""
        super().validate()
        if not self.name:
            raise ValidationError("Metric name is required")
        if not self.unit:
            raise ValidationError("Metric unit is required")
        if not self.source:
            raise ValidationError("Metric source is required")


@dataclass
class Alert(BaseModel):
    """Alert model for observability domain"""
    name: str = ""
    description: str = ""
    condition: str = ""
    threshold: float = 0.0
    metric_name: str = ""
    is_active: bool = True
    severity: str = "medium"  # low, medium, high, critical
    tags: Dict[str, str] = field(default_factory=dict)
    
    def validate(self) -> None:
        """Validate alert data"""
        super().validate()
        if not self.name:
            raise ValidationError("Alert name is required")
        if not self.condition:
            raise ValidationError("Alert condition is required")
        if not self.metric_name:
            raise ValidationError("Alert metric name is required")
        if self.severity not in ["low", "medium", "high", "critical"]:
            raise ValidationError("Alert severity must be low, medium, high, or critical")


@dataclass
class SecurityEvent(BaseModel):
    """Security event model for observability domain"""
    event_type: str = ""
    severity: str = "medium"  # low, medium, high, critical
    source: str = ""
    title: str = ""
    description: str = ""
    resource_id: str = ""
    region: str = ""
    account_id: str = ""
    finding_id: str = ""
    status: str = "active"  # active, resolved, suppressed
    tags: Dict[str, str] = field(default_factory=dict)
    
    def validate(self) -> None:
        """Validate security event data"""
        super().validate()
        if not self.event_type:
            raise ValidationError("Security event type is required")
        if not self.source:
            raise ValidationError("Security event source is required")
        if not self.title:
            raise ValidationError("Security event title is required")
        if self.severity not in ["low", "medium", "high", "critical"]:
            raise ValidationError("Security event severity must be low, medium, high, or critical")


@dataclass
class SystemHealth(BaseModel):
    """System health model for observability domain"""
    service_name: str = ""
    status: str = "healthy"  # healthy, degraded, unhealthy
    response_time: float = 0.0
    error_rate: float = 0.0
    throughput: float = 0.0
    cpu_usage: float = 0.0
    memory_usage: float = 0.0
    availability: float = 100.0
    last_check: datetime = field(default_factory=datetime.utcnow)
    tags: Dict[str, str] = field(default_factory=dict)
    
    def validate(self) -> None:
        """Validate system health data"""
        super().validate()
        if not self.service_name:
            raise ValidationError("Service name is required")
        if self.status not in ["healthy", "degraded", "unhealthy"]:
            raise ValidationError("Status must be healthy, degraded, or unhealthy")
        if not 0 <= self.availability <= 100:
            raise ValidationError("Availability must be between 0 and 100")


# Aggregate Roots for Event Sourcing

class MetricAggregate(AggregateRoot):
    """Metric aggregate for event sourcing"""
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.metrics: List[Metric] = []
    
    def collect_metric(self, metric: Metric) -> None:
        """Collect a new metric"""
        metric.validate()
        
        self.raise_event("MetricCollected", {
            "metric_id": metric.id,
            "name": metric.name,
            "value": metric.value,
            "unit": metric.unit,
            "tags": metric.tags,
            "timestamp": metric.timestamp.isoformat(),
            "source": metric.source
        })
    
    def _apply_event(self, event: Event) -> None:
        """Apply event to metric aggregate"""
        if event.event_type == "MetricCollected":
            metric_data = event.event_data
            metric = Metric(
                id=metric_data["metric_id"],
                name=metric_data["name"],
                value=metric_data["value"],
                unit=metric_data["unit"],
                tags=metric_data["tags"],
                timestamp=datetime.fromisoformat(metric_data["timestamp"]),
                source=metric_data["source"]
            )
            self.metrics.append(metric)


class AlertAggregate(AggregateRoot):
    """Alert aggregate for event sourcing"""
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.alerts: List[Alert] = []
    
    def create_alert(self, alert: Alert) -> None:
        """Create a new alert"""
        alert.validate()
        
        self.raise_event("AlertCreated", {
            "alert_id": alert.id,
            "name": alert.name,
            "description": alert.description,
            "condition": alert.condition,
            "threshold": alert.threshold,
            "metric_name": alert.metric_name,
            "is_active": alert.is_active,
            "severity": alert.severity,
            "tags": alert.tags
        })
    
    def trigger_alert(self, alert_id: str, metric_value: float) -> None:
        """Trigger an alert"""
        alert = self._find_alert(alert_id)
        if not alert:
            raise SkafuException(f"Alert {alert_id} not found")
        
        if not alert.is_active:
            raise SkafuException(f"Alert {alert_id} is not active")
        
        self.raise_event("AlertTriggered", {
            "alert_id": alert_id,
            "metric_value": metric_value,
            "threshold": alert.threshold,
            "severity": alert.severity
        })
    
    def _apply_event(self, event: Event) -> None:
        """Apply event to alert aggregate"""
        if event.event_type == "AlertCreated":
            alert_data = event.event_data
            alert = Alert(
                id=alert_data["alert_id"],
                name=alert_data["name"],
                description=alert_data["description"],
                condition=alert_data["condition"],
                threshold=alert_data["threshold"],
                metric_name=alert_data["metric_name"],
                is_active=alert_data["is_active"],
                severity=alert_data["severity"],
                tags=alert_data["tags"]
            )
            self.alerts.append(alert)
        elif event.event_type == "AlertTriggered":
            # Alert triggered - could update state or create incident
            pass
    
    def _find_alert(self, alert_id: str) -> Optional[Alert]:
        """Find alert by ID"""
        for alert in self.alerts:
            if alert.id == alert_id:
                return alert
        return None