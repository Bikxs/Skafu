'use client';

import { 
  Container, 
  Header, 
  Grid, 
  Box, 
  Cards, 
  Button,
  SpaceBetween,
  ColumnLayout
} from '@cloudscape-design/components';
import { useAppDispatch } from '@/store/hooks';
import { setActiveSection } from '@/store/slices/uiSlice';
import { useEffect } from 'react';

export default function DashboardPage() {
  const dispatch = useAppDispatch();

  useEffect(() => {
    dispatch(setActiveSection('dashboard'));
  }, [dispatch]);

  const quickAccessItems = [
    {
      header: 'Observability',
      description: 'Monitor metrics, logs, traces, and alerts',
      href: '/dashboard/observability',
      items: [
        { name: 'Metrics', href: '/dashboard/observability/metrics' },
        { name: 'Logs', href: '/dashboard/observability/logs' },
        { name: 'Traces', href: '/dashboard/observability/traces' },
        { name: 'Alerts', href: '/dashboard/observability/alerts' },
      ]
    },
    {
      header: 'Projects',
      description: 'Manage your projects and deployments',
      href: '/dashboard/projects',
      items: [
        { name: 'Active Projects', href: '/dashboard/projects' },
        { name: 'Templates', href: '/dashboard/templates' },
        { name: 'Deployments', href: '/dashboard/projects/deployments' },
      ]
    },
    {
      header: 'AI Assistant',
      description: 'Claude-powered development assistance',
      href: '/dashboard/ai',
      items: [
        { name: 'Code Analysis', href: '/dashboard/ai/analysis' },
        { name: 'Recommendations', href: '/dashboard/ai/recommendations' },
        { name: 'Documentation', href: '/dashboard/ai/docs' },
      ]
    }
  ];

  return (
    <Container>
      <SpaceBetween direction="vertical" size="l">
        <Header
          variant="h1"
          description="Welcome to your Skafu dashboard. Monitor your applications, manage projects, and leverage AI-powered insights."
        >
          Dashboard
        </Header>

        <ColumnLayout columns={3} borders="vertical">
          {quickAccessItems.map((section, index) => (
            <Box key={index} padding="l">
              <SpaceBetween direction="vertical" size="m">
                <Header variant="h3">{section.header}</Header>
                <Box variant="p" color="text-body-secondary">
                  {section.description}
                </Box>
                <SpaceBetween direction="vertical" size="xs">
                  {section.items.map((item, itemIndex) => (
                    <Button 
                      key={itemIndex}
                      variant="link"
                      href={item.href}
                      iconAlign="right"
                      iconName="external"
                    >
                      {item.name}
                    </Button>
                  ))}
                </SpaceBetween>
                <Button href={section.href} variant="primary">
                  Go to {section.header}
                </Button>
              </SpaceBetween>
            </Box>
          ))}
        </ColumnLayout>

        <Grid
          gridDefinition={[
            { colspan: { default: 12, xs: 6 } },
            { colspan: { default: 12, xs: 6 } }
          ]}
        >
          <Container
            header={
              <Header variant="h2" description="Recent activity across your infrastructure">
                Recent Activity
              </Header>
            }
          >
            <Box variant="p" color="text-body-secondary">
              Recent events and notifications will appear here.
            </Box>
          </Container>

          <Container
            header={
              <Header variant="h2" description="Quick insights and metrics">
                System Overview
              </Header>
            }
          >
            <Box variant="p" color="text-body-secondary">
              High-level system metrics and health indicators will appear here.
            </Box>
          </Container>
        </Grid>
      </SpaceBetween>
    </Container>
  );
}