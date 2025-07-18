# Automation Scripts

## Overview

This document provides automation scripts and Infrastructure as Code (IaC) templates for the Skafu platform. These scripts automate deployment, monitoring, backup, and maintenance tasks to ensure consistent and reliable operations.

## AWS CDK Infrastructure Scripts

### Main CDK Stack

```typescript
// infrastructure/lib/skafu-stack.ts
import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

export interface SkafuStackProps extends cdk.StackProps {
  stage: 'development' | 'staging' | 'production';
  domain: string;
  certificateArn: string;
}

export class SkafuStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: SkafuStackProps) {
    super(scope, id, props);

    // VPC Configuration
    const vpc = new ec2.Vpc(this, 'SkafuVPC', {
      maxAzs: 3,
      natGateways: props.stage === 'production' ? 3 : 1,
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: 'public-subnet',
          subnetType: ec2.SubnetType.PUBLIC,
        },
        {
          cidrMask: 24,
          name: 'private-subnet',
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
        },
        {
          cidrMask: 24,
          name: 'isolated-subnet',
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
        },
      ],
    });

    // Security Groups
    const albSecurityGroup = new ec2.SecurityGroup(this, 'ALBSecurityGroup', {
      vpc,
      description: 'Security group for Application Load Balancer',
      allowAllOutbound: true,
    });

    albSecurityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(443),
      'Allow HTTPS traffic'
    );

    albSecurityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(80),
      'Allow HTTP traffic for redirect'
    );

    const ecsSecurityGroup = new ec2.SecurityGroup(this, 'ECSSecurityGroup', {
      vpc,
      description: 'Security group for ECS tasks',
      allowAllOutbound: true,
    });

    ecsSecurityGroup.addIngressRule(
      albSecurityGroup,
      ec2.Port.tcp(3000),
      'Allow traffic from ALB'
    );

    const dbSecurityGroup = new ec2.SecurityGroup(this, 'DBSecurityGroup', {
      vpc,
      description: 'Security group for RDS database',
      allowAllOutbound: false,
    });

    dbSecurityGroup.addIngressRule(
      ecsSecurityGroup,
      ec2.Port.tcp(5432),
      'Allow PostgreSQL traffic from ECS'
    );

    // Database
    const dbCredentials = new secretsmanager.Secret(this, 'DBCredentials', {
      generateSecretString: {
        secretStringTemplate: JSON.stringify({ username: 'skafu_admin' }),
        generateStringKey: 'password',
        excludeCharacters: '"@/\\',
      },
    });

    const database = new rds.DatabaseInstance(this, 'SkafuDatabase', {
      engine: rds.DatabaseInstanceEngine.postgres({
        version: rds.PostgresEngineVersion.VER_14,
      }),
      instanceType: this.getDbInstanceType(props.stage),
      credentials: rds.Credentials.fromSecret(dbCredentials),
      vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
      },
      securityGroups: [dbSecurityGroup],
      multiAz: props.stage === 'production',
      backupRetention: cdk.Duration.days(props.stage === 'production' ? 30 : 7),
      deleteAutomatedBackups: props.stage !== 'production',
      deletionProtection: props.stage === 'production',
      enablePerformanceInsights: true,
      monitoringInterval: cdk.Duration.seconds(60),
      parameterGroup: this.createDbParameterGroup(),
    });

    // ECS Cluster
    const cluster = new ecs.Cluster(this, 'SkafuCluster', {
      vpc,
      clusterName: `skafu-${props.stage}`,
      containerInsights: true,
    });

    // Application Load Balancer
    const alb = new elbv2.ApplicationLoadBalancer(this, 'SkafuALB', {
      vpc,
      internetFacing: true,
      securityGroup: albSecurityGroup,
    });

    // Target Group
    const targetGroup = new elbv2.ApplicationTargetGroup(this, 'SkafuTargetGroup', {
      vpc,
      port: 3000,
      protocol: elbv2.ApplicationProtocol.HTTP,
      targetType: elbv2.TargetType.IP,
      healthCheck: {
        path: '/health',
        healthyHttpCodes: '200',
        interval: cdk.Duration.seconds(30),
        timeout: cdk.Duration.seconds(10),
        healthyThresholdCount: 2,
        unhealthyThresholdCount: 3,
      },
    });

    // HTTPS Listener
    const httpsListener = alb.addListener('HTTPSListener', {
      port: 443,
      certificates: [
        {
          certificateArn: props.certificateArn,
        },
      ],
      defaultTargetGroups: [targetGroup],
    });

    // HTTP Listener (redirect to HTTPS)
    alb.addListener('HTTPListener', {
      port: 80,
      defaultAction: elbv2.ListenerAction.redirect({
        protocol: 'HTTPS',
        port: '443',
        permanent: true,
      }),
    });

    // ECS Service
    const taskDefinition = new ecs.FargateTaskDefinition(this, 'SkafuTaskDef', {
      memoryLimitMiB: this.getTaskMemory(props.stage),
      cpu: this.getTaskCpu(props.stage),
    });

    const container = taskDefinition.addContainer('skafu-app', {
      image: ecs.ContainerImage.fromRegistry('skafu/app:latest'),
      environment: {
        NODE_ENV: props.stage,
        PORT: '3000',
      },
      secrets: {
        DATABASE_URL: ecs.Secret.fromSecretsManager(dbCredentials, 'connectionString'),
        JWT_SECRET: ecs.Secret.fromSecretsManager(
          secretsmanager.Secret.fromSecretNameV2(this, 'JWTSecret', 'skafu/jwt-secret')
        ),
      },
      logging: ecs.LogDrivers.awsLogs({
        streamPrefix: 'skafu-app',
        logRetention: this.getLogRetention(props.stage),
      }),
    });

    container.addPortMappings({
      containerPort: 3000,
      protocol: ecs.Protocol.TCP,
    });

    const service = new ecs.FargateService(this, 'SkafuService', {
      cluster,
      taskDefinition,
      desiredCount: this.getDesiredCount(props.stage),
      assignPublicIp: false,
      securityGroups: [ecsSecurityGroup],
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
      },
      enableExecuteCommand: true,
      circuitBreaker: {
        rollback: true,
      },
    });

    // Attach service to target group
    service.attachToApplicationTargetGroup(targetGroup);

    // Auto Scaling
    const scalableTarget = service.autoScaleTaskCount({
      minCapacity: this.getMinCapacity(props.stage),
      maxCapacity: this.getMaxCapacity(props.stage),
    });

    scalableTarget.scaleOnCpuUtilization('CpuScaling', {
      targetUtilizationPercent: 70,
      scaleInCooldown: cdk.Duration.minutes(10),
      scaleOutCooldown: cdk.Duration.minutes(5),
    });

    scalableTarget.scaleOnMemoryUtilization('MemoryScaling', {
      targetUtilizationPercent: 80,
      scaleInCooldown: cdk.Duration.minutes(10),
      scaleOutCooldown: cdk.Duration.minutes(5),
    });

    // S3 Bucket for static assets
    const assetsBucket = new s3.Bucket(this, 'SkafuAssets', {
      bucketName: `skafu-assets-${props.stage}`,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      versioned: props.stage === 'production',
      lifecycleRules: [
        {
          id: 'delete-old-versions',
          enabled: true,
          noncurrentVersionExpiration: cdk.Duration.days(30),
        },
      ],
    });

    // CloudFront Distribution
    const distribution = new cloudfront.Distribution(this, 'SkafuDistribution', {
      defaultBehavior: {
        origin: new cloudfront.HttpOrigin(alb.loadBalancerDnsName),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
        cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD_OPTIONS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        originRequestPolicy: cloudfront.OriginRequestPolicy.CORS_S3_ORIGIN,
      },
      additionalBehaviors: {
        '/static/*': {
          origin: new cloudfront.S3Origin(assetsBucket),
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        },
      },
      domainNames: [props.domain],
      certificate: acm.Certificate.fromCertificateArn(
        this,
        'Certificate',
        props.certificateArn
      ),
    });

    // Outputs
    new cdk.CfnOutput(this, 'LoadBalancerDNS', {
      value: alb.loadBalancerDnsName,
      description: 'DNS name of the load balancer',
    });

    new cdk.CfnOutput(this, 'CloudFrontDNS', {
      value: distribution.domainName,
      description: 'CloudFront distribution domain name',
    });

    new cdk.CfnOutput(this, 'DatabaseEndpoint', {
      value: database.instanceEndpoint.hostname,
      description: 'RDS database endpoint',
    });
  }

  private getDbInstanceType(stage: string): ec2.InstanceType {
    switch (stage) {
      case 'production':
        return ec2.InstanceType.of(ec2.InstanceClass.R5, ec2.InstanceSize.LARGE);
      case 'staging':
        return ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.SMALL);
      default:
        return ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MICRO);
    }
  }

  private getTaskMemory(stage: string): number {
    return stage === 'production' ? 2048 : stage === 'staging' ? 1024 : 512;
  }

  private getTaskCpu(stage: string): number {
    return stage === 'production' ? 1024 : stage === 'staging' ? 512 : 256;
  }

  private getDesiredCount(stage: string): number {
    return stage === 'production' ? 3 : stage === 'staging' ? 2 : 1;
  }

  private getMinCapacity(stage: string): number {
    return stage === 'production' ? 2 : 1;
  }

  private getMaxCapacity(stage: string): number {
    return stage === 'production' ? 10 : stage === 'staging' ? 5 : 2;
  }

  private getLogRetention(stage: string): logs.RetentionDays {
    switch (stage) {
      case 'production':
        return logs.RetentionDays.ONE_YEAR;
      case 'staging':
        return logs.RetentionDays.THREE_MONTHS;
      default:
        return logs.RetentionDays.ONE_MONTH;
    }
  }

  private createDbParameterGroup(): rds.ParameterGroup {
    return new rds.ParameterGroup(this, 'DbParameterGroup', {
      engine: rds.DatabaseInstanceEngine.postgres({
        version: rds.PostgresEngineVersion.VER_14,
      }),
      parameters: {
        shared_preload_libraries: 'pg_stat_statements',
        log_statement: 'all',
        log_min_duration_statement: '1000',
        track_activity_query_size: '2048',
        pg_stat_statements_max: '10000',
        pg_stat_statements_track: 'all',
      },
    });
  }
}
```

### Lambda Functions Stack

```typescript
// infrastructure/lib/lambda-stack.ts
import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

export class LambdaStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: cdk.StackProps) {
    super(scope, id, props);

    // DynamoDB Table for session management
    const sessionTable = new dynamodb.Table(this, 'SessionTable', {
      tableName: 'skafu-sessions',
      partitionKey: { name: 'sessionId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      pointInTimeRecovery: true,
      timeToLiveAttribute: 'expiresAt',
    });

    // Lambda Layer for common dependencies
    const commonLayer = new lambda.LayerVersion(this, 'CommonLayer', {
      layerVersionName: 'skafu-common-layer',
      code: lambda.Code.fromAsset('lambda/layers/common'),
      compatibleRuntimes: [lambda.Runtime.NODEJS_18_X],
      description: 'Common dependencies for Skafu Lambda functions',
    });

    // Authentication Lambda
    const authLambda = new lambda.Function(this, 'AuthLambda', {
      functionName: 'skafu-auth',
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambda/functions/auth'),
      layers: [commonLayer],
      environment: {
        SESSION_TABLE_NAME: sessionTable.tableName,
        JWT_SECRET: process.env.JWT_SECRET || 'default-secret',
      },
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      logRetention: logs.RetentionDays.ONE_MONTH,
    });

    // Grant permissions to DynamoDB
    sessionTable.grantReadWriteData(authLambda);

    // API Gateway for authentication
    const authApi = new apigateway.RestApi(this, 'AuthAPI', {
      restApiName: 'Skafu Auth API',
      description: 'Authentication API for Skafu platform',
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: ['Content-Type', 'Authorization'],
      },
    });

    const authIntegration = new apigateway.LambdaIntegration(authLambda);
    authApi.root.addResource('auth').addMethod('POST', authIntegration);
    authApi.root.addResource('verify').addMethod('POST', authIntegration);

    // Background processing Lambda
    const processingLambda = new lambda.Function(this, 'ProcessingLambda', {
      functionName: 'skafu-processing',
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambda/functions/processing'),
      layers: [commonLayer],
      timeout: cdk.Duration.minutes(15),
      memorySize: 1024,
      reservedConcurrentExecutions: 10,
      logRetention: logs.RetentionDays.THREE_MONTHS,
    });

    // EventBridge rule for scheduled processing
    const scheduledRule = new events.Rule(this, 'ScheduledProcessing', {
      schedule: events.Schedule.rate(cdk.Duration.hours(1)),
      description: 'Trigger processing Lambda every hour',
    });

    scheduledRule.addTarget(new targets.LambdaFunction(processingLambda));

    // Monitoring Lambda
    const monitoringLambda = new lambda.Function(this, 'MonitoringLambda', {
      functionName: 'skafu-monitoring',
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambda/functions/monitoring'),
      layers: [commonLayer],
      timeout: cdk.Duration.minutes(5),
      memorySize: 256,
      logRetention: logs.RetentionDays.ONE_MONTH,
    });

    // Grant CloudWatch permissions
    monitoringLambda.addToRolePolicy(
      new iam.PolicyStatement({
        actions: [
          'cloudwatch:GetMetricStatistics',
          'cloudwatch:ListMetrics',
          'logs:CreateLogGroup',
          'logs:CreateLogStream',
          'logs:PutLogEvents',
        ],
        resources: ['*'],
      })
    );

    // Outputs
    new cdk.CfnOutput(this, 'AuthAPIEndpoint', {
      value: authApi.url,
      description: 'Auth API Gateway endpoint',
    });
  }
}
```

## Deployment Scripts

### Deployment Automation

```bash
#!/bin/bash
# scripts/deploy.sh - Main deployment script

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
CONFIG_FILE="$PROJECT_ROOT/config/deploy.json"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
    exit 1
}

warn() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Check dependencies
check_dependencies() {
    log "Checking dependencies..."
    
    command -v aws >/dev/null 2>&1 || error "AWS CLI is required"
    command -v docker >/dev/null 2>&1 || error "Docker is required"
    command -v node >/dev/null 2>&1 || error "Node.js is required"
    command -v npm >/dev/null 2>&1 || error "npm is required"
    
    log "All dependencies are available"
}

# Parse configuration
parse_config() {
    local stage=$1
    
    if [[ ! -f "$CONFIG_FILE" ]]; then
        error "Configuration file not found: $CONFIG_FILE"
    fi
    
    export AWS_REGION=$(jq -r ".environments.${stage}.region" "$CONFIG_FILE")
    export AWS_ACCOUNT_ID=$(jq -r ".environments.${stage}.account_id" "$CONFIG_FILE")
    export DOMAIN=$(jq -r ".environments.${stage}.domain" "$CONFIG_FILE")
    export CERTIFICATE_ARN=$(jq -r ".environments.${stage}.certificate_arn" "$CONFIG_FILE")
    
    log "Configuration loaded for stage: $stage"
}

# Build application
build_application() {
    log "Building application..."
    
    cd "$PROJECT_ROOT"
    npm ci
    npm run build
    npm run test
    
    log "Application built successfully"
}

# Build and push Docker image
build_and_push_image() {
    local stage=$1
    local image_tag="$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/skafu:$stage-$(git rev-parse --short HEAD)"
    
    log "Building Docker image: $image_tag"
    
    # Build image
    docker build -t "$image_tag" .
    
    # Login to ECR
    aws ecr get-login-password --region "$AWS_REGION" | docker login --username AWS --password-stdin "$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com"
    
    # Push image
    docker push "$image_tag"
    
    log "Image pushed successfully: $image_tag"
    echo "$image_tag"
}

# Deploy infrastructure
deploy_infrastructure() {
    local stage=$1
    
    log "Deploying infrastructure for stage: $stage"
    
    cd "$PROJECT_ROOT/infrastructure"
    npm ci
    
    # Bootstrap CDK (if not already done)
    npx cdk bootstrap aws://$AWS_ACCOUNT_ID/$AWS_REGION
    
    # Deploy stack
    npx cdk deploy SkafuStack-$stage \
        --context stage=$stage \
        --context domain=$DOMAIN \
        --context certificateArn=$CERTIFICATE_ARN \
        --require-approval never
    
    log "Infrastructure deployed successfully"
}

# Run health checks
run_health_checks() {
    local stage=$1
    
    log "Running health checks for stage: $stage"
    
    # Get load balancer DNS from CDK output
    local lb_dns=$(aws cloudformation describe-stacks \
        --stack-name "SkafuStack-$stage" \
        --query 'Stacks[0].Outputs[?OutputKey==`LoadBalancerDNS`].OutputValue' \
        --output text)
    
    # Wait for load balancer to be ready
    local max_attempts=30
    local attempt=1
    
    while [[ $attempt -le $max_attempts ]]; do
        if curl -s -o /dev/null -w "%{http_code}" "http://$lb_dns/health" | grep -q "200"; then
            log "Health check passed"
            return 0
        fi
        
        warn "Health check failed (attempt $attempt/$max_attempts)"
        sleep 30
        ((attempt++))
    done
    
    error "Health checks failed after $max_attempts attempts"
}

# Send notifications
send_notifications() {
    local stage=$1
    local status=$2
    
    if [[ -n "$WEBHOOK_URL" ]]; then
        curl -X POST "$WEBHOOK_URL" \
            -H "Content-Type: application/json" \
            -d "{\"text\": \"Deployment to $stage: $status\"}"
    fi
}

# Main deployment function
main() {
    local stage=${1:-development}
    
    log "Starting deployment to $stage environment"
    
    # Validate stage
    if [[ ! "$stage" =~ ^(development|staging|production)$ ]]; then
        error "Invalid stage: $stage. Must be one of: development, staging, production"
    fi
    
    # Check dependencies
    check_dependencies
    
    # Parse configuration
    parse_config "$stage"
    
    # Build application
    build_application
    
    # Build and push Docker image
    local image_tag
    image_tag=$(build_and_push_image "$stage")
    
    # Deploy infrastructure
    deploy_infrastructure "$stage"
    
    # Run health checks
    run_health_checks "$stage"
    
    # Send success notification
    send_notifications "$stage" "SUCCESS"
    
    log "Deployment completed successfully!"
}

# Script execution
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
```

### Rollback Script

```bash
#!/bin/bash
# scripts/rollback.sh - Rollback deployment script

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
    exit 1
}

warn() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Get previous deployment
get_previous_deployment() {
    local stage=$1
    
    # Get ECS service ARN
    local service_arn=$(aws ecs list-services \
        --cluster "skafu-$stage" \
        --query 'serviceArns[0]' \
        --output text)
    
    # Get previous task definition
    local current_task_def=$(aws ecs describe-services \
        --cluster "skafu-$stage" \
        --services "$service_arn" \
        --query 'services[0].taskDefinition' \
        --output text)
    
    # Get task definition family
    local family=$(echo "$current_task_def" | cut -d'/' -f1)
    
    # Get previous revision
    local previous_revision=$(aws ecs list-task-definitions \
        --family-prefix "$family" \
        --status ACTIVE \
        --sort DESC \
        --query 'taskDefinitionArns[1]' \
        --output text)
    
    if [[ "$previous_revision" == "None" ]]; then
        error "No previous task definition found for rollback"
    fi
    
    echo "$previous_revision"
}

# Rollback ECS service
rollback_ecs_service() {
    local stage=$1
    local previous_task_def=$2
    
    log "Rolling back ECS service to: $previous_task_def"
    
    # Update service
    aws ecs update-service \
        --cluster "skafu-$stage" \
        --service "skafu-service" \
        --task-definition "$previous_task_def" \
        --force-new-deployment
    
    # Wait for deployment to complete
    aws ecs wait services-stable \
        --cluster "skafu-$stage" \
        --services "skafu-service"
    
    log "ECS service rollback completed"
}

# Rollback Lambda functions
rollback_lambda_functions() {
    local stage=$1
    
    log "Rolling back Lambda functions"
    
    # Get list of Lambda functions
    local functions=$(aws lambda list-functions \
        --query 'Functions[?starts_with(FunctionName, `skafu-`)].FunctionName' \
        --output text)
    
    for function in $functions; do
        # Get previous version
        local previous_version=$(aws lambda list-versions-by-function \
            --function-name "$function" \
            --query 'Versions[-2].Version' \
            --output text)
        
        if [[ "$previous_version" != "None" ]]; then
            log "Rolling back $function to version $previous_version"
            
            # Update alias to point to previous version
            aws lambda update-alias \
                --function-name "$function" \
                --name "$stage" \
                --function-version "$previous_version" || true
        fi
    done
    
    log "Lambda functions rollback completed"
}

# Verify rollback
verify_rollback() {
    local stage=$1
    
    log "Verifying rollback for stage: $stage"
    
    # Get load balancer DNS
    local lb_dns=$(aws cloudformation describe-stacks \
        --stack-name "SkafuStack-$stage" \
        --query 'Stacks[0].Outputs[?OutputKey==`LoadBalancerDNS`].OutputValue' \
        --output text)
    
    # Run health checks
    local max_attempts=10
    local attempt=1
    
    while [[ $attempt -le $max_attempts ]]; do
        if curl -s -o /dev/null -w "%{http_code}" "http://$lb_dns/health" | grep -q "200"; then
            log "Rollback verification passed"
            return 0
        fi
        
        warn "Rollback verification failed (attempt $attempt/$max_attempts)"
        sleep 30
        ((attempt++))
    done
    
    error "Rollback verification failed after $max_attempts attempts"
}

# Main rollback function
main() {
    local stage=${1:-staging}
    
    log "Starting rollback for $stage environment"
    
    # Validate stage
    if [[ ! "$stage" =~ ^(development|staging|production)$ ]]; then
        error "Invalid stage: $stage. Must be one of: development, staging, production"
    fi
    
    # Confirm rollback
    if [[ "$stage" == "production" ]]; then
        read -p "Are you sure you want to rollback production? (yes/no): " confirm
        if [[ "$confirm" != "yes" ]]; then
            error "Rollback cancelled"
        fi
    fi
    
    # Get previous deployment
    local previous_task_def
    previous_task_def=$(get_previous_deployment "$stage")
    
    # Rollback ECS service
    rollback_ecs_service "$stage" "$previous_task_def"
    
    # Rollback Lambda functions
    rollback_lambda_functions "$stage"
    
    # Verify rollback
    verify_rollback "$stage"
    
    log "Rollback completed successfully!"
}

# Script execution
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
```

## Monitoring and Alerting Scripts

### CloudWatch Alarms Setup

```bash
#!/bin/bash
# scripts/setup-monitoring.sh - Set up CloudWatch alarms and dashboards

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
    exit 1
}

# Create SNS topic for alerts
create_sns_topic() {
    local stage=$1
    
    log "Creating SNS topic for $stage alerts"
    
    local topic_arn=$(aws sns create-topic \
        --name "skafu-alerts-$stage" \
        --query 'TopicArn' \
        --output text)
    
    # Subscribe email endpoint
    if [[ -n "$ALERT_EMAIL" ]]; then
        aws sns subscribe \
            --topic-arn "$topic_arn" \
            --protocol email \
            --notification-endpoint "$ALERT_EMAIL"
    fi
    
    echo "$topic_arn"
}

# Create CloudWatch alarms
create_cloudwatch_alarms() {
    local stage=$1
    local topic_arn=$2
    
    log "Creating CloudWatch alarms for $stage"
    
    # ECS Service CPU utilization
    aws cloudwatch put-metric-alarm \
        --alarm-name "skafu-$stage-ecs-cpu-high" \
        --alarm-description "ECS Service CPU utilization is high" \
        --metric-name "CPUUtilization" \
        --namespace "AWS/ECS" \
        --statistic "Average" \
        --period 300 \
        --threshold 80 \
        --comparison-operator "GreaterThanThreshold" \
        --evaluation-periods 2 \
        --alarm-actions "$topic_arn" \
        --dimensions Name=ServiceName,Value="skafu-service" Name=ClusterName,Value="skafu-$stage"
    
    # ECS Service Memory utilization
    aws cloudwatch put-metric-alarm \
        --alarm-name "skafu-$stage-ecs-memory-high" \
        --alarm-description "ECS Service Memory utilization is high" \
        --metric-name "MemoryUtilization" \
        --namespace "AWS/ECS" \
        --statistic "Average" \
        --period 300 \
        --threshold 85 \
        --comparison-operator "GreaterThanThreshold" \
        --evaluation-periods 2 \
        --alarm-actions "$topic_arn" \
        --dimensions Name=ServiceName,Value="skafu-service" Name=ClusterName,Value="skafu-$stage"
    
    # ALB Target Response Time
    aws cloudwatch put-metric-alarm \
        --alarm-name "skafu-$stage-alb-response-time-high" \
        --alarm-description "ALB Target Response Time is high" \
        --metric-name "TargetResponseTime" \
        --namespace "AWS/ApplicationELB" \
        --statistic "Average" \
        --period 300 \
        --threshold 1.0 \
        --comparison-operator "GreaterThanThreshold" \
        --evaluation-periods 2 \
        --alarm-actions "$topic_arn"
    
    # ALB HTTP 5xx Error Rate
    aws cloudwatch put-metric-alarm \
        --alarm-name "skafu-$stage-alb-5xx-errors" \
        --alarm-description "ALB 5xx error rate is high" \
        --metric-name "HTTPCode_Target_5XX_Count" \
        --namespace "AWS/ApplicationELB" \
        --statistic "Sum" \
        --period 300 \
        --threshold 10 \
        --comparison-operator "GreaterThanThreshold" \
        --evaluation-periods 1 \
        --alarm-actions "$topic_arn"
    
    # RDS CPU utilization
    aws cloudwatch put-metric-alarm \
        --alarm-name "skafu-$stage-rds-cpu-high" \
        --alarm-description "RDS CPU utilization is high" \
        --metric-name "CPUUtilization" \
        --namespace "AWS/RDS" \
        --statistic "Average" \
        --period 300 \
        --threshold 80 \
        --comparison-operator "GreaterThanThreshold" \
        --evaluation-periods 2 \
        --alarm-actions "$topic_arn"
    
    # RDS Database connections
    aws cloudwatch put-metric-alarm \
        --alarm-name "skafu-$stage-rds-connections-high" \
        --alarm-description "RDS Database connections are high" \
        --metric-name "DatabaseConnections" \
        --namespace "AWS/RDS" \
        --statistic "Average" \
        --period 300 \
        --threshold 80 \
        --comparison-operator "GreaterThanThreshold" \
        --evaluation-periods 2 \
        --alarm-actions "$topic_arn"
    
    # Lambda Error Rate
    aws cloudwatch put-metric-alarm \
        --alarm-name "skafu-$stage-lambda-errors" \
        --alarm-description "Lambda function errors are high" \
        --metric-name "Errors" \
        --namespace "AWS/Lambda" \
        --statistic "Sum" \
        --period 300 \
        --threshold 5 \
        --comparison-operator "GreaterThanThreshold" \
        --evaluation-periods 1 \
        --alarm-actions "$topic_arn"
    
    log "CloudWatch alarms created successfully"
}

# Create CloudWatch Dashboard
create_dashboard() {
    local stage=$1
    
    log "Creating CloudWatch dashboard for $stage"
    
    local dashboard_body=$(cat <<EOF
{
    "widgets": [
        {
            "type": "metric",
            "x": 0,
            "y": 0,
            "width": 12,
            "height": 6,
            "properties": {
                "metrics": [
                    [ "AWS/ECS", "CPUUtilization", "ServiceName", "skafu-service", "ClusterName", "skafu-$stage" ],
                    [ ".", "MemoryUtilization", ".", ".", ".", "." ]
                ],
                "view": "timeSeries",
                "stacked": false,
                "region": "$AWS_REGION",
                "title": "ECS Service Metrics",
                "period": 300
            }
        },
        {
            "type": "metric",
            "x": 12,
            "y": 0,
            "width": 12,
            "height": 6,
            "properties": {
                "metrics": [
                    [ "AWS/ApplicationELB", "TargetResponseTime", "LoadBalancer", "skafu-alb-$stage" ],
                    [ ".", "RequestCount", ".", "." ]
                ],
                "view": "timeSeries",
                "stacked": false,
                "region": "$AWS_REGION",
                "title": "ALB Metrics",
                "period": 300
            }
        },
        {
            "type": "metric",
            "x": 0,
            "y": 6,
            "width": 12,
            "height": 6,
            "properties": {
                "metrics": [
                    [ "AWS/RDS", "CPUUtilization", "DBInstanceIdentifier", "skafu-db-$stage" ],
                    [ ".", "DatabaseConnections", ".", "." ]
                ],
                "view": "timeSeries",
                "stacked": false,
                "region": "$AWS_REGION",
                "title": "RDS Metrics",
                "period": 300
            }
        },
        {
            "type": "metric",
            "x": 12,
            "y": 6,
            "width": 12,
            "height": 6,
            "properties": {
                "metrics": [
                    [ "AWS/Lambda", "Invocations", "FunctionName", "skafu-auth" ],
                    [ ".", "Errors", ".", "." ],
                    [ ".", "Duration", ".", "." ]
                ],
                "view": "timeSeries",
                "stacked": false,
                "region": "$AWS_REGION",
                "title": "Lambda Metrics",
                "period": 300
            }
        }
    ]
}
EOF
)
    
    aws cloudwatch put-dashboard \
        --dashboard-name "Skafu-$stage-Overview" \
        --dashboard-body "$dashboard_body"
    
    log "CloudWatch dashboard created successfully"
}

# Main function
main() {
    local stage=${1:-development}
    
    log "Setting up monitoring for $stage environment"
    
    # Validate stage
    if [[ ! "$stage" =~ ^(development|staging|production)$ ]]; then
        error "Invalid stage: $stage. Must be one of: development, staging, production"
    fi
    
    # Create SNS topic
    local topic_arn
    topic_arn=$(create_sns_topic "$stage")
    
    # Create CloudWatch alarms
    create_cloudwatch_alarms "$stage" "$topic_arn"
    
    # Create dashboard
    create_dashboard "$stage"
    
    log "Monitoring setup completed successfully!"
    log "SNS Topic ARN: $topic_arn"
}

# Script execution
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
```

## Backup and Maintenance Scripts

### Automated Backup Script

```bash
#!/bin/bash
# scripts/backup.sh - Automated backup script

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BACKUP_BUCKET="skafu-backups-$(date +%Y%m%d)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
    exit 1
}

# Create RDS snapshot
create_rds_snapshot() {
    local stage=$1
    local snapshot_id="skafu-db-$stage-$(date +%Y%m%d-%H%M%S)"
    
    log "Creating RDS snapshot: $snapshot_id"
    
    aws rds create-db-snapshot \
        --db-snapshot-identifier "$snapshot_id" \
        --db-instance-identifier "skafu-db-$stage"
    
    # Wait for snapshot to complete
    aws rds wait db-snapshot-completed \
        --db-snapshot-identifier "$snapshot_id"
    
    log "RDS snapshot created successfully: $snapshot_id"
}

# Backup Lambda function code
backup_lambda_functions() {
    local stage=$1
    
    log "Backing up Lambda functions for $stage"
    
    # Get list of Lambda functions
    local functions=$(aws lambda list-functions \
        --query 'Functions[?starts_with(FunctionName, `skafu-`)].FunctionName' \
        --output text)
    
    for function in $functions; do
        log "Backing up function: $function"
        
        # Get function code
        aws lambda get-function \
            --function-name "$function" \
            --query 'Code.Location' \
            --output text | xargs wget -O "/tmp/${function}.zip"
        
        # Upload to S3
        aws s3 cp "/tmp/${function}.zip" \
            "s3://$BACKUP_BUCKET/lambda/$stage/$function/$(date +%Y%m%d)/${function}.zip"
        
        # Get function configuration
        aws lambda get-function-configuration \
            --function-name "$function" > "/tmp/${function}-config.json"
        
        # Upload configuration to S3
        aws s3 cp "/tmp/${function}-config.json" \
            "s3://$BACKUP_BUCKET/lambda/$stage/$function/$(date +%Y%m%d)/${function}-config.json"
        
        # Cleanup temp files
        rm -f "/tmp/${function}.zip" "/tmp/${function}-config.json"
    done
    
    log "Lambda functions backup completed"
}

# Backup S3 buckets
backup_s3_buckets() {
    local stage=$1
    
    log "Backing up S3 buckets for $stage"
    
    # Get list of Skafu buckets
    local buckets=$(aws s3api list-buckets \
        --query 'Buckets[?starts_with(Name, `skafu-`)].Name' \
        --output text)
    
    for bucket in $buckets; do
        if [[ "$bucket" == *"$stage"* ]]; then
            log "Backing up bucket: $bucket"
            
            # Sync bucket to backup location
            aws s3 sync "s3://$bucket" "s3://$BACKUP_BUCKET/s3/$stage/$bucket/" \
                --exclude "*.tmp" --exclude "*.log"
        fi
    done
    
    log "S3 buckets backup completed"
}

# Backup configuration
backup_configuration() {
    local stage=$1
    
    log "Backing up configuration for $stage"
    
    # CloudFormation templates
    local stacks=$(aws cloudformation list-stacks \
        --stack-status-filter CREATE_COMPLETE UPDATE_COMPLETE \
        --query 'StackSummaries[?starts_with(StackName, `Skafu`)].StackName' \
        --output text)
    
    for stack in $stacks; do
        log "Backing up stack: $stack"
        
        # Get stack template
        aws cloudformation get-template \
            --stack-name "$stack" \
            --query 'TemplateBody' > "/tmp/${stack}-template.json"
        
        # Get stack parameters
        aws cloudformation describe-stacks \
            --stack-name "$stack" \
            --query 'Stacks[0].Parameters' > "/tmp/${stack}-parameters.json"
        
        # Upload to S3
        aws s3 cp "/tmp/${stack}-template.json" \
            "s3://$BACKUP_BUCKET/cloudformation/$stage/$stack/$(date +%Y%m%d)/"
        aws s3 cp "/tmp/${stack}-parameters.json" \
            "s3://$BACKUP_BUCKET/cloudformation/$stage/$stack/$(date +%Y%m%d)/"
        
        # Cleanup temp files
        rm -f "/tmp/${stack}-template.json" "/tmp/${stack}-parameters.json"
    done
    
    log "Configuration backup completed"
}

# Cleanup old backups
cleanup_old_backups() {
    local retention_days=${1:-30}
    
    log "Cleaning up backups older than $retention_days days"
    
    # RDS snapshots
    local old_snapshots=$(aws rds describe-db-snapshots \
        --snapshot-type manual \
        --query 'DBSnapshots[?starts_with(DBSnapshotIdentifier, `skafu-`) && SnapshotCreateTime < `'$(date -d "$retention_days days ago" --iso-8601)'`].DBSnapshotIdentifier' \
        --output text)
    
    for snapshot in $old_snapshots; do
        log "Deleting old RDS snapshot: $snapshot"
        aws rds delete-db-snapshot --db-snapshot-identifier "$snapshot"
    done
    
    # S3 backup cleanup (using lifecycle policy)
    log "Old backups cleanup completed"
}

# Main function
main() {
    local stage=${1:-production}
    
    log "Starting backup for $stage environment"
    
    # Validate stage
    if [[ ! "$stage" =~ ^(development|staging|production)$ ]]; then
        error "Invalid stage: $stage. Must be one of: development, staging, production"
    fi
    
    # Create backup bucket if it doesn't exist
    if ! aws s3api head-bucket --bucket "$BACKUP_BUCKET" 2>/dev/null; then
        log "Creating backup bucket: $BACKUP_BUCKET"
        aws s3api create-bucket --bucket "$BACKUP_BUCKET"
        
        # Enable versioning
        aws s3api put-bucket-versioning \
            --bucket "$BACKUP_BUCKET" \
            --versioning-configuration Status=Enabled
        
        # Set lifecycle policy
        aws s3api put-bucket-lifecycle-configuration \
            --bucket "$BACKUP_BUCKET" \
            --lifecycle-configuration file://"$PROJECT_ROOT/config/backup-lifecycle.json"
    fi
    
    # Create RDS snapshot
    create_rds_snapshot "$stage"
    
    # Backup Lambda functions
    backup_lambda_functions "$stage"
    
    # Backup S3 buckets
    backup_s3_buckets "$stage"
    
    # Backup configuration
    backup_configuration "$stage"
    
    # Cleanup old backups
    cleanup_old_backups 30
    
    log "Backup completed successfully!"
    log "Backup location: s3://$BACKUP_BUCKET"
}

# Script execution
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
```

These automation scripts provide a comprehensive foundation for deploying, monitoring, and maintaining the Skafu platform infrastructure. They ensure consistent operations across all environments and facilitate reliable deployment processes.