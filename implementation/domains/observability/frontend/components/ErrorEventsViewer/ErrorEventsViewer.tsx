'use client';

import React from 'react';
import {
  Container,
  Header,
  Table,
  Box,
  SpaceBetween,
  Button,
  StatusIndicator,
  Badge,
  Modal,
  CodeEditor,
  Toggle,
  Select,
} from '@cloudscape-design/components';
import { useState, useEffect } from 'react';
import { useGetErrorEventsQuery, useSubscribeToErrorEventsQuery } from '../../../../frontend/src/store/apis/amplifyDataApi';
import type { ErrorEvent, ErrorEventsViewerProps } from '../../types';

export function ErrorEventsViewer({ 
  limit = 50, 
  autoRefresh = true, 
  showDetails = true 
}: ErrorEventsViewerProps) {
  const [selectedEvent, setSelectedEvent] = useState<ErrorEvent | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(autoRefresh);
  const [selectedSeverity, setSelectedSeverity] = useState<{ label: string; value: string }>({ label: 'All', value: '' });

  // Fetch error events
  const { data: errorEvents, isLoading, error, refetch } = useGetErrorEventsQuery(
    { limit },
    { pollingInterval: autoRefreshEnabled ? 30000 : 0 } // Poll every 30 seconds if auto-refresh enabled
  );

  // Subscribe to real-time error events
  const { data: liveErrorEvents } = useSubscribeToErrorEventsQuery();

  // Combine static and live events, removing duplicates
  const allEvents = React.useMemo(() => {
    const events = [...(errorEvents || [])];
    const liveEvents = liveErrorEvents || [];
    
    // Add live events that aren't already in the main list
    liveEvents.forEach(liveEvent => {
      if (!events.find(event => event.id === liveEvent.id)) {
        events.unshift(liveEvent);
      }
    });
    
    // Sort by creation time (newest first) and limit
    return events
      .sort((a, b) => new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime())
      .slice(0, limit);
  }, [errorEvents, liveErrorEvents, limit]);

  const handleViewDetails = (event: ErrorEvent) => {
    setSelectedEvent(event);
    setShowModal(true);
  };

  const formatEventPayload = (eventPayload: string | null) => {
    if (!eventPayload) return 'No payload data';
    
    try {
      return JSON.stringify(JSON.parse(eventPayload), null, 2);
    } catch {
      return eventPayload;
    }
  };

  const getEventSeverity = (event: ErrorEvent) => {
    // Parse event payload to determine severity
    try {
      const payload = JSON.parse(event.eventPayload || '{}');
      const detailType = payload['detail-type'] || '';
      
      if (detailType.toLowerCase().includes('critical') || detailType.toLowerCase().includes('fatal')) {
        return { level: 'critical', color: 'red' };
      } else if (detailType.toLowerCase().includes('error')) {
        return { level: 'high', color: 'red' };
      } else if (detailType.toLowerCase().includes('warning')) {
        return { level: 'medium', color: 'orange' };
      } else {
        return { level: 'low', color: 'blue' };
      }
    } catch {
      return { level: 'unknown', color: 'grey' };
    }
  };

  const columnDefinitions = [
    {
      id: 'timestamp',
      header: 'Timestamp',
      cell: (item: ErrorEvent) => (
        <Box variant="small">
          {new Date(item.createdAt || '').toLocaleString()}
        </Box>
      ),
      sortingField: 'createdAt',
      width: 180,
    },
    {
      id: 'severity',
      header: 'Severity',
      cell: (item: ErrorEvent) => {
        const severity = getEventSeverity(item);
        return (
          <Badge color={severity.color}>
            {severity.level.toUpperCase()}
          </Badge>
        );
      },
      width: 100,
    },
    {
      id: 'source',
      header: 'Source',
      cell: (item: ErrorEvent) => {
        try {
          const payload = JSON.parse(item.eventPayload || '{}');
          return payload.source || 'Unknown';
        } catch {
          return 'Unknown';
        }
      },
      width: 150,
    },
    {
      id: 'detailType',
      header: 'Event Type',
      cell: (item: ErrorEvent) => {
        try {
          const payload = JSON.parse(item.eventPayload || '{}');
          return payload['detail-type'] || 'Unknown';
        } catch {
          return 'Unknown';
        }
      },
      width: 200,
    },
    {
      id: 'region',
      header: 'Region',
      cell: (item: ErrorEvent) => {
        try {
          const payload = JSON.parse(item.eventPayload || '{}');
          return payload.region || 'Unknown';
        } catch {
          return 'Unknown';
        }
      },
      width: 120,
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: (item: ErrorEvent) => (
        <Button
          variant="link"
          onClick={() => handleViewDetails(item)}
          disabled={!showDetails}
        >
          View Details
        </Button>
      ),
      width: 120,
    },
  ];

  const severityOptions = [
    { label: 'All', value: '' },
    { label: 'Critical', value: 'critical' },
    { label: 'High', value: 'high' },
    { label: 'Medium', value: 'medium' },
    { label: 'Low', value: 'low' },
  ];

  // Filter events by severity
  const filteredEvents = selectedSeverity.value 
    ? allEvents.filter(event => getEventSeverity(event).level === selectedSeverity.value)
    : allEvents;

  return (
    <>
      <Container
        header={
          <Header
            variant="h2"
            description="Real-time error events from EventBridge with complete payload data"
            actions={
              <SpaceBetween direction="horizontal" size="xs">
                <Toggle
                  checked={autoRefreshEnabled}
                  onChange={({ detail }) => setAutoRefreshEnabled(detail.checked)}
                >
                  Auto-refresh
                </Toggle>
                <Select
                  selectedOption={selectedSeverity}
                  onChange={({ detail }) => setSelectedSeverity(detail.selectedOption)}
                  options={severityOptions}
                  placeholder="Filter by severity"
                />
                <Button iconName="refresh" onClick={() => refetch()}>
                  Refresh
                </Button>
              </SpaceBetween>
            }
          >
            Error Events ({filteredEvents.length})
          </Header>
        }
      >
        {isLoading ? (
          <StatusIndicator type="loading">Loading error events...</StatusIndicator>
        ) : error ? (
          <StatusIndicator type="error">
            Failed to load error events: {String(error)}
          </StatusIndicator>
        ) : (
          <Table
            columnDefinitions={columnDefinitions}
            items={filteredEvents}
            sortingDisabled={false}
            variant="borderless"
            wrapLines={false}
            stripedRows={true}
            selectionType="single"
            empty={
              <Box textAlign="center" color="inherit">
                <b>No error events found</b>
                <Box variant="p" color="inherit">
                  No error events match the current filters.
                </Box>
              </Box>
            }
            loadingText="Loading error events..."
          />
        )}
      </Container>

      {/* Event Details Modal */}
      <Modal
        visible={showModal}
        onDismiss={() => setShowModal(false)}
        header="Error Event Details"
        footer={
          <Box float="right">
            <Button onClick={() => setShowModal(false)}>Close</Button>
          </Box>
        }
        size="large"
      >
        {selectedEvent && (
          <SpaceBetween direction="vertical" size="m">
            <Container header={<Header variant="h3">Event Information</Header>}>
              <SpaceBetween direction="vertical" size="s">
                <Box>
                  <Box variant="small" color="text-label">Event ID:</Box>
                  <Box fontFamily="monospace">{selectedEvent.id}</Box>
                </Box>
                <Box>
                  <Box variant="small" color="text-label">Created At:</Box>
                  <Box>{new Date(selectedEvent.createdAt || '').toLocaleString()}</Box>
                </Box>
                <Box>
                  <Box variant="small" color="text-label">Updated At:</Box>
                  <Box>{new Date(selectedEvent.updatedAt || '').toLocaleString()}</Box>
                </Box>
              </SpaceBetween>
            </Container>

            <Container header={<Header variant="h3">Event Payload</Header>}>
              <CodeEditor
                ace={undefined}
                language="json"
                value={formatEventPayload(selectedEvent.eventPayload)}
                readOnly={true}
                preferences={{
                  fontSize: 14,
                  tabSize: 2,
                  wrapLinesEnabled: true,
                }}
                i18nStrings={{
                  loadingState: 'Loading code editor',
                  errorState: 'There was an error loading the code editor.',
                  errorStateRecovery: 'Retry',
                  editorGroupAriaLabel: 'Code editor',
                  statusBarGroupAriaLabel: 'Status bar',
                  cursorPosition: (row, column) => `Line ${row}, Column ${column}`,
                  errorsTab: 'Errors',
                  warningsTab: 'Warnings',
                  preferencesButtonAriaLabel: 'Preferences',
                  paneCloseButtonAriaLabel: 'Close',
                  preferencesModalHeader: 'Preferences',
                  preferencesModalCancel: 'Cancel',
                  preferencesModalConfirm: 'Confirm',
                  preferencesModalWrapLinesLabel: 'Wrap lines',
                  preferencesModalThemeLabel: 'Theme',
                  preferencesModalThemeValueLight: 'Light',
                  preferencesModalThemeValueDark: 'Dark',
                  preferencesModalFontSizeLabel: 'Font size',
                  preferencesModalTabSizeLabel: 'Tab size',
                }}
              />
            </Container>
          </SpaceBetween>
        )}
      </Modal>
    </>
  );
}