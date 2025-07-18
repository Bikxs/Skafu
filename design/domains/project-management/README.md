# Project Management Domain

**Domain Purpose**: Core business logic for managing scaffolded projects, services, and their configurations.

## Domain Scope

The Project Management domain handles:
- **Project Lifecycle**: Creation, configuration, updates, and deletion of scaffolded projects
- **Service Management**: Adding, removing, and configuring microservices within projects
- **Project Relationships**: Dependencies and integration patterns between services
- **Configuration Management**: Project-level settings and service-specific configurations
- **Project Templates**: Application of templates to generate project structures

## Bounded Context

### Core Entities
- **Project**: Top-level container for a microservices application
- **Service**: Individual microservice within a project
- **ServiceRelationship**: Connections and dependencies between services
- **ProjectConfiguration**: Project-wide settings and preferences

### External Dependencies
- **Template Management**: Uses templates for project/service generation
- **GitHub Integration**: Creates repositories and manages code deployment
- **AI Integration**: Leverages Claude SDK for intelligent project design
- **User Management**: Cognito integration for project ownership and permissions

## Architecture Overview

```
API Gateway → Step Functions → Event Store → EventBridge
                     ↓
                Read Model Updates (via Amplify Gen2)
                     ↓
                GraphQL Subscriptions → Frontend
```

## Domain Events

### Project Events
- `ProjectCreated`: New project scaffolded
- `ProjectUpdated`: Project configuration changed
- `ProjectDeleted`: Project removed from system
- `ProjectTemplateApplied`: Template applied to existing project

### Service Events
- `ServiceAdded`: New microservice added to project
- `ServiceRemoved`: Microservice removed from project
- `ServiceUpdated`: Service configuration changed
- `ServiceRelationshipEstablished`: Dependency created between services
- `ServiceRelationshipRemoved`: Dependency removed

### Configuration Events
- `ProjectConfigurationUpdated`: Project-wide settings changed
- `ServiceConfigurationUpdated`: Service-specific settings changed

## Command Operations

### Project Commands
- `CreateProject`: Initialize new scaffolded project
- `UpdateProject`: Modify project metadata and configuration
- `DeleteProject`: Remove project and all associated resources
- `ApplyTemplate`: Apply template to existing project

### Service Commands
- `AddService`: Add new microservice to project
- `RemoveService`: Remove microservice from project
- `UpdateService`: Modify service configuration
- `EstablishServiceRelationship`: Create dependency between services
- `RemoveServiceRelationship`: Remove service dependency

## Query Models

### Project Queries (via Amplify Gen2 GraphQL)
- Project list with filtering and pagination
- Project details with service topology
- Project configuration and settings
- Project deployment status and health

### Service Queries
- Service list within project
- Service details and configuration
- Service relationship graph
- Service deployment metrics

## File Structure

- [domain-design.md](./domain-design.md) - Detailed domain model and business rules
- [events.yaml](./events.yaml) - AsyncAPI specification for domain events
- [api.yaml](./api.yaml) - OpenAPI specification for command APIs
- [data-schema.graphql](./data-schema.graphql) - GraphQL schema for Amplify Gen2
- [infrastructure.md](./infrastructure.md) - AWS SAM nested stack design
- [ui-design.md](./ui-design.md) - Frontend components and user flows
- [scenarios/](./scenarios/) - Use case scenarios and event flows
- [images/](./images/) - Domain diagrams and visualizations

## Integration Patterns

### With Template Management
- Request templates for project/service generation
- Subscribe to template update events
- Validate template compatibility with project requirements

### With GitHub Integration  
- Trigger repository creation after project creation
- Coordinate service additions with repository structure updates
- Manage branch protection and deployment workflows

### With AI Integration
- Request project structure recommendations from Claude SDK
- Get service boundary suggestions based on requirements
- Validate architectural decisions against best practices

## Key Scenarios

1. **[Create New Project](./scenarios/create-project.md)**: Complete flow from user request to working project
2. **[Add Microservice](./scenarios/add-service.md)**: Adding new service to existing project
3. **[Update Service Relationships](./scenarios/update-relationships.md)**: Managing service dependencies
4. **[Apply Template Updates](./scenarios/apply-template.md)**: Updating project with new template versions