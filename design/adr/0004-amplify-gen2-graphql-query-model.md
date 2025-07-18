# ADR-0004: Amplify Gen2 for GraphQL Query Model

**Status**: 🟢 Accepted  
**Date**: 2025-01-18  
**Deciders**: Development Team

## Context and Problem Statement

We need to implement the query side of our CQRS architecture with real-time capabilities, auto-generated GraphQL APIs, and optimized read models that integrate seamlessly with our React frontend while supporting our event-driven architecture.

## Decision Drivers

* CQRS pattern requires optimized read models separate from write models
* Need real-time updates in the frontend via subscriptions
* Rapid development of GraphQL APIs without boilerplate
* Type safety between frontend and backend
* Integration with existing AWS serverless architecture
* Automated DynamoDB table creation and management
* Support for complex query patterns and relationships

## Considered Options

* **Option 1**: Manual GraphQL API with Apollo Server on Lambda
* **Option 2**: AWS AppSync with manual schema definition
* **Option 3**: Amplify Gen2 with auto-generated GraphQL API
* **Option 4**: REST APIs with manual caching for read models
* **Option 5**: Hasura with PostgreSQL for GraphQL

## Decision Outcome

Chosen option: **"Amplify Gen2 with auto-generated GraphQL API"**, because it provides rapid development, type safety, real-time subscriptions, and seamless integration with our AWS serverless architecture while automatically handling the infrastructure complexity.

### Implementation Details

**Amplify Gen2 Architecture**:
- **Data Schema Definition**: GraphQL schema defined in TypeScript
- **Auto-Generated API**: AppSync GraphQL API automatically created
- **DynamoDB Tables**: Automatically provisioned and managed
- **Real-time Subscriptions**: WebSocket connections for live updates
- **Type Generation**: Automatic TypeScript type generation
- **Client Libraries**: Generated client libraries for React frontend

**Schema Definition Pattern**:
```typescript
// amplify/data/resource.ts
import { type ClientSchema, a, defineData } from '@aws-amplify/backend';

const schema = a.schema({
  // Project read model
  Project: a.model({
    id: a.id().required(),
    name: a.string().required(),
    description: a.string(),
    ownerId: a.string().required(),
    status: a.enum(['DRAFT', 'ACTIVE', 'ARCHIVED', 'DELETED']),
    serviceCount: a.integer().default(0),
    configuration: a.json(),
    tags: a.json(),
    createdAt: a.datetime().required(),
    updatedAt: a.datetime().required(),
    
    // Relationships
    services: a.hasMany('Service', 'projectId'),
    relationships: a.hasMany('ServiceRelationship', 'projectId')
  }).authorization(allow => [
    allow.owner('ownerId'),
    allow.groups(['Admin'])
  ]),

  // Service read model
  Service: a.model({
    id: a.id().required(),
    projectId: a.string().required(),
    name: a.string().required(),
    type: a.enum(['API', 'WORKER', 'FRONTEND', 'DATABASE']),
    description: a.string(),
    status: a.enum(['PLANNED', 'ACTIVE', 'INACTIVE', 'DEPRECATED']),
    configuration: a.json(),
    endpoints: a.json(),
    dependencyCount: a.integer().default(0),
    dependentCount: a.integer().default(0),
    createdAt: a.datetime().required(),
    updatedAt: a.datetime().required(),
    
    // Relationships
    project: a.belongsTo('Project', 'projectId'),
    sourceRelationships: a.hasMany('ServiceRelationship', 'sourceServiceId'),
    targetRelationships: a.hasMany('ServiceRelationship', 'targetServiceId')
  }).authorization(allow => [
    allow.owner('project.ownerId'),
    allow.groups(['Admin'])
  ]),

  // Service relationship read model
  ServiceRelationship: a.model({
    id: a.id().required(),
    projectId: a.string().required(),
    sourceServiceId: a.string().required(),
    targetServiceId: a.string().required(),
    type: a.enum(['SYNC_API', 'ASYNC_EVENT', 'DATA_DEPENDENCY']),
    configuration: a.json(),
    createdAt: a.datetime().required(),
    
    // Relationships
    project: a.belongsTo('Project', 'projectId'),
    sourceService: a.belongsTo('Service', 'sourceServiceId'),
    targetService: a.belongsTo('Service', 'targetServiceId')
  }).authorization(allow => [
    allow.owner('project.ownerId'),
    allow.groups(['Admin'])
  ])
});

export type Schema = ClientSchema<typeof schema>;
export const data = defineData({ schema });
```

**Frontend Integration**:
```typescript
// Frontend React component
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '@/amplify/data/resource';

const client = generateClient<Schema>();

// Query projects
const { data: projects } = await client.models.Project.list({
  filter: { status: { eq: 'ACTIVE' } },
  limit: 20
});

// Real-time subscription
const subscription = client.models.Project.observeQuery().subscribe({
  next: (data) => {
    console.log('Projects updated:', data.items);
  }
});

// Complex query with relationships
const { data: projectWithServices } = await client.models.Project.get({
  id: projectId,
  selectionSet: ['id', 'name', 'services.*', 'relationships.*']
});
```

### Read Model Update Integration

**Event-Driven Updates**:
```python
# Lambda function for updating read models
import boto3
import json
from datetime import datetime

def handle_project_created(event, context):
    """Update Project read model when ProjectCreated event received"""
    project_data = event['detail']['data']
    
    # Use Amplify Data API to update read model
    appsync_client = boto3.client('appsync')
    
    mutation = '''
    mutation CreateProject($input: CreateProjectInput!) {
      createProject(input: $input) {
        id
        name
        status
      }
    }
    '''
    
    variables = {
        'input': {
            'id': project_data['projectId'],
            'name': project_data['name'],
            'description': project_data['description'],
            'ownerId': project_data['ownerId'],
            'status': project_data['status'],
            'serviceCount': 0,
            'configuration': json.dumps(project_data['configuration']),
            'createdAt': datetime.utcnow().isoformat(),
            'updatedAt': datetime.utcnow().isoformat()
        }
    }
    
    response = appsync_client.evaluate_mapping_template(
        template=mutation,
        context=json.dumps({
            'arguments': variables,
            'source': {},
            'request': {'headers': {}}
        })
    )
    
    return response
```

**Subscription Triggers**:
- Read model updates automatically trigger GraphQL subscriptions
- Frontend receives real-time updates via WebSocket
- Optimistic updates in Redux for immediate UI feedback

### Authorization Integration

**Cognito Integration**:
```typescript
// Amplify Auth configuration
import { defineAuth } from '@aws-amplify/backend';

export const auth = defineAuth({
  loginWith: {
    email: true,
    username: false
  },
  userAttributes: {
    email: { required: true },
    'custom:organization_id': { dataType: 'String' }
  },
  groups: ['Admin', 'Developer', 'Viewer']
});
```

**Row-Level Security**:
- Projects filtered by owner ID automatically
- Services inherit project-level permissions
- Admin group has full access across organizations
- Fine-grained access control per resource

### Consequences

**Good**:
* **Rapid Development**: Auto-generated GraphQL API reduces boilerplate
* **Type Safety**: Full TypeScript integration from schema to frontend
* **Real-time Updates**: Built-in WebSocket subscriptions
* **Scalability**: DynamoDB auto-scaling for read-heavy workloads
* **Security**: Built-in authorization with Cognito integration
* **Maintenance**: Automatic infrastructure management
* **Performance**: Optimized for read operations with caching
* **Developer Experience**: Generated client libraries and documentation

**Bad**:
* **AWS Lock-in**: Heavily dependent on AWS Amplify ecosystem
* **Limited Customization**: Less control over AppSync configuration
* **Schema Migrations**: Complex migrations for breaking schema changes
* **Debugging**: Limited visibility into auto-generated infrastructure
* **Cost**: Potentially higher costs for complex query patterns
* **Learning Curve**: Team needs to understand Amplify Gen2 patterns

## Data Flow Integration

**CQRS Read Side**:
```
EventBridge Event → Lambda Projection → AppSync Mutation → DynamoDB Read Model
                                                        ↓
                                           GraphQL Subscription → Frontend
```

**Frontend Query Pattern**:
```
React Component → Amplify Client → AppSync → DynamoDB Read Model
                                         ↓
                             Real-time Subscription Updates
```

### Performance Considerations

**Query Optimization**:
- Use selection sets to minimize data transfer
- Implement pagination for large lists
- Cache frequently accessed data
- Use DataLoader pattern for N+1 query prevention

**Subscription Management**:
- Limit subscription scope to necessary data
- Implement subscription cleanup on unmount
- Use connection pooling for multiple subscriptions
- Monitor subscription costs and usage

### Schema Evolution Strategy

**Backward Compatibility**:
- Add new fields as optional
- Use @deprecated directive for old fields
- Implement versioned mutations for breaking changes
- Gradual migration path for schema updates

**Migration Process**:
1. Deploy schema changes to staging
2. Test with existing frontend code
3. Update frontend to use new fields
4. Deploy to production with feature flags
5. Monitor for issues and rollback if needed

## Implementation Guidelines

1. **Schema Design**: Design for query patterns, not just data structure
2. **Authorization**: Use fine-grained permissions with owner and group rules
3. **Subscriptions**: Implement efficient subscription patterns
4. **Performance**: Monitor and optimize query performance
5. **Testing**: Comprehensive testing of generated APIs and subscriptions

## Integration with Other Components

**With Redux**: Redux manages application state, Amplify provides data layer
**With EventBridge**: Events trigger read model updates via Lambda projections
**With Step Functions**: Commands flow through Step Functions, queries through Amplify
**With Cognito**: Seamless authentication and authorization integration

## More Information

* [AWS Amplify Gen2 Documentation](https://docs.amplify.aws/react/build-a-backend/data/)
* [AppSync GraphQL API](https://docs.aws.amazon.com/appsync/)
* [CQRS with Event Sourcing](https://martinfowler.com/bliki/CQRS.html)
* Related ADRs: ADR-0003 (CQRS Event Sourcing), ADR-0006 (Frontend Architecture)