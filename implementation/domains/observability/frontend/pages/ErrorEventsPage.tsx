'use client';

import { Container, Header, SpaceBetween } from '@cloudscape-design/components';
import { useAppDispatch } from '../../../frontend/src/store/hooks';
import { setActiveSection } from '../../../frontend/src/store/slices/uiSlice';
import { ErrorEventsViewer } from '../components/ErrorEventsViewer';
import { useEffect } from 'react';

export function ErrorEventsPage() {
  const dispatch = useAppDispatch();

  useEffect(() => {
    dispatch(setActiveSection('alerts'));
  }, [dispatch]);

  return (
    <Container>
      <SpaceBetween direction="vertical" size="l">
        <Header
          variant="h1"
          description="Monitor real-time error events from EventBridge across your infrastructure"
        >
          Error Events
        </Header>

        <ErrorEventsViewer 
          limit={100}
          autoRefresh={true}
          showDetails={true}
        />
      </SpaceBetween>
    </Container>
  );
}