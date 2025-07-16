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
- Claude Code SDK access
- GitHub account for repository management

### Installation

*Note: This is a research project. Installation instructions will be provided once the platform is developed.*

1. Clone the repository
2. Configure AWS credentials
3. Set up Claude Code SDK integration
4. Deploy infrastructure using SAM
5. Configure frontend with Amplify Gen2

## Development Roadmap

### Phase 1: Foundation (Months 1-3)
- Core architecture setup
- Claude Code SDK integration
- Basic UI for project configuration

### Phase 2: Core Features (Months 4-6)
- Visual designers for microservices
- GitHub integration
- CQRS implementation templates

### Phase 3: Enterprise Features (Months 7-9)
- Advanced template marketplace
- Monitoring and observability
- Security hardening

### Phase 4: Scale and Optimize (Months 10-12)
- Performance optimization
- Advanced AI features
- Multi-region deployment

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

🚧 **Research Phase**: This project is currently in the research and planning phase. The documentation represents the comprehensive vision for the platform based on detailed requirements analysis.

## Contact

For questions about this project, please refer to the research documentation in the `/research` directory.

---

*Skafu - Accelerating microservices development through intelligent scaffolding* 🚀