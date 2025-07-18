# AI Integration Domain Design

## Domain Overview

The AI Integration domain provides intelligent analysis, code generation, and architectural recommendations through Claude SDK integration. This domain handles AI-powered project analysis, template optimization, code generation, and architectural guidance across the Skafu platform.

## Business Context

### Domain Purpose
- **Project Analysis**: Analyze project requirements and provide architectural recommendations
- **Code Generation**: Generate code snippets and configurations based on project needs
- **Template Optimization**: Suggest improvements to existing templates
- **Architecture Guidance**: Provide best practices and architectural patterns
- **Cost Optimization**: Recommend cost-effective solutions and configurations

### Key Business Rules
1. **Usage Limits**: AI operations are subject to daily usage limits per user/organization
2. **Cost Control**: All AI operations must be tracked for cost management
3. **Security**: Sensitive information must be sanitized before AI processing
4. **Quality Assurance**: AI outputs must be validated for security and quality
5. **Caching**: Common requests should be cached to reduce costs and improve performance

## Domain Model

### Aggregates and Entities

#### AI Analysis Aggregate
```python
class AIAnalysis:
    def __init__(self, analysis_id: str, project_id: str, analysis_type: str):
        self.id = analysis_id
        self.project_id = project_id
        self.analysis_type = analysis_type  # 'requirements', 'architecture', 'optimization'
        self.status = AnalysisStatus.PENDING
        self.input_data = {}
        self.output_data = {}
        self.recommendations = []
        self.confidence_score = 0.0
        self.tokens_used = 0
        self.cost = 0.0
        self.created_at = datetime.utcnow()
        self.completed_at = None
        self.events = []
    
    def start_analysis(self, input_data: Dict[str, Any]) -> None:
        """Start AI analysis with input data"""
        if self.status != AnalysisStatus.PENDING:
            raise AnalysisAlreadyStartedError("Analysis already started")
        
        # Sanitize input data
        self.input_data = self._sanitize_input_data(input_data)
        self.status = AnalysisStatus.IN_PROGRESS
        
        self._add_event(AIAnalysisStarted(self.id, self.project_id, self.analysis_type))
    
    def complete_analysis(self, output_data: Dict[str, Any], tokens_used: int, cost: float) -> None:
        """Complete AI analysis with results"""
        if self.status != AnalysisStatus.IN_PROGRESS:
            raise AnalysisNotInProgressError("Analysis not in progress")
        
        self.output_data = output_data
        self.recommendations = self._extract_recommendations(output_data)
        self.confidence_score = self._calculate_confidence_score(output_data)
        self.tokens_used = tokens_used
        self.cost = cost
        self.status = AnalysisStatus.COMPLETED
        self.completed_at = datetime.utcnow()
        
        self._add_event(AIAnalysisCompleted(
            self.id, 
            self.project_id, 
            self.analysis_type,
            self.recommendations,
            self.confidence_score
        ))
    
    def fail_analysis(self, error_message: str) -> None:
        """Mark analysis as failed"""
        if self.status != AnalysisStatus.IN_PROGRESS:
            raise AnalysisNotInProgressError("Analysis not in progress")
        
        self.status = AnalysisStatus.FAILED
        self.completed_at = datetime.utcnow()
        
        self._add_event(AIAnalysisFailed(self.id, self.project_id, error_message))
    
    def _sanitize_input_data(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """Sanitize input data to remove sensitive information"""
        sanitizer = DataSanitizer()
        return sanitizer.sanitize(input_data)
    
    def _extract_recommendations(self, output_data: Dict[str, Any]) -> List[Recommendation]:
        """Extract recommendations from AI output"""
        recommendations = []
        
        if 'recommendations' in output_data:
            for rec_data in output_data['recommendations']:
                recommendation = Recommendation(
                    rec_data.get('title', 'Unnamed Recommendation'),
                    rec_data.get('description', ''),
                    rec_data.get('priority', 'medium'),
                    rec_data.get('category', 'general'),
                    rec_data.get('impact', 'unknown')
                )
                recommendations.append(recommendation)
        
        return recommendations
    
    def _calculate_confidence_score(self, output_data: Dict[str, Any]) -> float:
        """Calculate confidence score from AI output"""
        # This would implement logic to determine confidence based on AI response
        return output_data.get('confidence', 0.7)
    
    def _add_event(self, event: DomainEvent) -> None:
        """Add domain event"""
        self.events.append(event)

class CodeGeneration:
    def __init__(self, generation_id: str, project_id: str, generation_type: str):
        self.id = generation_id
        self.project_id = project_id
        self.generation_type = generation_type  # 'service', 'config', 'tests'
        self.status = GenerationStatus.PENDING
        self.specification = {}
        self.generated_code = {}
        self.validation_results = []
        self.tokens_used = 0
        self.cost = 0.0
        self.created_at = datetime.utcnow()
        self.completed_at = None
        self.events = []
    
    def start_generation(self, specification: Dict[str, Any]) -> None:
        """Start code generation with specification"""
        if self.status != GenerationStatus.PENDING:
            raise GenerationAlreadyStartedError("Code generation already started")
        
        self.specification = specification
        self.status = GenerationStatus.IN_PROGRESS
        
        self._add_event(CodeGenerationStarted(self.id, self.project_id, self.generation_type))
    
    def complete_generation(self, generated_code: Dict[str, str], tokens_used: int, cost: float) -> None:
        """Complete code generation with results"""
        if self.status != GenerationStatus.IN_PROGRESS:
            raise GenerationNotInProgressError("Code generation not in progress")
        
        # Validate generated code
        self.validation_results = self._validate_generated_code(generated_code)
        
        if all(result.is_valid for result in self.validation_results):
            self.generated_code = generated_code
            self.status = GenerationStatus.COMPLETED
        else:
            self.status = GenerationStatus.FAILED
        
        self.tokens_used = tokens_used
        self.cost = cost
        self.completed_at = datetime.utcnow()
        
        if self.status == GenerationStatus.COMPLETED:
            self._add_event(CodeGenerationCompleted(
                self.id, 
                self.project_id, 
                self.generation_type,
                list(generated_code.keys())
            ))
        else:
            self._add_event(CodeGenerationFailed(
                self.id, 
                self.project_id, 
                [result.error for result in self.validation_results if not result.is_valid]
            ))
    
    def _validate_generated_code(self, generated_code: Dict[str, str]) -> List[ValidationResult]:
        """Validate generated code for security and quality"""
        validator = CodeValidator()
        return [validator.validate(filename, code) for filename, code in generated_code.items()]
    
    def _add_event(self, event: DomainEvent) -> None:
        """Add domain event"""
        self.events.append(event)

class AnalysisStatus(Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"

class GenerationStatus(Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"
```

### Value Objects

```python
class Recommendation:
    def __init__(self, title: str, description: str, priority: str, category: str, impact: str):
        self.title = title
        self.description = description
        self.priority = priority  # 'high', 'medium', 'low'
        self.category = category  # 'security', 'performance', 'architecture', 'cost'
        self.impact = impact  # 'high', 'medium', 'low'
        self.implementation_effort = None
        self.estimated_cost_savings = None
        self.technical_details = {}
    
    def __eq__(self, other):
        if not isinstance(other, Recommendation):
            return False
        return (self.title == other.title and 
                self.description == other.description and 
                self.category == other.category)

class ValidationResult:
    def __init__(self, is_valid: bool, error: str = None):
        self.is_valid = is_valid
        self.error = error

class UsageMetrics:
    def __init__(self):
        self.total_tokens = 0
        self.total_cost = 0.0
        self.total_requests = 0
        self.successful_requests = 0
        self.failed_requests = 0
        self.average_response_time = 0.0
        self.last_reset = datetime.utcnow()
```

## Domain Services

### Claude Client Service

```python
class ClaudeClientService:
    def __init__(self):
        self.secrets_client = boto3.client('secretsmanager')
        self._client = None
        self._api_key = None
        self.usage_tracker = UsageTracker()
        self.cache = ResponseCache()
    
    @property
    def client(self):
        """Lazy initialization of Claude client"""
        if self._client is None:
            if self._api_key is None:
                self._api_key = self._get_api_key()
            self._client = anthropic.Anthropic(api_key=self._api_key)
        return self._client
    
    def analyze_project_requirements(self, requirements: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze project requirements and provide architectural recommendations"""
        # Check usage limits
        if not self.usage_tracker.check_daily_limit('project_analysis'):
            raise UsageLimitExceededError("Daily usage limit exceeded for project analysis")
        
        # Check cache
        cache_key = self._generate_cache_key('project_analysis', requirements, context)
        cached_result = self.cache.get(cache_key)
        if cached_result:
            return cached_result
        
        prompt = self._build_requirements_analysis_prompt(requirements, context)
        
        try:
            start_time = time.time()
            response = self.client.messages.create(
                model="claude-3-sonnet-20240229",
                max_tokens=4000,
                temperature=0.3,
                messages=[{"role": "user", "content": prompt}]
            )
            
            response_time = time.time() - start_time
            
            # Parse response
            analysis_result = self._parse_requirements_analysis(response.content[0].text)
            
            # Track usage
            self.usage_tracker.track_usage(
                'project_analysis',
                response.usage.output_tokens,
                self._calculate_cost(response.usage.output_tokens),
                response_time
            )
            
            # Cache result
            self.cache.set(cache_key, analysis_result, ttl=3600)
            
            return analysis_result
            
        except Exception as e:
            self.usage_tracker.track_failure('project_analysis')
            raise AIServiceError(f"Failed to analyze project requirements: {e}")
    
    def generate_service_code(self, service_spec: Dict[str, Any], template_context: Dict[str, Any]) -> Dict[str, str]:
        """Generate code for a specific service"""
        # Check usage limits
        if not self.usage_tracker.check_daily_limit('code_generation'):
            raise UsageLimitExceededError("Daily usage limit exceeded for code generation")
        
        # Check cache
        cache_key = self._generate_cache_key('code_generation', service_spec, template_context)
        cached_result = self.cache.get(cache_key)
        if cached_result:
            return cached_result
        
        prompt = self._build_code_generation_prompt(service_spec, template_context)
        
        try:
            start_time = time.time()
            response = self.client.messages.create(
                model="claude-3-sonnet-20240229",
                max_tokens=6000,
                temperature=0.1,
                messages=[{"role": "user", "content": prompt}]
            )
            
            response_time = time.time() - start_time
            
            # Parse generated code
            generated_code = self._parse_generated_code(response.content[0].text)
            
            # Track usage
            self.usage_tracker.track_usage(
                'code_generation',
                response.usage.output_tokens,
                self._calculate_cost(response.usage.output_tokens),
                response_time
            )
            
            # Cache result
            self.cache.set(cache_key, generated_code, ttl=1800)
            
            return generated_code
            
        except Exception as e:
            self.usage_tracker.track_failure('code_generation')
            raise AIServiceError(f"Failed to generate service code: {e}")
    
    def review_architecture(self, architecture: Dict[str, Any], requirements: Dict[str, Any]) -> Dict[str, Any]:
        """Review architecture and provide feedback"""
        # Check usage limits
        if not self.usage_tracker.check_daily_limit('architecture_review'):
            raise UsageLimitExceededError("Daily usage limit exceeded for architecture review")
        
        # Check cache
        cache_key = self._generate_cache_key('architecture_review', architecture, requirements)
        cached_result = self.cache.get(cache_key)
        if cached_result:
            return cached_result
        
        prompt = self._build_architecture_review_prompt(architecture, requirements)
        
        try:
            start_time = time.time()
            response = self.client.messages.create(
                model="claude-3-sonnet-20240229",
                max_tokens=3000,
                temperature=0.2,
                messages=[{"role": "user", "content": prompt}]
            )
            
            response_time = time.time() - start_time
            
            # Parse review
            review_result = self._parse_architecture_review(response.content[0].text)
            
            # Track usage
            self.usage_tracker.track_usage(
                'architecture_review',
                response.usage.output_tokens,
                self._calculate_cost(response.usage.output_tokens),
                response_time
            )
            
            # Cache result
            self.cache.set(cache_key, review_result, ttl=3600)
            
            return review_result
            
        except Exception as e:
            self.usage_tracker.track_failure('architecture_review')
            raise AIServiceError(f"Failed to review architecture: {e}")
    
    def _get_api_key(self) -> str:
        """Get Claude API key from Secrets Manager"""
        try:
            response = self.secrets_client.get_secret_value(
                SecretId='/prod/claude-sdk/api-key/anthropic-key'
            )
            secret = json.loads(response['SecretString'])
            return secret['apiKey']
        except Exception as e:
            raise AIServiceError(f"Failed to get Claude API key: {e}")
    
    def _build_requirements_analysis_prompt(self, requirements: str, context: Dict[str, Any]) -> str:
        """Build prompt for requirements analysis"""
        return f"""
        Analyze the following project requirements and provide architectural recommendations:
        
        Requirements: {requirements}
        Context: {json.dumps(context, indent=2)}
        
        Please provide a comprehensive analysis including:
        1. Suggested microservices boundaries and responsibilities
        2. Data models and relationships
        3. API design recommendations
        4. Technology stack suggestions
        5. Security considerations
        6. Performance optimization opportunities
        7. Cost optimization recommendations
        8. Deployment and scaling strategies
        
        Respond in JSON format with the following structure:
        {{
            "confidence": 0.85,
            "microservices": [
                {{
                    "name": "service-name",
                    "responsibilities": ["responsibility1", "responsibility2"],
                    "data_models": ["model1", "model2"],
                    "apis": ["api1", "api2"]
                }}
            ],
            "recommendations": [
                {{
                    "title": "recommendation title",
                    "description": "detailed description",
                    "priority": "high|medium|low",
                    "category": "security|performance|architecture|cost",
                    "impact": "high|medium|low"
                }}
            ],
            "technology_stack": {{
                "runtime": "python3.9",
                "database": "dynamodb",
                "messaging": "eventbridge",
                "caching": "redis"
            }},
            "estimated_cost": {{
                "monthly_cost": 500,
                "cost_breakdown": {{"compute": 300, "storage": 100, "networking": 100}}
            }}
        }}
        """
    
    def _build_code_generation_prompt(self, service_spec: Dict[str, Any], template_context: Dict[str, Any]) -> str:
        """Build prompt for code generation"""
        return f"""
        Generate code for a microservice based on the following specification:
        
        Service Specification: {json.dumps(service_spec, indent=2)}
        Template Context: {json.dumps(template_context, indent=2)}
        
        Please generate:
        1. Lambda function handlers with proper error handling
        2. Data models and schemas with validation
        3. API endpoint implementations following REST conventions
        4. Unit tests with good coverage
        5. SAM template configuration
        6. Requirements/dependencies file
        
        Follow these guidelines:
        - Use AWS serverless best practices
        - Implement proper error handling and logging
        - Include input validation and security measures
        - Follow the existing project structure and conventions
        - Add appropriate documentation and comments
        
        Return the generated code in the following format:
        ```
        FILE: filename.py
        ```
        [file content]
        ```
        
        FILE: requirements.txt
        ```
        [file content]
        ```
        """
    
    def _build_architecture_review_prompt(self, architecture: Dict[str, Any], requirements: Dict[str, Any]) -> str:
        """Build prompt for architecture review"""
        return f"""
        Review the following architecture against the requirements and provide feedback:
        
        Architecture: {json.dumps(architecture, indent=2)}
        Requirements: {json.dumps(requirements, indent=2)}
        
        Please provide:
        1. Overall architecture assessment (strengths and weaknesses)
        2. Potential issues and risks
        3. Improvement suggestions with priorities
        4. Compliance with best practices
        5. Scalability and performance considerations
        6. Security assessment
        7. Cost optimization opportunities
        
        Rate each aspect on a scale of 1-10 and provide specific recommendations.
        
        Respond in JSON format with the following structure:
        {{
            "overall_score": 8.5,
            "assessment": {{
                "strengths": ["strength1", "strength2"],
                "weaknesses": ["weakness1", "weakness2"],
                "risks": ["risk1", "risk2"]
            }},
            "ratings": {{
                "scalability": 8,
                "performance": 7,
                "security": 9,
                "maintainability": 8,
                "cost_efficiency": 7
            }},
            "recommendations": [
                {{
                    "title": "recommendation title",
                    "description": "detailed description",
                    "priority": "high|medium|low",
                    "category": "security|performance|architecture|cost",
                    "impact": "high|medium|low"
                }}
            ]
        }}
        """
    
    def _parse_requirements_analysis(self, response_text: str) -> Dict[str, Any]:
        """Parse requirements analysis response"""
        try:
            # Extract JSON from response
            json_match = re.search(r'```json\s*({.*?})\s*```', response_text, re.DOTALL)
            if json_match:
                return json.loads(json_match.group(1))
            else:
                # Try to parse the entire response as JSON
                return json.loads(response_text)
        except Exception as e:
            raise AIServiceError(f"Failed to parse requirements analysis response: {e}")
    
    def _parse_generated_code(self, response_text: str) -> Dict[str, str]:
        """Parse generated code response"""
        files = {}
        
        # Extract files using regex
        file_pattern = r'FILE:\s*([^\n]+)\s*```[^\n]*\n(.*?)```'
        matches = re.findall(file_pattern, response_text, re.DOTALL)
        
        for filename, content in matches:
            files[filename.strip()] = content.strip()
        
        return files
    
    def _parse_architecture_review(self, response_text: str) -> Dict[str, Any]:
        """Parse architecture review response"""
        try:
            # Extract JSON from response
            json_match = re.search(r'```json\s*({.*?})\s*```', response_text, re.DOTALL)
            if json_match:
                return json.loads(json_match.group(1))
            else:
                # Try to parse the entire response as JSON
                return json.loads(response_text)
        except Exception as e:
            raise AIServiceError(f"Failed to parse architecture review response: {e}")
    
    def _calculate_cost(self, tokens: int) -> float:
        """Calculate cost based on token usage"""
        # Claude 3 Sonnet pricing: $3 per 1M input tokens, $15 per 1M output tokens
        return (tokens / 1000000) * 15.0
    
    def _generate_cache_key(self, operation: str, *args) -> str:
        """Generate cache key for operation"""
        key_data = f"{operation}:{json.dumps(args, sort_keys=True)}"
        return hashlib.md5(key_data.encode()).hexdigest()
```

### Data Sanitization Service

```python
class DataSanitizer:
    def __init__(self):
        self.sensitive_patterns = [
            r'password\s*=\s*["\'][^"\']+["\']',
            r'secret\s*=\s*["\'][^"\']+["\']',
            r'api_key\s*=\s*["\'][^"\']+["\']',
            r'token\s*=\s*["\'][^"\']+["\']',
            r'AKIA[0-9A-Z]{16}',  # AWS Access Key ID
            r'[0-9]{12}',  # AWS Account ID
            r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'  # Email
        ]
        
        self.sensitive_fields = [
            'password', 'secret', 'token', 'api_key', 'private_key',
            'access_key', 'secret_key', 'database_password', 'ssh_key',
            'certificate', 'email', 'phone', 'ssn', 'credit_card'
        ]
    
    def sanitize(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Sanitize data to remove sensitive information"""
        if isinstance(data, dict):
            return {key: self._sanitize_value(key, value) for key, value in data.items()}
        elif isinstance(data, list):
            return [self.sanitize(item) for item in data]
        else:
            return data
    
    def _sanitize_value(self, key: str, value: Any) -> Any:
        """Sanitize individual value"""
        if isinstance(value, str):
            # Check if key is sensitive
            if any(sensitive in key.lower() for sensitive in self.sensitive_fields):
                return '[REDACTED]'
            
            # Check for sensitive patterns
            for pattern in self.sensitive_patterns:
                if re.search(pattern, value, re.IGNORECASE):
                    return '[REDACTED]'
            
            return value
        elif isinstance(value, (dict, list)):
            return self.sanitize(value)
        else:
            return value
```

### Usage Tracking Service

```python
class UsageTracker:
    def __init__(self):
        self.dynamodb = boto3.resource('dynamodb')
        self.table = self.dynamodb.Table('AIUsageTracking')
        self.daily_limits = {
            'project_analysis': 100,
            'code_generation': 50,
            'architecture_review': 25
        }
    
    def track_usage(self, operation: str, tokens_used: int, cost: float, response_time: float) -> None:
        """Track AI usage for monitoring and billing"""
        today = datetime.now().strftime('%Y-%m-%d')
        
        try:
            self.table.put_item(
                Item={
                    'date': today,
                    'operation': operation,
                    'timestamp': datetime.now().isoformat(),
                    'tokens_used': tokens_used,
                    'cost': cost,
                    'response_time': response_time,
                    'status': 'success'
                }
            )
        except Exception as e:
            logger.error(f"Failed to track usage: {e}")
    
    def track_failure(self, operation: str) -> None:
        """Track failed AI operation"""
        today = datetime.now().strftime('%Y-%m-%d')
        
        try:
            self.table.put_item(
                Item={
                    'date': today,
                    'operation': operation,
                    'timestamp': datetime.now().isoformat(),
                    'tokens_used': 0,
                    'cost': 0.0,
                    'response_time': 0.0,
                    'status': 'failed'
                }
            )
        except Exception as e:
            logger.error(f"Failed to track failure: {e}")
    
    def check_daily_limit(self, operation: str) -> bool:
        """Check if daily usage limit is exceeded"""
        today = datetime.now().strftime('%Y-%m-%d')
        
        try:
            response = self.table.query(
                KeyConditionExpression='date = :date',
                FilterExpression='operation = :op',
                ExpressionAttributeValues={
                    ':date': today,
                    ':op': operation
                }
            )
            
            usage_count = len(response['Items'])
            limit = self.daily_limits.get(operation, 1000)
            
            return usage_count < limit
        except Exception as e:
            logger.error(f"Failed to check daily limit: {e}")
            return True  # Allow operation if check fails
    
    def get_usage_metrics(self, date_range: int = 30) -> Dict[str, Any]:
        """Get usage metrics for the specified date range"""
        end_date = datetime.now()
        start_date = end_date - timedelta(days=date_range)
        
        try:
            response = self.table.scan(
                FilterExpression='#date BETWEEN :start_date AND :end_date',
                ExpressionAttributeNames={
                    '#date': 'date'
                },
                ExpressionAttributeValues={
                    ':start_date': start_date.strftime('%Y-%m-%d'),
                    ':end_date': end_date.strftime('%Y-%m-%d')
                }
            )
            
            items = response['Items']
            
            # Calculate metrics
            total_tokens = sum(item.get('tokens_used', 0) for item in items)
            total_cost = sum(item.get('cost', 0.0) for item in items)
            total_requests = len(items)
            successful_requests = len([item for item in items if item.get('status') == 'success'])
            failed_requests = total_requests - successful_requests
            
            response_times = [item.get('response_time', 0.0) for item in items if item.get('status') == 'success']
            average_response_time = sum(response_times) / len(response_times) if response_times else 0.0
            
            return {
                'total_tokens': total_tokens,
                'total_cost': total_cost,
                'total_requests': total_requests,
                'successful_requests': successful_requests,
                'failed_requests': failed_requests,
                'success_rate': (successful_requests / total_requests) * 100 if total_requests > 0 else 0,
                'average_response_time': average_response_time,
                'date_range': date_range
            }
        except Exception as e:
            logger.error(f"Failed to get usage metrics: {e}")
            return {}
```

## Domain Events

### Event Definitions

```python
class AIAnalysisStarted(DomainEvent):
    def __init__(self, analysis_id: str, project_id: str, analysis_type: str):
        super().__init__()
        self.analysis_id = analysis_id
        self.project_id = project_id
        self.analysis_type = analysis_type

class AIAnalysisCompleted(DomainEvent):
    def __init__(self, analysis_id: str, project_id: str, analysis_type: str, 
                 recommendations: List[Recommendation], confidence_score: float):
        super().__init__()
        self.analysis_id = analysis_id
        self.project_id = project_id
        self.analysis_type = analysis_type
        self.recommendations = recommendations
        self.confidence_score = confidence_score

class AIAnalysisFailed(DomainEvent):
    def __init__(self, analysis_id: str, project_id: str, error_message: str):
        super().__init__()
        self.analysis_id = analysis_id
        self.project_id = project_id
        self.error_message = error_message

class CodeGenerationStarted(DomainEvent):
    def __init__(self, generation_id: str, project_id: str, generation_type: str):
        super().__init__()
        self.generation_id = generation_id
        self.project_id = project_id
        self.generation_type = generation_type

class CodeGenerationCompleted(DomainEvent):
    def __init__(self, generation_id: str, project_id: str, generation_type: str, 
                 generated_files: List[str]):
        super().__init__()
        self.generation_id = generation_id
        self.project_id = project_id
        self.generation_type = generation_type
        self.generated_files = generated_files

class CodeGenerationFailed(DomainEvent):
    def __init__(self, generation_id: str, project_id: str, errors: List[str]):
        super().__init__()
        self.generation_id = generation_id
        self.project_id = project_id
        self.errors = errors

class AIUsageLimitExceeded(DomainEvent):
    def __init__(self, operation: str, user_id: str, limit: int):
        super().__init__()
        self.operation = operation
        self.user_id = user_id
        self.limit = limit
```

## Application Services

### AI Integration Service

```python
class AIIntegrationService:
    def __init__(self, claude_client: ClaudeClientService, usage_tracker: UsageTracker):
        self.claude_client = claude_client
        self.usage_tracker = usage_tracker
    
    def analyze_project_requirements(self, project_id: str, requirements: str, 
                                   context: Dict[str, Any]) -> str:
        """Analyze project requirements and return analysis ID"""
        analysis_id = str(uuid.uuid4())
        
        # Create analysis aggregate
        analysis = AIAnalysis(analysis_id, project_id, 'requirements')
        analysis.start_analysis({
            'requirements': requirements,
            'context': context
        })
        
        try:
            # Call Claude API
            result = self.claude_client.analyze_project_requirements(requirements, context)
            
            # Complete analysis
            analysis.complete_analysis(
                result,
                result.get('tokens_used', 0),
                result.get('cost', 0.0)
            )
            
            # Store analysis
            self._store_analysis(analysis)
            
            return analysis_id
            
        except Exception as e:
            analysis.fail_analysis(str(e))
            self._store_analysis(analysis)
            raise
    
    def generate_service_code(self, project_id: str, service_spec: Dict[str, Any], 
                            template_context: Dict[str, Any]) -> str:
        """Generate service code and return generation ID"""
        generation_id = str(uuid.uuid4())
        
        # Create generation aggregate
        generation = CodeGeneration(generation_id, project_id, 'service')
        generation.start_generation({
            'service_spec': service_spec,
            'template_context': template_context
        })
        
        try:
            # Call Claude API
            result = self.claude_client.generate_service_code(service_spec, template_context)
            
            # Complete generation
            generation.complete_generation(
                result,
                result.get('tokens_used', 0),
                result.get('cost', 0.0)
            )
            
            # Store generation
            self._store_generation(generation)
            
            return generation_id
            
        except Exception as e:
            generation.fail_generation(str(e))
            self._store_generation(generation)
            raise
    
    def get_analysis_result(self, analysis_id: str) -> Dict[str, Any]:
        """Get analysis result by ID"""
        analysis = self._get_analysis(analysis_id)
        
        return {
            'id': analysis.id,
            'project_id': analysis.project_id,
            'analysis_type': analysis.analysis_type,
            'status': analysis.status.value,
            'recommendations': [self._recommendation_to_dict(rec) for rec in analysis.recommendations],
            'confidence_score': analysis.confidence_score,
            'created_at': analysis.created_at.isoformat(),
            'completed_at': analysis.completed_at.isoformat() if analysis.completed_at else None
        }
    
    def get_generation_result(self, generation_id: str) -> Dict[str, Any]:
        """Get code generation result by ID"""
        generation = self._get_generation(generation_id)
        
        return {
            'id': generation.id,
            'project_id': generation.project_id,
            'generation_type': generation.generation_type,
            'status': generation.status.value,
            'generated_code': generation.generated_code,
            'validation_results': [self._validation_result_to_dict(vr) for vr in generation.validation_results],
            'created_at': generation.created_at.isoformat(),
            'completed_at': generation.completed_at.isoformat() if generation.completed_at else None
        }
    
    def get_usage_metrics(self, date_range: int = 30) -> Dict[str, Any]:
        """Get AI usage metrics"""
        return self.usage_tracker.get_usage_metrics(date_range)
    
    def _store_analysis(self, analysis: AIAnalysis) -> None:
        """Store analysis in database"""
        # Implementation would store in DynamoDB
        pass
    
    def _store_generation(self, generation: CodeGeneration) -> None:
        """Store generation in database"""
        # Implementation would store in DynamoDB
        pass
    
    def _get_analysis(self, analysis_id: str) -> AIAnalysis:
        """Get analysis from database"""
        # Implementation would retrieve from DynamoDB
        pass
    
    def _get_generation(self, generation_id: str) -> CodeGeneration:
        """Get generation from database"""
        # Implementation would retrieve from DynamoDB
        pass
    
    def _recommendation_to_dict(self, recommendation: Recommendation) -> Dict[str, Any]:
        """Convert recommendation to dictionary"""
        return {
            'title': recommendation.title,
            'description': recommendation.description,
            'priority': recommendation.priority,
            'category': recommendation.category,
            'impact': recommendation.impact
        }
    
    def _validation_result_to_dict(self, validation_result: ValidationResult) -> Dict[str, Any]:
        """Convert validation result to dictionary"""
        return {
            'is_valid': validation_result.is_valid,
            'error': validation_result.error
        }
```

This AI Integration domain design provides comprehensive AI-powered analysis, code generation, and architectural guidance capabilities while maintaining cost control, security, and performance through proper usage tracking, caching, and validation.