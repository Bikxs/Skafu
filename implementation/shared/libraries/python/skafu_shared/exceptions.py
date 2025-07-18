"""
Custom exceptions for Skafu platform
"""


class SkafuException(Exception):
    """Base exception class for Skafu platform"""
    
    def __init__(self, message: str, error_code: str = "SKAFU_ERROR", details: dict = None):
        super().__init__(message)
        self.message = message
        self.error_code = error_code
        self.details = details or {}
    
    def to_dict(self) -> dict:
        """Convert exception to dictionary for API responses"""
        return {
            "error": self.error_code,
            "message": self.message,
            "details": self.details
        }


class ValidationError(SkafuException):
    """Raised when validation fails"""
    
    def __init__(self, message: str, field: str = None, details: dict = None):
        super().__init__(message, "VALIDATION_ERROR", details)
        self.field = field
    
    def to_dict(self) -> dict:
        """Convert validation error to dictionary"""
        result = super().to_dict()
        if self.field:
            result["field"] = self.field
        return result


class NotFoundError(SkafuException):
    """Raised when a resource is not found"""
    
    def __init__(self, resource_type: str, resource_id: str, details: dict = None):
        message = f"{resource_type} '{resource_id}' not found"
        super().__init__(message, "NOT_FOUND", details)
        self.resource_type = resource_type
        self.resource_id = resource_id
    
    def to_dict(self) -> dict:
        """Convert not found error to dictionary"""
        result = super().to_dict()
        result["resource_type"] = self.resource_type
        result["resource_id"] = self.resource_id
        return result


class UnauthorizedError(SkafuException):
    """Raised when user is not authorized"""
    
    def __init__(self, message: str = "Unauthorized", details: dict = None):
        super().__init__(message, "UNAUTHORIZED", details)


class ForbiddenError(SkafuException):
    """Raised when user is forbidden from accessing resource"""
    
    def __init__(self, message: str = "Forbidden", details: dict = None):
        super().__init__(message, "FORBIDDEN", details)


class ConflictError(SkafuException):
    """Raised when there's a conflict (e.g., optimistic locking)"""
    
    def __init__(self, message: str, details: dict = None):
        super().__init__(message, "CONFLICT", details)


class BusinessRuleViolationError(SkafuException):
    """Raised when business rules are violated"""
    
    def __init__(self, rule: str, message: str, details: dict = None):
        super().__init__(message, "BUSINESS_RULE_VIOLATION", details)
        self.rule = rule
    
    def to_dict(self) -> dict:
        """Convert business rule violation to dictionary"""
        result = super().to_dict()
        result["rule"] = self.rule
        return result


class ExternalServiceError(SkafuException):
    """Raised when external service calls fail"""
    
    def __init__(self, service: str, message: str, status_code: int = None, details: dict = None):
        super().__init__(message, "EXTERNAL_SERVICE_ERROR", details)
        self.service = service
        self.status_code = status_code
    
    def to_dict(self) -> dict:
        """Convert external service error to dictionary"""
        result = super().to_dict()
        result["service"] = self.service
        if self.status_code:
            result["status_code"] = self.status_code
        return result


class RetryableError(SkafuException):
    """Raised when operation should be retried"""
    
    def __init__(self, message: str, retry_after: int = None, details: dict = None):
        super().__init__(message, "RETRYABLE_ERROR", details)
        self.retry_after = retry_after
    
    def to_dict(self) -> dict:
        """Convert retryable error to dictionary"""
        result = super().to_dict()
        if self.retry_after:
            result["retry_after"] = self.retry_after
        return result