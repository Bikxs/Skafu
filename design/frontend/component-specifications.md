# Frontend Component Specifications

## Overview

This document defines the comprehensive component specifications for the Skafu platform frontend. It covers the component hierarchy, design system integration, state management patterns, and user experience flows.

## Component Architecture

### Component Hierarchy

```
src/
├── components/
│   ├── ui/                    # Basic UI components
│   │   ├── Button/
│   │   ├── Input/
│   │   ├── Modal/
│   │   ├── Card/
│   │   └── Layout/
│   ├── forms/                 # Form components
│   │   ├── ProjectForm/
│   │   ├── UserForm/
│   │   └── SettingsForm/
│   ├── navigation/            # Navigation components
│   │   ├── Sidebar/
│   │   ├── Header/
│   │   ├── Breadcrumbs/
│   │   └── TabNavigation/
│   ├── data-display/          # Data presentation components
│   │   ├── DataTable/
│   │   ├── ProjectCard/
│   │   ├── MetricsWidget/
│   │   └── StatusIndicator/
│   ├── feedback/              # User feedback components
│   │   ├── AlertBanner/
│   │   ├── LoadingSpinner/
│   │   ├── ProgressBar/
│   │   └── Toast/
│   └── domain/                # Domain-specific components
│       ├── project/
│       ├── template/
│       ├── ai/
│       └── github/
├── pages/                     # Page components
│   ├── Dashboard/
│   ├── Projects/
│   ├── Templates/
│   ├── Settings/
│   └── Profile/
├── hooks/                     # Custom React hooks
│   ├── useAuth/
│   ├── useApi/
│   ├── useLocalStorage/
│   └── useWebSocket/
├── store/                     # Redux store configuration
│   ├── slices/
│   ├── api/
│   └── middleware/
├── utils/                     # Utility functions
│   ├── formatting/
│   ├── validation/
│   └── constants/
└── styles/                    # Styling configuration
    ├── theme/
    ├── tokens/
    └── globals/
```

## Design System Integration

### Cloudscape Design System

```typescript
// theme/cloudscape-theme.ts
import { applyTheme } from '@cloudscape-design/global-styles';

export const skafuTheme = {
  tokens: {
    colorBackgroundButtonPrimaryDefault: '#0972d3',
    colorBackgroundButtonPrimaryHover: '#1662b7',
    colorBackgroundButtonPrimaryActive: '#144d8a',
    colorBackgroundButtonPrimaryDisabled: '#e9ebed',
    
    colorTextButtonPrimaryDefault: '#ffffff',
    colorTextButtonPrimaryHover: '#ffffff',
    colorTextButtonPrimaryActive: '#ffffff',
    colorTextButtonPrimaryDisabled: '#5f6b7a',
    
    colorBorderDividerDefault: '#e9ebed',
    colorBorderInputDefault: '#879596',
    colorBorderInputFocused: '#0972d3',
    
    colorBackgroundLayoutMain: '#fafbfc',
    colorBackgroundContainerContent: '#ffffff',
    colorBackgroundContainerHeader: '#ffffff',
    
    spaceScaledXs: '4px',
    spaceScaledS: '8px',
    spaceScaledM: '16px',
    spaceScaledL: '24px',
    spaceScaledXl: '32px',
    spaceScaledXxl: '40px',
    
    fontSizeHeadingXs: '16px',
    fontSizeHeadingS: '18px',
    fontSizeHeadingM: '20px',
    fontSizeHeadingL: '24px',
    fontSizeHeadingXl: '32px',
    
    fontWeightHeadingXs: '600',
    fontWeightHeadingS: '600',
    fontWeightHeadingM: '600',
    fontWeightHeadingL: '600',
    fontWeightHeadingXl: '600',
  },
  
  // Custom Skafu brand colors
  brand: {
    primary: '#0972d3',
    secondary: '#037f0c',
    accent: '#ff6b35',
    neutral: '#232f3e',
    
    success: '#037f0c',
    warning: '#ff9900',
    error: '#d13313',
    info: '#0972d3',
  },
  
  // Status colors
  status: {
    active: '#037f0c',
    inactive: '#879596',
    pending: '#ff9900',
    error: '#d13313',
    draft: '#5f6b7a',
  },
  
  // Semantic colors
  semantic: {
    background: {
      primary: '#ffffff',
      secondary: '#fafbfc',
      tertiary: '#f2f3f3',
    },
    text: {
      primary: '#232f3e',
      secondary: '#5f6b7a',
      tertiary: '#879596',
      inverse: '#ffffff',
    },
    border: {
      default: '#e9ebed',
      focus: '#0972d3',
      error: '#d13313',
    },
  },
};

// Apply theme
applyTheme({ theme: skafuTheme });
```

### Design Tokens

```typescript
// styles/tokens/spacing.ts
export const spacing = {
  xs: '4px',
  sm: '8px',
  md: '16px',
  lg: '24px',
  xl: '32px',
  xxl: '40px',
  xxxl: '48px',
} as const;

// styles/tokens/typography.ts
export const typography = {
  fontFamily: {
    primary: '"Amazon Ember", "Helvetica Neue", Arial, sans-serif',
    mono: '"Amazon Ember Mono", "Courier New", monospace',
  },
  
  fontSize: {
    xs: '12px',
    sm: '14px',
    md: '16px',
    lg: '18px',
    xl: '20px',
    xxl: '24px',
    xxxl: '32px',
  },
  
  fontWeight: {
    light: '300',
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
  
  lineHeight: {
    tight: '1.2',
    normal: '1.4',
    relaxed: '1.6',
  },
} as const;

// styles/tokens/shadows.ts
export const shadows = {
  sm: '0 1px 2px rgba(0, 0, 0, 0.05)',
  md: '0 4px 6px rgba(0, 0, 0, 0.1)',
  lg: '0 10px 15px rgba(0, 0, 0, 0.1)',
  xl: '0 20px 25px rgba(0, 0, 0, 0.1)',
} as const;

// styles/tokens/breakpoints.ts
export const breakpoints = {
  xs: '480px',
  sm: '768px',
  md: '1024px',
  lg: '1280px',
  xl: '1440px',
  xxl: '1920px',
} as const;
```

## Core UI Components

### Button Component

```typescript
// components/ui/Button/Button.tsx
import React from 'react';
import { Button as CloudscapeButton, ButtonProps } from '@cloudscape-design/components';
import { styled } from '@emotion/styled';

export interface SkafuButtonProps extends ButtonProps {
  size?: 'small' | 'medium' | 'large';
  variant?: 'primary' | 'secondary' | 'link' | 'icon';
  fullWidth?: boolean;
  loading?: boolean;
  tooltip?: string;
}

const StyledButton = styled(CloudscapeButton)<SkafuButtonProps>`
  ${({ fullWidth }) => fullWidth && 'width: 100%;'}
  
  &.primary {
    background-color: var(--color-background-button-primary-default);
    color: var(--color-text-button-primary-default);
    border-color: var(--color-background-button-primary-default);
    
    &:hover {
      background-color: var(--color-background-button-primary-hover);
      border-color: var(--color-background-button-primary-hover);
    }
    
    &:active {
      background-color: var(--color-background-button-primary-active);
      border-color: var(--color-background-button-primary-active);
    }
    
    &:disabled {
      background-color: var(--color-background-button-primary-disabled);
      color: var(--color-text-button-primary-disabled);
      border-color: var(--color-background-button-primary-disabled);
    }
  }
`;

export const Button: React.FC<SkafuButtonProps> = ({
  children,
  size = 'medium',
  variant = 'primary',
  fullWidth = false,
  loading = false,
  tooltip,
  ...props
}) => {
  return (
    <StyledButton
      variant={variant}
      size={size}
      loading={loading}
      fullWidth={fullWidth}
      className={variant}
      {...props}
    >
      {children}
    </StyledButton>
  );
};

// Usage examples
export const ButtonExamples: React.FC = () => {
  return (
    <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
      <Button variant="primary">Primary Button</Button>
      <Button variant="secondary">Secondary Button</Button>
      <Button variant="link">Link Button</Button>
      <Button variant="primary" size="small">Small Button</Button>
      <Button variant="primary" size="large">Large Button</Button>
      <Button variant="primary" loading>Loading Button</Button>
      <Button variant="primary" disabled>Disabled Button</Button>
      <Button variant="primary" fullWidth>Full Width Button</Button>
    </div>
  );
};
```

### Input Component

```typescript
// components/ui/Input/Input.tsx
import React from 'react';
import { Input as CloudscapeInput, InputProps, FormField } from '@cloudscape-design/components';
import { styled } from '@emotion/styled';

export interface SkafuInputProps extends Omit<InputProps, 'value' | 'onChange'> {
  label?: string;
  helperText?: string;
  error?: string;
  required?: boolean;
  fullWidth?: boolean;
  value?: string;
  onChange?: (value: string) => void;
}

const StyledFormField = styled(FormField)<{ fullWidth?: boolean }>`
  ${({ fullWidth }) => fullWidth && 'width: 100%;'}
  
  .cloudscape-input {
    border-color: var(--color-border-input-default);
    
    &:focus {
      border-color: var(--color-border-input-focused);
      box-shadow: 0 0 0 2px rgba(9, 114, 211, 0.2);
    }
    
    &.error {
      border-color: var(--color-border-error);
    }
  }
`;

export const Input: React.FC<SkafuInputProps> = ({
  label,
  helperText,
  error,
  required,
  fullWidth = false,
  value,
  onChange,
  ...props
}) => {
  return (
    <StyledFormField
      label={label}
      description={helperText}
      errorText={error}
      fullWidth={fullWidth}
    >
      <CloudscapeInput
        value={value}
        onChange={({ detail }) => onChange?.(detail.value)}
        invalid={!!error}
        className={error ? 'error' : ''}
        {...props}
      />
    </StyledFormField>
  );
};

// Usage examples
export const InputExamples: React.FC = () => {
  const [value, setValue] = React.useState('');
  
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <Input
        label="Project Name"
        helperText="Enter a descriptive name for your project"
        value={value}
        onChange={setValue}
        required
      />
      <Input
        label="Description"
        helperText="Optional project description"
        value={value}
        onChange={setValue}
        type="textarea"
      />
      <Input
        label="Email"
        error="Please enter a valid email address"
        value={value}
        onChange={setValue}
        type="email"
      />
      <Input
        label="Password"
        value={value}
        onChange={setValue}
        type="password"
      />
    </div>
  );
};
```

### Modal Component

```typescript
// components/ui/Modal/Modal.tsx
import React from 'react';
import { Modal as CloudscapeModal, ModalProps, Box, SpaceBetween, Button } from '@cloudscape-design/components';
import { styled } from '@emotion/styled';

export interface SkafuModalProps extends Omit<ModalProps, 'children'> {
  title: string;
  children: React.ReactNode;
  primaryAction?: {
    text: string;
    onClick: () => void;
    loading?: boolean;
    disabled?: boolean;
  };
  secondaryAction?: {
    text: string;
    onClick: () => void;
  };
  size?: 'small' | 'medium' | 'large' | 'max';
  dismissible?: boolean;
}

const StyledModal = styled(CloudscapeModal)`
  .cloudscape-modal-content {
    padding: var(--space-scaled-l);
  }
  
  .cloudscape-modal-header {
    border-bottom: 1px solid var(--color-border-divider-default);
    padding-bottom: var(--space-scaled-m);
    margin-bottom: var(--space-scaled-l);
  }
  
  .cloudscape-modal-footer {
    border-top: 1px solid var(--color-border-divider-default);
    padding-top: var(--space-scaled-m);
    margin-top: var(--space-scaled-l);
  }
`;

export const Modal: React.FC<SkafuModalProps> = ({
  title,
  children,
  primaryAction,
  secondaryAction,
  size = 'medium',
  dismissible = true,
  visible,
  onDismiss,
  ...props
}) => {
  return (
    <StyledModal
      visible={visible}
      onDismiss={onDismiss}
      header={title}
      size={size}
      footer={
        (primaryAction || secondaryAction) && (
          <Box float="right">
            <SpaceBetween direction="horizontal" size="xs">
              {secondaryAction && (
                <Button
                  variant="link"
                  onClick={secondaryAction.onClick}
                >
                  {secondaryAction.text}
                </Button>
              )}
              {primaryAction && (
                <Button
                  variant="primary"
                  onClick={primaryAction.onClick}
                  loading={primaryAction.loading}
                  disabled={primaryAction.disabled}
                >
                  {primaryAction.text}
                </Button>
              )}
            </SpaceBetween>
          </Box>
        )
      }
      {...props}
    >
      {children}
    </StyledModal>
  );
};

// Usage example
export const ModalExample: React.FC = () => {
  const [visible, setVisible] = React.useState(false);
  
  return (
    <>
      <Button onClick={() => setVisible(true)}>Open Modal</Button>
      
      <Modal
        title="Create New Project"
        visible={visible}
        onDismiss={() => setVisible(false)}
        primaryAction={{
          text: 'Create Project',
          onClick: () => {
            // Handle create project
            setVisible(false);
          },
        }}
        secondaryAction={{
          text: 'Cancel',
          onClick: () => setVisible(false),
        }}
      >
        <SpaceBetween direction="vertical" size="m">
          <Input
            label="Project Name"
            placeholder="Enter project name"
          />
          <Input
            label="Description"
            placeholder="Enter project description"
            type="textarea"
          />
        </SpaceBetween>
      </Modal>
    </>
  );
};
```

### Card Component

```typescript
// components/ui/Card/Card.tsx
import React from 'react';
import { Container, ContainerProps, Header, SpaceBetween } from '@cloudscape-design/components';
import { styled } from '@emotion/styled';

export interface SkafuCardProps extends Omit<ContainerProps, 'children'> {
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  variant?: 'default' | 'highlighted' | 'borderless';
  padding?: 'none' | 'small' | 'medium' | 'large';
  hover?: boolean;
  clickable?: boolean;
  onClick?: () => void;
}

const StyledContainer = styled(Container)<{
  variant?: string;
  padding?: string;
  hover?: boolean;
  clickable?: boolean;
}>`
  ${({ variant }) => variant === 'highlighted' && `
    border: 2px solid var(--color-border-input-focused);
    box-shadow: 0 0 0 2px rgba(9, 114, 211, 0.1);
  `}
  
  ${({ variant }) => variant === 'borderless' && `
    border: none;
    box-shadow: none;
  `}
  
  ${({ padding }) => {
    switch (padding) {
      case 'none': return 'padding: 0;';
      case 'small': return 'padding: var(--space-scaled-s);';
      case 'medium': return 'padding: var(--space-scaled-m);';
      case 'large': return 'padding: var(--space-scaled-l);';
      default: return '';
    }
  }}
  
  ${({ hover }) => hover && `
    transition: box-shadow 0.2s ease-in-out;
    
    &:hover {
      box-shadow: var(--shadow-lg);
    }
  `}
  
  ${({ clickable }) => clickable && `
    cursor: pointer;
    
    &:hover {
      background-color: var(--color-background-container-hover);
    }
  `}
`;

export const Card: React.FC<SkafuCardProps> = ({
  title,
  subtitle,
  actions,
  children,
  variant = 'default',
  padding = 'medium',
  hover = false,
  clickable = false,
  onClick,
  ...props
}) => {
  return (
    <StyledContainer
      header={
        (title || subtitle || actions) && (
          <Header
            variant="h3"
            description={subtitle}
            actions={actions}
          >
            {title}
          </Header>
        )
      }
      variant={variant}
      padding={padding}
      hover={hover}
      clickable={clickable}
      onClick={onClick}
      {...props}
    >
      {children}
    </StyledContainer>
  );
};

// Usage examples
export const CardExamples: React.FC = () => {
  return (
    <SpaceBetween direction="vertical" size="m">
      <Card
        title="Basic Card"
        subtitle="This is a basic card with title and subtitle"
      >
        <p>Card content goes here.</p>
      </Card>
      
      <Card
        title="Highlighted Card"
        variant="highlighted"
        actions={
          <Button variant="primary" size="small">
            Action
          </Button>
        }
      >
        <p>This card is highlighted to draw attention.</p>
      </Card>
      
      <Card
        title="Clickable Card"
        clickable
        hover
        onClick={() => console.log('Card clicked')}
      >
        <p>This card is clickable and has hover effects.</p>
      </Card>
      
      <Card variant="borderless" padding="none">
        <p>This card has no border and no padding.</p>
      </Card>
    </SpaceBetween>
  );
};
```

## Layout Components

### Layout System

```typescript
// components/ui/Layout/Layout.tsx
import React from 'react';
import { AppLayout, AppLayoutProps } from '@cloudscape-design/components';
import { styled } from '@emotion/styled';

export interface SkafuLayoutProps extends Omit<AppLayoutProps, 'children'> {
  children: React.ReactNode;
  sidebar?: React.ReactNode;
  breadcrumbs?: React.ReactNode;
  notifications?: React.ReactNode;
  tools?: React.ReactNode;
  splitPanel?: React.ReactNode;
}

const StyledAppLayout = styled(AppLayout)`
  .cloudscape-app-layout-content {
    padding: var(--space-scaled-l);
  }
  
  .cloudscape-app-layout-navigation {
    background-color: var(--color-background-layout-navigation);
    border-right: 1px solid var(--color-border-divider-default);
  }
  
  .cloudscape-app-layout-tools {
    background-color: var(--color-background-layout-tools);
    border-left: 1px solid var(--color-border-divider-default);
  }
`;

export const Layout: React.FC<SkafuLayoutProps> = ({
  children,
  sidebar,
  breadcrumbs,
  notifications,
  tools,
  splitPanel,
  ...props
}) => {
  return (
    <StyledAppLayout
      navigation={sidebar}
      breadcrumbs={breadcrumbs}
      notifications={notifications}
      tools={tools}
      splitPanel={splitPanel}
      content={children}
      {...props}
    />
  );
};

// Page Layout wrapper
export const PageLayout: React.FC<{
  title: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}> = ({ title, description, actions, children }) => {
  return (
    <SpaceBetween direction="vertical" size="l">
      <Header
        variant="h1"
        description={description}
        actions={actions}
      >
        {title}
      </Header>
      {children}
    </SpaceBetween>
  );
};
```

### Sidebar Navigation

```typescript
// components/navigation/Sidebar/Sidebar.tsx
import React from 'react';
import { SideNavigation, SideNavigationProps } from '@cloudscape-design/components';
import { styled } from '@emotion/styled';
import { useLocation, useNavigate } from 'react-router-dom';

export interface NavigationItem {
  type: 'link' | 'section' | 'divider';
  text?: string;
  href?: string;
  icon?: React.ReactNode;
  items?: NavigationItem[];
  badge?: string | number;
  disabled?: boolean;
}

export interface SkafuSidebarProps extends Omit<SideNavigationProps, 'items'> {
  items: NavigationItem[];
  activeHref?: string;
  onNavigate?: (href: string) => void;
}

const StyledSideNavigation = styled(SideNavigation)`
  .cloudscape-side-navigation-item {
    padding: var(--space-scaled-xs) var(--space-scaled-s);
    
    &:hover {
      background-color: var(--color-background-item-hover);
    }
    
    &.active {
      background-color: var(--color-background-item-selected);
      color: var(--color-text-accent);
      border-right: 3px solid var(--color-border-accent);
    }
  }
  
  .cloudscape-side-navigation-section {
    padding: var(--space-scaled-s);
    color: var(--color-text-secondary);
    font-weight: var(--font-weight-medium);
    text-transform: uppercase;
    font-size: var(--font-size-xs);
  }
`;

export const Sidebar: React.FC<SkafuSidebarProps> = ({
  items,
  activeHref,
  onNavigate,
  ...props
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  
  const currentPath = activeHref || location.pathname;
  
  const handleFollow = (event: any) => {
    event.preventDefault();
    const href = event.detail.href;
    if (onNavigate) {
      onNavigate(href);
    } else {
      navigate(href);
    }
  };
  
  return (
    <StyledSideNavigation
      items={items}
      activeHref={currentPath}
      onFollow={handleFollow}
      {...props}
    />
  );
};

// Navigation items configuration
export const navigationItems: NavigationItem[] = [
  {
    type: 'link',
    text: 'Dashboard',
    href: '/',
    icon: <i className="fas fa-home" />,
  },
  {
    type: 'section',
    text: 'Projects',
  },
  {
    type: 'link',
    text: 'My Projects',
    href: '/projects',
    icon: <i className="fas fa-folder" />,
  },
  {
    type: 'link',
    text: 'Create Project',
    href: '/projects/create',
    icon: <i className="fas fa-plus" />,
  },
  {
    type: 'section',
    text: 'Templates',
  },
  {
    type: 'link',
    text: 'Browse Templates',
    href: '/templates',
    icon: <i className="fas fa-th-large" />,
  },
  {
    type: 'link',
    text: 'My Templates',
    href: '/templates/my',
    icon: <i className="fas fa-bookmark" />,
  },
  {
    type: 'divider',
  },
  {
    type: 'section',
    text: 'Tools',
  },
  {
    type: 'link',
    text: 'AI Assistant',
    href: '/ai',
    icon: <i className="fas fa-robot" />,
    badge: 'Beta',
  },
  {
    type: 'link',
    text: 'GitHub Integration',
    href: '/github',
    icon: <i className="fab fa-github" />,
  },
  {
    type: 'link',
    text: 'Monitoring',
    href: '/monitoring',
    icon: <i className="fas fa-chart-line" />,
  },
  {
    type: 'divider',
  },
  {
    type: 'section',
    text: 'Account',
  },
  {
    type: 'link',
    text: 'Settings',
    href: '/settings',
    icon: <i className="fas fa-cog" />,
  },
  {
    type: 'link',
    text: 'Profile',
    href: '/profile',
    icon: <i className="fas fa-user" />,
  },
];
```

## Data Display Components

### DataTable Component

```typescript
// components/data-display/DataTable/DataTable.tsx
import React from 'react';
import { Table, TableProps, Pagination, TextFilter, Header, SpaceBetween, Button, CollectionPreferences } from '@cloudscape-design/components';
import { styled } from '@emotion/styled';

export interface Column<T> {
  id: string;
  header: string;
  accessor: keyof T | ((item: T) => React.ReactNode);
  sortingField?: string;
  isRowHeader?: boolean;
  width?: number;
  minWidth?: number;
  maxWidth?: number;
}

export interface DataTableProps<T> extends Omit<TableProps, 'items' | 'columnDefinitions'> {
  data: T[];
  columns: Column<T>[];
  loading?: boolean;
  searchable?: boolean;
  searchPlaceholder?: string;
  selectable?: boolean;
  selectedItems?: T[];
  onSelectionChange?: (items: T[]) => void;
  sortingDescending?: boolean;
  sortingColumn?: Column<T>;
  onSortingChange?: (column: Column<T>, descending: boolean) => void;
  pagination?: {
    currentPageIndex: number;
    pagesCount: number;
    pageSize: number;
    onPageChange: (pageIndex: number) => void;
    onPageSizeChange: (pageSize: number) => void;
  };
  actions?: React.ReactNode;
  preferences?: {
    pageSize: number;
    visibleColumns: string[];
    wrapLines: boolean;
    onPreferencesChange: (preferences: any) => void;
  };
  emptyState?: React.ReactNode;
  errorState?: React.ReactNode;
}

const StyledTable = styled(Table)`
  .cloudscape-table-header {
    background-color: var(--color-background-container-header);
    border-bottom: 2px solid var(--color-border-divider-default);
    font-weight: var(--font-weight-semibold);
  }
  
  .cloudscape-table-row {
    &:hover {
      background-color: var(--color-background-item-hover);
    }
    
    &.selected {
      background-color: var(--color-background-item-selected);
    }
  }
  
  .cloudscape-table-cell {
    padding: var(--space-scaled-s) var(--space-scaled-m);
  }
`;

export function DataTable<T extends Record<string, any>>({
  data,
  columns,
  loading = false,
  searchable = false,
  searchPlaceholder = 'Search...',
  selectable = false,
  selectedItems = [],
  onSelectionChange,
  sortingDescending = false,
  sortingColumn,
  onSortingChange,
  pagination,
  actions,
  preferences,
  emptyState,
  errorState,
  ...props
}: DataTableProps<T>) {
  const [searchText, setSearchText] = React.useState('');
  const [filteredData, setFilteredData] = React.useState(data);
  
  // Filter data based on search
  React.useEffect(() => {
    if (!searchText) {
      setFilteredData(data);
      return;
    }
    
    const filtered = data.filter(item =>
      columns.some(column => {
        const value = typeof column.accessor === 'function'
          ? column.accessor(item)
          : item[column.accessor];
        return String(value).toLowerCase().includes(searchText.toLowerCase());
      })
    );
    
    setFilteredData(filtered);
  }, [data, searchText, columns]);
  
  // Convert columns to Cloudscape format
  const columnDefinitions = columns.map(column => ({
    id: column.id,
    header: column.header,
    cell: (item: T) => {
      if (typeof column.accessor === 'function') {
        return column.accessor(item);
      }
      return item[column.accessor];
    },
    sortingField: column.sortingField,
    isRowHeader: column.isRowHeader,
    width: column.width,
    minWidth: column.minWidth,
    maxWidth: column.maxWidth,
  }));
  
  return (
    <SpaceBetween direction="vertical" size="s">
      <Header
        variant="h3"
        counter={`(${filteredData.length})`}
        actions={actions}
      >
        Items
      </Header>
      
      {searchable && (
        <TextFilter
          filteringText={searchText}
          onChange={({ detail }) => setSearchText(detail.filteringText)}
          placeholder={searchPlaceholder}
        />
      )}
      
      <StyledTable
        items={filteredData}
        columnDefinitions={columnDefinitions}
        loading={loading}
        selectionType={selectable ? 'multi' : undefined}
        selectedItems={selectedItems}
        onSelectionChange={({ detail }) => onSelectionChange?.(detail.selectedItems)}
        sortingDescending={sortingDescending}
        sortingColumn={sortingColumn}
        onSortingChange={({ detail }) => {
          if (onSortingChange) {
            const column = columns.find(col => col.id === detail.sortingColumn?.id);
            if (column) {
              onSortingChange(column, detail.isDescending || false);
            }
          }
        }}
        empty={emptyState || 'No items found'}
        preferences={preferences && (
          <CollectionPreferences
            title="Preferences"
            confirmLabel="Confirm"
            cancelLabel="Cancel"
            preferences={{
              pageSize: preferences.pageSize,
              visibleContent: preferences.visibleColumns,
              wrapLines: preferences.wrapLines,
            }}
            onConfirm={({ detail }) => preferences.onPreferencesChange(detail)}
            pageSizePreference={{
              title: 'Page size',
              options: [
                { value: 10, label: '10 items' },
                { value: 25, label: '25 items' },
                { value: 50, label: '50 items' },
                { value: 100, label: '100 items' },
              ],
            }}
            wrapLinesPreference={{
              label: 'Wrap lines',
              description: 'Wrap long text content',
            }}
            visibleContentPreference={{
              title: 'Select visible columns',
              options: columns.map(column => ({
                id: column.id,
                label: column.header,
              })),
            }}
          />
        )}
        {...props}
      />
      
      {pagination && (
        <Pagination
          currentPageIndex={pagination.currentPageIndex}
          pagesCount={pagination.pagesCount}
          onChange={({ detail }) => pagination.onPageChange(detail.currentPageIndex)}
        />
      )}
    </SpaceBetween>
  );
}

// Usage example
export const DataTableExample: React.FC = () => {
  const [selectedItems, setSelectedItems] = React.useState<any[]>([]);
  const [currentPage, setCurrentPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(25);
  
  const sampleData = [
    { id: 1, name: 'Project Alpha', status: 'Active', created: '2023-01-15', owner: 'John Doe' },
    { id: 2, name: 'Project Beta', status: 'Draft', created: '2023-02-20', owner: 'Jane Smith' },
    { id: 3, name: 'Project Gamma', status: 'Inactive', created: '2023-03-10', owner: 'Bob Johnson' },
  ];
  
  const columns: Column<any>[] = [
    {
      id: 'name',
      header: 'Project Name',
      accessor: 'name',
      sortingField: 'name',
      isRowHeader: true,
    },
    {
      id: 'status',
      header: 'Status',
      accessor: (item) => (
        <span className={`status-badge ${item.status.toLowerCase()}`}>
          {item.status}
        </span>
      ),
      sortingField: 'status',
    },
    {
      id: 'created',
      header: 'Created',
      accessor: 'created',
      sortingField: 'created',
    },
    {
      id: 'owner',
      header: 'Owner',
      accessor: 'owner',
      sortingField: 'owner',
    },
  ];
  
  return (
    <DataTable
      data={sampleData}
      columns={columns}
      searchable
      selectable
      selectedItems={selectedItems}
      onSelectionChange={setSelectedItems}
      pagination={{
        currentPageIndex: currentPage,
        pagesCount: Math.ceil(sampleData.length / pageSize),
        pageSize,
        onPageChange: setCurrentPage,
        onPageSizeChange: setPageSize,
      }}
      actions={
        <SpaceBetween direction="horizontal" size="xs">
          <Button>Create Project</Button>
          <Button disabled={selectedItems.length === 0}>
            Delete Selected
          </Button>
        </SpaceBetween>
      }
    />
  );
};
```

This comprehensive component specification provides the foundation for the Skafu platform's frontend architecture. The components are built on top of AWS Cloudscape Design System with custom styling and enhanced functionality specific to the platform's needs.

## Next Steps

With these component specifications, the frontend team can:

1. **Implement the core component library** following these specifications
2. **Create page-specific components** using the established patterns
3. **Integrate with the Redux store** for state management
4. **Add responsive design** features for mobile and tablet support
5. **Implement accessibility features** following WCAG guidelines
6. **Add testing strategies** for component reliability
7. **Create Storybook documentation** for component catalog