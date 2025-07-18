# ADR-0012: No Template Versioning

**Status**: 🟢 Accepted  
**Date**: 2025-01-18  
**Deciders**: Development Team

## Context and Problem Statement

We need to decide on a versioning strategy for Jinja2 templates stored in S3 that balances operational simplicity, development velocity, and system complexity while supporting template evolution and rollback capabilities.

## Decision Drivers

* Operational simplicity and reduced management overhead
* Fast development cycles and template iteration
* Minimal storage and infrastructure costs
* Reduced complexity in template selection and management
* Clear deployment and rollback procedures
* Support for template evolution and improvements
* Integration with existing S3 and Git workflows

## Considered Options

* **Option 1**: Comprehensive template versioning with S3 versioning
* **Option 2**: Git-based versioning with semantic versions
* **Option 3**: Simple latest-only approach with no versioning
* **Option 4**: Hybrid approach with backup-only versioning
* **Option 5**: Time-based versioning with retention policies

## Decision Outcome

Chosen option: **"Simple latest-only approach with no versioning"**, because it provides the simplest operational model, fastest development cycles, and lowest complexity while meeting our current requirements for template management.

### Implementation Details

**Template Storage Structure**:
```
S3 Bucket: skafu-templates
├── project-templates/
│   ├── full-stack-template/
│   │   ├── template.json          # Template metadata
│   │   ├── sam-template.yaml      # SAM template
│   │   ├── frontend/
│   │   │   ├── package.json.j2
│   │   │   ├── src/
│   │   │   │   ├── App.tsx.j2
│   │   │   │   └── components/
│   │   │   └── public/
│   │   └── backend/
│   │       ├── requirements.txt.j2
│   │       ├── src/
│   │       │   ├── handlers/
│   │       │   └── models/
│   │       └── tests/
│   └── microservice-template/
│       ├── template.json
│       ├── sam-template.yaml
│       └── src/
└── service-templates/
    ├── api-service/
    │   ├── template.json
    │   ├── handler.py.j2
    │   ├── requirements.txt.j2
    │   └── tests/
    └── worker-service/
        ├── template.json
        ├── handler.py.j2
        └── requirements.txt.j2
```

**Template Metadata Format**:
```json
{
  "templateId": "full-stack-template",
  "name": "Full Stack Microservices Template",
  "description": "Complete template for full-stack microservices application",
  "version": "latest",
  "type": "project",
  "category": "full-stack",
  "lastModified": "2025-01-18T10:30:00Z",
  "author": "Skafu Team",
  "supportedFrameworks": ["sam"],
  "supportedRuntimes": ["python3.9", "nodejs18"],
  "parameters": [
    {
      "name": "projectName",
      "type": "string",
      "required": true,
      "description": "Name of the project"
    },
    {
      "name": "runtime",
      "type": "string",
      "required": true,
      "enum": ["python3.9", "nodejs18"],
      "description": "Runtime for Lambda functions"
    }
  ],
  "dependencies": [],
  "compatibility": {
    "minVersion": "1.0.0",
    "maxVersion": "2.0.0"
  }
}
```

**Template Retrieval Logic**:
```python
import boto3
import json
from typing import Dict, Any, Optional

class TemplateManager:
    def __init__(self):
        self.s3_client = boto3.client('s3')
        self.bucket_name = 'skafu-templates'
    
    def get_template(self, template_id: str, template_type: str = 'project') -> Dict[str, Any]:
        """Get the latest version of a template"""
        template_prefix = f"{template_type}-templates/{template_id}/"
        
        try:
            # Get template metadata
            metadata_key = f"{template_prefix}template.json"
            metadata_response = self.s3_client.get_object(
                Bucket=self.bucket_name,
                Key=metadata_key
            )
            
            metadata = json.loads(metadata_response['Body'].read())
            
            # Get all template files
            template_files = self._get_template_files(template_prefix)
            
            return {
                'metadata': metadata,
                'files': template_files,
                'version': 'latest',
                'lastModified': metadata['lastModified']
            }
            
        except Exception as e:
            raise TemplateNotFoundError(f"Template {template_id} not found: {e}")
    
    def _get_template_files(self, prefix: str) -> Dict[str, str]:
        """Get all files for a template"""
        files = {}
        
        paginator = self.s3_client.get_paginator('list_objects_v2')
        
        for page in paginator.paginate(Bucket=self.bucket_name, Prefix=prefix):
            if 'Contents' in page:
                for obj in page['Contents']:
                    key = obj['Key']
                    if key.endswith('.j2') or key.endswith('.yaml') or key.endswith('.json'):
                        response = self.s3_client.get_object(
                            Bucket=self.bucket_name,
                            Key=key
                        )
                        relative_path = key[len(prefix):]
                        files[relative_path] = response['Body'].read().decode('utf-8')
        
        return files
    
    def list_templates(self, template_type: str = 'project') -> List[Dict[str, Any]]:
        """List all available templates"""
        templates = []
        prefix = f"{template_type}-templates/"
        
        paginator = self.s3_client.get_paginator('list_objects_v2')
        
        for page in paginator.paginate(Bucket=self.bucket_name, Prefix=prefix, Delimiter='/'):
            if 'CommonPrefixes' in page:
                for prefix_info in page['CommonPrefixes']:
                    template_prefix = prefix_info['Prefix']
                    template_id = template_prefix.split('/')[-2]
                    
                    try:
                        metadata_key = f"{template_prefix}template.json"
                        metadata_response = self.s3_client.get_object(
                            Bucket=self.bucket_name,
                            Key=metadata_key
                        )
                        
                        metadata = json.loads(metadata_response['Body'].read())
                        templates.append({
                            'templateId': template_id,
                            'name': metadata['name'],
                            'description': metadata['description'],
                            'version': 'latest',
                            'lastModified': metadata['lastModified'],
                            'type': metadata['type'],
                            'category': metadata['category']
                        })
                    except Exception as e:
                        print(f"Error loading template {template_id}: {e}")
        
        return templates
    
    def update_template(self, template_id: str, template_type: str, files: Dict[str, str], metadata: Dict[str, Any]) -> bool:
        """Update a template (overwrites existing)"""
        template_prefix = f"{template_type}-templates/{template_id}/"
        
        try:
            # Update metadata with current timestamp
            metadata['lastModified'] = datetime.utcnow().isoformat()
            
            # Upload metadata
            metadata_key = f"{template_prefix}template.json"
            self.s3_client.put_object(
                Bucket=self.bucket_name,
                Key=metadata_key,
                Body=json.dumps(metadata, indent=2),
                ContentType='application/json'
            )
            
            # Upload all template files
            for file_path, content in files.items():
                file_key = f"{template_prefix}{file_path}"
                content_type = self._get_content_type(file_path)
                
                self.s3_client.put_object(
                    Bucket=self.bucket_name,
                    Key=file_key,
                    Body=content,
                    ContentType=content_type
                )
            
            return True
            
        except Exception as e:
            print(f"Error updating template {template_id}: {e}")
            return False
    
    def _get_content_type(self, file_path: str) -> str:
        """Get content type based on file extension"""
        if file_path.endswith('.json'):
            return 'application/json'
        elif file_path.endswith('.yaml') or file_path.endswith('.yml'):
            return 'application/yaml'
        elif file_path.endswith('.j2'):
            return 'text/plain'
        else:
            return 'text/plain'
```

**Template Deployment Strategy**:
```python
class TemplateDeployment:
    def __init__(self):
        self.template_manager = TemplateManager()
        self.git_client = GitClient()
    
    def deploy_from_git(self, git_ref: str = 'main') -> bool:
        """Deploy templates from Git repository"""
        try:
            # Clone or pull latest templates from Git
            templates_repo = self.git_client.get_repository('skafu-templates')
            
            # Get all template directories
            template_dirs = self._scan_template_directories(templates_repo)
            
            # Deploy each template
            for template_dir in template_dirs:
                template_id = template_dir.name
                template_type = self._determine_template_type(template_dir)
                
                # Read template files
                files = self._read_template_files(template_dir)
                metadata = self._read_template_metadata(template_dir)
                
                # Deploy to S3
                success = self.template_manager.update_template(
                    template_id=template_id,
                    template_type=template_type,
                    files=files,
                    metadata=metadata
                )
                
                if not success:
                    print(f"Failed to deploy template {template_id}")
                    return False
            
            return True
            
        except Exception as e:
            print(f"Error deploying templates: {e}")
            return False
    
    def backup_current_templates(self) -> str:
        """Create a backup of current templates"""
        backup_key = f"backups/templates-backup-{datetime.utcnow().strftime('%Y%m%d-%H%M%S')}.tar.gz"
        
        # Create backup archive of all templates
        backup_data = self._create_template_backup()
        
        # Store backup in S3
        self.template_manager.s3_client.put_object(
            Bucket=self.template_manager.bucket_name,
            Key=backup_key,
            Body=backup_data,
            ContentType='application/gzip'
        )
        
        return backup_key
    
    def restore_from_backup(self, backup_key: str) -> bool:
        """Restore templates from backup"""
        try:
            # Download backup
            response = self.template_manager.s3_client.get_object(
                Bucket=self.template_manager.bucket_name,
                Key=backup_key
            )
            
            # Extract and restore templates
            self._restore_template_backup(response['Body'].read())
            
            return True
            
        except Exception as e:
            print(f"Error restoring from backup: {e}")
            return False
```

**Template Validation**:
```python
class TemplateValidator:
    def __init__(self):
        self.jinja_env = Environment(
            loader=DictLoader({}),
            undefined=StrictUndefined
        )
    
    def validate_template(self, template_files: Dict[str, str], metadata: Dict[str, Any]) -> Dict[str, Any]:
        """Validate template files and metadata"""
        validation_results = {
            'valid': True,
            'errors': [],
            'warnings': []
        }
        
        # Validate metadata
        metadata_errors = self._validate_metadata(metadata)
        validation_results['errors'].extend(metadata_errors)
        
        # Validate Jinja2 templates
        for file_path, content in template_files.items():
            if file_path.endswith('.j2'):
                template_errors = self._validate_jinja_template(file_path, content)
                validation_results['errors'].extend(template_errors)
        
        # Validate parameter usage
        parameter_warnings = self._validate_parameter_usage(template_files, metadata)
        validation_results['warnings'].extend(parameter_warnings)
        
        validation_results['valid'] = len(validation_results['errors']) == 0
        
        return validation_results
    
    def _validate_metadata(self, metadata: Dict[str, Any]) -> List[str]:
        """Validate template metadata"""
        errors = []
        
        required_fields = ['templateId', 'name', 'description', 'type', 'parameters']
        for field in required_fields:
            if field not in metadata:
                errors.append(f"Missing required field: {field}")
        
        # Validate parameter definitions
        if 'parameters' in metadata:
            for param in metadata['parameters']:
                if 'name' not in param or 'type' not in param:
                    errors.append(f"Invalid parameter definition: {param}")
        
        return errors
    
    def _validate_jinja_template(self, file_path: str, content: str) -> List[str]:
        """Validate Jinja2 template syntax"""
        errors = []
        
        try:
            template = self.jinja_env.from_string(content)
            # Try to render with dummy data to check for syntax errors
            template.render({})
        except Exception as e:
            errors.append(f"Jinja2 syntax error in {file_path}: {e}")
        
        return errors
```

### Rollback Strategy

**Git-Based Rollback**:
```bash
# Emergency rollback procedure
# 1. Identify the last known good commit
git log --oneline templates/

# 2. Rollback to specific commit
git checkout <commit-hash>

# 3. Redeploy templates
python deploy_templates.py --force

# 4. Verify template functionality
python test_templates.py --all
```

**Backup-Based Rollback**:
```python
def emergency_rollback():
    """Emergency rollback to last backup"""
    template_deployment = TemplateDeployment()
    
    # List available backups
    backups = template_deployment.list_backups()
    
    if not backups:
        print("No backups available")
        return False
    
    # Get latest backup
    latest_backup = backups[0]
    
    # Restore from backup
    success = template_deployment.restore_from_backup(latest_backup['key'])
    
    if success:
        print(f"Successfully restored from backup: {latest_backup['key']}")
    else:
        print("Failed to restore from backup")
    
    return success
```

### Consequences

**Good**:
* **Simplicity**: No complex versioning logic or management overhead
* **Performance**: Fastest template retrieval with no version resolution
* **Storage**: Minimal storage costs with no version history
* **Development**: Rapid iteration and deployment of template changes
* **Maintenance**: Reduced complexity in template management
* **Consistency**: Always using the latest template version
* **Deployment**: Simple deployment pipeline with Git integration

**Bad**:
* **Rollback**: Limited rollback capabilities to previous versions
* **Testing**: Harder to test template changes before deployment
* **Stability**: Risk of breaking changes affecting all new projects
* **Audit**: No history of template changes and evolution
* **Collaboration**: Harder to coordinate template changes across teams
* **Recovery**: Limited recovery options if templates are corrupted

## Risk Mitigation

**Backup Strategy**:
- Automated daily backups of all templates
- Manual backup before any template updates
- Git repository maintains full history
- Emergency rollback procedures documented

**Testing Strategy**:
- Template validation before deployment
- Automated testing of template generation
- Staging environment for template testing
- Canary deployments for critical changes

**Change Management**:
- Code review process for template changes
- Documentation of template modifications
- Communication of breaking changes
- Gradual rollout of significant changes

## Operational Procedures

**Template Update Process**:
1. Update templates in Git repository
2. Create backup of current templates
3. Validate templates using validation tools
4. Deploy templates to staging environment
5. Test template functionality
6. Deploy to production environment
7. Verify deployment success

**Emergency Procedures**:
1. Identify template issues
2. Assess impact and urgency
3. Rollback using backup or Git
4. Communicate with affected users
5. Fix issues and redeploy
6. Document incident and lessons learned

## Implementation Guidelines

1. **Git Integration**: Use Git as the source of truth for templates
2. **Validation**: Always validate templates before deployment
3. **Backups**: Maintain regular backups for rollback capability
4. **Testing**: Comprehensive testing in staging environment
5. **Documentation**: Clear documentation of template structure and usage

## More Information

* [Jinja2 Template Documentation](https://jinja.palletsprojects.com/)
* [AWS S3 Best Practices](https://docs.aws.amazon.com/s3/latest/userguide/best-practices.html)
* [Template Design Patterns](https://jinja.palletsprojects.com/en/3.0.x/templates/)
* Related ADRs: ADR-0001 (AWS Serverless), ADR-0005 (Shared Resources)