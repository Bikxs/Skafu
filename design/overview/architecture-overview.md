# Skafu System Architecture Overview

## System Vision

Skafu is a microservices scaffolding application that leverages AI-powered analysis to generate, customize, and deploy serverless microservices architectures on AWS. The system combines event-driven architecture, CQRS patterns, and modern frontend technologies to provide a comprehensive development platform.

## High-Level Architecture

### Core Architectural Principles

1. **Event-Driven Architecture**: All domains communicate through EventBridge events
2. **CQRS + Event Sourcing**: Separate command/query responsibilities with event persistence
3. **Serverless-First**: AWS Lambda, Step Functions, and managed services
4. **Domain-Driven Design**: Business logic organized by bounded contexts
5. **Configuration over Code**: Prefer declarative Step Functions workflows

### System Components

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Skafu Architecture                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐         │
│  │   Frontend      │    │   API Gateway   │    │   EventBridge   │         │
│  │   (React +      │────│   (REST APIs)   │    │   (Event Bus)   │         │
│  │   Amplify)      │    │                 │    │                 │         │
│  └─────────────────┘    └─────────────────┘    └─────────────────┘         │
│           │                       │                       │                 │
│           │                       │                       │                 │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐         │
│  │   Amplify Gen2  │    │  Step Functions │    │   Error Bus     │         │
│  │   (GraphQL)     │    │  (Workflows)    │    │   (Monitoring)  │         │
│  └─────────────────┘    └─────────────────┘    └─────────────────┘         │
│           │                       │                       │                 │
│           │                       │                       │                 │
│  ┌─────────────────────────────────────────────────────────────────────────┤
│  │                        Domain Layer                                     │
│  │                                                                         │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐      │
│  │  │  Project    │ │  Template   │ │     AI      │ │   GitHub    │      │
│  │  │ Management  │ │ Management  │ │ Integration │ │ Integration │      │
│  │  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘      │
│  │                                                                         │
│  │  ┌─────────────────────────────────────────────────────────────────────┤
│  │  │                    Observability Domain                            │
│  │  │   ┌─────────────┐ ┌─────────────┐ ┌─────────────┐                 │
│  │  │   │  Monitoring │ │  Analytics  │ │  Security   │                 │
│  │  │   │             │ │             │ │  Events     │                 │
│  │  │   └─────────────┘ └─────────────┘ └─────────────┘                 │
│  │  └─────────────────────────────────────────────────────────────────────┤
│  └─────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────────┤
│  │                        Data Layer                                       │
│  │                                                                         │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐      │
│  │  │  DynamoDB   │ │     S3      │ │   Secrets   │ │ CloudWatch  │      │
│  │  │ (Events)    │ │(Templates)  │ │  Manager    │ │  (Metrics)  │      │
│  │  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘      │
│  └─────────────────────────────────────────────────────────────────────────┘
└─────────────────────────────────────────────────────────────────────────────┘
```

## Domain Architecture

### Bounded Contexts

#### 1. Project Management Domain
**Purpose**: Core business logic for project creation, configuration, and lifecycle management

**Key Components**:
- Project aggregate with lifecycle events
- Configuration management
- Template selection and customization
- Deployment orchestration

**Events Published**:
- `ProjectCreated`
- `ProjectConfigured`
- `ProjectDeployed`
- `ProjectDeleted`

#### 2. Template Management Domain
**Purpose**: Jinja2 template storage, versioning, and processing

**Key Components**:
- Template repository (S3)
- Template validation and processing
- Parameter definition and validation
- Template rendering engine

**Events Published**:
- `TemplateUploaded`
- `TemplateValidated`
- `TemplateRendered`

#### 3. AI Integration Domain
**Purpose**: Claude SDK integration for intelligent project analysis and code generation

**Key Components**:
- Claude client wrapper
- Project analysis workflows
- Code generation pipelines
- Recommendation engine

**Events Published**:
- `AIAnalysisRequested`
- `AIAnalysisCompleted`
- `CodeGenerated`
- `RecommendationGenerated`

#### 4. GitHub Integration Domain
**Purpose**: Repository automation and workflow management

**Key Components**:
- GitHub API integration
- Repository creation and management
- Workflow automation
- Pull request management

**Events Published**:
- `RepositoryCreated`
- `WorkflowTriggered`
- `DeploymentCompleted`

#### 5. Observability Domain
**Purpose**: System monitoring, analytics, and operational data exposure

**Key Components**:
- Metrics collection and aggregation
- Log analysis and correlation
- Dashboard data APIs
- Alert management

**Events Published**:
- `MetricCollected`
- `AlertTriggered`
- `DashboardUpdated`

## Data Architecture

### CQRS + Event Sourcing Pattern

```
Command Side                    Event Store                    Query Side
─────────────                  ─────────────                  ──────────

┌─────────────┐               ┌─────────────┐               ┌─────────────┐
│   Command   │──────────────▶│  DynamoDB   │──────────────▶│  Amplify    │
│  Handlers   │               │ Event Store │               │  GraphQL    │
│             │               │             │               │   Schema    │
└─────────────┘               └─────────────┘               └─────────────┘
       │                             │                             │
       │                             │                             │
       ▼                             ▼                             ▼
┌─────────────┐               ┌─────────────┐               ┌─────────────┐
│    Step     │               │ EventBridge │               │   React     │
│  Functions  │               │  Events     │               │  Frontend   │
│             │               │             │               │             │
└─────────────┘               └─────────────┘               └─────────────┘
```

### Event Flow

1. **Command Processing**: REST API → Step Functions → Command Handlers
2. **Event Persistence**: Command Handlers → DynamoDB Event Store
3. **Event Publication**: DynamoDB Streams → EventBridge
4. **Query Updates**: EventBridge → Query Handlers → Amplify DataStore
5. **Frontend Updates**: Amplify DataStore → React Components

## Security Architecture

### Security Layers

1. **API Gateway**: Request validation, WAF protection, rate limiting
2. **Authentication**: Cognito User Pools with OAuth 2.0
3. **Authorization**: Fine-grained IAM roles and policies
4. **Data Protection**: Encryption at rest and in transit
5. **Monitoring**: GuardDuty, Security Hub, CloudTrail
6. **Secret Management**: AWS Secrets Manager integration

### Security Event Flow

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  GuardDuty  │────│ Security    │────│ Error Bus   │
│  Findings   │    │ Hub Events  │    │ Correlation │
└─────────────┘    └─────────────┘    └─────────────┘
       │                    │                    │
       │                    │                    │
       ▼                    ▼                    ▼
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│ CloudWatch  │    │ Lambda      │    │ Dashboard   │
│ Alarms      │    │ Processing  │    │ Updates     │
└─────────────┘    └─────────────┘    └─────────────┘
```

## Integration Patterns

### External System Integration

#### GitHub API Integration
- **Pattern**: Event-driven webhook processing
- **Authentication**: GitHub App with JWT tokens
- **Rate Limiting**: Token bucket with backoff
- **Error Handling**: Retry with exponential backoff

#### Claude API Integration
- **Pattern**: Embedded SDK per service
- **Authentication**: API keys in Secrets Manager
- **Cost Control**: Usage tracking and limits
- **Caching**: Response caching for common queries

#### AWS Service Integration
- **Pattern**: Native SDK integration
- **Authentication**: IAM roles and policies
- **Monitoring**: CloudWatch metrics and alarms
- **Error Handling**: Circuit breaker pattern

### Inter-Domain Communication

#### Event-Driven Communication
- **Primary**: EventBridge for domain events
- **Secondary**: Error Bus for error correlation
- **Patterns**: Publish-subscribe, event sourcing
- **Guarantees**: At-least-once delivery

#### Synchronous Communication
- **Pattern**: Direct Lambda invocation (minimal usage)
- **Use Cases**: Critical path operations only
- **Timeout**: 30-second maximum
- **Fallback**: Asynchronous event publication

## Deployment Architecture

### Infrastructure as Code

```yaml
# SAM Template Structure
Skafu Application
├── Global Resources
│   ├── EventBridge Bus
│   ├── Error Bus
│   ├── S3 Buckets
│   └── Cognito User Pool
├── Domain Stacks
│   ├── Project Management
│   ├── Template Management
│   ├── AI Integration
│   ├── GitHub Integration
│   └── Observability
└── Shared Resources
    ├── Lambda Layers
    ├── IAM Roles
    └── Security Groups
```

### Environment Strategy

- **Development**: Single-stack deployment with mocked external services
- **Staging**: Full integration testing with external services
- **Production**: Multi-AZ deployment with high availability

### CI/CD Pipeline

```
GitHub Push → Quality Gates → Build → Deploy Dev → Integration Tests → 
Deploy Staging → E2E Tests → Deploy Production → Smoke Tests → Monitor
```

## Monitoring & Observability

### Observability Strategy

1. **Metrics**: Custom CloudWatch metrics for business and technical KPIs
2. **Logging**: Structured logging with correlation IDs
3. **Tracing**: X-Ray distributed tracing across services
4. **Alerting**: CloudWatch alarms with SNS notifications
5. **Dashboards**: Custom dashboards for operational visibility

### Key Metrics

- **Business Metrics**: Project creation rate, template usage, deployment success
- **Technical Metrics**: Lambda duration, API Gateway latency, event processing time
- **Security Metrics**: Authentication failures, security findings, policy violations
- **Cost Metrics**: Service costs, resource utilization, optimization opportunities

## Performance Characteristics

### Scalability Targets

- **Concurrent Users**: 1,000+ simultaneous users
- **Project Creation**: 100+ projects per hour
- **Template Processing**: 1,000+ templates per hour
- **Event Processing**: 10,000+ events per minute

### Performance Budgets

- **API Response Time**: < 500ms for 95th percentile
- **Page Load Time**: < 3 seconds on 3G networks
- **Event Processing**: < 1 second average latency
- **Template Rendering**: < 10 seconds for complex templates

## Technology Stack

### Backend Technologies
- **Runtime**: Python 3.9, Node.js 18
- **Frameworks**: AWS SAM, Step Functions
- **Databases**: DynamoDB, S3
- **Messaging**: EventBridge, SQS, SNS
- **AI/ML**: Claude SDK, AWS Bedrock

### Frontend Technologies
- **Framework**: React 18 with TypeScript
- **State Management**: Redux Toolkit
- **UI Library**: Cloudscape Design System
- **Build Tool**: Vite
- **Deployment**: AWS Amplify

### Infrastructure
- **Cloud Provider**: AWS
- **IaC**: CloudFormation (SAM)
- **CI/CD**: GitHub Actions
- **Monitoring**: CloudWatch, X-Ray
- **Security**: GuardDuty, Security Hub

## Compliance & Governance

### Security Compliance
- **Data Protection**: GDPR, CCPA compliance
- **Access Control**: Role-based access control (RBAC)
- **Audit Trail**: Complete audit logging
- **Encryption**: End-to-end encryption

### Operational Governance
- **Code Quality**: Automated testing, static analysis
- **Documentation**: Architecture decision records (ADRs)
- **Change Management**: Pull request reviews, deployment approvals
- **Incident Response**: Automated alerting, runbooks

## Future Considerations

### Scalability Improvements
- **Caching**: Redis for frequently accessed data
- **CDN**: CloudFront for static assets
- **Database**: Read replicas for query scaling
- **Compute**: Auto-scaling policies

### Feature Enhancements
- **Multi-Cloud**: Azure, GCP template support
- **Languages**: Additional runtime support
- **Integrations**: More version control systems
- **AI**: Enhanced code generation capabilities

This architecture provides a solid foundation for building a scalable, secure, and maintainable microservices scaffolding platform that can evolve with changing requirements and technological advances.