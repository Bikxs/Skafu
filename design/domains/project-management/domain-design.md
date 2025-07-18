# Project Management Domain Design

## Domain Model

### Aggregates and Entities

#### Project Aggregate

**Project (Aggregate Root)**
```
Project:
  - projectId: UUID (immutable)
  - name: string (1-100 chars, alphanumeric + spaces/hyphens)
  - description: string (max 500 chars)
  - ownerId: UUID (Cognito user ID)
  - organizationId: UUID (optional, for multi-tenant)
  - templateId: UUID (reference to applied template)
  - status: ProjectStatus (draft, active, archived, deleted)
  - createdAt: timestamp
  - updatedAt: timestamp
  - configuration: ProjectConfiguration
  - services: List<Service>
  - relationships: List<ServiceRelationship>
```

**Service (Entity)**
```
Service:
  - serviceId: UUID (immutable)
  - projectId: UUID (foreign key)
  - name: string (1-50 chars, kebab-case)
  - type: ServiceType (api, worker, frontend, database)
  - description: string (max 300 chars)
  - templateId: UUID (service template reference)
  - status: ServiceStatus (planned, active, inactive, deprecated)
  - configuration: ServiceConfiguration
  - endpoints: List<ServiceEndpoint>
  - dependencies: List<UUID> (serviceIds this service depends on)
  - createdAt: timestamp
  - updatedAt: timestamp
```

**ServiceRelationship (Entity)**
```
ServiceRelationship:
  - relationshipId: UUID
  - sourceServiceId: UUID
  - targetServiceId: UUID
  - type: RelationshipType (sync_api, async_event, data_dependency)
  - configuration: RelationshipConfiguration
  - createdAt: timestamp
```

### Value Objects

**ProjectConfiguration**
```
ProjectConfiguration:
  - framework: string (sam, cdk, terraform)
  - runtime: string (python3.9, nodejs18, java11)
  - region: string (aws region)
  - environment: string (dev, staging, prod)
  - tags: Map<string, string>
  - cicdEnabled: boolean
  - monitoringEnabled: boolean
  - loggingLevel: LogLevel
```

**ServiceConfiguration**
```
ServiceConfiguration:
  - runtime: string (override project default)
  - memorySize: number (128-10240 MB)
  - timeout: number (1-900 seconds)
  - environmentVariables: Map<string, string>
  - triggers: List<TriggerConfiguration>
  - scaling: ScalingConfiguration
```

**ServiceEndpoint**
```
ServiceEndpoint:
  - path: string (/api/v1/resource)
  - method: HttpMethod (GET, POST, PUT, DELETE)
  - description: string
  - authentication: boolean
  - rateLimit: RateLimitConfiguration
```

### Enums

**ProjectStatus**
- `DRAFT`: Project created but not yet active
- `ACTIVE`: Project is deployed and operational
- `ARCHIVED`: Project preserved but not actively used
- `DELETED`: Soft deleted project (retained for audit)

**ServiceType**
- `API`: REST API service
- `WORKER`: Background processing service
- `FRONTEND`: Web frontend application
- `DATABASE`: Database service (rare in serverless)

**ServiceStatus**
- `PLANNED`: Service designed but not implemented
- `ACTIVE`: Service deployed and operational
- `INACTIVE`: Service deployed but disabled
- `DEPRECATED`: Service marked for removal

**RelationshipType**
- `SYNC_API`: Direct API call relationship
- `ASYNC_EVENT`: Event-driven relationship
- `DATA_DEPENDENCY`: Shared data store dependency

## Business Rules

### Project Rules

1. **Unique Naming**: Project names must be unique within an organization
2. **Owner Assignment**: Every project must have an owner (creator by default)
3. **Status Transitions**: Valid transitions:
   - DRAFT → ACTIVE (after successful deployment)
   - ACTIVE → ARCHIVED (when project discontinued)
   - ARCHIVED → ACTIVE (when project reactivated)
   - Any status → DELETED (soft delete)
4. **Template Compatibility**: Applied templates must be compatible with existing services
5. **Service Limits**: Maximum 50 services per project (configurable)

### Service Rules

1. **Unique Service Names**: Service names must be unique within a project
2. **Naming Convention**: Service names must follow kebab-case pattern
3. **Dependency Validation**: 
   - No circular dependencies allowed
   - Dependencies must be within same project
   - Maximum dependency depth of 5 levels
4. **Status Constraints**:
   - Cannot delete service with active dependents
   - Cannot activate service with inactive dependencies
5. **Configuration Inheritance**: Services inherit project configuration unless overridden

### Relationship Rules

1. **No Self-Dependencies**: Services cannot depend on themselves
2. **Relationship Uniqueness**: Only one relationship per service pair per type
3. **Dependency Constraints**: 
   - API services can depend on any service type
   - Worker services should primarily use async relationships
   - Frontend services should only have sync API dependencies
4. **Circular Dependency Prevention**: Graph algorithms prevent cycles

## Command Handlers

### Project Commands

**CreateProject Command**
```
Input:
  - name: string
  - description: string
  - templateId: UUID
  - configuration: ProjectConfiguration

Validation:
  - Name uniqueness within organization
  - Template exists and is active
  - Configuration validity
  - User permissions

Business Logic:
  1. Generate unique projectId
  2. Set owner to current user
  3. Initialize with DRAFT status
  4. Apply base template configuration
  5. Store ProjectCreated event

Output Events:
  - ProjectCreated
```

**AddService Command**
```
Input:
  - projectId: UUID
  - name: string
  - type: ServiceType
  - description: string
  - templateId: UUID
  - configuration: ServiceConfiguration

Validation:
  - Project exists and user has access
  - Service name unique within project
  - Template compatible with project
  - Service count within limits

Business Logic:
  1. Generate unique serviceId
  2. Validate template compatibility
  3. Apply service template defaults
  4. Add to project service list
  5. Store ServiceAdded event

Output Events:
  - ServiceAdded
```

**EstablishServiceRelationship Command**
```
Input:
  - projectId: UUID
  - sourceServiceId: UUID
  - targetServiceId: UUID
  - type: RelationshipType
  - configuration: RelationshipConfiguration

Validation:
  - Both services exist in project
  - Relationship type valid for service types
  - No circular dependencies created
  - User has project access

Business Logic:
  1. Validate dependency graph remains acyclic
  2. Generate relationship configuration
  3. Update service dependency lists
  4. Store ServiceRelationshipEstablished event

Output Events:
  - ServiceRelationshipEstablished
```

## Event Sourcing Design

### Event Store Schema

**Project Events Table**
```
Table: ProjectEvents
Partition Key: projectId
Sort Key: eventSequence
Attributes:
  - eventId: UUID
  - eventType: string
  - eventData: JSON
  - correlationId: UUID
  - timestamp: ISO-8601
  - version: string
  - userId: UUID
  - metadata: JSON
```

### Event Types

**ProjectCreated Event**
```json
{
  "eventType": "ProjectCreated",
  "eventData": {
    "projectId": "uuid",
    "name": "My Project",
    "description": "Project description",
    "ownerId": "user-uuid",
    "templateId": "template-uuid",
    "configuration": {...},
    "status": "DRAFT"
  }
}
```

**ServiceAdded Event**
```json
{
  "eventType": "ServiceAdded",
  "eventData": {
    "projectId": "uuid",
    "serviceId": "uuid",
    "name": "user-service",
    "type": "API",
    "description": "User management service",
    "templateId": "service-template-uuid",
    "configuration": {...}
  }
}
```

### Read Model Projections

**Project List View**
```
Table: ProjectListView
Partition Key: organizationId
Sort Key: projectId
Attributes:
  - name: string
  - description: string
  - status: string
  - serviceCount: number
  - lastUpdated: timestamp
  - tags: Set<string>
```

**Project Detail View**
```
Table: ProjectDetailView  
Partition Key: projectId
Attributes:
  - project: JSON (full project data)
  - services: JSON (array of services)
  - relationships: JSON (service relationship graph)
  - topology: JSON (visual layout data)
  - metrics: JSON (runtime metrics summary)
```

**Service Dependency Graph**
```
Table: ServiceDependencyView
Partition Key: projectId
Sort Key: serviceId
Attributes:
  - serviceName: string
  - dependencies: Set<string> (service names)
  - dependents: Set<string> (services that depend on this)
  - depth: number (max dependency depth)
```

## Domain Services

### ProjectTemplateService
- Validates template compatibility with existing project
- Applies template defaults to project configuration
- Handles template version updates and migrations

### DependencyGraphService
- Validates dependency relationships for cycles
- Calculates dependency depth and complexity metrics
- Provides topological sorting for deployment order

### ProjectValidationService
- Validates project configuration against business rules
- Checks service limits and constraints
- Validates naming conventions and uniqueness

### ServiceConfigurationService
- Merges project and service-level configurations
- Validates service configuration against templates
- Provides configuration inheritance logic

## Integration Points

### External Service Dependencies

**Template Management Domain**
- Query: GetTemplate(templateId) → Template
- Query: ValidateTemplateCompatibility(projectId, templateId) → boolean
- Event: TemplateUpdated → trigger compatibility check

**GitHub Integration Domain**
- Command: CreateRepository(projectId, configuration)
- Command: AddServiceToRepository(projectId, serviceId, serviceData)
- Event: RepositoryCreated → update project status

**AI Integration Domain**  
- Query: AnalyzeProjectRequirements(requirements) → ProjectSuggestion
- Query: SuggestServiceBoundaries(projectData) → ServiceSuggestions
- Query: ValidateArchitecturalDecision(projectId, decision) → ValidationResult

### Event Subscriptions

**Inbound Events**
- `TemplateUpdated` → check project compatibility
- `RepositoryCreated` → update project deployment status
- `ServiceDeploymentCompleted` → update service status

**Outbound Events**
- `ProjectCreated` → trigger repository creation
- `ServiceAdded` → trigger service deployment
- `ProjectDeleted` → trigger cleanup processes

## Error Handling

### Validation Errors
- Invalid project names or configurations
- Template compatibility issues
- Dependency cycle detection
- Service limit violations

### Business Rule Violations
- Circular dependencies
- Invalid status transitions
- Permission violations
- Resource conflicts

### Integration Failures
- Template service unavailable
- GitHub API failures
- AI service timeouts
- Event publishing failures

All errors result in appropriate error events sent to ErrorBus with full context for debugging and recovery.