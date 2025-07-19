// Amplify Gen2 auth resource using existing Cognito infrastructure
// References the shared Cognito User Pool and Identity Pool from SAM backend

import { referenceAuth } from '@aws-amplify/backend';

export const auth = referenceAuth({
  // Reference existing User Pool from shared infrastructure
  userPoolId: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID!,
  
  // Use dedicated frontend client (better separation of concerns)
  userPoolClientId: process.env.NEXT_PUBLIC_COGNITO_FRONTEND_CLIENT_ID!,
  
  // Reference Identity Pool created in SAM template
  identityPoolId: process.env.NEXT_PUBLIC_COGNITO_IDENTITY_POOL_ID!,
  
  // IAM roles for AWS SDK access
  authRoleArn: process.env.NEXT_PUBLIC_AUTH_ROLE_ARN!,
  unauthRoleArn: process.env.NEXT_PUBLIC_UNAUTH_ROLE_ARN!,
});

// Export types for TypeScript integration
export type AuthConfig = typeof auth;