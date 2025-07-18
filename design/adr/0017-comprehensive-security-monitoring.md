# ADR-0017: Comprehensive Security Monitoring

**Status**: 🟢 Accepted  
**Date**: 2025-01-18  
**Deciders**: Development Team

## Context and Problem Statement

We need a comprehensive security monitoring solution that provides real-time threat detection, compliance monitoring, and security analytics across our serverless architecture while integrating with existing AWS security services and our Error Bus observability system.

## Decision Drivers

* Real-time security threat detection and alerting
* Compliance monitoring and audit trail requirements
* Integration with existing AWS security services (GuardDuty, SecurityHub)
* Correlation with application logs and error events
* Automated incident response and escalation procedures
* Cost-effective security monitoring solution
* Support for security dashboard and analytics
* Integration with existing Error Bus and observability systems

## Considered Options

* **Option 1**: AWS Security Hub + GuardDuty + CloudTrail only
* **Option 2**: Third-party SIEM solution (Splunk, Sumo Logic)
* **Option 3**: Custom security monitoring with Lambda + EventBridge
* **Option 4**: AWS Security Hub + GuardDuty + Custom analytics layer
* **Option 5**: Hybrid approach with AWS services + custom dashboards

## Decision Outcome

Chosen option: **"AWS Security Hub + GuardDuty + Custom analytics layer"**, because it provides comprehensive AWS-native security monitoring with the flexibility to create custom security analytics and dashboards while maintaining cost efficiency and deep integration with our existing architecture.

### Implementation Details

**Security Monitoring Architecture**:
```yaml
# SAM template for security monitoring
SecurityMonitoringStack:
  Type: AWS::CloudFormation::Stack
  Properties:
    TemplateURL: !Sub '${TemplatesBucket}/security-monitoring.yaml'
    Parameters:
      ErrorBusArn: !GetAtt ErrorBus.Arn
      NotificationTopic: !Ref SecurityAlertsTopic

# GuardDuty Configuration
GuardDutyDetector:
  Type: AWS::GuardDuty::Detector
  Properties:
    Enable: true
    FindingPublishingFrequency: FIFTEEN_MINUTES
    Features:
      - Name: S3_DATA_EVENTS
        Status: ENABLED
      - Name: EBS_MALWARE_PROTECTION
        Status: ENABLED
      - Name: RDS_LOGIN_EVENTS
        Status: ENABLED

# Security Hub Configuration
SecurityHub:
  Type: AWS::SecurityHub::Hub
  Properties:
    Tags:
      - Key: Project
        Value: Skafu
    EnableDefaultStandards: true
    ControlFindingGenerator: SECURITY_CONTROL

# CloudTrail for API monitoring
CloudTrail:
  Type: AWS::CloudTrail::Trail
  Properties:
    TrailName: !Sub '${AWS::StackName}-security-trail'
    S3BucketName: !Ref SecurityLogsBucket
    IncludeGlobalServiceEvents: true
    IsMultiRegionTrail: true
    EnableLogFileValidation: true
    EventSelectors:
      - ReadWriteType: All
        IncludeManagementEvents: true
        DataResources:
          - Type: AWS::S3::Object
            Values: 
              - !Sub '${TemplatesBucket}/*'
          - Type: AWS::Lambda::Function
            Values:
              - '*'
```

**Security Event Processing**:
```python
# security_monitor.py
import boto3
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, Any, List

logger = logging.getLogger(__name__)

class SecurityMonitor:
    def __init__(self):
        self.guardduty = boto3.client('guardduty')
        self.securityhub = boto3.client('securityhub')
        self.cloudtrail = boto3.client('cloudtrail')
        self.cloudwatch = boto3.client('cloudwatch')
        self.eventbridge = boto3.client('events')
        self.dynamodb = boto3.resource('dynamodb')
        self.security_table = self.dynamodb.Table('SecurityEvents')
        self.error_bus_name = 'skafu-error-bus'
    
    def process_guardduty_finding(self, finding: Dict[str, Any]) -> Dict[str, Any]:
        """Process GuardDuty security finding"""
        try:
            finding_id = finding['id']
            finding_type = finding['type']
            severity = finding['severity']
            
            # Store finding in DynamoDB
            security_event = {
                'eventId': finding_id,
                'timestamp': datetime.utcnow().isoformat(),
                'source': 'guardduty',
                'eventType': finding_type,
                'severity': self._map_severity(severity),
                'data': {
                    'finding': finding,
                    'accountId': finding.get('accountId'),
                    'region': finding.get('region'),
                    'resources': finding.get('resource', {}),
                    'service': finding.get('service', {})
                },
                'metadata': {
                    'processed': True,
                    'correlationId': f"gd-{finding_id}",
                    'ttl': int((datetime.utcnow() + timedelta(days=365)).timestamp())
                }
            }
            
            self.security_table.put_item(Item=security_event)
            
            # Send to Error Bus for correlation
            self._publish_to_error_bus(security_event)
            
            # Update security metrics
            self._update_security_metrics(finding_type, severity)
            
            # Check for alert conditions
            if severity >= 7.0:  # High severity findings
                self._trigger_security_alert(security_event)
            
            logger.info(f"Processed GuardDuty finding {finding_id}", extra={
                'findingType': finding_type,
                'severity': severity
            })
            
            return security_event
            
        except Exception as e:
            logger.error(f"Error processing GuardDuty finding: {e}")
            raise
    
    def process_security_hub_finding(self, finding: Dict[str, Any]) -> Dict[str, Any]:
        """Process Security Hub finding"""
        try:
            finding_id = finding['Id']
            finding_type = finding['Types'][0] if finding['Types'] else 'Unknown'
            severity = finding['Severity']['Normalized']
            
            security_event = {
                'eventId': finding_id,
                'timestamp': datetime.utcnow().isoformat(),
                'source': 'securityhub',
                'eventType': finding_type,
                'severity': self._map_severity(severity),
                'data': {
                    'finding': finding,
                    'awsAccountId': finding.get('AwsAccountId'),
                    'region': finding.get('Region'),
                    'resources': finding.get('Resources', []),
                    'compliance': finding.get('Compliance', {}),
                    'remediation': finding.get('Remediation', {})
                },
                'metadata': {
                    'processed': True,
                    'correlationId': f"sh-{finding_id}",
                    'ttl': int((datetime.utcnow() + timedelta(days=365)).timestamp())
                }
            }
            
            self.security_table.put_item(Item=security_event)
            
            # Send to Error Bus for correlation
            self._publish_to_error_bus(security_event)
            
            # Update compliance metrics
            self._update_compliance_metrics(finding)
            
            # Check for alert conditions
            if severity >= 70:  # High severity findings
                self._trigger_security_alert(security_event)
            
            return security_event
            
        except Exception as e:
            logger.error(f"Error processing Security Hub finding: {e}")
            raise
    
    def analyze_cloudtrail_events(self, start_time: datetime, end_time: datetime) -> Dict[str, Any]:
        """Analyze CloudTrail events for security anomalies"""
        try:
            # Get CloudTrail events
            response = self.cloudtrail.lookup_events(
                LookupAttributes=[
                    {
                        'AttributeKey': 'EventName',
                        'AttributeValue': 'AssumeRole'
                    }
                ],
                StartTime=start_time,
                EndTime=end_time
            )
            
            events = response['Events']
            
            # Analyze for anomalies
            anomalies = []
            
            # Check for unusual API calls
            api_calls = {}
            for event in events:
                event_name = event['EventName']
                user_identity = event.get('Username', 'Unknown')
                
                if event_name not in api_calls:
                    api_calls[event_name] = {}
                
                if user_identity not in api_calls[event_name]:
                    api_calls[event_name][user_identity] = 0
                
                api_calls[event_name][user_identity] += 1
            
            # Detect unusual patterns
            for api_call, users in api_calls.items():
                for user, count in users.items():
                    if count > 100:  # Threshold for unusual activity
                        anomalies.append({
                            'type': 'unusual_api_activity',
                            'user': user,
                            'apiCall': api_call,
                            'count': count,
                            'severity': 'medium'
                        })
            
            return {
                'analyzedEvents': len(events),
                'anomalies': anomalies,
                'timeRange': {
                    'start': start_time.isoformat(),
                    'end': end_time.isoformat()
                }
            }
            
        except Exception as e:
            logger.error(f"Error analyzing CloudTrail events: {e}")
            raise
    
    def get_security_metrics(self, time_range: str = '24h') -> Dict[str, Any]:
        """Get security metrics for dashboard"""
        try:
            # Parse time range
            if time_range == '24h':
                start_time = datetime.utcnow() - timedelta(hours=24)
            elif time_range == '7d':
                start_time = datetime.utcnow() - timedelta(days=7)
            elif time_range == '30d':
                start_time = datetime.utcnow() - timedelta(days=30)
            else:
                start_time = datetime.utcnow() - timedelta(hours=24)
            
            # Query security events
            response = self.security_table.scan(
                FilterExpression='#timestamp > :start_time',
                ExpressionAttributeNames={
                    '#timestamp': 'timestamp'
                },
                ExpressionAttributeValues={
                    ':start_time': start_time.isoformat()
                }
            )
            
            security_events = response['Items']
            
            # Aggregate metrics
            metrics = {
                'totalEvents': len(security_events),
                'eventsBySource': {},
                'eventsBySeverity': {},
                'eventsByType': {},
                'timeRange': time_range
            }
            
            for event in security_events:
                source = event['source']
                severity = event['severity']
                event_type = event['eventType']
                
                metrics['eventsBySource'][source] = metrics['eventsBySource'].get(source, 0) + 1
                metrics['eventsBySeverity'][severity] = metrics['eventsBySeverity'].get(severity, 0) + 1
                metrics['eventsByType'][event_type] = metrics['eventsByType'].get(event_type, 0) + 1
            
            # Get CloudWatch metrics
            cloudwatch_metrics = self._get_cloudwatch_security_metrics(start_time)
            metrics['cloudWatchMetrics'] = cloudwatch_metrics
            
            return metrics
            
        except Exception as e:
            logger.error(f"Error getting security metrics: {e}")
            raise
    
    def _map_severity(self, severity: float) -> str:
        """Map numeric severity to string"""
        if severity >= 7.0:
            return 'CRITICAL'
        elif severity >= 4.0:
            return 'HIGH'
        elif severity >= 2.0:
            return 'MEDIUM'
        else:
            return 'LOW'
    
    def _publish_to_error_bus(self, security_event: Dict[str, Any]):
        """Publish security event to Error Bus for correlation"""
        try:
            self.eventbridge.put_events(
                Entries=[
                    {
                        'EventBusName': self.error_bus_name,
                        'Source': 'security-monitor',
                        'DetailType': 'SecurityEvent',
                        'Detail': json.dumps(security_event)
                    }
                ]
            )
        except Exception as e:
            logger.error(f"Failed to publish to Error Bus: {e}")
    
    def _update_security_metrics(self, finding_type: str, severity: float):
        """Update CloudWatch security metrics"""
        try:
            self.cloudwatch.put_metric_data(
                Namespace='Skafu/Security',
                MetricData=[
                    {
                        'MetricName': 'SecurityFindings',
                        'Dimensions': [
                            {
                                'Name': 'FindingType',
                                'Value': finding_type
                            },
                            {
                                'Name': 'Severity',
                                'Value': self._map_severity(severity)
                            }
                        ],
                        'Value': 1,
                        'Unit': 'Count'
                    }
                ]
            )
        except Exception as e:
            logger.error(f"Failed to update security metrics: {e}")
    
    def _update_compliance_metrics(self, finding: Dict[str, Any]):
        """Update compliance metrics"""
        try:
            compliance = finding.get('Compliance', {})
            status = compliance.get('Status', 'UNKNOWN')
            
            self.cloudwatch.put_metric_data(
                Namespace='Skafu/Compliance',
                MetricData=[
                    {
                        'MetricName': 'ComplianceStatus',
                        'Dimensions': [
                            {
                                'Name': 'Status',
                                'Value': status
                            }
                        ],
                        'Value': 1,
                        'Unit': 'Count'
                    }
                ]
            )
        except Exception as e:
            logger.error(f"Failed to update compliance metrics: {e}")
    
    def _trigger_security_alert(self, security_event: Dict[str, Any]):
        """Trigger security alert for high severity events"""
        try:
            # This would integrate with SNS/SQS for immediate notifications
            logger.critical(f"Security alert triggered", extra={
                'eventId': security_event['eventId'],
                'eventType': security_event['eventType'],
                'severity': security_event['severity']
            })
        except Exception as e:
            logger.error(f"Failed to trigger security alert: {e}")
    
    def _get_cloudwatch_security_metrics(self, start_time: datetime) -> Dict[str, Any]:
        """Get CloudWatch security metrics"""
        try:
            response = self.cloudwatch.get_metric_statistics(
                Namespace='Skafu/Security',
                MetricName='SecurityFindings',
                StartTime=start_time,
                EndTime=datetime.utcnow(),
                Period=3600,
                Statistics=['Sum']
            )
            
            return {
                'securityFindings': response['Datapoints']
            }
        except Exception as e:
            logger.error(f"Error getting CloudWatch security metrics: {e}")
            return {}

# Lambda handlers
security_monitor = SecurityMonitor()

def guardduty_handler(event, context):
    """Handle GuardDuty findings"""
    try:
        for record in event['Records']:
            message = json.loads(record['body'])
            detail = message['detail']
            
            result = security_monitor.process_guardduty_finding(detail)
            
        return {
            'statusCode': 200,
            'body': json.dumps({'status': 'processed'})
        }
    except Exception as e:
        logger.error(f"Error in GuardDuty handler: {e}")
        raise

def securityhub_handler(event, context):
    """Handle Security Hub findings"""
    try:
        for record in event['Records']:
            message = json.loads(record['body'])
            detail = message['detail']
            
            result = security_monitor.process_security_hub_finding(detail)
            
        return {
            'statusCode': 200,
            'body': json.dumps({'status': 'processed'})
        }
    except Exception as e:
        logger.error(f"Error in Security Hub handler: {e}")
        raise

def security_metrics_handler(event, context):
    """Handle security metrics API requests"""
    try:
        time_range = event.get('queryStringParameters', {}).get('timeRange', '24h')
        
        metrics = security_monitor.get_security_metrics(time_range)
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps(metrics, default=str)
        }
    except Exception as e:
        logger.error(f"Error in security metrics handler: {e}")
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)})
        }
```

**Security Dashboard Integration**:
```typescript
// securitySlice.ts
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { apiClient } from '../utils/apiClient';

interface SecurityState {
  metrics: any;
  events: any[];
  alerts: any[];
  loading: {
    metrics: boolean;
    events: boolean;
    alerts: boolean;
  };
  error: string | null;
}

const initialState: SecurityState = {
  metrics: null,
  events: [],
  alerts: [],
  loading: {
    metrics: false,
    events: false,
    alerts: false
  },
  error: null
};

export const fetchSecurityMetrics = createAsyncThunk(
  'security/fetchMetrics',
  async (timeRange: string = '24h') => {
    const response = await apiClient.get(`/api/security/metrics?timeRange=${timeRange}`);
    return response.data;
  }
);

export const fetchSecurityEvents = createAsyncThunk(
  'security/fetchEvents',
  async (params: { timeRange?: string; severity?: string; source?: string }) => {
    const response = await apiClient.get('/api/security/events', { params });
    return response.data;
  }
);

export const fetchSecurityAlerts = createAsyncThunk(
  'security/fetchAlerts',
  async () => {
    const response = await apiClient.get('/api/security/alerts');
    return response.data;
  }
);

const securitySlice = createSlice({
  name: 'security',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearEvents: (state) => {
      state.events = [];
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchSecurityMetrics.pending, (state) => {
        state.loading.metrics = true;
        state.error = null;
      })
      .addCase(fetchSecurityMetrics.fulfilled, (state, action) => {
        state.loading.metrics = false;
        state.metrics = action.payload;
      })
      .addCase(fetchSecurityMetrics.rejected, (state, action) => {
        state.loading.metrics = false;
        state.error = action.error.message || 'Failed to fetch security metrics';
      })
      .addCase(fetchSecurityEvents.pending, (state) => {
        state.loading.events = true;
        state.error = null;
      })
      .addCase(fetchSecurityEvents.fulfilled, (state, action) => {
        state.loading.events = false;
        state.events = action.payload.events;
      })
      .addCase(fetchSecurityEvents.rejected, (state, action) => {
        state.loading.events = false;
        state.error = action.error.message || 'Failed to fetch security events';
      });
  }
});

export const { clearError, clearEvents } = securitySlice.actions;
export default securitySlice.reducer;
```

**EventBridge Rules for Security Integration**:
```yaml
# Security event routing
GuardDutyEventRule:
  Type: AWS::Events::Rule
  Properties:
    EventBusName: !Ref MainEventBus
    EventPattern:
      source: ["aws.guardduty"]
      detail-type: ["GuardDuty Finding"]
    State: ENABLED
    Targets:
      - Arn: !GetAtt SecurityProcessorFunction.Arn
        Id: GuardDutyTarget
      - Arn: !GetAtt ErrorBus.Arn
        Id: ErrorBusTarget

SecurityHubEventRule:
  Type: AWS::Events::Rule
  Properties:
    EventBusName: !Ref MainEventBus
    EventPattern:
      source: ["aws.securityhub"]
      detail-type: ["Security Hub Findings - Imported"]
    State: ENABLED
    Targets:
      - Arn: !GetAtt SecurityProcessorFunction.Arn
        Id: SecurityHubTarget

# CloudWatch alarms
HighSecurityAlertsAlarm:
  Type: AWS::CloudWatch::Alarm
  Properties:
    AlarmName: !Sub '${AWS::StackName}-high-security-alerts'
    AlarmDescription: 'High number of security alerts'
    MetricName: SecurityFindings
    Namespace: Skafu/Security
    Statistic: Sum
    Period: 300
    EvaluationPeriods: 2
    Threshold: 5
    ComparisonOperator: GreaterThanThreshold
    Dimensions:
      - Name: Severity
        Value: HIGH
    AlarmActions:
      - !Ref SecurityAlertsTopic

CriticalSecurityAlarm:
  Type: AWS::CloudWatch::Alarm
  Properties:
    AlarmName: !Sub '${AWS::StackName}-critical-security'
    AlarmDescription: 'Critical security finding detected'
    MetricName: SecurityFindings
    Namespace: Skafu/Security
    Statistic: Sum
    Period: 60
    EvaluationPeriods: 1
    Threshold: 1
    ComparisonOperator: GreaterThanOrEqualToThreshold
    Dimensions:
      - Name: Severity
        Value: CRITICAL
    AlarmActions:
      - !Ref CriticalSecurityTopic
```

### Consequences

**Good**:
* **Comprehensive Coverage**: AWS GuardDuty + Security Hub provide comprehensive security monitoring
* **Real-time Detection**: Immediate threat detection and alerting
* **Integration**: Seamless integration with existing Error Bus and observability systems
* **Compliance**: Built-in compliance monitoring and audit trails
* **Cost Effective**: AWS-native services with predictable pricing
* **Scalability**: Automatic scaling with AWS services
* **Analytics**: Rich security analytics and custom dashboards
* **Automation**: Automated threat detection and response capabilities

**Bad**:
* **AWS Dependency**: Heavily dependent on AWS security services
* **Cost**: Additional costs for GuardDuty and Security Hub services
* **Complexity**: Multiple services to configure and manage
* **Alert Fatigue**: Risk of too many alerts if not properly tuned
* **Learning Curve**: Team needs to understand AWS security services
* **Custom Logic**: Need to maintain custom analytics and correlation logic

## Security Event Categories

**Threat Detection**:
- Malicious IP activity
- Unusual API calls
- Privilege escalation attempts
- Data exfiltration patterns
- Cryptocurrency mining detection

**Compliance Monitoring**:
- CIS AWS Foundations Benchmark
- PCI DSS compliance checks
- SOC 2 Type II requirements
- GDPR data protection compliance
- Industry-specific regulations

**Operational Security**:
- Failed authentication attempts
- Unusual access patterns
- Configuration drift detection
- Vulnerability assessments
- Security group changes

## Alert Escalation

**Severity Levels**:
- **CRITICAL**: Immediate escalation to security team
- **HIGH**: Alert within 15 minutes
- **MEDIUM**: Daily digest notification
- **LOW**: Weekly summary report

**Notification Channels**:
- SNS for immediate alerts
- Slack integration for team notifications
- Email for detailed reports
- Dashboard for visual monitoring

## Implementation Guidelines

1. **Configuration**: Properly configure GuardDuty and Security Hub
2. **Tuning**: Tune alert thresholds to reduce false positives
3. **Correlation**: Correlate security events with application errors
4. **Response**: Implement automated response procedures
5. **Documentation**: Maintain security runbooks and procedures

## More Information

* [AWS GuardDuty Documentation](https://docs.aws.amazon.com/guardduty/)
* [AWS Security Hub Documentation](https://docs.aws.amazon.com/securityhub/)
* [Security Monitoring Best Practices](https://aws.amazon.com/architecture/security-identity-compliance/)
* Related ADRs: ADR-0010 (Error Bus), ADR-0013 (Observability), ADR-0016 (Secrets Manager)