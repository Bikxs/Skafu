"""
Skafu Shared Library
Common utilities and patterns for the Skafu platform
"""

__version__ = "1.0.0"
__author__ = "Skafu Team"
__email__ = "team@skafu.com"

from .events import EventPublisher, EventHandler, Event
from .models import BaseModel, AggregateRoot, EventStore
from .exceptions import SkafuException, ValidationError, NotFoundError
from .utils import correlation_id, logger, metrics

__all__ = [
    "EventPublisher",
    "EventHandler", 
    "Event",
    "BaseModel",
    "AggregateRoot",
    "EventStore",
    "SkafuException",
    "ValidationError",
    "NotFoundError",
    "correlation_id",
    "logger",
    "metrics"
]