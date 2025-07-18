# ADR-0014: API Security with Validation and WAF

**Status**: 🟢 Accepted  
**Date**: 2025-01-18  
**Deciders**: Development Team

## Context and Problem Statement

We need to protect our API Gateway endpoints from malicious requests, malformed data, and common web attacks while maintaining good performance and user experience for legitimate requests.

## Decision Drivers

* Protection against common web attacks (SQL injection, XSS, etc.)
* Data validation at the API gateway level to prevent malformed requests
* Cost-effective security implementation
* Integration with existing serverless architecture
* Observability and monitoring of security events
* Minimal impact on legitimate request performance

## Considered Options

* **Option 1**: Basic API Gateway security only
* **Option 2**: Request validation only with OpenAPI schemas
* **Option 3**: AWS WAF only without request validation
* **Option 4**: Combined request validation and AWS WAF
* **Option 5**: Third-party API security solution

## Decision Outcome

Chosen option: **"Combined request validation and AWS WAF"**, because it provides comprehensive protection with minimal performance impact while leveraging native AWS services for cost-effectiveness and integration.

### Implementation Details

**Request Validation Layer**:

**OpenAPI Schema Validation**:
- JSON Schema validation for all POST/PUT request bodies
- Query parameter validation for GET requests
- Header validation for required headers
- Response validation for consistent API contracts

**Validation Configuration**:
```yaml
# Example OpenAPI validation
paths:
  /api/projects:
    post:
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [name, description]
              properties:
                name:
                  type: string
                  minLength: 1
                  maxLength: 100
                  pattern: '^[a-zA-Z0-9\s\-_]+$'
                description:
                  type: string
                  maxLength: 500
              additionalProperties: false
      parameters:
        - name: correlationId
          in: header
          required: true
          schema:
            type: string
            format: uuid
```

**AWS WAF Integration**:

**Core Protection Rules**:
- **AWSManagedRulesCommonRuleSet**: Protection against OWASP Top 10
- **AWSManagedRulesKnownBadInputsRuleSet**: Known malicious patterns
- **AWSManagedRulesSQLiRuleSet**: SQL injection protection
- **AWSManagedRulesLinuxRuleSet**: Linux-specific attacks
- **AWSManagedRulesUnixRuleSet**: Unix-specific attacks

**Custom Rules**:
```json
{
  "Name": "RateLimitRule",
  "Priority": 1,
  "Statement": {
    "RateBasedStatement": {
      "Limit": 2000,
      "AggregateKeyType": "IP"
    }
  },
  "Action": {
    "Block": {}
  }
}
```

**Geographic Restrictions** (if needed):
- Block/allow specific countries
- Custom handling for VPN traffic

**Request Size Limits**:
- Maximum request body size: 1MB
- Maximum header size: 8KB
- URL length restrictions

### Error Handling and Responses

**Validation Errors**:
```json
{
  "error": "ValidationError",
  "message": "Request validation failed",
  "details": [
    {
      "field": "name",
      "code": "PATTERN_MISMATCH",
      "message": "Name contains invalid characters"
    }
  ],
  "correlationId": "uuid"
}
```

**WAF Block Response**:
- Custom error page for blocked requests
- Generic error message (no attack details)
- Logging of block reasons for analysis

### Monitoring and Observability

**CloudWatch Metrics**:
- Request validation failures by endpoint
- WAF rule match counts
- Block vs allow ratios
- Geographic request patterns

**Logging Strategy**:
- WAF logs to S3 for analysis
- Validation errors to CloudWatch
- Integration with security monitoring dashboard

**Alerting**:
- High rate of blocked requests
- New attack patterns detected
- Validation error spikes

### Consequences

**Good**:
* **Early attack prevention**: Malicious requests blocked at API Gateway
* **Reduced backend load**: Invalid requests never reach Lambda/Step Functions
* **Cost optimization**: Prevent expensive processing of attack traffic
* **Comprehensive protection**: Combined validation and WAF covers multiple attack vectors
* **Native AWS integration**: Seamless integration with existing infrastructure
* **Detailed monitoring**: Rich metrics and logging for security analysis
* **Performance**: Minimal latency impact on valid requests

**Bad**:
* **False positives**: Legitimate requests may be blocked by WAF rules
* **Maintenance overhead**: Need to maintain OpenAPI schemas and WAF rules
* **Cost**: Additional charges for WAF requests and rule evaluations
* **Complexity**: Multiple layers of security configuration
* **Debugging**: More complex troubleshooting when requests are blocked

## Configuration Management

**Environment-Specific Rules**:
- Development: Relaxed rules for testing
- Staging: Production-like rules for validation
- Production: Full protection with strict rules

**Rule Updates**:
- Version control for WAF rule configurations
- Automated deployment via SAM templates
- Testing of rule changes in non-production environments

**Schema Evolution**:
- Backward-compatible schema changes only
- Version negotiation for API changes
- Graceful handling of schema mismatches

## Implementation Guidelines

1. **Schema Design**: Strict but user-friendly validation rules
2. **Error Messages**: Clear, actionable error messages for developers
3. **WAF Tuning**: Regular review and tuning of WAF rules
4. **Testing**: Comprehensive testing of both validation and WAF rules
5. **Documentation**: Clear API documentation with validation requirements

## Security Considerations

**Input Sanitization**:
- Validation at API Gateway level
- Additional sanitization in Step Functions if needed
- No raw user input passed to backend services

**Attack Surface Reduction**:
- Only expose necessary API endpoints
- Use specific HTTP methods per endpoint
- Implement proper CORS policies

**Incident Response**:
- Automated alerting for attack patterns
- Runbooks for security incident response
- Integration with ErrorBus for security events

## Performance Impact

**Request Validation**:
- ~10-20ms additional latency
- No impact on successful requests
- Early termination for invalid requests

**WAF Processing**:
- ~1-5ms additional latency
- Parallel processing with request routing
- Minimal impact on user experience

## More Information

* [AWS WAF Documentation](https://docs.aws.amazon.com/waf/)
* [API Gateway Request Validation](https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-method-request-validation.html)
* [OpenAPI 3.0 Specification](https://swagger.io/specification/)
* Related ADRs: ADR-0017 (Security Monitoring), ADR-0010 (Error Bus)