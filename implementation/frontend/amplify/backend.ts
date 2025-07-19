import { defineBackend } from '@aws-amplify/backend';
import { data } from './data/resource';

// Note: We're reusing the existing Cognito User Pool from our backend infrastructure
// instead of creating a new one. This provides unified authentication across
// both real observability APIs and Amplify Data operations.

defineBackend({
  data
});