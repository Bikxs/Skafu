# 🔐 Unified Authentication System Migration Guide

This guide documents the migration from hybrid authentication (API Key + external Cognito) to a unified authentication system using Cognito Identity Pool integration.

## 📋 Overview

**Current State (Hybrid)**:
- ✅ Observability APIs: Cognito User Pool JWT → API Gateway
- ✅ Amplify Data: API Key → AppSync GraphQL
- ❌ No AWS SDK credentials for frontend

**Target State (Unified)**:
- ✅ Observability APIs: Cognito User Pool JWT → API Gateway
- ✅ Amplify Data: User Pool authentication → AppSync GraphQL
- ✅ AWS SDK credentials via Identity Pool for advanced features

## 🚀 Migration Steps

### Phase 1: Deploy Backend Infrastructure

1. **Deploy Updated SAM Template**:
   ```bash
   cd /home/bikxs/Projects/Skafu/implementation/shared/infrastructure
   sam deploy --guided
   ```

2. **Verify New Resources Created**:
   - Cognito Identity Pool
   - IAM Roles (Authenticated/Unauthenticated)
   - Frontend User Pool Client
   - Identity Pool Role Attachment

3. **Extract Stack Outputs**:
   ```bash
   aws cloudformation describe-stacks \
     --stack-name skafu-shared-resources-development \
     --query 'Stacks[0].Outputs' \
     --output table
   ```

### Phase 2: Configure Frontend Environment

4. **Update Environment Variables**:
   ```bash
   # Copy and configure environment file
   cp .env.example .env.local
   
   # Set the new values from stack outputs:
   NEXT_PUBLIC_COGNITO_FRONTEND_CLIENT_ID=<FrontendUserPoolClientId>
   NEXT_PUBLIC_COGNITO_IDENTITY_POOL_ID=<IdentityPoolId>
   NEXT_PUBLIC_AUTH_ROLE_ARN=<AuthenticatedRoleArn>
   NEXT_PUBLIC_UNAUTH_ROLE_ARN=<UnauthenticatedRoleArn>
   ```

### Phase 3: Deploy Amplify Backend

5. **Deploy Updated Amplify Backend**:
   ```bash
   cd /home/bikxs/Projects/Skafu/implementation/frontend
   npx ampx sandbox
   ```

6. **Verify Authentication Integration**:
   - Check that referenceAuth() connects to existing User Pool
   - Verify Identity Pool provides AWS SDK credentials
   - Test user-based authorization for Amplify Data

### Phase 4: Test Integration

7. **Test Authentication Flow**:
   ```bash
   npm run dev
   # Navigate to http://localhost:3000
   # Test sign-in/sign-out functionality
   # Verify access to both observability APIs and Amplify Data
   ```

8. **Verify Permissions**:
   - Test CloudWatch metrics access
   - Test Amplify Data CRUD operations
   - Verify owner-based authorization works
   - Test S3 file upload capabilities (if needed)

## 🔧 Configuration Details

### Stack Outputs Required

| Output Name | Environment Variable | Purpose |
|-------------|---------------------|---------|
| `FrontendUserPoolClientId` | `NEXT_PUBLIC_COGNITO_FRONTEND_CLIENT_ID` | Dedicated client for frontend |
| `IdentityPoolId` | `NEXT_PUBLIC_COGNITO_IDENTITY_POOL_ID` | AWS SDK credentials |
| `AuthenticatedRoleArn` | `NEXT_PUBLIC_AUTH_ROLE_ARN` | Authenticated user permissions |
| `UnauthenticatedRoleArn` | `NEXT_PUBLIC_UNAUTH_ROLE_ARN` | Anonymous user permissions |

### IAM Permissions Summary

**Authenticated Role Permissions**:
- ✅ AppSync GraphQL operations
- ✅ CloudWatch metrics/logs/traces (read-only)
- ✅ S3 Assets bucket (read/write)
- ✅ DynamoDB Event Store (user-scoped)

**Unauthenticated Role Permissions**:
- ✅ Minimal Cognito Sync permissions only

### Authorization Rules

**Amplify Data Models**:
- **Projects**: Owner-based (create/update/delete) + authenticated read
- **Templates**: Author-based (create/update/delete) + authenticated read/update
- **UserProfiles**: Owner-based (create/update/delete) + authenticated read

## 🐛 Troubleshooting

### Common Issues

1. **"User Pool not found" Error**:
   - Verify `NEXT_PUBLIC_COGNITO_USER_POOL_ID` matches actual pool
   - Check AWS region configuration

2. **"Identity Pool not configured" Error**:
   - Ensure `NEXT_PUBLIC_COGNITO_IDENTITY_POOL_ID` is set
   - Verify Identity Pool exists in AWS Console

3. **Permission Denied Errors**:
   - Check IAM role policies in SAM template
   - Verify role trust relationships are correct

4. **Authentication Loop**:
   - Clear browser storage and cookies
   - Check User Pool Client configuration
   - Verify callback URLs are set correctly

### Rollback Plan

If issues arise, you can temporarily revert to API Key mode:

```typescript
// In amplify/data/resource.ts
export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'apiKey', // Fallback to API Key
    apiKeyAuthorizationMode: { expiresInDays: 30 },
  },
});
```

## 📊 Benefits After Migration

1. **Unified Authentication**: Single sign-on across all features
2. **Enhanced Security**: User-based data isolation and permissions
3. **AWS SDK Access**: Full AWS service integration capabilities
4. **Better UX**: Consistent authentication experience
5. **Scalability**: Ready for advanced features requiring AWS SDK

## 🔄 Future Enhancements

After successful migration, these features become possible:
- Real-time file uploads to S3
- Direct DynamoDB access for user data
- Advanced CloudWatch dashboard customization
- User-specific notification preferences
- Cross-service AWS integrations

---

**Note**: This migration maintains backward compatibility. The existing observability API authentication remains unchanged, ensuring zero downtime for core features.