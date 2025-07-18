# Frontend Architecture Design

## Overview

The Skafu frontend is a modern React application built with AWS Amplify Gen2, implementing a component-based architecture using Cloudscape Design System, Redux Toolkit for state management, and TypeScript for type safety. The application follows best practices for scalability, maintainability, and user experience.

## Technology Stack

### Core Technologies
- **React 18**: Modern React with hooks and concurrent features
- **TypeScript**: Type-safe JavaScript with strong typing
- **AWS Amplify Gen2**: Full-stack framework for authentication and data management
- **Cloudscape Design System**: AWS's design system for consistent UI components
- **Redux Toolkit (RTK)**: State management with modern Redux patterns
- **React Router v6**: Client-side routing with modern API

### Build and Development Tools
- **Vite**: Fast build tool and development server
- **ESLint**: Code linting and quality enforcement
- **Prettier**: Code formatting
- **Jest**: Unit testing framework
- **React Testing Library**: Component testing utilities
- **Cypress**: End-to-end testing

## Architecture Patterns

### Component Architecture

```
src/
├── components/           # Reusable UI components
│   ├── common/          # Generic components
│   ├── forms/           # Form components
│   ├── layout/          # Layout components
│   └── ui/              # UI-specific components
├── features/            # Feature-based organization
│   ├── projects/        # Project management features
│   ├── templates/       # Template management features
│   ├── ai/             # AI integration features
│   └── auth/           # Authentication features
├── pages/              # Page-level components
├── hooks/              # Custom React hooks
├── services/           # API and service layer
├── store/              # Redux store configuration
├── types/              # TypeScript type definitions
├── utils/              # Utility functions
└── constants/          # Application constants
```

### Feature-Based Organization

```typescript
// Feature structure example: features/projects/
projects/
├── components/          # Project-specific components
│   ├── ProjectCard.tsx
│   ├── ProjectForm.tsx
│   └── ProjectList.tsx
├── hooks/              # Project-specific hooks
│   ├── useProjects.ts
│   └── useProjectForm.ts
├── services/           # Project-specific services
│   └── projectService.ts
├── store/              # Project-specific state
│   ├── projectSlice.ts
│   └── projectSelectors.ts
├── types/              # Project-specific types
│   └── project.types.ts
├── utils/              # Project-specific utilities
│   └── projectUtils.ts
└── pages/              # Project-specific pages
    ├── ProjectListPage.tsx
    ├── ProjectDetailPage.tsx
    └── CreateProjectPage.tsx
```

## State Management with Redux Toolkit

### Store Configuration

```typescript
// store/index.ts
import { configureStore } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';
import { projectApi } from '../features/projects/store/projectApi';
import { templateApi } from '../features/templates/store/templateApi';
import { aiApi } from '../features/ai/store/aiApi';
import authSlice from '../features/auth/store/authSlice';
import uiSlice from './slices/uiSlice';

export const store = configureStore({
  reducer: {
    // RTK Query APIs
    [projectApi.reducerPath]: projectApi.reducer,
    [templateApi.reducerPath]: templateApi.reducer,
    [aiApi.reducerPath]: aiApi.reducer,
    
    // Regular slices
    auth: authSlice,
    ui: uiSlice,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
      },
    })
      .concat(projectApi.middleware)
      .concat(templateApi.middleware)
      .concat(aiApi.middleware),
});

setupListeners(store.dispatch);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
```

### RTK Query API Slices

```typescript
// features/projects/store/projectApi.ts
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { Project, CreateProjectRequest, UpdateProjectRequest } from '../types/project.types';

export const projectApi = createApi({
  reducerPath: 'projectApi',
  baseQuery: fetchBaseQuery({
    baseUrl: '/api/v1/projects',
    prepareHeaders: (headers, { getState }) => {
      const token = (getState() as any).auth.token;
      if (token) {
        headers.set('authorization', `Bearer ${token}`);
      }
      return headers;
    },
  }),
  tagTypes: ['Project'],
  endpoints: (builder) => ({
    // Queries
    getProjects: builder.query<Project[], void>({
      query: () => '',
      providesTags: ['Project'],
    }),
    getProject: builder.query<Project, string>({
      query: (id) => `/${id}`,
      providesTags: (result, error, id) => [{ type: 'Project', id }],
    }),
    
    // Mutations
    createProject: builder.mutation<Project, CreateProjectRequest>({
      query: (project) => ({
        url: '',
        method: 'POST',
        body: project,
      }),
      invalidatesTags: ['Project'],
    }),
    updateProject: builder.mutation<Project, UpdateProjectRequest>({
      query: ({ id, ...patch }) => ({
        url: `/${id}`,
        method: 'PATCH',
        body: patch,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Project', id }],
    }),
    deleteProject: builder.mutation<void, string>({
      query: (id) => ({
        url: `/${id}`,
        method: 'DELETE',
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

## Cloudscape Design System Integration

### Theme Configuration

```typescript
// components/layout/AppLayout.tsx
import { AppLayout, SideNavigation, TopNavigation } from '@cloudscape-design/components';
import { applyMode, Mode } from '@cloudscape-design/global-styles';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';

interface Props {
  children: React.ReactNode;
}

export const ApplicationLayout: React.FC<Props> = ({ children }) => {
  const { theme } = useSelector((state: RootState) => state.ui);
  
  React.useEffect(() => {
    applyMode(theme as Mode);
  }, [theme]);

  const navigationItems = [
    {
      type: 'section',
      text: 'Projects',
      items: [
        { type: 'link', text: 'All Projects', href: '/projects' },
        { type: 'link', text: 'Create Project', href: '/projects/create' },
      ],
    },
    {
      type: 'section',
      text: 'Templates',
      items: [
        { type: 'link', text: 'Template Library', href: '/templates' },
        { type: 'link', text: 'My Templates', href: '/templates/my' },
      ],
    },
    {
      type: 'section',
      text: 'AI Assistant',
      items: [
        { type: 'link', text: 'Analysis', href: '/ai/analysis' },
        { type: 'link', text: 'Code Generation', href: '/ai/generation' },
      ],
    },
  ];

  return (
    <AppLayout
      headerSelector="#header"
      navigation={
        <SideNavigation
          header={{ text: 'Skafu', href: '/' }}
          items={navigationItems}
        />
      }
      content={children}
      toolsHide
    />
  );
};
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

## Authentication with AWS Amplify

### Amplify Configuration

```typescript
// amplify/auth/resource.ts
import { defineAuth } from '@aws-amplify/backend';

export const auth = defineAuth({
  loginWith: {
    email: true,
  },
  userAttributes: {
    email: {
      required: true,
      mutable: true,
    },
    name: {
      required: true,
      mutable: true,
    },
  },
});
```

### Authentication Context

```typescript
// contexts/AuthContext.tsx
import { createContext, useContext, useEffect, useState } from 'react';
import { getCurrentUser, signOut, AuthUser } from 'aws-amplify/auth';
import { Hub } from 'aws-amplify/utils';

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCurrentUser()
      .then((user) => {
        setUser(user);
      })
      .catch(() => {
        setUser(null);
      })
      .finally(() => {
        setLoading(false);
      });

    const hubListener = (data: any) => {
      switch (data.payload.event) {
        case 'signIn':
          setUser(data.payload.data);
          break;
        case 'signOut':
          setUser(null);
          break;
      }
    };

    Hub.listen('auth', hubListener);

    return () => Hub.remove('auth', hubListener);
  }, []);

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <AuthContext.Provider value={{ user, loading, signOut: handleSignOut }}>
      {children}
    </AuthContext.Provider>
  );
};
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

## Performance Optimization

### Lazy Loading

```typescript
// routes/AppRoutes.tsx
import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import { LoadingSpinner } from '../components/common/LoadingSpinner';

// Lazy load page components
const ProjectListPage = lazy(() => import('../features/projects/pages/ProjectListPage'));
const ProjectDetailPage = lazy(() => import('../features/projects/pages/ProjectDetailPage'));
const CreateProjectPage = lazy(() => import('../features/projects/pages/CreateProjectPage'));
const TemplateLibraryPage = lazy(() => import('../features/templates/pages/TemplateLibraryPage'));

export const AppRoutes: React.FC = () => (
  <Suspense fallback={<LoadingSpinner />}>
    <Routes>
      <Route path="/" element={<ProjectListPage />} />
      <Route path="/projects" element={<ProjectListPage />} />
      <Route path="/projects/create" element={<CreateProjectPage />} />
      <Route path="/projects/:id" element={<ProjectDetailPage />} />
      <Route path="/templates" element={<TemplateLibraryPage />} />
    </Routes>
  </Suspense>
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

## Deployment Configuration

### Amplify Hosting

```typescript
// amplify/backend.ts
import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource';
import { data } from './data/resource';

const backend = defineBackend({
  auth,
  data,
});

// Configure hosting
backend.addOutput({
  custom: {
    hostedZoneId: process.env.HOSTED_ZONE_ID,
    domainName: process.env.DOMAIN_NAME,
    certificateArn: process.env.CERTIFICATE_ARN,
  },
});
```

### Build Configuration

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          cloudscape: ['@cloudscape-design/components'],
          redux: ['@reduxjs/toolkit', 'react-redux'],
        },
      },
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
});
```

This frontend architecture provides a robust, scalable, and maintainable foundation for the Skafu application with modern React patterns, AWS integration, and comprehensive testing capabilities.