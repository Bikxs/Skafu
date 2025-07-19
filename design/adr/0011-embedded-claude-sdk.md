# ADR-0011: Embedded Claude SDK Integration

**Status**: 🟢 Accepted  
**Date**: 2025-01-18  
**Deciders**: Development Team

## Context and Problem Statement

We need to integrate AI capabilities for intelligent project analysis, code generation, and architectural recommendations throughout our microservices scaffolding application while maintaining security, performance, and cost efficiency.

## Decision Drivers

* Need for AI-powered project analysis and recommendations
* Intelligent code generation based on project requirements
* Architectural guidance and best practices enforcement
* Security and privacy of user data and generated code
* Cost control for AI service usage
* Integration with existing serverless architecture
* Flexibility to upgrade AI capabilities over time

## Considered Options

* **Option 1**: Centralized AI service that all microservices call
* **Option 2**: Embedded Claude SDK in each microservice that needs AI
* **Option 3**: Third-party AI service integration (OpenAI, etc.)
* **Option 4**: Custom AI model deployment on AWS
* **Option 5**: Hybrid approach with both centralized and embedded AI

## Decision Outcome

Chosen option: **"Embedded Claude SDK in each microservice that needs AI"**, because it provides the best balance of performance, security, flexibility, and cost control while avoiding the complexity of managing a centralized AI service.

### Implementation Details

**SDK Integration Pattern**:
```python
# Shared Lambda layer for Claude SDK
# layers/claude-sdk/python/claude_client.py
import anthropic
import boto3
import json
import logging
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)

class ClaudeClient:
    def __init__(self):
        self.secrets_client = boto3.client('secretsmanager')
        self._client = None
        self._api_key = None
    
    @property
    def client(self):
        """Lazy initialization of Claude client"""
        if self._client is None:
            if self._api_key is None:
                self._api_key = self._get_api_key()
            self._client = anthropic.Anthropic(api_key=self._api_key)
        return self._client
    
    def _get_api_key(self) -> str:
        """Get Claude API key from Secrets Manager"""
        try:
            response = self.secrets_client.get_secret_value(
                SecretId='/prod/claude-sdk/api-key/anthropic-key'
            )
            secret = json.loads(response['SecretString'])
            return secret['apiKey']
        except Exception as e:
            logger.error(f"Failed to get Claude API key: {e}")
            raise
    
    def analyze_project_requirements(
        self, 
        requirements: str, 
        context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Analyze project requirements and suggest architecture"""
        prompt = f"""
        Analyze the following project requirements and provide architectural recommendations:
        
        Requirements: {requirements}
        Context: {json.dumps(context, indent=2)}
        
        Please provide:
        1. Suggested microservices boundaries
        2. Data models and relationships
        3. API design recommendations
        4. Technology stack suggestions
        5. Security considerations
        6. Performance optimization opportunities
        
        Respond in JSON format with structured recommendations.
        """
        
        try:
            response = self.client.messages.create(
                model="claude-3-sonnet-20240229",
                max_tokens=4000,
                temperature=0.3,
                messages=[
                    {
                        "role": "user",
                        "content": prompt
                    }
                ]
            )
            
            # Parse and structure the response
            recommendations = self._parse_recommendations(response.content[0].text)
            
            # Log for observability
            logger.info(f"Generated recommendations for project analysis", extra={
                'recommendations_count': len(recommendations),
                'context': context
            })
            
            return recommendations
            
        except Exception as e:
            logger.error(f"Failed to analyze project requirements: {e}")
            raise
    
    def generate_service_code(
        self, 
        service_spec: Dict[str, Any], 
        template_context: Dict[str, Any]
    ) -> Dict[str, str]:
        """Generate code for a specific service"""
        prompt = f"""
        Generate code for a microservice based on the following specification:
        
        Service Specification: {json.dumps(service_spec, indent=2)}
        Template Context: {json.dumps(template_context, indent=2)}
        
        Please generate:
        1. Lambda function handlers
        2. Data models and schemas
        3. API endpoint implementations
        4. Unit tests
        5. SAM template configuration
        
        Follow AWS serverless best practices and include proper error handling.
        """
        
        try:
            response = self.client.messages.create(
                model="claude-3-sonnet-20240229",
                max_tokens=6000,
                temperature=0.1,
                messages=[
                    {
                        "role": "user",
                        "content": prompt
                    }
                ]
            )
            
            # Parse generated code files
            code_files = self._parse_code_files(response.content[0].text)
            
            logger.info(f"Generated code for service", extra={
                'service_name': service_spec.get('name'),
                'file_count': len(code_files)
            })
            
            return code_files
            
        except Exception as e:
            logger.error(f"Failed to generate service code: {e}")
            raise
    
    def review_architecture(
        self, 
        architecture: Dict[str, Any], 
        requirements: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Review and provide feedback on architecture"""
        prompt = f"""
        Review the following architecture against the requirements and provide feedback:
        
        Architecture: {json.dumps(architecture, indent=2)}
        Requirements: {json.dumps(requirements, indent=2)}
        
        Please provide:
        1. Architecture strengths and weaknesses
        2. Potential issues and risks
        3. Improvement suggestions
        4. Compliance with best practices
        5. Scalability considerations
        
        Rate each aspect on a scale of 1-10 and provide specific recommendations.
        """
        
        try:
            response = self.client.messages.create(
                model="claude-3-sonnet-20240229",
                max_tokens=3000,
                temperature=0.2,
                messages=[
                    {
                        "role": "user",
                        "content": prompt
                    }
                ]
            )
            
            review = self._parse_architecture_review(response.content[0].text)
            
            logger.info("Generated architecture review", extra={
                'overall_score': review.get('overall_score'),
                'recommendation_count': len(review.get('recommendations', []))
            })
            
            return review
            
        except Exception as e:
            logger.error(f"Failed to review architecture: {e}")
            raise
    
    def _parse_recommendations(self, response_text: str) -> Dict[str, Any]:
        """Parse Claude response into structured recommendations"""
        # Implementation to parse and structure Claude's response
        # This would include JSON parsing and validation
        pass
    
    def _parse_code_files(self, response_text: str) -> Dict[str, str]:
        """Parse generated code into separate files"""
        # Implementation to extract code files from response
        pass
    
    def _parse_architecture_review(self, response_text: str) -> Dict[str, Any]:
        """Parse architecture review into structured format"""
        # Implementation to parse review into structured format
        pass

# Usage in Lambda functions
claude_client = ClaudeClient()

def lambda_handler(event, context):
    """Lambda handler with Claude integration"""
    try:
        requirements = event.get('requirements', '')
        project_context = event.get('context', {})
        
        # Analyze requirements using Claude
        recommendations = claude_client.analyze_project_requirements(
            requirements=requirements,
            context=project_context
        )
        
        # Store recommendations in DynamoDB
        store_recommendations(recommendations)
        
        # Publish analysis completed event
        publish_analysis_event(recommendations)
        
        return {
            'statusCode': 200,
            'body': json.dumps({
                'status': 'completed',
                'recommendations': recommendations
            })
        }
        
    except Exception as e:
        logger.error(f"Error in AI analysis: {e}")
        raise
```

**Step Functions Integration**:
```json
{
  "Comment": "Project Creation with AI Analysis",
  "StartAt": "CreateProject",
  "States": {
    "CreateProject": {
      "Type": "Task",
      "Resource": "arn:aws:states:::lambda:invoke",
      "Parameters": {
        "FunctionName": "create-project"
      },
      "Next": "RequestAIAnalysis"
    },
    "RequestAIAnalysis": {
      "Type": "Task",
      "Resource": "arn:aws:states:::lambda:invoke",
      "Parameters": {
        "FunctionName": "ai-project-analysis",
        "Payload": {
          "requirements.$": "$.requirements",
          "context.$": "$.context",
          "projectId.$": "$.projectId"
        }
      },
      "TimeoutSeconds": 300,
      "Retry": [
        {
          "ErrorEquals": ["States.TaskFailed"],
          "IntervalSeconds": 30,
          "MaxAttempts": 2,
          "BackoffRate": 2.0
        }
      ],
      "Catch": [
        {
          "ErrorEquals": ["States.ALL"],
          "Next": "AIAnalysisFailure",
          "ResultPath": "$.error"
        }
      ],
      "Next": "ProcessRecommendations"
    },
    "ProcessRecommendations": {
      "Type": "Task",
      "Resource": "arn:aws:states:::lambda:invoke",
      "Parameters": {
        "FunctionName": "process-ai-recommendations"
      },
      "End": true
    },
    "AIAnalysisFailure": {
      "Type": "Task",
      "Resource": "arn:aws:states:::events:putEvents",
      "Parameters": {
        "Entries": [
          {
            "EventBusName": "skafu-error-bus",
            "Source": "ai-integration",
            "DetailType": "AIAnalysisFailure",
            "Detail": {
              "error.$": "$.error",
              "projectId.$": "$.projectId"
            }
          }
        ]
      },
      "End": true
    }
  }
}
```

**Cost Management**:
```python
# Cost tracking and limits
class CostTracker:
    def __init__(self):
        self.dynamodb = boto3.resource('dynamodb')
        self.table = self.dynamodb.Table('AIUsageTracking')
    
    def track_usage(self, operation: str, tokens_used: int, cost: float):
        """Track AI usage for cost monitoring"""
        self.table.put_item(
            Item={
                'date': datetime.now().strftime('%Y-%m-%d'),
                'operation': operation,
                'tokens_used': tokens_used,
                'cost': cost,
                'timestamp': datetime.now().isoformat()
            }
        )
    
    def check_daily_limit(self, operation: str) -> bool:
        """Check if daily usage limit is exceeded"""
        today = datetime.now().strftime('%Y-%m-%d')
        
        response = self.table.query(
            KeyConditionExpression='date = :date',
            FilterExpression='operation = :op',
            ExpressionAttributeValues={
                ':date': today,
                ':op': operation
            }
        )
        
        total_cost = sum(item['cost'] for item in response['Items'])
        daily_limit = float(os.environ.get('DAILY_AI_LIMIT', '100.0'))
        
        return total_cost < daily_limit

# Usage in Claude client
cost_tracker = CostTracker()

def analyze_with_cost_tracking(self, requirements: str, context: Dict[str, Any]):
    """Analyze requirements with cost tracking"""
    if not cost_tracker.check_daily_limit('project_analysis'):
        raise Exception("Daily AI usage limit exceeded")
    
    # Make API call and track usage
    response = self.client.messages.create(...)
    
    # Track usage
    cost_tracker.track_usage(
        operation='project_analysis',
        tokens_used=response.usage.output_tokens,
        cost=calculate_cost(response.usage.output_tokens)
    )
```

### Security Implementation

**Data Privacy**:
```python
class DataSanitizer:
    @staticmethod
    def sanitize_for_ai(data: Dict[str, Any]) -> Dict[str, Any]:
        """Remove sensitive data before sending to AI"""
        sanitized = data.copy()
        
        # Remove PII and sensitive fields
        sensitive_fields = ['email', 'phone', 'ssn', 'password', 'token']
        for field in sensitive_fields:
            if field in sanitized:
                sanitized[field] = '[REDACTED]'
        
        # Remove AWS account info
        if 'accountId' in sanitized:
            sanitized['accountId'] = '[REDACTED]'
        
        return sanitized
    
    @staticmethod
    def validate_ai_output(output: str) -> str:
        """Validate AI output for security issues"""
        # Check for potential security issues in generated code
        security_patterns = [
            r'password\s*=\s*["\'][^"\']+["\']',
            r'secret\s*=\s*["\'][^"\']+["\']',
            r'api_key\s*=\s*["\'][^"\']+["\']'
        ]
        
        for pattern in security_patterns:
            if re.search(pattern, output, re.IGNORECASE):
                raise SecurityError("AI output contains potential security issue")
        
        return output
```

**Rate Limiting**:
```python
class RateLimiter:
    def __init__(self):
        self.redis_client = redis.Redis(host=os.environ['REDIS_HOST'])
    
    def check_rate_limit(self, user_id: str, operation: str) -> bool:
        """Check if user has exceeded rate limit"""
        key = f"rate_limit:{user_id}:{operation}"
        current = self.redis_client.get(key)
        
        if current is None:
            self.redis_client.setex(key, 3600, 1)  # 1 hour expiry
            return True
        
        if int(current) >= 10:  # 10 requests per hour
            return False
        
        self.redis_client.incr(key)
        return True
```

### Integration Points

**With Project Management Domain**:
```python
# AI analysis integration
def handle_project_created(event, context):
    """Handle ProjectCreated event with AI analysis"""
    project_data = event['detail']
    
    # Trigger AI analysis
    ai_analysis = claude_client.analyze_project_requirements(
        requirements=project_data['description'],
        context={
            'projectId': project_data['projectId'],
            'templateId': project_data['templateId'],
            'configuration': project_data['configuration']
        }
    )
    
    # Store analysis results
    store_ai_analysis(project_data['projectId'], ai_analysis)
    
    # Publish analysis completed event
    publish_event('AIAnalysisCompleted', {
        'projectId': project_data['projectId'],
        'recommendations': ai_analysis['recommendations'],
        'confidence': ai_analysis['confidence']
    })
```

**With Template Management Domain**:
```python
# Template optimization with AI
def optimize_template_with_ai(template_id: str, usage_data: Dict[str, Any]):
    """Use AI to optimize template based on usage patterns"""
    optimization_suggestions = claude_client.analyze_template_usage(
        template_id=template_id,
        usage_patterns=usage_data
    )
    
    return optimization_suggestions
```

### Consequences

**Good**:
* **Flexibility**: Each service can use AI independently without dependencies
* **Performance**: No network calls to centralized AI service
* **Security**: Better data isolation and privacy control
* **Scalability**: AI usage scales with individual service load
* **Cost Control**: Fine-grained cost tracking and limiting per service
* **Reliability**: No single point of failure for AI capabilities
* **Customization**: Each service can customize AI interactions

**Bad**:
* **Duplication**: SDK code duplicated across services
* **Consistency**: Different services might use AI differently
* **Management**: Harder to manage AI usage across all services
* **Updates**: Need to update SDK in multiple places
* **Monitoring**: Distributed monitoring of AI usage
* **Cost Tracking**: More complex cost aggregation

## Performance Considerations

**Caching Strategy**:
```python
class AIResponseCache:
    def __init__(self):
        self.cache = {}
        self.ttl = 3600  # 1 hour
    
    def get_cached_response(self, prompt_hash: str) -> Optional[Dict[str, Any]]:
        """Get cached AI response if available"""
        if prompt_hash in self.cache:
            cached_item = self.cache[prompt_hash]
            if datetime.now() - cached_item['timestamp'] < timedelta(seconds=self.ttl):
                return cached_item['response']
        return None
    
    def cache_response(self, prompt_hash: str, response: Dict[str, Any]):
        """Cache AI response"""
        self.cache[prompt_hash] = {
            'response': response,
            'timestamp': datetime.now()
        }
```

**Timeout and Retry Logic**:
```python
def ai_request_with_retry(self, prompt: str, max_retries: int = 3):
    """Make AI request with retry logic"""
    for attempt in range(max_retries):
        try:
            response = self.client.messages.create(
                model="claude-3-sonnet-20240229",
                max_tokens=4000,
                timeout=30,  # 30 second timeout
                messages=[{"role": "user", "content": prompt}]
            )
            return response
        except Exception as e:
            if attempt == max_retries - 1:
                raise
            time.sleep(2 ** attempt)  # Exponential backoff
```

## Implementation Guidelines

1. **Security First**: Always sanitize data before sending to AI
2. **Cost Control**: Implement usage tracking and limits
3. **Error Handling**: Robust error handling for AI service failures
4. **Caching**: Cache responses to reduce costs and improve performance
5. **Monitoring**: Comprehensive monitoring of AI usage and performance

## More Information

* [Anthropic Claude API Documentation](https://docs.anthropic.com/claude/reference/)
* [AWS Lambda Layers](https://docs.aws.amazon.com/lambda/latest/dg/configuration-layers.html)
* [AI Safety Best Practices](https://docs.anthropic.com/claude/docs/safety-best-practices)
* Related ADRs: ADR-0016 (Secrets Manager), ADR-0010 (Error Bus)