// Amplify configuration using existing Cognito User Pool from backend infrastructure
// 
// ARCHITECTURE DECISION: Hybrid Authentication Approach
// 1. Observability APIs: Cognito User Pool JWT tokens → API Gateway (existing backend pattern)
// 2. Amplify Data: API Key authorization → AppSync (mock data for stubbed features)
//
// RATIONALE: Backend infrastructure provides User Pool but no Identity Pool.
// This indicates it was designed for API Gateway JWT auth, not AWS SDK credential access.
// Using referenceAuth() would require adding Identity Pool + IAM roles to backend.
//
// BENEFITS:
// - ✅ Works with existing backend architecture (no infrastructure changes needed)
// - ✅ Proper JWT authentication for real observability data
// - ✅ Secure API Key access for public mock data (projects, templates, user profiles)
// - ✅ Single sign-on experience for users
// - ✅ Simple, maintainable, aligned with backend design

export const amplifyConfig = {
  Auth: {
    Cognito: {
      userPoolId: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID!,
      userPoolClientId: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID!,
      // Using external User Pool from backend shared infrastructure
      // Pool ID: eu-west-2_PayvQ7I3A (from shared-resources.yaml)
    },
  },
  API: {
    REST: {
      observabilityAPI: {
        endpoint: process.env.NEXT_PUBLIC_API_ENDPOINT!,
        region: process.env.NEXT_PUBLIC_AWS_REGION!,
        // This API uses Cognito User Pool JWT tokens for authentication
        // Tokens are automatically attached by AWS Amplify Auth
      },
    },
  },
};

// Note: amplify_outputs.json contains the Amplify Data (AppSync) endpoint configuration
// The AppSync API uses API Key authorization for mock data access
// Future enhancement: Could add Identity Pool to backend for user-based Amplify Data auth