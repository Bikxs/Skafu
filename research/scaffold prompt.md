I now have a clear understanding of your scaffolding application. Here's the AI prompt for your deep research LLM to compile a comprehensive PRD:

---

**AI Research Prompt for PRD Generation:**

Create a comprehensive Product Requirements Document (PRD) for a full-stack scaffolding application that generates microservices-based applications. The scaffolding application itself follows the same architecture it generates for other projects.

**Core Architecture:**
- The scaffolding application is a single microservice with AWS SAM backend (Python Lambda functions and layers) and Amplify Gen2 frontend (React)
- It generates multi-microservice applications where each microservice has its own SAM backend and Amplify Gen2 frontend
- Generated applications follow CQRS pattern with command and query segregation

**Key Entities and Data Model:**
The scaffolding application manages these entities:
- GitHub Repositories (one per project)
- GitHub Templates
- Projects
- Microservices
- Data Models (for query side - AppSync GraphQL/DynamoDB)
- Command Models (for command side - API Gateway POST endpoints)

**Core Features:**
1. **AI-Assisted Project Creation**: Integration with Claude Code SDK (Python) in the backend for:
   - Analyzing detailed project descriptions
   - Conducting Q&A sessions to gather requirements
   - Auto-populating suggested fields for domain entities
   - Generating initial microservices and models

2. **Visual Project Configuration**: Web-based UI for:
   - Creating new projects with detailed descriptions
   - Defining microservices within projects
   - Designing data models (GraphQL schemas)
   - Defining command models (API endpoints)
   - Managing Jinja2 templates stored in S3

3. **Code Generation and GitHub Integration**:
   - Automatic GitHub repository creation for new projects
   - Initial code generation from GitHub templates
   - Pull Request creation when adding new microservices to existing projects
   - All microservices for a project exist in a single repository

4. **Template Management**:
   - Jinja2 templates stored in Amplify Gen2 storage (S3)
   - Customizable templates through the UI
   - Template versioning and management

**Generated Application Architecture:**
Each generated project includes:
- Multiple microservices in a monorepo structure
- Shared Cognito User Pool across all microservices
- Shared EventBridge event bus for inter-service communication
- SAM template for shared infrastructure provisioning

Each generated microservice includes:
- **Backend (AWS SAM)**:
  - Python Lambda functions for command handlers
  - API Gateway for POST command endpoints
  - Lambda layers for shared code
  
- **Frontend (Amplify Gen2)**:
  - Separate React application per microservice
  - Redux for state management and subscriptions
  - Amplify Gen2 data libraries for GraphQL queries
  - Command submission to API Gateway endpoints

- **CQRS Implementation**:
  - Query side: AppSync GraphQL API with DynamoDB
  - Command side: API Gateway → Lambda handlers → GraphQL mutations
  - Event-driven updates from command to query side

**Authentication and Security:**
- Scaffolding application uses Cognito for user authentication
- No multi-tenancy - single-tenant application
- Generated applications have their own Cognito User Pools

**Persistence and Data Storage:**
- AppSync/DynamoDB for scaffolding application's data persistence
- S3 for template storage via Amplify Gen2 storage
- Full project configuration history maintained

**User Workflow:**
1. User logs into scaffolding application
2. Creates new project with description
3. Claude Code SDK conducts Q&A session
4. System suggests initial microservices and models
5. User refines configuration through UI
6. System generates code and creates GitHub repository
7. User can return later to add new microservices (creates PR)

**Technical Requirements:**
- Support for modern React patterns in generated frontends
- Proper error handling and validation
- Scalable architecture for both scaffolding app and generated apps
- Comprehensive logging and monitoring
- CI/CD pipeline generation for created projects

Include sections on: Executive Summary, Problem Statement, Goals and Objectives, User Stories, Functional Requirements, Non-Functional Requirements, Technical Architecture, Security Considerations, Success Metrics, Timeline and Milestones, and Risks and Mitigation Strategies.