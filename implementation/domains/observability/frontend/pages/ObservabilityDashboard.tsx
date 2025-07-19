'use client';

import { 
  Container, 
  Header, 
  Grid, 
  Box, 
  SpaceBetween,
  ColumnLayout,
  Cards,
  Button,
  Badge,
  StatusIndicator
} from '@cloudscape-design/components';
import { useAppDispatch, useAppSelector } from '../../../frontend/src/store/hooks';
import { setActiveSection } from '../../../frontend/src/store/slices/uiSlice';
import { useGetHealthMetricsQuery, useGetAlertsQuery } from '../../../frontend/src/store/apis/observabilityApi';
import { useGetErrorEventsQuery, useSubscribeToErrorEventsQuery } from '../../../frontend/src/store/apis/amplifyDataApi';
import { selectTimeRange } from '../store/observabilitySlice';
import { useEffect } from 'react';

export function ObservabilityDashboard() {
  const dispatch = useAppDispatch();
  const timeRange = useAppSelector(selectTimeRange);

  // Fetch observability data
  const { data: healthMetrics, isLoading: metricsLoading } = useGetHealthMetricsQuery(timeRange);
  const { data: alerts, isLoading: alertsLoading } = useGetAlertsQuery();
  const { data: errorEvents, isLoading: errorEventsLoading } = useGetErrorEventsQuery({ limit: 10 });
  const { data: liveErrorEvents } = useSubscribeToErrorEventsQuery();

  useEffect(() => {
    dispatch(setActiveSection('dashboard'));
  }, [dispatch]);

  const quickStats = [
    {
      label: 'Total Requests',
      value: healthMetrics?.summary.total_requests || 0,
      status: 'success' as const,
      icon: 'trending-up',
    },
    {
      label: 'Error Rate',
      value: `${healthMetrics?.summary.error_percentage || 0}%`,
      status: healthMetrics?.summary.error_percentage && healthMetrics.summary.error_percentage > 5 ? 'error' : 'success',
      icon: 'status-warning',
    },
    {
      label: 'Avg Response Time',
      value: `${healthMetrics?.summary.avg_response_time || 0}ms`,
      status: healthMetrics?.summary.avg_response_time && healthMetrics.summary.avg_response_time > 1000 ? 'warning' : 'success',
      icon: 'clock',
    },
    {
      label: 'Uptime',
      value: `${healthMetrics?.summary.uptime_percentage || 0}%`,
      status: healthMetrics?.summary.uptime_percentage && healthMetrics.summary.uptime_percentage < 99 ? 'warning' : 'success',
      icon: 'status-positive',
    },
  ];

  const observabilityTools = [
    {
      title: 'Metrics',
      description: 'Monitor application and infrastructure metrics',
      href: '/dashboard/observability/metrics',
      icon: 'trending-up',
      status: metricsLoading ? 'loading' : 'ready',
    },
    {
      title: 'Logs',
      description: 'Search and analyze application logs',
      href: '/dashboard/observability/logs',
      icon: 'file-text',
      status: 'ready',
    },
    {
      title: 'Traces',
      description: 'Distributed tracing and performance analysis',
      href: '/dashboard/observability/traces',
      icon: 'network',
      status: 'ready',
    },
    {
      title: 'Alerts',
      description: 'Manage alerts and notifications',
      href: '/dashboard/observability/alerts',
      icon: 'notification',
      status: alertsLoading ? 'loading' : 'ready',
      badge: alerts?.summary.alarm_count || 0,
    },
    {
      title: 'Error Events',
      description: 'Real-time error event streaming',
      href: '/dashboard/observability/errors',
      icon: 'status-warning',
      status: errorEventsLoading ? 'loading' : 'ready',
      badge: (errorEvents?.length || 0) + (liveErrorEvents?.length || 0),
    },
    {
      title: 'Costs',
      description: 'Monitor AWS costs and usage',
      href: '/dashboard/observability/costs',
      icon: 'dollar-sign',
      status: 'ready',
    },
  ];

  return (
    <Container>
      <SpaceBetween direction="vertical" size="l">
        <Header
          variant="h1"
          description="Monitor your applications and infrastructure with comprehensive observability tools"
          actions={
            <SpaceBetween direction="horizontal" size="xs">
              <Button iconName="refresh" onClick={() => window.location.reload()}>
                Refresh
              </Button>
              <Button variant="primary" href="/dashboard/observability/metrics">
                View Metrics
              </Button>
            </SpaceBetween>
          }
        >
          Observability Dashboard
        </Header>

        {/* Quick Stats */}
        <Container
          header={
            <Header variant="h2">
              System Health Overview
            </Header>
          }
        >
          <ColumnLayout columns={4} borders="vertical">
            {quickStats.map((stat, index) => (
              <Box key={index} textAlign="center" padding="m">
                <SpaceBetween direction="vertical" size="xs">
                  <StatusIndicator type={stat.status}>
                    {stat.label}
                  </StatusIndicator>
                  <Box variant="h2" fontWeight="bold">
                    {stat.value}
                  </Box>
                </SpaceBetween>
              </Box>
            ))}
          </ColumnLayout>
        </Container>

        {/* Observability Tools */}
        <Cards
          ariaLabels={{
            itemSelectionLabel: (e, t) => `select ${t.title}`,
            selectionGroupLabel: 'Observability tools selection',
          }}
          cardDefinition={{
            header: (item) => (
              <Box>
                <SpaceBetween direction="horizontal" size="xs" alignItems="center">
                  <Box variant="h3">{item.title}</Box>
                  {item.badge !== undefined && item.badge > 0 && (
                    <Badge color={item.badge > 0 ? 'red' : 'grey'}>
                      {item.badge}
                    </Badge>
                  )}
                </SpaceBetween>
              </Box>
            ),
            sections: [
              {
                id: 'description',
                content: (item) => (
                  <Box variant="p" color="text-body-secondary">
                    {item.description}
                  </Box>
                ),
              },
              {
                id: 'status',
                content: (item) => (
                  <StatusIndicator type={item.status === 'loading' ? 'loading' : 'success'}>
                    {item.status === 'loading' ? 'Loading...' : 'Ready'}
                  </StatusIndicator>
                ),
              },
              {
                id: 'actions',
                content: (item) => (
                  <Button href={item.href} iconAlign="right" iconName="external">
                    Open {item.title}
                  </Button>
                ),
              },
            ],
          }}
          cardsPerRow={[
            { cards: 1 },
            { minWidth: 500, cards: 2 },
            { minWidth: 800, cards: 3 },
          ]}
          items={observabilityTools}
          loadingText="Loading observability tools..."
          trackBy="title"
          variant="full-page"
          selectionType="none"
        />

        {/* Recent Activity */}
        <Grid
          gridDefinition={[
            { colspan: { default: 12, xs: 6 } },
            { colspan: { default: 12, xs: 6 } }
          ]}
        >
          <Container
            header={
              <Header 
                variant="h2" 
                actions={
                  <Button href="/dashboard/observability/alerts" variant="link">
                    View all alerts
                  </Button>
                }
              >
                Recent Alerts
              </Header>
            }
          >
            {alertsLoading ? (
              <StatusIndicator type="loading">Loading alerts...</StatusIndicator>
            ) : alerts?.alerts && alerts.alerts.length > 0 ? (
              <SpaceBetween direction="vertical" size="xs">
                {alerts.alerts.slice(0, 5).map((alert) => (
                  <Box key={alert.id}>
                    <SpaceBetween direction="horizontal" size="xs" alignItems="center">
                      <StatusIndicator type={alert.state === 'ALARM' ? 'error' : 'success'}>
                        {alert.name}
                      </StatusIndicator>
                      <Badge color={alert.state === 'ALARM' ? 'red' : 'green'}>
                        {alert.state}
                      </Badge>
                    </SpaceBetween>
                  </Box>
                ))}
              </SpaceBetween>
            ) : (
              <Box variant="p" color="text-body-secondary">
                No recent alerts
              </Box>
            )}
          </Container>

          <Container
            header={
              <Header 
                variant="h2"
                actions={
                  <Button href="/dashboard/observability/errors" variant="link">
                    View all error events
                  </Button>
                }
              >
                Recent Error Events
              </Header>
            }
          >
            {errorEventsLoading ? (
              <StatusIndicator type="loading">Loading error events...</StatusIndicator>
            ) : errorEvents && errorEvents.length > 0 ? (
              <SpaceBetween direction="vertical" size="xs">
                {errorEvents.slice(0, 5).map((event) => (
                  <Box key={event.id}>
                    <SpaceBetween direction="horizontal" size="xs" alignItems="center">
                      <StatusIndicator type="error">
                        Error Event
                      </StatusIndicator>
                      <Box variant="small" color="text-body-secondary">
                        {new Date(event.createdAt || '').toLocaleString()}
                      </Box>
                    </SpaceBetween>
                  </Box>
                ))}
              </SpaceBetween>
            ) : (
              <Box variant="p" color="text-body-secondary">
                No recent error events
              </Box>
            )}
          </Container>
        </Grid>
      </SpaceBetween>
    </Container>
  );
}