import { defineBackend } from '@aws-amplify/backend';
import { data } from './data/resource';
import { auth } from './auth/resource';

// Unified authentication system using existing Cognito infrastructure
// - User Pool & Identity Pool: Shared with SAM backend domains
// - Auth/Unauth Roles: Defined in shared-resources.yaml
// - Frontend Client: Dedicated client for better separation of concerns

defineBackend({
  auth,
  data
});