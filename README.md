# Skafu - AI-Powered Microservices Scaffolding Platform

**Skafu** (Swahili for "scaffold") is an innovative full-stack scaffolding application that leverages AI to generate microservices-based applications with enterprise-grade architecture patterns.

## Overview

Skafu addresses the critical challenge of accelerating enterprise application development while maintaining consistency, quality, and architectural standards. By integrating Claude Code SDK for intelligent project analysis and automated code generation, Skafu reduces project initialization time from weeks to minutes while ensuring adherence to CQRS patterns and microservices best practices.

### Key Features

- **🤖 AI-Assisted Project Creation**: Integration with Claude Code SDK for intelligent requirement gathering and code generation
- **🎨 Visual Project Configuration**: Web-based interface for designing microservices architecture
- **🔄 CQRS Implementation**: Automated separation of command and query responsibilities
- **📦 GitHub Integration**: Automatic repository creation and pull request management
- **🛠️ Template Management**: Jinja2-based template system with versioning and customization
- **🔐 Enterprise Security**: Built-in authentication, authorization, and compliance features

## Architecture

### Platform Architecture

Skafu follows a serverless microservices architecture using AWS managed services:

```
┌─────────────────────────────────────────────────────────┐
│                   Frontend (Amplify Gen2)                │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │ Project     │  │  Template    │  │  Preview      │  │
│  │ Designer    │  │  Editor      │  │  Engine       │  │
│  └─────────────┘  └──────────────┘  └───────────────┘  │
└─────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────┐
│                  API Gateway + Lambda                    │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │   Project   │  │   Template   │  │     Code      │  │
│  │   Service   │  │   Service    │  │  Generation   │  │
│  └─────────────┘  └──────────────┘  └───────────────┘  │
└─────────────────────────────────────────────────────────┘
                              │
                    ┌─────────┴─────────┐
                    ▼                   ▼
        ┌─────────────────┐   ┌─────────────────┐
        │  Claude Code    │   │    GitHub       │
        │      SDK        │   │      API        │
        └─────────────────┘   └─────────────────┘
```

### Generated Application Architecture

Each generated project includes:

- **Multiple microservices** in a monorepo structure
- **Shared Cognito User Pool** across all microservices
- **Shared EventBridge** event bus for inter-service communication
- **SAM templates** for shared infrastructure provisioning

**Per Microservice:**
- **Backend (AWS SAM)**: Python Lambda functions, API Gateway, shared layers
- **Frontend (Amplify Gen2)**: React application with Redux and GraphQL
- **CQRS Implementation**: Separate command and query sides with event-driven updates

## Technology Stack

### Backend
- **Runtime**: Python 3.12 Lambda functions
- **API**: AWS API Gateway for REST endpoints
- **GraphQL**: AWS AppSync for queries
- **Database**: DynamoDB for both command and query stores
- **Events**: EventBridge for event-driven architecture
- **AI Integration**: Claude Code SDK (Python)

### Frontend
- **Framework**: React 18 with TypeScript
- **State Management**: Redux Toolkit with RTK Query
- **UI Library**: AWS Amplify UI components
- **Editor**: Monaco Editor for template editing
- **Build Tool**: Vite for development

### Infrastructure
- **IaC**: AWS SAM for serverless infrastructure
- **Storage**: S3 for template storage via Amplify Storage
- **CDN**: CloudFront for global distribution
- **Monitoring**: CloudWatch with X-Ray tracing

## Core Entities

The platform manages these key entities:

- **Projects**: Container for related microservices
- **Microservices**: Individual service definitions
- **Data Models**: GraphQL schemas for query operations
- **Command Models**: API endpoints for write operations
- **Templates**: Jinja2 templates stored in S3
- **GitHub Repositories**: Generated project repositories

## User Workflow

1. **Project Creation**: User describes project requirements in natural language
2. **AI Analysis**: Claude Code SDK conducts Q&A session to gather detailed requirements
3. **Architecture Design**: System suggests initial microservices and data models
4. **Visual Configuration**: User refines configuration through web interface
5. **Code Generation**: System generates complete project structure
6. **GitHub Integration**: Automatic repository creation with initial code
7. **Iterative Development**: Add new microservices via pull requests

## Key Value Propositions

- **70% reduction** in project initialization time through AI-assisted scaffolding
- **Standardized architecture** across all generated applications ensuring consistency
- **Self-documenting design** where the scaffolding tool demonstrates its own patterns
- **Enterprise-ready** with built-in security, scalability, and monitoring capabilities

## Security Features

- **Authentication**: AWS Cognito with MFA support
- **Authorization**: Role-based access control and IAM policies
- **Data Protection**: Encryption at rest and in transit
- **Audit Trail**: Comprehensive logging of all actions
- **Template Security**: Sandboxed execution environment

## Performance Targets

- **Project Generation**: < 30 seconds
- **Template Rendering**: < 100ms per file
- **UI Response**: < 200ms for all interactions
- **AI Response**: < 3 seconds per question
- **Platform Availability**: 99.9% uptime SLA

## Getting Started

### Prerequisites

- AWS Account with appropriate permissions
- Node.js 18+ for frontend development
- Python 3.12+ for backend development
- AWS CLI configured
- SAM CLI installed
- Claude Code SDK access

### Phase 1 Implementation

The foundation infrastructure is now implemented and can be deployed:

```bash
# Clone the repository
git clone <repository-url>
cd Skafu

# Deploy the infrastructure
cd implementation
sam build
sam deploy --guided --config-env development

# Install frontend dependencies
cd frontend
npm install
npm run dev
```

### Project Structure

```
implementation/
├── template.yaml              # Root SAM template
├── shared/infrastructure/     # Shared resources (EventBridge, Cognito, etc.)
├── domains/observability/     # Observability domain implementation
├── shared/libraries/python/   # Event sourcing utilities
├── frontend/                  # React SPA with Amplify Gen2
└── reports/                   # Implementation reports
```

### Local Development

```bash
# Start SAM local API
sam local start-api

# Run frontend development server
cd frontend
npm run dev

# Run tests
npm test
```

## Development Roadmap

### ✅ Phase 1: Foundation & Infrastructure (COMPLETED)
- Event sourcing architecture with DynamoDB event store
- Nested SAM templates for infrastructure as code
- Shared Python libraries with AWS Powertools
- Observability domain foundation with Lambda functions
- Custom EventBridge buses for event-driven communication
- Cognito authentication with Groups-based RBAC
- Fine-grained IAM security and full X-Ray tracing

### 🔄 Phase 2: Backend Implementation (IN PROGRESS)
- Complete observability domain API endpoints
- Remaining Lambda functions (query metrics, alerts, security events)
- Amplify Gen2 GraphQL setup for read model queries
- Step Functions orchestration for read model updates
- Stubbed domain endpoints for project and template management

### 🔄 Phase 3: Frontend Implementation (NEXT)
- React components with Cloudscape Design System
- Redux state management and RTK Query integration
- Observability dashboard with real-time metrics
- Authentication flow with Cognito integration
- Responsive design and accessibility compliance

### 🔄 Phase 4: Integration & Testing (PLANNED)
- End-to-end testing with comprehensive test coverage
- Integration testing across all domains
- Performance testing and optimization
- Security testing and vulnerability scanning
- CI/CD pipeline with GitHub Actions

### 🔄 Phase 5: Production Deployment (PLANNED)
- Multi-AZ production deployment
- Performance monitoring and alerting
- Documentation and user guides
- Security hardening and compliance validation
- Production readiness review

## Success Metrics

### Primary Metrics
- **Adoption**: 500+ monthly active users within 6 months
- **Performance**: < 30 seconds average project generation time
- **Quality**: 100% architectural compliance score

### Secondary Metrics
- **Developer Satisfaction**: Net Promoter Score > 40
- **Operational**: 99.9% platform availability
- **Template Reuse**: > 60% reuse rate

## Contributing

This is currently a research project. Contribution guidelines will be established once the platform enters active development.

## License

*License information will be provided once the project is ready for public release.*

## Project Status

🚀 **Phase 1 Complete**: Foundation & Infrastructure implemented with event sourcing architecture

### Current Implementation Status
- ✅ **Phase 1**: Foundation & Infrastructure (COMPLETED)
  - Complete event sourcing architecture with DynamoDB event store
  - Nested SAM templates for infrastructure as code
  - Shared Python libraries with AWS Powertools integration
  - Observability domain with Lambda functions and Step Functions
  - Custom EventBridge buses for event-driven communication
  - Cognito authentication with Groups-based RBAC
  - Fine-grained IAM security with per-function roles
  - Full X-Ray tracing and CloudWatch monitoring

- 🔄 **Phase 2**: Backend Implementation (IN PROGRESS)
  - Complete observability domain API endpoints
  - Remaining Lambda functions for metrics, alerts, and system health
  - Amplify Gen2 GraphQL setup for read model queries
  - Step Functions orchestration for read model updates

### Implementation Architecture

```
Phase 1 Implementation:
implementation/
├── domains/
│   ├── observability/           # ✅ Foundation complete
│   │   ├── backend/            # Lambda functions + Step Functions
│   │   ├── frontend/           # React components (Phase 3)
│   │   └── template.yaml       # SAM template
│   ├── project-management/     # 🔄 Stubbed for Phase 2
│   └── template-management/    # 🔄 Stubbed for Phase 2
├── shared/
│   ├── infrastructure/         # ✅ Complete SAM templates
│   ├── libraries/             # ✅ Event sourcing utilities
│   └── testing/               # 🔄 Phase 4
├── frontend/                   # ✅ React + TypeScript foundation
└── reports/                    # ✅ Phase 1 implementation report
```

### Technology Stack Implemented
- **Backend**: Python 3.12 Lambda functions with AWS Powertools
- **Event Store**: DynamoDB with aggregateId/eventSequence pattern
- **Event Bus**: Custom EventBridge buses (skafu-events, skafu-errors)
- **Infrastructure**: AWS SAM with nested stacks
- **Security**: Cognito User Pool + fine-grained IAM roles
- **Monitoring**: X-Ray tracing + CloudWatch + structured logging
- **Frontend**: React 18 + TypeScript + Vite (foundation ready)

### Next Milestones
- **Phase 2**: Complete observability domain backend (Week 2-3)
- **Phase 3**: Frontend implementation with Cloudscape Design System (Week 3-4)
- **Phase 4**: Integration testing and CI/CD pipeline (Week 4-5)
- **Phase 5**: Production deployment and documentation (Week 5-6)

## Contact

For questions about this project, please refer to the research documentation in the `/research` directory.

---

*Skafu - Accelerating microservices development through intelligent scaffolding* 🚀