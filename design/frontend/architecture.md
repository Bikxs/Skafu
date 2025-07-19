# Frontend Architecture Design

## Overview

The Skafu frontend is a modern Next.js application built with AWS Amplify Gen2, implementing a component-based architecture using Cloudscape Design System, Redux Toolkit for state management, and TypeScript for type safety. The application follows best practices for scalability, maintainability, and user experience with seamless AWS integration.

## Technology Stack

### Core Technologies
- **Next.js 14**: React framework with app directory and file-based routing
- **React 18**: Modern React with hooks and concurrent features
- **TypeScript**: Type-safe JavaScript with strong typing
- **AWS Amplify Gen2**: Full-stack framework for authentication and data management
- **Cloudscape Design System**: AWS's design system for consistent UI components
- **Redux Toolkit (RTK)**: State management with dual API pattern (Amplify Data + API Gateway)
- **@aws-amplify/ui-react**: Pre-built authentication components

### Build and Development Tools
- **Next.js Built-in Bundling**: Zero-configuration build system
- **ESLint**: Code linting and quality enforcement
- **Prettier**: Code formatting
- **Jest**: Unit testing framework
- **React Testing Library**: Component testing utilities
- **Cypress**: End-to-end testing

## Architecture Patterns

### Next.js App Directory Structure

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

### Domain-Based Organization with Next.js App Router

```typescript
// Domain structure example: app/projects/
app/projects/
├── page.tsx                     # Projects list page
├── create/
│   └── page.tsx                # Create project page
├── [projectId]/
│   ├── page.tsx               # Project detail hub
│   ├── edit/
│   │   └── page.tsx          # Edit project page
│   └── loading.tsx           # Loading UI
├── components/                 # Project-specific components
│   ├── ProjectCard.tsx
│   ├── ProjectForm.tsx
│   ├── ProjectHeroSection.tsx
│   └── RelatedResourcesCard.tsx
├── hooks/                     # Project-specific hooks
│   ├── useProjects.ts
│   └── useProjectSubscriptions.ts
└── types/                     # Project-specific types
    └── project.types.ts

// Shared library structure: app/lib/
app/lib/
├── store/                     # Redux configuration
│   ├── index.ts              # Store setup
│   ├── amplifyApi.ts         # Amplify Data RTK Query
│   └── observabilityApi.ts   # API Gateway RTK Query
├── amplify/                   # Amplify configuration
│   ├── schema.ts             # Data models
│   └── client.ts             # Data client
└── utils/                     # Shared utilities
```

## State Management with Redux Toolkit and Amplify Data

### Dual API Pattern Store Configuration

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
    // Amplify Data APIs (for read models)
    [projectApi.reducerPath]: projectApi.reducer,
    [templateApi.reducerPath]: templateApi.reducer,
    [userApi.reducerPath]: userApi.reducer,
    
    // API Gateway APIs (for commands/observability)
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

### Custom RTK Query with Amplify Data

```typescript
// app/lib/store/amplifyApi.ts
import { createApi, BaseQueryFn } from '@reduxjs/toolkit/query/react';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../amplify/schema';

const client = generateClient<Schema>();

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
> = async ({ model, operation, data, id, filter }) => {
  try {
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

// Project API slice using Amplify Data
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

## Cloudscape Design System Integration with Hub Pattern

### Root Layout with Amplify Authentication

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
              <main>{children}</main>
            </Provider>
          </Authenticator>
        </Authenticator.Provider>
      </body>
    </html>
  );
}
```

### Hub Pattern Implementation

```typescript
// app/projects/[projectId]/page.tsx
'use client';

import { useParams } from 'next/navigation';
import { 
  SpaceBetween,
  Header,
  Container,
  Grid,
  Button,
  ColumnLayout,
  Box
} from '@cloudscape-design/components';
import { useGetProjectQuery } from '../../lib/store/amplifyApi';
import { ProjectHeroSection } from '../components/ProjectHeroSection';
import { RelatedTemplatesCard } from '../components/RelatedTemplatesCard';
import { TeamMembersCard } from '../components/TeamMembersCard';
import { RecentDeploymentsCard } from '../components/RecentDeploymentsCard';

export default function ProjectDetailHub() {
  const { projectId } = useParams();
  const { data: project, isLoading } = useGetProjectQuery(projectId);
  
  if (isLoading) return <div>Loading project...</div>;
  if (!project) return <div>Project not found</div>;

  return (
    <SpaceBetween direction="vertical" size="l">
      {/* Hero Section - Central Resource Overview */}
      <ProjectHeroSection project={project} />
      
      {/* Quick Actions Bar */}
      <Container>
        <SpaceBetween direction="horizontal" size="s">
          <Button variant="primary" iconName="upload">
            Deploy
          </Button>
          <Button iconName="copy">
            Clone Project
          </Button>
          <Button iconName="share">
            Share
          </Button>
          <Button iconName="edit">
            Edit Settings
          </Button>
        </SpaceBetween>
      </Container>
      
      {/* Related Resources Grid */}
      <Grid gridDefinition={[
        { colspan: { default: 12, s: 6, m: 4 } },
        { colspan: { default: 12, s: 6, m: 4 } },
        { colspan: { default: 12, s: 12, m: 4 } }
      ]}>
        <RelatedTemplatesCard projectId={projectId} />
        <TeamMembersCard projectId={projectId} />
        <RecentDeploymentsCard projectId={projectId} />
      </Grid>
    </SpaceBetween>
  );
}
```

### Custom Components with Cloudscape

```typescript
// components/common/DataTable.tsx
import { Table, Pagination, PropertyFilter } from '@cloudscape-design/components';
import { useState } from 'react';

interface DataTableProps<T> {
  data: T[];
  columns: any[];
  loading?: boolean;
  selectionType?: 'single' | 'multi';
  onSelectionChange?: (selection: T[]) => void;
  filteringProperties?: any[];
  sortingColumn?: string;
  sortingDescending?: boolean;
  onSortingChange?: (event: any) => void;
}

export function DataTable<T>({
  data,
  columns,
  loading = false,
  selectionType,
  onSelectionChange,
  filteringProperties = [],
  sortingColumn,
  sortingDescending = false,
  onSortingChange,
}: DataTableProps<T>) {
  const [currentPageIndex, setCurrentPageIndex] = useState(1);
  const [selectedItems, setSelectedItems] = useState<T[]>([]);
  const [filteringText, setFilteringText] = useState('');
  const [filteringTokens, setFilteringTokens] = useState([]);
  
  const pageSize = 10;
  const startIndex = (currentPageIndex - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  
  // Filter and paginate data
  const filteredData = data.filter(item => {
    if (!filteringText) return true;
    // Implement filtering logic based on filteringText and filteringTokens
    return true;
  });
  
  const paginatedData = filteredData.slice(startIndex, endIndex);

  const handleSelectionChange = (event: any) => {
    setSelectedItems(event.detail.selectedItems);
    onSelectionChange?.(event.detail.selectedItems);
  };

  return (
    <>
      <Table
        items={paginatedData}
        columns={columns}
        loading={loading}
        selectionType={selectionType}
        selectedItems={selectedItems}
        onSelectionChange={handleSelectionChange}
        sortingColumn={sortingColumn}
        sortingDescending={sortingDescending}
        onSortingChange={onSortingChange}
        header={
          filteringProperties.length > 0 && (
            <PropertyFilter
              filteringProperties={filteringProperties}
              filteringText={filteringText}
              filteringTokens={filteringTokens}
              onChange={({ detail }) => {
                setFilteringText(detail.filteringText);
                setFilteringTokens(detail.filteringTokens);
              }}
            />
          )
        }
        pagination={
          <Pagination
            currentPageIndex={currentPageIndex}
            pagesCount={Math.ceil(filteredData.length / pageSize)}
            onChange={({ detail }) => setCurrentPageIndex(detail.currentPageIndex)}
          />
        }
      />
    </>
  );
}
```

## Authentication with @aws-amplify/ui-react

### Amplify Data Schema with Authorization

```typescript
// app/lib/amplify/schema.ts
import { a, defineData, type ClientSchema } from '@aws-amplify/backend';

const schema = a.schema({
  // Project Model with Role-based Authorization
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
  }).authorization(allow => [
    allow.owner(),
    allow.groups(['admin']).to(['read', 'create', 'update', 'delete']),
    allow.groups(['developer']).to(['read', 'create', 'update']),
    allow.groups(['viewer']).to(['read'])
  ]),

  // User Model
  User: a.model({
    id: a.id().required(),
    email: a.email().required(),
    name: a.string().required(),
    role: a.enum(['admin', 'developer', 'viewer']),
    preferences: a.json(),
    
    // Relationships
    ownedProjects: a.hasMany('Project', 'ownerId'),
    templates: a.hasMany('Template', 'authorId'),
  }).authorization(allow => [
    allow.owner(),
    allow.authenticated().to(['read']),
    allow.groups(['admin']).to(['read', 'update'])
  ]),

  // Template Model
  Template: a.model({
    id: a.id().required(),
    name: a.string().required(),
    description: a.string(),
    category: a.enum(['react', 'nodejs', 'python', 'nextjs']),
    framework: a.string().required(),
    authorId: a.id().required(),
    
    // Relationships
    author: a.belongsTo('User', 'authorId'),
    projects: a.hasMany('Project', 'templateId'),
  }).authorization(allow => [
    allow.owner(),
    allow.authenticated().to(['read']),
    allow.groups(['admin']).to(['read', 'create', 'update', 'delete'])
  ]),
});

export type Schema = ClientSchema<typeof schema>;
export const data = defineData({ schema });
```

### Automatic Authentication with Authenticator

```typescript
// app/layout.tsx (Authentication is handled automatically)
'use client';

import { Authenticator } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Authenticator.Provider>
          <Authenticator hideSignUp={false}>
            {/* All authenticated content */}
            <Provider store={store}>
              <main>{children}</main>
            </Provider>
          </Authenticator>
        </Authenticator.Provider>
      </body>
    </html>
  );
}

// No custom authentication context needed - Authenticator handles everything
```

## Custom Hooks

### API Integration Hooks

```typescript
// hooks/useAsyncOperation.ts
import { useState, useCallback } from 'react';

interface AsyncOperationState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

export function useAsyncOperation<T>() {
  const [state, setState] = useState<AsyncOperationState<T>>({
    data: null,
    loading: false,
    error: null,
  });

  const execute = useCallback(async (operation: () => Promise<T>) => {
    setState({ data: null, loading: true, error: null });
    
    try {
      const result = await operation();
      setState({ data: result, loading: false, error: null });
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setState({ data: null, loading: false, error: errorMessage });
      throw error;
    }
  }, []);

  const reset = useCallback(() => {
    setState({ data: null, loading: false, error: null });
  }, []);

  return { ...state, execute, reset };
}
```

### Form Management Hooks

```typescript
// hooks/useForm.ts
import { useState, useCallback } from 'react';

interface FormState<T> {
  values: T;
  errors: Partial<Record<keyof T, string>>;
  touched: Partial<Record<keyof T, boolean>>;
  isSubmitting: boolean;
}

interface UseFormOptions<T> {
  initialValues: T;
  validate?: (values: T) => Partial<Record<keyof T, string>>;
  onSubmit: (values: T) => Promise<void> | void;
}

export function useForm<T extends Record<string, any>>({
  initialValues,
  validate,
  onSubmit,
}: UseFormOptions<T>) {
  const [state, setState] = useState<FormState<T>>({
    values: initialValues,
    errors: {},
    touched: {},
    isSubmitting: false,
  });

  const setFieldValue = useCallback((field: keyof T, value: any) => {
    setState(prev => ({
      ...prev,
      values: { ...prev.values, [field]: value },
      errors: { ...prev.errors, [field]: '' },
    }));
  }, []);

  const setFieldTouched = useCallback((field: keyof T, touched = true) => {
    setState(prev => ({
      ...prev,
      touched: { ...prev.touched, [field]: touched },
    }));
  }, []);

  const validateForm = useCallback(() => {
    if (!validate) return true;
    
    const errors = validate(state.values);
    setState(prev => ({ ...prev, errors }));
    
    return Object.keys(errors).length === 0;
  }, [validate, state.values]);

  const handleSubmit = useCallback(async (e?: React.FormEvent) => {
    e?.preventDefault();
    
    if (!validateForm()) return;
    
    setState(prev => ({ ...prev, isSubmitting: true }));
    
    try {
      await onSubmit(state.values);
    } finally {
      setState(prev => ({ ...prev, isSubmitting: false }));
    }
  }, [validateForm, onSubmit, state.values]);

  const reset = useCallback(() => {
    setState({
      values: initialValues,
      errors: {},
      touched: {},
      isSubmitting: false,
    });
  }, [initialValues]);

  return {
    values: state.values,
    errors: state.errors,
    touched: state.touched,
    isSubmitting: state.isSubmitting,
    setFieldValue,
    setFieldTouched,
    handleSubmit,
    reset,
    validateForm,
  };
}
```

## Error Handling and User Experience

### Error Boundary

```typescript
// components/common/ErrorBoundary.tsx
import React from 'react';
import { Alert, Button } from '@cloudscape-design/components';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error: Error; resetError: () => void }>;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    // Log error to monitoring service
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback;
        return <FallbackComponent error={this.state.error!} resetError={this.handleReset} />;
      }

      return (
        <Alert
          type="error"
          header="Something went wrong"
          action={
            <Button onClick={this.handleReset}>
              Try again
            </Button>
          }
        >
          {this.state.error?.message || 'An unexpected error occurred'}
        </Alert>
      );
    }

    return this.props.children;
  }
}
```

### Loading States

```typescript
// components/common/LoadingSpinner.tsx
import { Spinner } from '@cloudscape-design/components';

interface LoadingSpinnerProps {
  size?: 'small' | 'normal' | 'large';
  text?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'normal',
  text = 'Loading...',
}) => (
  <div className="loading-spinner">
    <Spinner size={size} />
    {text && <span className="loading-text">{text}</span>}
  </div>
);
```

## Performance Optimization with Next.js

### Automatic Code Splitting and Lazy Loading

```typescript
// Next.js automatically code splits by page
// app/projects/loading.tsx - Automatic loading UI
export default function Loading() {
  return (
    <div className="loading-container">
      <Spinner size="large" />
      <p>Loading projects...</p>
    </div>
  );
}

// app/projects/error.tsx - Automatic error boundary
'use client';

import { Alert, Button } from '@cloudscape-design/components';

export default function Error({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <Alert
      type="error"
      header="Something went wrong"
      action={
        <Button onClick={reset}>
          Try again
        </Button>
      }
    >
      {error.message}
    </Alert>
  );
}

// Dynamic imports for heavy components
import dynamic from 'next/dynamic';

const ProjectAnalytics = dynamic(
  () => import('../components/ProjectAnalytics'),
  { loading: () => <Spinner /> }
);
```

### Memoization

```typescript
// components/projects/ProjectCard.tsx
import { memo } from 'react';
import { Card, Button, Box } from '@cloudscape-design/components';
import { Project } from '../../types/project.types';

interface ProjectCardProps {
  project: Project;
  onEdit: (project: Project) => void;
  onDelete: (projectId: string) => void;
}

export const ProjectCard = memo<ProjectCardProps>(({
  project,
  onEdit,
  onDelete,
}) => {
  const handleEdit = () => onEdit(project);
  const handleDelete = () => onDelete(project.id);

  return (
    <Card
      header={project.name}
      footer={
        <Box float="right">
          <Button variant="link" onClick={handleEdit}>
            Edit
          </Button>
          <Button variant="link" onClick={handleDelete}>
            Delete
          </Button>
        </Box>
      }
    >
      <p>{project.description}</p>
      <p>Status: {project.status}</p>
      <p>Created: {new Date(project.createdAt).toLocaleDateString()}</p>
    </Card>
  );
});
```

## Testing Strategy

### Component Testing

```typescript
// features/projects/components/__tests__/ProjectCard.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { ProjectCard } from '../ProjectCard';
import { Project } from '../../types/project.types';

const mockProject: Project = {
  id: '1',
  name: 'Test Project',
  description: 'Test Description',
  status: 'active',
  createdAt: '2025-01-18T10:00:00Z',
  updatedAt: '2025-01-18T10:00:00Z',
};

describe('ProjectCard', () => {
  const mockOnEdit = jest.fn();
  const mockOnDelete = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders project information', () => {
    render(
      <ProjectCard
        project={mockProject}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );

    expect(screen.getByText('Test Project')).toBeInTheDocument();
    expect(screen.getByText('Test Description')).toBeInTheDocument();
    expect(screen.getByText('Status: active')).toBeInTheDocument();
  });

  it('calls onEdit when edit button is clicked', () => {
    render(
      <ProjectCard
        project={mockProject}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );

    fireEvent.click(screen.getByText('Edit'));
    expect(mockOnEdit).toHaveBeenCalledWith(mockProject);
  });

  it('calls onDelete when delete button is clicked', () => {
    render(
      <ProjectCard
        project={mockProject}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );

    fireEvent.click(screen.getByText('Delete'));
    expect(mockOnDelete).toHaveBeenCalledWith(mockProject.id);
  });
});
```

### Integration Testing

```typescript
// features/projects/pages/__tests__/ProjectListPage.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { store } from '../../../../store';
import { ProjectListPage } from '../ProjectListPage';
import { projectApi } from '../../store/projectApi';

// Mock the API
jest.mock('../../store/projectApi');

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Provider store={store}>
    <BrowserRouter>
      {children}
    </BrowserRouter>
  </Provider>
);

describe('ProjectListPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('displays loading state initially', () => {
    render(
      <TestWrapper>
        <ProjectListPage />
      </TestWrapper>
    );

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('displays projects when loaded', async () => {
    const mockProjects = [
      { id: '1', name: 'Project 1', description: 'Description 1' },
      { id: '2', name: 'Project 2', description: 'Description 2' },
    ];

    (projectApi.useGetProjectsQuery as jest.Mock).mockReturnValue({
      data: mockProjects,
      isLoading: false,
      error: null,
    });

    render(
      <TestWrapper>
        <ProjectListPage />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Project 1')).toBeInTheDocument();
      expect(screen.getByText('Project 2')).toBeInTheDocument();
    });
  });
});
```

## Deployment Configuration with Next.js and Amplify

### Next.js Configuration for Amplify Hosting

```typescript
// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export', // Enable static export for Amplify Hosting
  trailingSlash: true,
  images: {
    unoptimized: true // Required for static export
  },
  // Client-side rendering configuration
  experimental: {
    // Enable latest features
  }
};

module.exports = nextConfig;
```

### Amplify Hosting Build Configuration

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

### Environment Configuration

```typescript
// app/lib/amplify/auth.ts
import type { ResourcesConfig } from 'aws-amplify';

const amplifyConfig: ResourcesConfig = {
  Auth: {
    Cognito: {
      userPoolId: process.env.NEXT_PUBLIC_AMPLIFY_USER_POOL_ID!,
      userPoolClientId: process.env.NEXT_PUBLIC_AMPLIFY_USER_POOL_CLIENT_ID!,
      signUpVerificationMethod: 'code',
      loginWith: {
        email: true,
        username: false,
        phone: false,
      },
    },
  },
  API: {
    GraphQL: {
      endpoint: process.env.NEXT_PUBLIC_AMPLIFY_GRAPHQL_ENDPOINT!,
      region: process.env.NEXT_PUBLIC_AMPLIFY_REGION!,
      defaultAuthMode: 'userPool',
    },
    REST: {
      observability: {
        endpoint: process.env.NEXT_PUBLIC_API_GATEWAY_ENDPOINT!,
        region: process.env.NEXT_PUBLIC_AMPLIFY_REGION!,
      },
    },
  },
};

export default amplifyConfig;
```

This Next.js frontend architecture provides a robust, scalable, and maintainable foundation for the Skafu application with seamless AWS Amplify Gen2 integration, dual API patterns for CQRS, Cloudscape hub pattern navigation, and comprehensive real-time capabilities.