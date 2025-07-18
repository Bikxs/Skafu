# Template Management Domain Design

## Domain Overview

The Template Management domain is responsible for storing, validating, processing, and serving Jinja2 templates that define project structures and configurations. This domain handles template lifecycle management, validation, rendering, and distribution across the Skafu platform.

## Business Context

### Domain Purpose
- **Template Storage**: Manage Jinja2 templates and associated metadata
- **Template Validation**: Ensure templates follow required standards and conventions
- **Template Rendering**: Process templates with user-provided parameters
- **Template Distribution**: Serve templates to project creation workflows
- **Template Analytics**: Track template usage and performance metrics

### Key Business Rules
1. **Template Uniqueness**: Each template must have a unique ID within its category
2. **Latest Version**: Only the latest version of each template is served (no versioning)
3. **Validation Required**: All templates must pass validation before being available
4. **Parameter Validation**: Template parameters must be validated against schemas
5. **Atomic Operations**: Template updates must be atomic to prevent inconsistencies

## Domain Model

### Aggregates and Entities

#### Template Aggregate
```python
class Template:
    def __init__(self, template_id: str, name: str, template_type: str):
        self.id = template_id
        self.name = name
        self.type = template_type  # 'project' or 'service'
        self.category = None
        self.description = None
        self.version = "latest"
        self.files = {}
        self.parameters = []
        self.metadata = TemplateMetadata()
        self.status = TemplateStatus.DRAFT
        self.created_at = datetime.utcnow()
        self.updated_at = datetime.utcnow()
        self.events = []
    
    def add_files(self, files: Dict[str, str]) -> None:
        """Add template files"""
        if self.status != TemplateStatus.DRAFT:
            raise TemplateImmutableError("Cannot modify published template")
        
        for file_path, content in files.items():
            self.files[file_path] = content
            
        self.updated_at = datetime.utcnow()
        self._add_event(TemplateFilesAdded(self.id, list(files.keys())))
    
    def add_parameter(self, parameter: TemplateParameter) -> None:
        """Add template parameter"""
        if self.status != TemplateStatus.DRAFT:
            raise TemplateImmutableError("Cannot modify published template")
            
        # Validate parameter
        if any(p.name == parameter.name for p in self.parameters):
            raise DuplicateParameterError(f"Parameter {parameter.name} already exists")
            
        self.parameters.append(parameter)
        self.updated_at = datetime.utcnow()
        self._add_event(TemplateParameterAdded(self.id, parameter.name))
    
    def validate(self) -> ValidationResult:
        """Validate template structure and content"""
        validator = TemplateValidator()
        result = validator.validate(self)
        
        if result.is_valid:
            self.status = TemplateStatus.VALIDATED
            self._add_event(TemplateValidated(self.id))
        else:
            self.status = TemplateStatus.INVALID
            self._add_event(TemplateValidationFailed(self.id, result.errors))
            
        return result
    
    def publish(self) -> None:
        """Publish template for use"""
        if self.status != TemplateStatus.VALIDATED:
            raise TemplateNotValidatedError("Template must be validated before publishing")
            
        self.status = TemplateStatus.PUBLISHED
        self.updated_at = datetime.utcnow()
        self._add_event(TemplatePublished(self.id))
    
    def render(self, parameters: Dict[str, Any]) -> Dict[str, str]:
        """Render template with parameters"""
        if self.status != TemplateStatus.PUBLISHED:
            raise TemplateNotPublishedError("Template must be published to render")
            
        # Validate parameters
        self._validate_parameters(parameters)
        
        # Render files
        renderer = TemplateRenderer()
        rendered_files = renderer.render(self.files, parameters)
        
        self._add_event(TemplateRendered(self.id, list(rendered_files.keys())))
        
        return rendered_files
    
    def _validate_parameters(self, parameters: Dict[str, Any]) -> None:
        """Validate provided parameters against template schema"""
        for param in self.parameters:
            if param.required and param.name not in parameters:
                raise MissingParameterError(f"Required parameter {param.name} is missing")
                
            if param.name in parameters:
                if not param.validate(parameters[param.name]):
                    raise InvalidParameterError(f"Invalid value for parameter {param.name}")
    
    def _add_event(self, event: DomainEvent) -> None:
        """Add domain event"""
        self.events.append(event)

class TemplateMetadata:
    def __init__(self):
        self.author = None
        self.last_modified = None
        self.supported_frameworks = []
        self.supported_runtimes = []
        self.compatibility = {}
        self.usage_count = 0
        self.success_rate = 0.0

class TemplateParameter:
    def __init__(self, name: str, param_type: str, required: bool = False):
        self.name = name
        self.type = param_type
        self.required = required
        self.description = None
        self.default_value = None
        self.enum_values = []
        self.validation_pattern = None
        self.min_length = None
        self.max_length = None
    
    def validate(self, value: Any) -> bool:
        """Validate parameter value"""
        if self.type == "string":
            return self._validate_string(value)
        elif self.type == "integer":
            return self._validate_integer(value)
        elif self.type == "boolean":
            return self._validate_boolean(value)
        elif self.type == "array":
            return self._validate_array(value)
        else:
            return True
    
    def _validate_string(self, value: Any) -> bool:
        if not isinstance(value, str):
            return False
        if self.min_length and len(value) < self.min_length:
            return False
        if self.max_length and len(value) > self.max_length:
            return False
        if self.enum_values and value not in self.enum_values:
            return False
        if self.validation_pattern and not re.match(self.validation_pattern, value):
            return False
        return True

class TemplateStatus(Enum):
    DRAFT = "draft"
    VALIDATED = "validated"
    PUBLISHED = "published"
    INVALID = "invalid"
    DEPRECATED = "deprecated"
```

### Value Objects

```python
class TemplateId:
    def __init__(self, value: str):
        if not value or not re.match(r'^[a-z0-9-]+$', value):
            raise InvalidTemplateIdError("Template ID must be lowercase alphanumeric with hyphens")
        self.value = value
    
    def __str__(self):
        return self.value

class TemplateFile:
    def __init__(self, path: str, content: str, content_type: str):
        self.path = path
        self.content = content
        self.content_type = content_type
        self.size = len(content.encode('utf-8'))
        self.checksum = hashlib.md5(content.encode('utf-8')).hexdigest()

class ValidationResult:
    def __init__(self, is_valid: bool, errors: List[str] = None, warnings: List[str] = None):
        self.is_valid = is_valid
        self.errors = errors or []
        self.warnings = warnings or []
```

## Domain Services

### Template Validator Service

```python
class TemplateValidator:
    def __init__(self):
        self.jinja_env = Environment(
            loader=DictLoader({}),
            undefined=StrictUndefined
        )
    
    def validate(self, template: Template) -> ValidationResult:
        """Validate template structure and content"""
        errors = []
        warnings = []
        
        # Validate metadata
        metadata_errors = self._validate_metadata(template)
        errors.extend(metadata_errors)
        
        # Validate files
        file_errors = self._validate_files(template.files)
        errors.extend(file_errors)
        
        # Validate parameters
        param_errors = self._validate_parameters(template.parameters)
        errors.extend(param_errors)
        
        # Validate Jinja2 templates
        jinja_errors = self._validate_jinja_templates(template.files)
        errors.extend(jinja_errors)
        
        # Validate required files
        required_file_errors = self._validate_required_files(template)
        errors.extend(required_file_errors)
        
        return ValidationResult(
            is_valid=len(errors) == 0,
            errors=errors,
            warnings=warnings
        )
    
    def _validate_metadata(self, template: Template) -> List[str]:
        """Validate template metadata"""
        errors = []
        
        required_fields = ['name', 'type', 'category']
        for field in required_fields:
            if not getattr(template, field, None):
                errors.append(f"Missing required field: {field}")
        
        if template.type not in ['project', 'service']:
            errors.append(f"Invalid template type: {template.type}")
        
        return errors
    
    def _validate_files(self, files: Dict[str, str]) -> List[str]:
        """Validate template files"""
        errors = []
        
        if not files:
            errors.append("Template must contain at least one file")
        
        for file_path, content in files.items():
            if not content.strip():
                errors.append(f"File {file_path} cannot be empty")
            
            if len(content.encode('utf-8')) > 1024 * 1024:  # 1MB limit
                errors.append(f"File {file_path} exceeds size limit")
        
        return errors
    
    def _validate_parameters(self, parameters: List[TemplateParameter]) -> List[str]:
        """Validate template parameters"""
        errors = []
        
        param_names = [p.name for p in parameters]
        if len(param_names) != len(set(param_names)):
            errors.append("Duplicate parameter names found")
        
        for param in parameters:
            if not param.name:
                errors.append("Parameter name cannot be empty")
            if not param.type:
                errors.append(f"Parameter {param.name} must have a type")
            if param.type not in ['string', 'integer', 'boolean', 'array']:
                errors.append(f"Invalid parameter type: {param.type}")
        
        return errors
    
    def _validate_jinja_templates(self, files: Dict[str, str]) -> List[str]:
        """Validate Jinja2 template syntax"""
        errors = []
        
        for file_path, content in files.items():
            if file_path.endswith('.j2'):
                try:
                    template = self.jinja_env.from_string(content)
                    # Try to render with dummy data
                    template.render({})
                except Exception as e:
                    errors.append(f"Jinja2 syntax error in {file_path}: {e}")
        
        return errors
    
    def _validate_required_files(self, template: Template) -> List[str]:
        """Validate required files exist"""
        errors = []
        
        if template.type == 'project':
            required_files = ['template.json', 'sam-template.yaml']
            for required_file in required_files:
                if required_file not in template.files:
                    errors.append(f"Required file missing: {required_file}")
        
        return errors
```

### Template Renderer Service

```python
class TemplateRenderer:
    def __init__(self):
        self.jinja_env = Environment(
            loader=DictLoader({}),
            undefined=StrictUndefined,
            trim_blocks=True,
            lstrip_blocks=True
        )
        # Add custom filters
        self.jinja_env.filters['camel_case'] = self._camel_case
        self.jinja_env.filters['snake_case'] = self._snake_case
        self.jinja_env.filters['kebab_case'] = self._kebab_case
    
    def render(self, files: Dict[str, str], parameters: Dict[str, Any]) -> Dict[str, str]:
        """Render template files with parameters"""
        rendered_files = {}
        
        for file_path, content in files.items():
            if file_path.endswith('.j2'):
                # Render Jinja2 template
                rendered_content = self._render_jinja_template(content, parameters)
                # Remove .j2 extension from output path
                output_path = file_path[:-3]
                rendered_files[output_path] = rendered_content
            else:
                # Copy non-template files as-is
                rendered_files[file_path] = content
        
        return rendered_files
    
    def _render_jinja_template(self, content: str, parameters: Dict[str, Any]) -> str:
        """Render individual Jinja2 template"""
        try:
            template = self.jinja_env.from_string(content)
            return template.render(**parameters)
        except Exception as e:
            raise TemplateRenderError(f"Failed to render template: {e}")
    
    def _camel_case(self, value: str) -> str:
        """Convert string to camelCase"""
        words = re.sub(r'[^a-zA-Z0-9]', ' ', value).split()
        return words[0].lower() + ''.join(word.capitalize() for word in words[1:])
    
    def _snake_case(self, value: str) -> str:
        """Convert string to snake_case"""
        return re.sub(r'[^a-zA-Z0-9]', '_', value).lower()
    
    def _kebab_case(self, value: str) -> str:
        """Convert string to kebab-case"""
        return re.sub(r'[^a-zA-Z0-9]', '-', value).lower()
```

### Template Repository Service

```python
class TemplateRepository:
    def __init__(self):
        self.s3_client = boto3.client('s3')
        self.bucket_name = os.environ['TEMPLATES_BUCKET']
        self.dynamodb = boto3.resource('dynamodb')
        self.table = self.dynamodb.Table('TemplateMetadata')
    
    def save_template(self, template: Template) -> None:
        """Save template to S3 and metadata to DynamoDB"""
        try:
            # Save files to S3
            self._save_files_to_s3(template)
            
            # Save metadata to DynamoDB
            self._save_metadata_to_dynamodb(template)
            
        except Exception as e:
            raise TemplateRepositoryError(f"Failed to save template: {e}")
    
    def get_template(self, template_id: str) -> Template:
        """Get template by ID"""
        try:
            # Get metadata from DynamoDB
            metadata = self._get_metadata_from_dynamodb(template_id)
            
            # Get files from S3
            files = self._get_files_from_s3(template_id, metadata['type'])
            
            # Reconstruct template
            template = Template(template_id, metadata['name'], metadata['type'])
            template.category = metadata.get('category')
            template.description = metadata.get('description')
            template.files = files
            template.parameters = self._deserialize_parameters(metadata.get('parameters', []))
            template.status = TemplateStatus(metadata['status'])
            template.created_at = datetime.fromisoformat(metadata['created_at'])
            template.updated_at = datetime.fromisoformat(metadata['updated_at'])
            
            return template
            
        except Exception as e:
            raise TemplateNotFoundError(f"Template {template_id} not found: {e}")
    
    def list_templates(self, template_type: str = None) -> List[Template]:
        """List all templates"""
        try:
            if template_type:
                response = self.table.scan(
                    FilterExpression='#type = :type AND #status = :status',
                    ExpressionAttributeNames={
                        '#type': 'type',
                        '#status': 'status'
                    },
                    ExpressionAttributeValues={
                        ':type': template_type,
                        ':status': TemplateStatus.PUBLISHED.value
                    }
                )
            else:
                response = self.table.scan(
                    FilterExpression='#status = :status',
                    ExpressionAttributeNames={
                        '#status': 'status'
                    },
                    ExpressionAttributeValues={
                        ':status': TemplateStatus.PUBLISHED.value
                    }
                )
            
            templates = []
            for item in response['Items']:
                template = Template(item['id'], item['name'], item['type'])
                template.category = item.get('category')
                template.description = item.get('description')
                template.status = TemplateStatus(item['status'])
                template.created_at = datetime.fromisoformat(item['created_at'])
                template.updated_at = datetime.fromisoformat(item['updated_at'])
                templates.append(template)
            
            return templates
            
        except Exception as e:
            raise TemplateRepositoryError(f"Failed to list templates: {e}")
    
    def delete_template(self, template_id: str) -> None:
        """Delete template"""
        try:
            # Delete files from S3
            self._delete_files_from_s3(template_id)
            
            # Delete metadata from DynamoDB
            self.table.delete_item(Key={'id': template_id})
            
        except Exception as e:
            raise TemplateRepositoryError(f"Failed to delete template: {e}")
    
    def _save_files_to_s3(self, template: Template) -> None:
        """Save template files to S3"""
        for file_path, content in template.files.items():
            s3_key = f"{template.type}-templates/{template.id}/{file_path}"
            self.s3_client.put_object(
                Bucket=self.bucket_name,
                Key=s3_key,
                Body=content,
                ContentType=self._get_content_type(file_path)
            )
    
    def _save_metadata_to_dynamodb(self, template: Template) -> None:
        """Save template metadata to DynamoDB"""
        self.table.put_item(
            Item={
                'id': template.id,
                'name': template.name,
                'type': template.type,
                'category': template.category,
                'description': template.description,
                'status': template.status.value,
                'parameters': self._serialize_parameters(template.parameters),
                'created_at': template.created_at.isoformat(),
                'updated_at': template.updated_at.isoformat(),
                'metadata': {
                    'author': template.metadata.author,
                    'supported_frameworks': template.metadata.supported_frameworks,
                    'supported_runtimes': template.metadata.supported_runtimes,
                    'usage_count': template.metadata.usage_count,
                    'success_rate': template.metadata.success_rate
                }
            }
        )
    
    def _get_files_from_s3(self, template_id: str, template_type: str) -> Dict[str, str]:
        """Get template files from S3"""
        files = {}
        prefix = f"{template_type}-templates/{template_id}/"
        
        paginator = self.s3_client.get_paginator('list_objects_v2')
        for page in paginator.paginate(Bucket=self.bucket_name, Prefix=prefix):
            if 'Contents' in page:
                for obj in page['Contents']:
                    key = obj['Key']
                    if key != prefix:  # Skip directory marker
                        response = self.s3_client.get_object(Bucket=self.bucket_name, Key=key)
                        relative_path = key[len(prefix):]
                        files[relative_path] = response['Body'].read().decode('utf-8')
        
        return files
    
    def _get_content_type(self, file_path: str) -> str:
        """Get content type for file"""
        if file_path.endswith('.json'):
            return 'application/json'
        elif file_path.endswith(('.yaml', '.yml')):
            return 'application/yaml'
        elif file_path.endswith('.j2'):
            return 'text/plain'
        else:
            return 'text/plain'
```

## Domain Events

### Event Definitions

```python
class TemplateUploaded(DomainEvent):
    def __init__(self, template_id: str, template_name: str, template_type: str):
        super().__init__()
        self.template_id = template_id
        self.template_name = template_name
        self.template_type = template_type

class TemplateValidated(DomainEvent):
    def __init__(self, template_id: str):
        super().__init__()
        self.template_id = template_id

class TemplateValidationFailed(DomainEvent):
    def __init__(self, template_id: str, errors: List[str]):
        super().__init__()
        self.template_id = template_id
        self.errors = errors

class TemplatePublished(DomainEvent):
    def __init__(self, template_id: str):
        super().__init__()
        self.template_id = template_id

class TemplateRendered(DomainEvent):
    def __init__(self, template_id: str, output_files: List[str]):
        super().__init__()
        self.template_id = template_id
        self.output_files = output_files

class TemplateUsageTracked(DomainEvent):
    def __init__(self, template_id: str, project_id: str, success: bool):
        super().__init__()
        self.template_id = template_id
        self.project_id = project_id
        self.success = success
```

## Application Services

### Template Management Service

```python
class TemplateManagementService:
    def __init__(self, repository: TemplateRepository, validator: TemplateValidator, renderer: TemplateRenderer):
        self.repository = repository
        self.validator = validator
        self.renderer = renderer
    
    def upload_template(self, template_data: Dict[str, Any]) -> str:
        """Upload and validate new template"""
        template = Template(
            template_data['id'],
            template_data['name'],
            template_data['type']
        )
        
        template.category = template_data.get('category')
        template.description = template_data.get('description')
        
        # Add files
        if 'files' in template_data:
            template.add_files(template_data['files'])
        
        # Add parameters
        if 'parameters' in template_data:
            for param_data in template_data['parameters']:
                parameter = TemplateParameter(
                    param_data['name'],
                    param_data['type'],
                    param_data.get('required', False)
                )
                parameter.description = param_data.get('description')
                parameter.default_value = param_data.get('default_value')
                parameter.enum_values = param_data.get('enum_values', [])
                template.add_parameter(parameter)
        
        # Validate template
        validation_result = template.validate()
        if not validation_result.is_valid:
            raise TemplateValidationError(validation_result.errors)
        
        # Publish template
        template.publish()
        
        # Save to repository
        self.repository.save_template(template)
        
        return template.id
    
    def get_template(self, template_id: str) -> Template:
        """Get template by ID"""
        return self.repository.get_template(template_id)
    
    def list_templates(self, template_type: str = None) -> List[Template]:
        """List available templates"""
        return self.repository.list_templates(template_type)
    
    def render_template(self, template_id: str, parameters: Dict[str, Any]) -> Dict[str, str]:
        """Render template with parameters"""
        template = self.repository.get_template(template_id)
        rendered_files = template.render(parameters)
        
        # Track usage
        self._track_template_usage(template_id, True)
        
        return rendered_files
    
    def validate_template_parameters(self, template_id: str, parameters: Dict[str, Any]) -> ValidationResult:
        """Validate parameters against template schema"""
        template = self.repository.get_template(template_id)
        
        errors = []
        for param in template.parameters:
            if param.required and param.name not in parameters:
                errors.append(f"Required parameter {param.name} is missing")
            elif param.name in parameters and not param.validate(parameters[param.name]):
                errors.append(f"Invalid value for parameter {param.name}")
        
        return ValidationResult(len(errors) == 0, errors)
    
    def _track_template_usage(self, template_id: str, success: bool) -> None:
        """Track template usage for analytics"""
        # This would typically publish an event for analytics
        pass
```

## Integration Points

### Event Handlers

```python
class TemplateEventHandler:
    def __init__(self, template_service: TemplateManagementService):
        self.template_service = template_service
    
    def handle_project_created(self, event: ProjectCreated) -> None:
        """Handle project created event"""
        # Track template usage
        if event.template_id:
            self.template_service._track_template_usage(event.template_id, True)
    
    def handle_project_deployment_failed(self, event: ProjectDeploymentFailed) -> None:
        """Handle project deployment failure"""
        # Track template failure
        if event.template_id:
            self.template_service._track_template_usage(event.template_id, False)
```

### API Endpoints

```python
class TemplateController:
    def __init__(self, template_service: TemplateManagementService):
        self.template_service = template_service
    
    def list_templates(self, template_type: str = None) -> List[Dict[str, Any]]:
        """List available templates"""
        templates = self.template_service.list_templates(template_type)
        return [self._template_to_dict(template) for template in templates]
    
    def get_template(self, template_id: str) -> Dict[str, Any]:
        """Get template details"""
        template = self.template_service.get_template(template_id)
        return self._template_to_dict(template)
    
    def render_template(self, template_id: str, parameters: Dict[str, Any]) -> Dict[str, str]:
        """Render template with parameters"""
        return self.template_service.render_template(template_id, parameters)
    
    def validate_parameters(self, template_id: str, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Validate template parameters"""
        result = self.template_service.validate_template_parameters(template_id, parameters)
        return {
            'valid': result.is_valid,
            'errors': result.errors
        }
    
    def _template_to_dict(self, template: Template) -> Dict[str, Any]:
        """Convert template to dictionary"""
        return {
            'id': template.id,
            'name': template.name,
            'type': template.type,
            'category': template.category,
            'description': template.description,
            'parameters': [self._parameter_to_dict(param) for param in template.parameters],
            'status': template.status.value,
            'created_at': template.created_at.isoformat(),
            'updated_at': template.updated_at.isoformat()
        }
    
    def _parameter_to_dict(self, parameter: TemplateParameter) -> Dict[str, Any]:
        """Convert parameter to dictionary"""
        return {
            'name': parameter.name,
            'type': parameter.type,
            'required': parameter.required,
            'description': parameter.description,
            'default_value': parameter.default_value,
            'enum_values': parameter.enum_values
        }
```

This Template Management domain design provides comprehensive functionality for managing Jinja2 templates with validation, rendering, and analytics capabilities while maintaining clean domain boundaries and event-driven integration with other domains.