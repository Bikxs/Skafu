# Access Control Patterns

## Overview

This document defines the access control patterns and implementation strategies for the Skafu platform. It covers authentication flows, authorization models, and security enforcement mechanisms across all system components.

## Authentication Patterns

### Primary Authentication Flow

```typescript
// Authentication Service Interface
interface AuthenticationService {
  // Primary authentication methods
  authenticateWithPassword(credentials: PasswordCredentials): Promise<AuthResult>;
  authenticateWithSAML(samlResponse: string): Promise<AuthResult>;
  authenticateWithOAuth(provider: OAuthProvider, code: string): Promise<AuthResult>;
  authenticateWithMFA(mfaToken: string, sessionId: string): Promise<AuthResult>;
  
  // Session management
  createSession(userId: string, deviceInfo: DeviceInfo): Promise<Session>;
  validateSession(sessionToken: string): Promise<SessionValidation>;
  invalidateSession(sessionToken: string): Promise<void>;
  
  // Token management
  generateTokens(userId: string, sessionId: string): Promise<TokenPair>;
  refreshTokens(refreshToken: string): Promise<TokenPair>;
  revokeTokens(tokenId: string): Promise<void>;
}

// Authentication Flow Implementation
class AuthenticationFlow {
  async authenticate(request: AuthRequest): Promise<AuthResponse> {
    // 1. Validate request format and rate limits
    await this.validateRequest(request);
    
    // 2. Primary authentication
    const primaryAuth = await this.primaryAuthentication(request);
    if (!primaryAuth.success) {
      await this.recordFailedAttempt(request);
      throw new AuthenticationError('Primary authentication failed');
    }
    
    // 3. Risk assessment
    const riskScore = await this.assessRisk(request, primaryAuth.user);
    
    // 4. MFA challenge if required
    if (riskScore > 0.5 || primaryAuth.user.mfaRequired) {
      return await this.requireMFA(primaryAuth.user, request);
    }
    
    // 5. Session creation
    const session = await this.createSession(primaryAuth.user, request);
    
    // 6. Token generation
    const tokens = await this.generateTokens(session);
    
    // 7. Audit logging
    await this.auditLog('authentication_success', {
      userId: primaryAuth.user.id,
      sessionId: session.id,
      riskScore,
      ipAddress: request.ipAddress,
      userAgent: request.userAgent,
    });
    
    return {
      success: true,
      tokens,
      session,
      requiresMFA: false,
    };
  }
}
```

### Multi-Factor Authentication Patterns

```typescript
// MFA Service Interface
interface MFAService {
  // MFA method registration
  registerTOTP(userId: string): Promise<TOTPSecret>;
  registerSMS(userId: string, phoneNumber: string): Promise<void>;
  registerWebAuthn(userId: string, publicKey: string): Promise<void>;
  
  // MFA verification
  verifyTOTP(userId: string, token: string): Promise<boolean>;
  verifySMS(userId: string, token: string): Promise<boolean>;
  verifyWebAuthn(userId: string, assertion: string): Promise<boolean>;
  
  // MFA management
  getMFAMethods(userId: string): Promise<MFAMethod[]>;
  removeMFAMethod(userId: string, methodId: string): Promise<void>;
  setPreferredMFA(userId: string, methodId: string): Promise<void>;
}

// MFA Challenge Flow
class MFAChallenge {
  async initiateMFA(user: User, request: AuthRequest): Promise<MFAChallenge> {
    const availableMethods = await this.mfaService.getMFAMethods(user.id);
    
    if (availableMethods.length === 0) {
      throw new MFARequiredError('MFA setup required');
    }
    
    // Select best MFA method based on risk and user preference
    const selectedMethod = this.selectMFAMethod(availableMethods, request);
    
    // Generate challenge
    const challenge = await this.generateChallenge(selectedMethod, user);
    
    // Store challenge in session
    await this.storeChallenge(challenge, user.id);
    
    return {
      challengeId: challenge.id,
      method: selectedMethod.type,
      expiresAt: challenge.expiresAt,
      deliveryTarget: this.maskTarget(selectedMethod.target),
    };
  }
  
  async verifyMFA(challengeId: string, response: string): Promise<boolean> {
    const challenge = await this.getChallenge(challengeId);
    
    if (!challenge || challenge.expiresAt < new Date()) {
      throw new MFAExpiredError('MFA challenge expired');
    }
    
    const isValid = await this.verifyResponse(challenge, response);
    
    if (isValid) {
      await this.markChallengeUsed(challengeId);
      await this.auditLog('mfa_success', {
        userId: challenge.userId,
        method: challenge.method,
        challengeId,
      });
    } else {
      await this.recordFailedMFA(challenge);
    }
    
    return isValid;
  }
}
```

### Single Sign-On (SSO) Integration

```typescript
// SAML 2.0 Implementation
class SAMLAuthProvider {
  async processSAMLResponse(samlResponse: string): Promise<AuthResult> {
    // 1. Validate SAML response
    const validationResult = await this.validateSAMLResponse(samlResponse);
    if (!validationResult.valid) {
      throw new SAMLValidationError('Invalid SAML response');
    }
    
    // 2. Extract user attributes
    const attributes = this.extractAttributes(validationResult.assertion);
    
    // 3. Map to internal user
    const user = await this.mapSAMLUser(attributes);
    
    // 4. Provision or update user
    const provisionedUser = await this.provisionUser(user);
    
    // 5. Apply group mappings
    await this.applyGroupMappings(provisionedUser, attributes);
    
    return {
      success: true,
      user: provisionedUser,
      attributes,
    };
  }
  
  private async validateSAMLResponse(response: string): Promise<ValidationResult> {
    // Verify signature
    const signatureValid = await this.verifySignature(response);
    
    // Check timestamp
    const notExpired = this.checkTimestamp(response);
    
    // Validate issuer
    const issuerValid = this.validateIssuer(response);
    
    // Validate audience
    const audienceValid = this.validateAudience(response);
    
    return {
      valid: signatureValid && notExpired && issuerValid && audienceValid,
      assertion: this.extractAssertion(response),
    };
  }
}

// OAuth 2.0 / OpenID Connect Implementation
class OAuthProvider {
  async exchangeCodeForTokens(code: string, provider: string): Promise<TokenResponse> {
    const tokenEndpoint = this.getTokenEndpoint(provider);
    
    const response = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${this.getClientCredentials(provider)}`,
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: this.getRedirectUri(provider),
        client_id: this.getClientId(provider),
      }),
    });
    
    if (!response.ok) {
      throw new OAuthError('Token exchange failed');
    }
    
    return await response.json();
  }
  
  async getUserInfo(accessToken: string, provider: string): Promise<UserInfo> {
    const userInfoEndpoint = this.getUserInfoEndpoint(provider);
    
    const response = await fetch(userInfoEndpoint, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });
    
    if (!response.ok) {
      throw new OAuthError('User info retrieval failed');
    }
    
    return await response.json();
  }
}
```

## Authorization Patterns

### Role-Based Access Control (RBAC)

```typescript
// Role Definition
interface Role {
  id: string;
  name: string;
  description: string;
  permissions: Permission[];
  inherits: string[]; // Parent role IDs
  conditions: Condition[];
  metadata: {
    createdAt: Date;
    updatedAt: Date;
    createdBy: string;
    isSystem: boolean;
  };
}

// Permission Definition
interface Permission {
  id: string;
  resource: string;
  action: string;
  conditions: Condition[];
  effect: 'ALLOW' | 'DENY';
  priority: number;
}

// RBAC Service Implementation
class RBACService {
  async checkPermission(
    userId: string,
    resource: string,
    action: string,
    context: Context
  ): Promise<boolean> {
    // 1. Get user roles
    const userRoles = await this.getUserRoles(userId);
    
    // 2. Collect all permissions from roles (including inherited)
    const allPermissions = await this.collectPermissions(userRoles);
    
    // 3. Filter permissions for resource and action
    const relevantPermissions = allPermissions.filter(p => 
      this.matchesResource(p.resource, resource) &&
      this.matchesAction(p.action, action)
    );
    
    // 4. Evaluate conditions
    const applicablePermissions = await this.evaluateConditions(
      relevantPermissions,
      context
    );
    
    // 5. Apply precedence rules (DENY takes precedence)
    const denyPermissions = applicablePermissions.filter(p => p.effect === 'DENY');
    if (denyPermissions.length > 0) {
      return false;
    }
    
    const allowPermissions = applicablePermissions.filter(p => p.effect === 'ALLOW');
    return allowPermissions.length > 0;
  }
  
  private async collectPermissions(roles: Role[]): Promise<Permission[]> {
    const permissions: Permission[] = [];
    const processedRoles = new Set<string>();
    
    const processRole = async (role: Role) => {
      if (processedRoles.has(role.id)) {
        return;
      }
      
      processedRoles.add(role.id);
      
      // Add role's direct permissions
      permissions.push(...role.permissions);
      
      // Process inherited roles
      for (const parentRoleId of role.inherits) {
        const parentRole = await this.getRole(parentRoleId);
        if (parentRole) {
          await processRole(parentRole);
        }
      }
    };
    
    for (const role of roles) {
      await processRole(role);
    }
    
    return permissions;
  }
}
```

### Attribute-Based Access Control (ABAC)

```typescript
// ABAC Policy Engine
interface ABACPolicy {
  id: string;
  name: string;
  description: string;
  target: PolicyTarget;
  rule: PolicyRule;
  effect: 'ALLOW' | 'DENY';
  priority: number;
  metadata: PolicyMetadata;
}

interface PolicyTarget {
  subjects: AttributeExpression[];
  resources: AttributeExpression[];
  actions: AttributeExpression[];
  environment: AttributeExpression[];
}

interface PolicyRule {
  condition: string; // CEL expression
  obligations: Obligation[];
  advice: Advice[];
}

// ABAC Evaluation Engine
class ABACEvaluator {
  async evaluate(request: AccessRequest): Promise<Decision> {
    // 1. Find applicable policies
    const applicablePolicies = await this.findApplicablePolicies(request);
    
    // 2. Evaluate policies in priority order
    const evaluationResults: EvaluationResult[] = [];
    
    for (const policy of applicablePolicies) {
      const result = await this.evaluatePolicy(policy, request);
      evaluationResults.push(result);
    }
    
    // 3. Apply combining algorithm
    const decision = this.combineDecisions(evaluationResults);
    
    // 4. Collect obligations and advice
    const obligations = this.collectObligations(evaluationResults);
    const advice = this.collectAdvice(evaluationResults);
    
    return {
      decision: decision.effect,
      obligations,
      advice,
      evaluationResults,
    };
  }
  
  private async evaluatePolicy(
    policy: ABACPolicy,
    request: AccessRequest
  ): Promise<EvaluationResult> {
    // 1. Check if policy target matches request
    const targetMatch = await this.evaluateTarget(policy.target, request);
    if (!targetMatch) {
      return {
        policy: policy.id,
        effect: 'NOT_APPLICABLE',
        reason: 'Target does not match',
      };
    }
    
    // 2. Evaluate policy rule condition
    const conditionResult = await this.evaluateCondition(
      policy.rule.condition,
      request
    );
    
    if (conditionResult.success) {
      return {
        policy: policy.id,
        effect: policy.effect,
        reason: 'Policy condition satisfied',
        obligations: policy.rule.obligations,
        advice: policy.rule.advice,
      };
    } else {
      return {
        policy: policy.id,
        effect: 'NOT_APPLICABLE',
        reason: `Condition failed: ${conditionResult.error}`,
      };
    }
  }
}
```

### Resource-Based Access Control

```typescript
// Resource-based permissions
interface ResourcePermission {
  resourceId: string;
  resourceType: string;
  principal: Principal;
  permissions: string[];
  conditions: Condition[];
  grantedBy: string;
  grantedAt: Date;
  expiresAt?: Date;
}

interface Principal {
  type: 'USER' | 'GROUP' | 'SERVICE' | 'ROLE';
  id: string;
  name: string;
}

// Resource Access Control Service
class ResourceAccessControl {
  async grantPermission(
    resourceId: string,
    principal: Principal,
    permissions: string[],
    grantedBy: string,
    conditions?: Condition[]
  ): Promise<void> {
    // 1. Validate resource exists
    const resource = await this.getResource(resourceId);
    if (!resource) {
      throw new ResourceNotFoundError(`Resource ${resourceId} not found`);
    }
    
    // 2. Check grantor has permission to grant
    const canGrant = await this.checkPermission(
      grantedBy,
      resourceId,
      'permission:grant'
    );
    
    if (!canGrant) {
      throw new InsufficientPermissionError('Cannot grant permissions');
    }
    
    // 3. Create permission record
    const permission: ResourcePermission = {
      resourceId,
      resourceType: resource.type,
      principal,
      permissions,
      conditions: conditions || [],
      grantedBy,
      grantedAt: new Date(),
    };
    
    // 4. Store permission
    await this.storePermission(permission);
    
    // 5. Audit log
    await this.auditLog('permission_granted', {
      resourceId,
      principal,
      permissions,
      grantedBy,
    });
  }
  
  async checkResourcePermission(
    userId: string,
    resourceId: string,
    action: string,
    context: Context
  ): Promise<boolean> {
    // 1. Get direct permissions
    const directPermissions = await this.getDirectPermissions(userId, resourceId);
    
    // 2. Get group permissions
    const groupPermissions = await this.getGroupPermissions(userId, resourceId);
    
    // 3. Get role permissions
    const rolePermissions = await this.getRolePermissions(userId, resourceId);
    
    // 4. Combine all permissions
    const allPermissions = [
      ...directPermissions,
      ...groupPermissions,
      ...rolePermissions,
    ];
    
    // 5. Check if any permission allows the action
    for (const permission of allPermissions) {
      if (permission.permissions.includes(action) ||
          permission.permissions.includes('*')) {
        
        // Check conditions
        if (await this.evaluateConditions(permission.conditions, context)) {
          return true;
        }
      }
    }
    
    return false;
  }
}
```

## Access Control Enforcement

### API Gateway Authorization

```typescript
// Lambda Authorizer for API Gateway
export const authorizer = async (event: APIGatewayTokenAuthorizerEvent): Promise<APIGatewayAuthorizerResult> => {
  try {
    // 1. Extract token from Authorization header
    const token = extractToken(event.authorizationToken);
    
    // 2. Validate token
    const tokenValidation = await validateToken(token);
    if (!tokenValidation.valid) {
      throw new UnauthorizedError('Invalid token');
    }
    
    // 3. Get user context
    const userContext = await getUserContext(tokenValidation.userId);
    
    // 4. Generate policy
    const policy = await generatePolicy(
      tokenValidation.userId,
      event.methodArn,
      userContext
    );
    
    return {
      principalId: tokenValidation.userId,
      policyDocument: policy,
      context: {
        userId: tokenValidation.userId,
        email: userContext.email,
        roles: JSON.stringify(userContext.roles),
        permissions: JSON.stringify(userContext.permissions),
      },
    };
  } catch (error) {
    throw new UnauthorizedError('Unauthorized');
  }
};

// Policy generation
async function generatePolicy(
  userId: string,
  methodArn: string,
  userContext: UserContext
): Promise<PolicyDocument> {
  const resource = parseMethodArn(methodArn);
  
  // Check permissions for the specific resource and action
  const hasPermission = await checkPermission(
    userId,
    resource.resource,
    resource.action,
    userContext
  );
  
  return {
    Version: '2012-10-17',
    Statement: [
      {
        Effect: hasPermission ? 'Allow' : 'Deny',
        Action: 'execute-api:Invoke',
        Resource: methodArn,
      },
    ],
  };
}
```

### Middleware Authorization

```typescript
// Express.js Authorization Middleware
export function authorize(
  requiredPermissions: string[],
  resourceExtractor?: (req: Request) => string
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // 1. Get user from token (set by authentication middleware)
      const user = req.user;
      if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      
      // 2. Extract resource ID if needed
      const resourceId = resourceExtractor ? resourceExtractor(req) : null;
      
      // 3. Check permissions
      const hasPermission = await checkUserPermissions(
        user.id,
        requiredPermissions,
        resourceId,
        {
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          timestamp: new Date(),
        }
      );
      
      if (!hasPermission) {
        await auditLog('authorization_denied', {
          userId: user.id,
          resource: resourceId,
          permissions: requiredPermissions,
          ipAddress: req.ip,
        });
        
        return res.status(403).json({ error: 'Forbidden' });
      }
      
      // 4. Add resource context to request
      if (resourceId) {
        req.resource = await getResource(resourceId);
      }
      
      next();
    } catch (error) {
      console.error('Authorization error:', error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  };
}

// Usage examples
app.get('/projects/:id', 
  authenticate(),
  authorize(['project:read'], (req) => req.params.id),
  getProject
);

app.post('/projects/:id/deploy',
  authenticate(),
  authorize(['project:deploy'], (req) => req.params.id),
  deployProject
);
```

### Database Row-Level Security

```sql
-- PostgreSQL Row-Level Security (RLS) policies
-- Enable RLS on projects table
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- Policy for project access based on user membership
CREATE POLICY project_access_policy ON projects
  FOR ALL TO authenticated_role
  USING (
    id IN (
      SELECT project_id 
      FROM project_members 
      WHERE user_id = current_user_id()
        AND status = 'active'
    )
  );

-- Policy for organization admin access
CREATE POLICY org_admin_access_policy ON projects
  FOR ALL TO authenticated_role
  USING (
    organization_id IN (
      SELECT organization_id 
      FROM organization_members 
      WHERE user_id = current_user_id()
        AND role IN ('admin', 'owner')
    )
  );

-- Policy for system admin access
CREATE POLICY system_admin_access_policy ON projects
  FOR ALL TO authenticated_role
  USING (
    EXISTS (
      SELECT 1 
      FROM user_roles 
      WHERE user_id = current_user_id()
        AND role = 'system_admin'
    )
  );

-- Function to get current user ID from JWT
CREATE OR REPLACE FUNCTION current_user_id()
RETURNS uuid AS $$
BEGIN
  RETURN (current_setting('jwt.claims.sub', true))::uuid;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;
```

## Dynamic Access Control

### Context-Aware Access Control

```typescript
// Context-aware authorization
interface AccessContext {
  timestamp: Date;
  ipAddress: string;
  userAgent: string;
  location?: GeoLocation;
  deviceTrust: DeviceTrustLevel;
  networkTrust: NetworkTrustLevel;
  riskScore: number;
  sessionAge: number;
  mfaStatus: MFAStatus;
}

class ContextAwareAuthorizer {
  async authorize(
    userId: string,
    resource: string,
    action: string,
    context: AccessContext
  ): Promise<AuthorizationResult> {
    // 1. Base permission check
    const hasBasePermission = await this.checkBasePermission(
      userId,
      resource,
      action
    );
    
    if (!hasBasePermission) {
      return {
        allowed: false,
        reason: 'Insufficient base permissions',
      };
    }
    
    // 2. Context-based additional checks
    const contextChecks = await this.performContextChecks(
      userId,
      resource,
      action,
      context
    );
    
    // 3. Risk assessment
    const riskAssessment = await this.assessRisk(userId, context);
    
    // 4. Apply dynamic policies
    const dynamicPolicies = await this.getDynamicPolicies(
      userId,
      resource,
      action
    );
    
    // 5. Make final decision
    return this.makeDecision(
      hasBasePermission,
      contextChecks,
      riskAssessment,
      dynamicPolicies
    );
  }
  
  private async performContextChecks(
    userId: string,
    resource: string,
    action: string,
    context: AccessContext
  ): Promise<ContextCheckResult[]> {
    const checks: ContextCheckResult[] = [];
    
    // Time-based access control
    if (await this.hasTimeRestrictions(userId, resource)) {
      const timeCheck = await this.checkTimeAccess(userId, resource, context.timestamp);
      checks.push(timeCheck);
    }
    
    // Location-based access control
    if (await this.hasLocationRestrictions(userId, resource)) {
      const locationCheck = await this.checkLocationAccess(userId, resource, context.location);
      checks.push(locationCheck);
    }
    
    // Device trust check
    if (context.deviceTrust === 'UNTRUSTED') {
      checks.push({
        type: 'device_trust',
        passed: false,
        reason: 'Untrusted device',
        requiresAdditionalAuth: true,
      });
    }
    
    // Network trust check
    if (context.networkTrust === 'UNTRUSTED') {
      checks.push({
        type: 'network_trust',
        passed: false,
        reason: 'Untrusted network',
        requiresAdditionalAuth: true,
      });
    }
    
    // Session age check
    if (context.sessionAge > this.getMaxSessionAge(action)) {
      checks.push({
        type: 'session_age',
        passed: false,
        reason: 'Session too old',
        requiresReauth: true,
      });
    }
    
    return checks;
  }
}
```

### Adaptive Access Control

```typescript
// Adaptive access control based on behavior patterns
class AdaptiveAccessControl {
  async evaluateAccess(
    userId: string,
    resource: string,
    action: string,
    context: AccessContext
  ): Promise<AdaptiveDecision> {
    // 1. Analyze user behavior patterns
    const behaviorAnalysis = await this.analyzeBehavior(userId, context);
    
    // 2. Check for anomalies
    const anomalies = await this.detectAnomalies(userId, context);
    
    // 3. Calculate trust score
    const trustScore = await this.calculateTrustScore(
      userId,
      behaviorAnalysis,
      anomalies
    );
    
    // 4. Apply adaptive policies
    const adaptivePolicy = await this.getAdaptivePolicy(
      userId,
      resource,
      action,
      trustScore
    );
    
    // 5. Make adaptive decision
    return this.makeAdaptiveDecision(
      trustScore,
      adaptivePolicy,
      anomalies
    );
  }
  
  private async analyzeBehavior(
    userId: string,
    context: AccessContext
  ): Promise<BehaviorAnalysis> {
    // Analyze historical patterns
    const historicalAccess = await this.getHistoricalAccess(userId, 30); // 30 days
    
    // Typical access patterns
    const typicalHours = this.analyzeAccessHours(historicalAccess);
    const typicalLocations = this.analyzeAccessLocations(historicalAccess);
    const typicalDevices = this.analyzeAccessDevices(historicalAccess);
    
    // Current vs typical comparison
    const hourScore = this.compareAccessHour(context.timestamp, typicalHours);
    const locationScore = this.compareLocation(context.location, typicalLocations);
    const deviceScore = this.compareDevice(context.deviceTrust, typicalDevices);
    
    return {
      hourScore,
      locationScore,
      deviceScore,
      overallScore: (hourScore + locationScore + deviceScore) / 3,
    };
  }
  
  private async detectAnomalies(
    userId: string,
    context: AccessContext
  ): Promise<Anomaly[]> {
    const anomalies: Anomaly[] = [];
    
    // Unusual access time
    if (await this.isUnusualTime(userId, context.timestamp)) {
      anomalies.push({
        type: 'unusual_time',
        severity: 'medium',
        description: 'Access at unusual time',
      });
    }
    
    // Unusual location
    if (await this.isUnusualLocation(userId, context.location)) {
      anomalies.push({
        type: 'unusual_location',
        severity: 'high',
        description: 'Access from unusual location',
      });
    }
    
    // Rapid successive access
    if (await this.hasRapidAccess(userId, context.timestamp)) {
      anomalies.push({
        type: 'rapid_access',
        severity: 'medium',
        description: 'Rapid successive access attempts',
      });
    }
    
    // Privilege escalation attempt
    if (await this.isPrivilegeEscalation(userId, context)) {
      anomalies.push({
        type: 'privilege_escalation',
        severity: 'critical',
        description: 'Potential privilege escalation',
      });
    }
    
    return anomalies;
  }
}
```

## Access Control Monitoring

### Real-time Monitoring

```typescript
// Access control monitoring service
class AccessControlMonitor {
  private readonly metrics: MetricsService;
  private readonly alerting: AlertingService;
  
  async monitorAccessAttempt(
    userId: string,
    resource: string,
    action: string,
    result: AuthorizationResult,
    context: AccessContext
  ): Promise<void> {
    // 1. Record metrics
    await this.recordMetrics(userId, resource, action, result, context);
    
    // 2. Check for suspicious patterns
    await this.checkSuspiciousPatterns(userId, resource, action, context);
    
    // 3. Update user behavior model
    await this.updateBehaviorModel(userId, resource, action, context);
    
    // 4. Trigger alerts if needed
    await this.checkAlertConditions(userId, resource, action, result, context);
  }
  
  private async recordMetrics(
    userId: string,
    resource: string,
    action: string,
    result: AuthorizationResult,
    context: AccessContext
  ): Promise<void> {
    // Record access attempt
    await this.metrics.increment('access_attempts_total', {
      result: result.allowed ? 'allowed' : 'denied',
      action,
      resource_type: this.getResourceType(resource),
    });
    
    // Record response time
    await this.metrics.histogram('authorization_duration_ms', result.duration, {
      action,
      resource_type: this.getResourceType(resource),
    });
    
    // Record risk score
    await this.metrics.gauge('access_risk_score', context.riskScore, {
      user_id: userId,
    });
  }
  
  private async checkSuspiciousPatterns(
    userId: string,
    resource: string,
    action: string,
    context: AccessContext
  ): Promise<void> {
    // Check for brute force attempts
    const recentFailures = await this.getRecentFailures(userId, '5m');
    if (recentFailures.length > 5) {
      await this.alerting.sendAlert({
        type: 'brute_force_attempt',
        userId,
        count: recentFailures.length,
        context,
      });
    }
    
    // Check for privilege escalation
    if (await this.isPrivilegeEscalation(userId, resource, action)) {
      await this.alerting.sendAlert({
        type: 'privilege_escalation',
        userId,
        resource,
        action,
        context,
      });
    }
    
    // Check for unusual resource access
    if (await this.isUnusualResourceAccess(userId, resource)) {
      await this.alerting.sendAlert({
        type: 'unusual_resource_access',
        userId,
        resource,
        context,
      });
    }
  }
}
```

### Audit Trail

```typescript
// Comprehensive audit logging
class AccessControlAuditService {
  async logAccessEvent(event: AccessEvent): Promise<void> {
    const auditRecord: AuditRecord = {
      eventId: generateUUID(),
      timestamp: new Date(),
      eventType: event.type,
      userId: event.userId,
      resource: event.resource,
      action: event.action,
      result: event.result,
      context: {
        ipAddress: event.context.ipAddress,
        userAgent: event.context.userAgent,
        sessionId: event.context.sessionId,
        requestId: event.context.requestId,
        riskScore: event.context.riskScore,
        mfaStatus: event.context.mfaStatus,
      },
      metadata: {
        version: '1.0',
        source: 'access-control-service',
        environment: process.env.NODE_ENV,
      },
    };
    
    // Store in multiple locations for redundancy
    await Promise.all([
      this.storeInDatabase(auditRecord),
      this.storeInCloudWatch(auditRecord),
      this.storeInS3(auditRecord),
    ]);
    
    // Send to SIEM if configured
    if (this.siemEnabled) {
      await this.sendToSIEM(auditRecord);
    }
  }
  
  async searchAuditLogs(query: AuditQuery): Promise<AuditRecord[]> {
    // Validate query parameters
    this.validateQuery(query);
    
    // Search across all storage locations
    const [dbResults, cloudWatchResults, s3Results] = await Promise.all([
      this.searchDatabase(query),
      this.searchCloudWatch(query),
      this.searchS3(query),
    ]);
    
    // Merge and deduplicate results
    const allResults = [...dbResults, ...cloudWatchResults, ...s3Results];
    const uniqueResults = this.deduplicateResults(allResults);
    
    // Apply additional filters
    const filteredResults = this.applyFilters(uniqueResults, query.filters);
    
    // Sort and paginate
    return this.sortAndPaginate(filteredResults, query.sort, query.pagination);
  }
}
```

This comprehensive access control pattern implementation provides robust security while maintaining usability and performance. The patterns support both traditional and modern access control models, with real-time monitoring and adaptive capabilities.