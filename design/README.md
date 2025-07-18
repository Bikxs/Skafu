# Skafu System Design Documentation

This directory contains comprehensive design documentation for the Skafu microservices scaffolding application.

## Structure

### 📋 [Architecture Decision Records (ADRs)](./adr/)
Documentation of significant architectural decisions with context, options considered, and consequences.

### 🏗️ [Overview](./overview/)
System-wide architecture, domain model, and event flow documentation.

### 🎯 [Domains](./domains/)
Domain-driven design documentation for each bounded context:
- **Project Management**: Core business logic for project creation and management
- **Template Management**: Jinja2 template storage and processing
- **AI Integration**: Claude Code SDK integration
- **GitHub Integration**: Repository and workflow automation
- **Observability**: Monitoring and operations data exposure

### 🤝 [Contracts](./contracts/)
Interface definitions between domains and external systems:
- **Events**: AsyncAPI schemas for domain events
- **Commands**: Command definitions and APIs
- **Data Models**: Shared types and GraphQL schemas

### 🎨 [Frontend](./frontend/)
UI architecture and component design:
- **State Management**: Redux Toolkit patterns
- **Components**: Cloudscape.design integration
- **Integration**: Amplify Gen2 and API Gateway patterns

### 🔐 [Security](./security/)
Security architecture and implementation patterns.

### 🚀 [Deployment](./deployment/)
Infrastructure and CI/CD patterns.

## Design Principles

1. **Domain-Driven Design**: Organize by business domains with clear boundaries
2. **Event-Driven Architecture**: Loose coupling through EventBridge
3. **CQRS + Event Sourcing**: Separate command/query responsibilities with event store
4. **Serverless-First**: AWS Lambda, API Gateway, and managed services
5. **Observability First**: Comprehensive monitoring and debugging support

## Implementation Status

**Current Phase**: MVP Implementation with full event sourcing architecture

- **Data Access**: Event sourcing with DynamoDB event store
- **Command APIs**: REST endpoints for commands
- **Query APIs**: GraphQL (Amplify Gen2) for queries
- **Event Flow**: Commands → Events → EventBridge → Read Model Updates
- **Domains**: Observability domain functional, others stubbed
- **Frontend**: React + Redux + Cloudscape Design System

See [IMPLEMENTATION_NOTES.md](./IMPLEMENTATION_NOTES.md) for detailed alignment between design vision and current implementation.

## Getting Started

1. Review [Architecture Overview](./overview/architecture-overview.md)
2. Read key [ADRs](./adr/) for context on major decisions
3. Explore domain-specific designs in [Domains](./domains/)
4. Check [Contracts](./contracts/) for integration points

## Diagram Generation

Mermaid diagrams are stored as `.mmd` files in `images/` folders and converted to PNG using:

```bash
mmdc -i diagram.mmd -o diagram.png
```