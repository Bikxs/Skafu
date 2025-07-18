"""
Utility functions and classes for Skafu platform
"""

import uuid
from typing import Optional, Dict, Any
from contextvars import ContextVar
from datetime import datetime
from aws_lambda_powertools import Logger, Tracer, Metrics
from aws_lambda_powertools.metrics import MetricUnit

# Context variables for request correlation
_correlation_id_context: ContextVar[str] = ContextVar('correlation_id', default='')
_user_id_context: ContextVar[str] = ContextVar('user_id', default='')
_tenant_id_context: ContextVar[str] = ContextVar('tenant_id', default='')

# Shared instances
logger = Logger()
tracer = Tracer()
metrics = Metrics()


class CorrelationId:
    """Utility class for managing correlation IDs"""

    @staticmethod
    def generate() -> str:
        """Generate a new correlation ID"""
        return str(uuid.uuid4())

    @staticmethod
    def set(correlation_id_value: str) -> None:
        """Set the correlation ID for the current context"""
        _correlation_id_context.set(correlation_id_value)

    @staticmethod
    def get() -> str:
        """Get the correlation ID from the current context"""
        current_id = _correlation_id_context.get()
        if not current_id:
            current_id = CorrelationId.generate()
            _correlation_id_context.set(current_id)
        return current_id

    @staticmethod
    def clear() -> None:
        """Clear the correlation ID from the current context"""
        _correlation_id_context.set('')


class UserContext:
    """Utility class for managing user context"""

    @staticmethod
    def set_user_id(user_id: str) -> None:
        """Set the user ID for the current context"""
        _user_id_context.set(user_id)

    @staticmethod
    def get_user_id() -> str:
        """Get the user ID from the current context"""
        return _user_id_context.get()

    @staticmethod
    def set_tenant_id(tenant_id: str) -> None:
        """Set the tenant ID for the current context"""
        _tenant_id_context.set(tenant_id)

    @staticmethod
    def get_tenant_id() -> str:
        """Get the tenant ID from the current context"""
        return _tenant_id_context.get()

    @staticmethod
    def clear() -> None:
        """Clear the user context"""
        _user_id_context.set('')
        _tenant_id_context.set('')


class MetricsHelper:
    """Helper class for custom metrics"""

    @staticmethod
    def increment_counter(name: str, value: float = 1.0, unit: MetricUnit = MetricUnit.Count,
                         dimensions: Optional[Dict[str, str]] = None) -> None:
        """Increment a counter metric"""
        if dimensions:
            for key, value_dim in dimensions.items():
                metrics.add_metadata(key, value_dim)

        metrics.add_metric(name=name, unit=unit, value=value)

    @staticmethod
    def record_latency(name: str, value: float, unit: MetricUnit = MetricUnit.Milliseconds,
                      dimensions: Optional[Dict[str, str]] = None) -> None:
        """Record a latency metric"""
        if dimensions:
            for key, value_dim in dimensions.items():
                metrics.add_metadata(key, value_dim)

        metrics.add_metric(name=name, unit=unit, value=value)

    @staticmethod
    def record_business_metric(name: str, value: float, unit: MetricUnit = MetricUnit.Count,
                              dimensions: Optional[Dict[str, str]] = None) -> None:
        """Record a business metric"""
        if dimensions:
            for key, value_dim in dimensions.items():
                metrics.add_metadata(key, value_dim)

        metrics.add_metric(name=name, unit=unit, value=value)


class LoggerHelper:
    """Helper class for structured logging"""

    @staticmethod
    def log_event(event_type: str, message: str, extra: Optional[Dict[str, Any]] = None) -> None:
        """Log an event with structured data"""
        log_extra = {
            "event_type": event_type,
            "correlation_id": CorrelationId.get(),
            "user_id": UserContext.get_user_id(),
            "tenant_id": UserContext.get_tenant_id()
        }

        if extra:
            log_extra.update(extra)

        logger.info(message, extra=log_extra)

    @staticmethod
    def log_error(error: Exception, context: Optional[Dict[str, Any]] = None) -> None:
        """Log an error with context"""
        log_extra = {
            "error_type": type(error).__name__,
            "error_message": str(error),
            "correlation_id": CorrelationId.get(),
            "user_id": UserContext.get_user_id(),
            "tenant_id": UserContext.get_tenant_id()
        }

        if context:
            log_extra.update(context)

        logger.error("Error occurred", extra=log_extra)

    @staticmethod
    def log_api_call(method: str, path: str, status_code: int, duration_ms: float,
                    extra: Optional[Dict[str, Any]] = None) -> None:
        """Log an API call"""
        log_extra = {
            "api_method": method,
            "api_path": path,
            "status_code": status_code,
            "duration_ms": duration_ms,
            "correlation_id": CorrelationId.get(),
            "user_id": UserContext.get_user_id(),
            "tenant_id": UserContext.get_tenant_id()
        }

        if extra:
            log_extra.update(extra)

        logger.info("API call", extra=log_extra)


def format_timestamp(timestamp: str) -> str:
    """Format timestamp for display"""
    try:
        dt = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
        return dt.strftime('%Y-%m-%d %H:%M:%S UTC')
    except ValueError:
        return timestamp


def sanitize_input(value: str, max_length: int = 255) -> str:
    """Sanitize input string"""
    if not value:
        return ""

    # Remove control characters
    sanitized = ''.join(char for char in value if ord(char) >= 32)

    # Truncate if too long
    if len(sanitized) > max_length:
        sanitized = sanitized[:max_length]

    return sanitized.strip()


def validate_uuid(value: str) -> bool:
    """Validate UUID format"""
    try:
        uuid.UUID(value)
        return True
    except ValueError:
        return False


def chunk_list(lst: list, chunk_size: int) -> list:
    """Split list into chunks"""
    return [lst[i:i + chunk_size] for i in range(0, len(lst), chunk_size)]


def safe_get(dictionary: dict, key: str, default: Any = None) -> Any:
    """Safely get value from dictionary"""
    return dictionary.get(key, default)


def merge_dicts(*dicts: dict) -> dict:
    """Merge multiple dictionaries"""
    result = {}
    for d in dicts:
        if d:
            result.update(d)
    return result


# Aliases for easier imports (using PascalCase for pylint compliance)
CorrelationIdAlias = CorrelationId
UserContextAlias = UserContext
MetricsHelperAlias = MetricsHelper
LoggerHelperAlias = LoggerHelper
