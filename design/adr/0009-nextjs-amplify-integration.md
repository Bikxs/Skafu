# ADR-0009: Next.js with Amplify Gen2 Integration

**Status**: 🟢 Accepted  
**Date**: 2025-01-19  
**Deciders**: Development Team

## Context and Problem Statement

We need to select a React framework that provides optimal integration with AWS Amplify Gen2, supports our CQRS architecture with dual data patterns, enables client-side rendering for real-time features, and offers excellent developer experience with TypeScript and modern tooling.

## Decision Drivers

* Seamless integration with AWS Amplify Gen2 Data and authentication
* Support for client-side rendering to maintain real-time capabilities
* CQRS architecture requiring dual API patterns (Amplify Data + API Gateway)
* File-based routing for intuitive navigation structure
* Built-in optimization and bundling without custom configuration
* TypeScript-first development experience
* Deployment compatibility with AWS Amplify Hosting
* No need for server-side API routes (backend via Lambda)

## Considered Options

* **Option 1**: React + Vite + React Router (current)
* **Option 2**: Next.js with app directory (recommended)
* **Option 3**: Remix with Amplify integration
* **Option 4**: Create React App with custom routing

## Decision Outcome

Chosen option: **"Next.js with App Directory"**, because it provides seamless Amplify Gen2 integration, eliminates custom build configuration, offers intuitive file-based routing, and supports our client-side rendering requirements while maintaining excellent TypeScript support.

### Implementation Details

**Next.js Configuration for CSR + Amplify**:

```typescript
// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export', // Enable static export for Amplify Hosting
  trailingSlash: true,
  images: {
    unoptimized: true // Required for static export
  },
  // Client-side rendering only
  experimental: {
    // Disable server components where needed
  }
};

module.exports = nextConfig;
```

**App Directory Structure**:
```
app/
├── layout.tsx                    # Root layout with Amplify Authenticator
├── page.tsx                      # Dashboard homepage
├── globals.css                   # Global styles and Cloudscape imports
├── lib/
│   ├── amplify/
│   │   ├── client.ts            # Amplify Data client setup
│   │   ├── schema.ts            # Data models definition
│   │   └── auth.ts              # Authentication configuration
│   ├── store/
│   │   ├── index.ts             # Redux store configuration
│   │   ├── amplifyApi.ts        # Custom RTK Query for Amplify Data
│   │   ├── observabilityApi.ts  # Standard RTK Query for API Gateway
│   │   └── middleware/
│   │       └── subscriptions.ts # Real-time subscription middleware
│   └── utils/
├── projects/
│   ├── page.tsx                 # Projects list page
│   ├── create/
│   │   └── page.tsx            # Create project page
│   ├── [projectId]/
│   │   ├── page.tsx            # Project detail hub
│   │   ├── edit/
│   │   │   └── page.tsx        # Edit project page
│   │   └── deployments/
│   │       └── page.tsx        # Project deployments page
│   └── components/
│       ├── ProjectCard.tsx
│       ├── ProjectForm.tsx
│       └── ProjectHeroSection.tsx
├── templates/
│   ├── page.tsx                # Templates list page
│   ├── [templateId]/
│   │   └── page.tsx           # Template detail hub
│   └── components/
├── observability/
│   ├── page.tsx               # Observability hub
│   ├── metrics/
│   │   └── page.tsx          # Metrics dashboard
│   ├── logs/
│   │   └── page.tsx          # Logs viewer
│   └── alerts/
│       └── page.tsx          # Alert management
└── settings/
    └── page.tsx               # Settings page
```

**Root Layout with Amplify Integration**:

```typescript
// app/layout.tsx
'use client';

import { Amplify } from 'aws-amplify';
import { Authenticator } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';
import '@cloudscape-design/global-styles/index.css';
import { applyMode, Mode } from '@cloudscape-design/global-styles';
import { Provider } from 'react-redux';
import { store } from './lib/store';
import { AmplifyClientProvider } from './lib/amplify/client';
import amplifyConfig from './lib/amplify/auth';

Amplify.configure(amplifyConfig);
applyMode(Mode.Light);

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Authenticator.Provider>
          <Authenticator hideSignUp={false}>
            <Provider store={store}>
              <AmplifyClientProvider>
                <main>{children}</main>
              </AmplifyClientProvider>
            </Provider>
          </Authenticator>
        </Authenticator.Provider>
      </body>
    </html>
  );
}
```

**Amplify Data Client Setup**:

```typescript
// app/lib/amplify/client.tsx
'use client';

import { createContext, useContext, ReactNode } from 'react';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from './schema';

const client = generateClient<Schema>();

const AmplifyClientContext = createContext<typeof client>(client);

export const AmplifyClientProvider = ({ children }: { children: ReactNode }) => {
  return (
    <AmplifyClientContext.Provider value={client}>
      {children}
    </AmplifyClientContext.Provider>
  );
};

export const useAmplifyClient = () => {
  const context = useContext(AmplifyClientContext);
  if (!context) {
    throw new Error('useAmplifyClient must be used within AmplifyClientProvider');
  }
  return context;
};
```

**Amplify Data Schema Definition**:

```typescript
// app/lib/amplify/schema.ts
import { a, defineData, type ClientSchema } from '@aws-amplify/backend';

const schema = a.schema({
  // Project Model
  Project: a.model({
    id: a.id().required(),
    name: a.string().required(),
    description: a.string(),
    status: a.enum(['draft', 'active', 'archived']),
    templateId: a.id().required(),
    ownerId: a.id().required(),
    createdAt: a.datetime(),
    updatedAt: a.datetime(),
    
    // Relationships
    template: a.belongsTo('Template', 'templateId'),
    owner: a.belongsTo('User', 'ownerId'),
    members: a.hasMany('ProjectMember', 'projectId'),
    deployments: a.hasMany('Deployment', 'projectId'),
  }).authorization(allow => [
    allow.owner(),
    allow.groups(['admin']).to(['read', 'create', 'update', 'delete']),
    allow.groups(['developer']).to(['read', 'create', 'update']),
    allow.groups(['viewer']).to(['read'])
  ]),

  // Template Model
  Template: a.model({
    id: a.id().required(),
    name: a.string().required(),
    description: a.string(),
    category: a.enum(['react', 'nodejs', 'python', 'nextjs']),
    framework: a.string().required(),
    runtime: a.string().required(),
    parameters: a.json(),
    isPublic: a.boolean().default(false),
    authorId: a.id().required(),
    
    // Relationships
    author: a.belongsTo('User', 'authorId'),
    projects: a.hasMany('Project', 'templateId'),
  }).authorization(allow => [
    allow.owner(),
    allow.authenticated().to(['read']),
    allow.groups(['admin']).to(['read', 'create', 'update', 'delete'])
  ]),

  // User Model
  User: a.model({
    id: a.id().required(),
    email: a.email().required(),
    name: a.string().required(),
    role: a.enum(['admin', 'developer', 'viewer']),
    preferences: a.json(),
    lastActiveAt: a.datetime(),
    
    // Relationships
    ownedProjects: a.hasMany('Project', 'ownerId'),
    templates: a.hasMany('Template', 'authorId'),
    memberships: a.hasMany('ProjectMember', 'userId'),
  }).authorization(allow => [
    allow.owner(),
    allow.authenticated().to(['read']),
    allow.groups(['admin']).to(['read', 'update'])
  ]),

  // Project Member Join Table
  ProjectMember: a.model({
    id: a.id().required(),
    projectId: a.id().required(),
    userId: a.id().required(),
    role: a.enum(['owner', 'admin', 'developer', 'viewer']),
    joinedAt: a.datetime(),
    
    // Relationships
    project: a.belongsTo('Project', 'projectId'),
    user: a.belongsTo('User', 'userId'),
  }).authorization(allow => [
    allow.owner(),
    allow.groups(['admin']).to(['read', 'create', 'update', 'delete'])
  ]),

  // Deployment Model
  Deployment: a.model({
    id: a.id().required(),
    projectId: a.id().required(),
    environment: a.enum(['dev', 'staging', 'prod']),
    status: a.enum(['pending', 'deploying', 'success', 'failed']),
    version: a.string(),
    deployedAt: a.datetime(),
    deployedBy: a.id().required(),
    
    // Relationships
    project: a.belongsTo('Project', 'projectId'),
    deployer: a.belongsTo('User', 'deployedBy'),
  }).authorization(allow => [
    allow.authenticated().to(['read']),
    allow.groups(['admin', 'developer']).to(['read', 'create'])
  ]),
});

export type Schema = ClientSchema<typeof schema>;
export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'userPool',
    userPoolAuthorizationMode: {
      userPoolId: 'us-east-1_XXXXXXXXX', // Will be set by Amplify
    },
  },
});
```

**Custom RTK Query BaseQuery for Amplify Data**:

```typescript
// app/lib/store/amplifyApi.ts
import { createApi, BaseQueryFn } from '@reduxjs/toolkit/query/react';
import { useAmplifyClient } from '../amplify/client';
import type { Schema } from '../amplify/schema';

// Custom baseQuery for Amplify Data
const amplifyBaseQuery: BaseQueryFn<
  {
    model: keyof Schema;
    operation: 'list' | 'get' | 'create' | 'update' | 'delete';
    data?: any;
    id?: string;
    filter?: any;
  },
  unknown,
  unknown
> = async ({ model, operation, data, id, filter }, { getState }) => {
  try {
    const client = useAmplifyClient();
    
    switch (operation) {
      case 'list':
        const listResult = await client.models[model].list(filter ? { filter } : undefined);
        return { data: listResult.data };
        
      case 'get':
        if (!id) throw new Error('ID required for get operation');
        const getResult = await client.models[model].get({ id });
        return { data: getResult.data };
        
      case 'create':
        const createResult = await client.models[model].create(data);
        return { data: createResult.data };
        
      case 'update':
        if (!id) throw new Error('ID required for update operation');
        const updateResult = await client.models[model].update({ id, ...data });
        return { data: updateResult.data };
        
      case 'delete':
        if (!id) throw new Error('ID required for delete operation');
        const deleteResult = await client.models[model].delete({ id });
        return { data: deleteResult.data };
        
      default:
        throw new Error(`Unsupported operation: ${operation}`);
    }
  } catch (error) {
    return { error: { status: 'FETCH_ERROR', error: error.message } };
  }
};

// Project API slice
export const projectApi = createApi({
  reducerPath: 'projectApi',
  baseQuery: amplifyBaseQuery,
  tagTypes: ['Project', 'ProjectMember'],
  endpoints: (builder) => ({
    getProjects: builder.query({
      query: (filter) => ({ 
        model: 'Project', 
        operation: 'list',
        filter 
      }),
      providesTags: ['Project'],
    }),
    getProject: builder.query({
      query: (id) => ({ 
        model: 'Project', 
        operation: 'get', 
        id 
      }),
      providesTags: (result, error, id) => [{ type: 'Project', id }],
    }),
    createProject: builder.mutation({
      query: (data) => ({ 
        model: 'Project', 
        operation: 'create', 
        data 
      }),
      invalidatesTags: ['Project'],
    }),
    updateProject: builder.mutation({
      query: ({ id, ...data }) => ({ 
        model: 'Project', 
        operation: 'update', 
        id, 
        data 
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Project', id }],
    }),
    deleteProject: builder.mutation({
      query: (id) => ({ 
        model: 'Project', 
        operation: 'delete', 
        id 
      }),
      invalidatesTags: ['Project'],
    }),
  }),
});

export const {
  useGetProjectsQuery,
  useGetProjectQuery,
  useCreateProjectMutation,
  useUpdateProjectMutation,
  useDeleteProjectMutation,
} = projectApi;
```

**Subscription Middleware for Real-time Updates**:

```typescript
// app/lib/store/middleware/subscriptions.ts
import { Middleware } from '@reduxjs/toolkit';
import { projectApi } from '../amplifyApi';

interface SubscriptionManager {
  subscriptions: Map<string, any>;
  add: (key: string, subscription: any) => void;
  remove: (key: string) => void;
  removeAll: () => void;
}

const subscriptionManager: SubscriptionManager = {
  subscriptions: new Map(),
  add(key, subscription) {
    this.subscriptions.set(key, subscription);
  },
  remove(key) {
    const subscription = this.subscriptions.get(key);
    if (subscription) {
      subscription.unsubscribe();
      this.subscriptions.delete(key);
    }
  },
  removeAll() {
    this.subscriptions.forEach(subscription => subscription.unsubscribe());
    this.subscriptions.clear();
  }
};

export const subscriptionMiddleware: Middleware = (store) => (next) => (action) => {
  // Handle subscription setup actions
  if (action.type === 'subscriptions/setup') {
    const { model, operation } = action.payload;
    const client = useAmplifyClient();
    
    const subscriptionKey = `${model}-${operation}`;
    
    // Remove existing subscription if any
    subscriptionManager.remove(subscriptionKey);
    
    // Create new subscription
    const subscription = client.models[model][operation]().subscribe({
      next: (data) => {
        // Invalidate relevant RTK Query cache
        if (model === 'Project') {
          store.dispatch(projectApi.util.invalidateTags(['Project']));
        }
        // Add more model types as needed
      },
      error: (error) => {
        console.error(`Subscription error for ${subscriptionKey}:`, error);
      }
    });
    
    subscriptionManager.add(subscriptionKey, subscription);
  }
  
  // Handle subscription cleanup
  if (action.type === 'subscriptions/cleanup') {
    const { model, operation } = action.payload;
    subscriptionManager.remove(`${model}-${operation}`);
  }
  
  // Handle cleanup all subscriptions
  if (action.type === 'subscriptions/cleanupAll') {
    subscriptionManager.removeAll();
  }
  
  return next(action);
};
```

**Redux Store Configuration**:

```typescript
// app/lib/store/index.ts
import { configureStore } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';
import { projectApi } from './amplifyApi';
import { templateApi } from './templateApi';
import { userApi } from './userApi';
import { observabilityApi } from './observabilityApi';
import { subscriptionMiddleware } from './middleware/subscriptions';
import uiSlice from './slices/uiSlice';

export const store = configureStore({
  reducer: {
    // Amplify Data APIs
    [projectApi.reducerPath]: projectApi.reducer,
    [templateApi.reducerPath]: templateApi.reducer,
    [userApi.reducerPath]: userApi.reducer,
    
    // API Gateway APIs
    [observabilityApi.reducerPath]: observabilityApi.reducer,
    
    // UI State
    ui: uiSlice,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['subscriptions/setup', 'subscriptions/cleanup'],
      },
    })
      .concat(projectApi.middleware)
      .concat(templateApi.middleware)
      .concat(userApi.middleware)
      .concat(observabilityApi.middleware)
      .concat(subscriptionMiddleware),
});

setupListeners(store.dispatch);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
```

**Component Usage Pattern**:

```typescript
// app/projects/page.tsx
'use client';

import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { 
  SpaceBetween, 
  Header, 
  Button, 
  Cards,
  Container
} from '@cloudscape-design/components';
import { useGetProjectsQuery } from '../lib/store/amplifyApi';
import { ProjectCard } from './components/ProjectCard';

export default function ProjectsPage() {
  const dispatch = useDispatch();
  const { 
    data: projects, 
    isLoading, 
    error 
  } = useGetProjectsQuery({});

  // Setup real-time subscriptions
  useEffect(() => {
    dispatch({ 
      type: 'subscriptions/setup', 
      payload: { model: 'Project', operation: 'onCreate' } 
    });
    dispatch({ 
      type: 'subscriptions/setup', 
      payload: { model: 'Project', operation: 'onUpdate' } 
    });
    dispatch({ 
      type: 'subscriptions/setup', 
      payload: { model: 'Project', operation: 'onDelete' } 
    });

    return () => {
      dispatch({ type: 'subscriptions/cleanupAll' });
    };
  }, [dispatch]);

  if (isLoading) return <div>Loading projects...</div>;
  if (error) return <div>Error loading projects</div>;

  return (
    <SpaceBetween direction="vertical" size="l">
      <Header
        variant="h1"
        description="Manage and organize your projects"
        actions={
          <Button variant="primary" href="/projects/create">
            Create Project
          </Button>
        }
      >
        Projects
      </Header>
      
      <Container>
        <Cards
          items={projects || []}
          cardDefinition={{
            header: (project) => project.name,
            sections: [
              {
                id: 'description',
                content: (project) => project.description
              }
            ]
          }}
          trackBy="id"
        />
      </Container>
    </SpaceBetween>
  );
}
```

### Build and Deployment Configuration

**AWS Amplify Hosting Integration**:

```yaml
# amplify.yml
version: 1
backend:
  phases:
    build:
      commands:
        - npm ci --cache .npm --prefer-offline
        - npx ampx generate
frontend:
  phases:
    preBuild:
      commands:
        - npm ci --cache .npm --prefer-offline
    build:
      commands:
        - npm run build
  artifacts:
    baseDirectory: out
    files:
      - '**/*'
  cache:
    paths:
      - .next/cache/**/*
      - .npm/**/*
```

**Package.json Scripts**:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "type-check": "tsc --noEmit"
  },
  "dependencies": {
    "next": "^14.0.0",
    "react": "^18.0.0",
    "react-dom": "^18.0.0",
    "@aws-amplify/ui-react": "^6.0.0",
    "aws-amplify": "^6.0.0",
    "@reduxjs/toolkit": "^2.0.0",
    "react-redux": "^9.0.0",
    "@cloudscape-design/components": "^3.0.0",
    "@cloudscape-design/global-styles": "^1.0.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "@types/react": "^18.0.0",
    "@types/react-dom": "^18.0.0",
    "typescript": "^5.0.0",
    "eslint": "^8.0.0",
    "eslint-config-next": "^14.0.0"
  }
}
```

### Consequences

**Good**:
* **Seamless Amplify Integration**: Built-in support for Amplify Gen2 with minimal configuration
* **File-based Routing**: Intuitive navigation structure with app directory
* **Zero Configuration**: No need for custom webpack or build setup
* **TypeScript First**: Excellent TypeScript support out of the box
* **Client-side Rendering**: Perfect for real-time applications with auth state
* **Optimized Bundling**: Automatic code splitting and optimization
* **AWS Deployment**: Native integration with Amplify Hosting

**Bad**:
* **Framework Lock-in**: Tied to Next.js conventions and patterns
* **Learning Curve**: Team needs to understand app directory structure
* **Static Export Limitations**: Some Next.js features not available with static export
* **Bundle Size**: Slightly larger than minimal React setups
* **Migration Complexity**: Requires updating existing React Router code

## Related ADRs

* ADR-0006: Frontend Architecture with Redux Toolkit and Amplify
* ADR-0007: Cloudscape Design System
* ADR-0008: Cloudscape Details Page as Hub Pattern

## More Information

* [Next.js App Directory Documentation](https://nextjs.org/docs/app)
* [AWS Amplify Gen2 Documentation](https://docs.amplify.aws/nextjs/)
* [Amplify Data Documentation](https://docs.amplify.aws/nextjs/build-a-backend/data/)
* [Next.js Static Export](https://nextjs.org/docs/app/building-your-application/deploying/static-exports)