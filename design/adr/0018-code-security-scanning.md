# ADR-0018: Code Security Scanning and Analysis

**Status**: 🟢 Accepted  
**Date**: 2025-01-18  
**Deciders**: Development Team

## Context and Problem Statement

We need a comprehensive code security scanning solution that identifies vulnerabilities, enforces security best practices, and integrates with our CI/CD pipeline to prevent security issues from reaching production while maintaining development velocity and code quality.

## Decision Drivers

* Automated vulnerability detection in code and dependencies
* Integration with GitHub Actions CI/CD pipeline
* Support for multiple languages (Python, JavaScript, TypeScript)
* Static application security testing (SAST) capabilities
* Dependency vulnerability scanning (SCA)
* Secret detection and prevention
* Security policy enforcement and compliance
* Cost-effective solution with good developer experience
* Integration with existing security monitoring systems

## Considered Options

* **Option 1**: GitHub-native security features only (CodeQL, Dependabot)
* **Option 2**: Third-party SAST tools (Snyk, SonarQube, Checkmarx)
* **Option 3**: AWS CodeGuru Reviewer + CodeGuru Profiler
* **Option 4**: Hybrid approach with GitHub security + additional tools
* **Option 5**: Custom security scanning pipeline with multiple tools

## Decision Outcome

Chosen option: **"Hybrid approach with GitHub security + additional tools"**, because it provides comprehensive security coverage by combining GitHub's native security features with specialized tools for dependency scanning and secret detection while maintaining cost efficiency and developer experience.

### Implementation Details

**GitHub Security Features**:
```yaml
# .github/workflows/security-scan.yml
name: Security Scanning

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]
  schedule:
    - cron: '0 6 * * *'  # Daily security scan

jobs:
  # CodeQL Analysis
  codeql-analysis:
    name: CodeQL Analysis
    runs-on: ubuntu-latest
    permissions:
      actions: read
      contents: read
      security-events: write
    
    strategy:
      fail-fast: false
      matrix:
        language: ['javascript', 'python']
    
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4
        
      - name: Initialize CodeQL
        uses: github/codeql-action/init@v2
        with:
          languages: ${{ matrix.language }}
          config-file: ./.github/codeql/codeql-config.yml
          
      - name: Setup Node.js
        if: matrix.language == 'javascript'
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
          
      - name: Setup Python
        if: matrix.language == 'python'
        uses: actions/setup-python@v4
        with:
          python-version: '3.9'
          cache: 'pip'
          
      - name: Install dependencies
        run: |
          if [ "${{ matrix.language }}" == "javascript" ]; then
            npm ci
          elif [ "${{ matrix.language }}" == "python" ]; then
            pip install -r requirements.txt
          fi
          
      - name: Perform CodeQL Analysis
        uses: github/codeql-action/analyze@v2
        with:
          category: "/language:${{ matrix.language }}"

  # Dependency Vulnerability Scanning
  dependency-scan:
    name: Dependency Vulnerability Scan
    runs-on: ubuntu-latest
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4
        
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
          
      - name: Setup Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.9'
          cache: 'pip'
          
      - name: Install dependencies
        run: |
          npm ci
          pip install -r requirements.txt
          
      - name: Run npm audit
        run: |
          npm audit --audit-level=moderate --output=json > npm-audit-results.json || true
          
      - name: Run pip-audit
        run: |
          pip install pip-audit
          pip-audit --requirement requirements.txt --format=json --output=pip-audit-results.json || true
          
      - name: Run Trivy vulnerability scanner
        uses: aquasecurity/trivy-action@master
        with:
          scan-type: 'fs'
          scan-ref: '.'
          format: 'sarif'
          output: 'trivy-results.sarif'
          
      - name: Upload Trivy scan results
        uses: github/codeql-action/upload-sarif@v2
        with:
          sarif_file: 'trivy-results.sarif'
          
      - name: Process vulnerability results
        run: |
          python .github/scripts/process-vulnerabilities.py \
            --npm-audit npm-audit-results.json \
            --pip-audit pip-audit-results.json \
            --trivy trivy-results.sarif \
            --output vulnerability-report.json
            
      - name: Upload vulnerability report
        uses: actions/upload-artifact@v4
        with:
          name: vulnerability-report
          path: vulnerability-report.json

  # Secret Detection
  secret-detection:
    name: Secret Detection
    runs-on: ubuntu-latest
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4
        with:
          fetch-depth: 0
          
      - name: TruffleHog OSS
        uses: trufflesecurity/trufflehog@main
        with:
          path: ./
          base: main
          head: HEAD
          extra_args: --debug --only-verified
          
      - name: GitLeaks
        uses: gitleaks/gitleaks-action@v2
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          GITLEAKS_LICENSE: ${{ secrets.GITLEAKS_LICENSE }}
          
      - name: Semgrep Secret Scanning
        uses: returntocorp/semgrep-action@v1
        with:
          config: >-
            p/security-audit
            p/secrets
            p/owasp-top-ten
        env:
          SEMGREP_APP_TOKEN: ${{ secrets.SEMGREP_APP_TOKEN }}

  # Custom Security Rules
  custom-security-analysis:
    name: Custom Security Analysis
    runs-on: ubuntu-latest
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4
        
      - name: Setup Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.9'
          
      - name: Install security tools
        run: |
          pip install bandit safety semgrep
          npm install -g eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin
          
      - name: Run Bandit (Python security linter)
        run: |
          bandit -r . -f json -o bandit-results.json || true
          
      - name: Run Safety (Python dependency check)
        run: |
          safety check --json --output safety-results.json || true
          
      - name: Run ESLint security rules
        run: |
          npm run lint:security || true
          
      - name: Custom security validation
        run: |
          python .github/scripts/custom-security-checks.py
          
      - name: Generate security report
        run: |
          python .github/scripts/generate-security-report.py \
            --bandit bandit-results.json \
            --safety safety-results.json \
            --output security-analysis-report.json
            
      - name: Upload security analysis
        uses: actions/upload-artifact@v4
        with:
          name: security-analysis
          path: security-analysis-report.json
```

**CodeQL Configuration**:
```yaml
# .github/codeql/codeql-config.yml
name: "Skafu Security Configuration"

queries:
  - uses: security-extended
  - uses: security-and-quality

paths-ignore:
  - node_modules/
  - .aws-sam/
  - dist/
  - build/
  - coverage/
  - __pycache__/
  - .pytest_cache/

paths:
  - src/
  - frontend/src/
  - backend/
  - infrastructure/

query-filters:
  - exclude:
      id: js/unused-local-variable
  - exclude:
      id: py/unused-import
  - include:
      severity: error
  - include:
      security-severity: high
```

**Custom Security Analysis Scripts**:
```python
# .github/scripts/custom-security-checks.py
import os
import re
import json
import subprocess
from typing import Dict, List, Any
from pathlib import Path

class SecurityChecker:
    def __init__(self):
        self.security_issues = []
        self.patterns = {
            'hardcoded_secrets': [
                r'(?i)(password|passwd|pwd)\s*=\s*["\'][^"\']{3,}["\']',
                r'(?i)(secret|token|key)\s*=\s*["\'][^"\']{10,}["\']',
                r'(?i)(api_key|apikey)\s*=\s*["\'][^"\']{10,}["\']',
                r'(?i)(access_key|secret_key)\s*=\s*["\'][^"\']{10,}["\']'
            ],
            'sql_injection': [
                r'(?i)(select|insert|update|delete|drop|create|alter)\s+.*\+.*["\']',
                r'(?i)execute\s*\(\s*["\'].*\+.*["\']',
                r'(?i)query\s*\(\s*["\'].*\+.*["\']'
            ],
            'xss_vulnerabilities': [
                r'(?i)innerHTML\s*=\s*.*\+',
                r'(?i)document\.write\s*\(\s*.*\+',
                r'(?i)eval\s*\(\s*.*\+',
                r'(?i)setTimeout\s*\(\s*["\'].*\+.*["\']'
            ],
            'insecure_random': [
                r'(?i)Math\.random\(\)',
                r'(?i)random\.randint\(',
                r'(?i)random\.choice\('
            ],
            'weak_crypto': [
                r'(?i)md5\s*\(',
                r'(?i)sha1\s*\(',
                r'(?i)des\s*\(',
                r'(?i)rc4\s*\('
            ]
        }
    
    def scan_files(self, directory: str = '.') -> List[Dict[str, Any]]:
        """Scan files for security issues"""
        for root, dirs, files in os.walk(directory):
            # Skip certain directories
            dirs[:] = [d for d in dirs if d not in [
                'node_modules', '.git', '.aws-sam', 'dist', 'build', 
                'coverage', '__pycache__', '.pytest_cache'
            ]]
            
            for file in files:
                if file.endswith(('.py', '.js', '.ts', '.jsx', '.tsx')):
                    file_path = os.path.join(root, file)
                    self.scan_file(file_path)
        
        return self.security_issues
    
    def scan_file(self, file_path: str):
        """Scan a single file for security issues"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
                
            for category, patterns in self.patterns.items():
                for pattern in patterns:
                    matches = re.finditer(pattern, content, re.MULTILINE)
                    for match in matches:
                        line_number = content[:match.start()].count('\n') + 1
                        
                        self.security_issues.append({
                            'file': file_path,
                            'line': line_number,
                            'category': category,
                            'severity': self.get_severity(category),
                            'message': self.get_message(category),
                            'matched_text': match.group()[:100],  # Truncate for safety
                            'pattern': pattern
                        })
                        
        except Exception as e:
            print(f"Error scanning {file_path}: {e}")
    
    def get_severity(self, category: str) -> str:
        """Get severity level for category"""
        severity_map = {
            'hardcoded_secrets': 'CRITICAL',
            'sql_injection': 'HIGH',
            'xss_vulnerabilities': 'HIGH',
            'insecure_random': 'MEDIUM',
            'weak_crypto': 'HIGH'
        }
        return severity_map.get(category, 'MEDIUM')
    
    def get_message(self, category: str) -> str:
        """Get message for category"""
        messages = {
            'hardcoded_secrets': 'Potential hardcoded secret or password detected',
            'sql_injection': 'Potential SQL injection vulnerability',
            'xss_vulnerabilities': 'Potential XSS vulnerability',
            'insecure_random': 'Insecure random number generation',
            'weak_crypto': 'Weak cryptographic algorithm usage'
        }
        return messages.get(category, 'Security issue detected')
    
    def check_aws_credentials(self) -> List[Dict[str, Any]]:
        """Check for AWS credentials in files"""
        aws_issues = []
        
        for root, dirs, files in os.walk('.'):
            dirs[:] = [d for d in dirs if d not in [
                'node_modules', '.git', '.aws-sam', 'dist', 'build'
            ]]
            
            for file in files:
                if file.endswith(('.py', '.js', '.ts', '.json', '.yaml', '.yml')):
                    file_path = os.path.join(root, file)
                    
                    try:
                        with open(file_path, 'r', encoding='utf-8') as f:
                            content = f.read()
                            
                        # Check for AWS access keys
                        aws_patterns = [
                            r'AKIA[0-9A-Z]{16}',  # AWS Access Key ID
                            r'[0-9a-zA-Z/+]{40}',  # AWS Secret Access Key (potential)
                            r'aws_access_key_id\s*=\s*["\'][^"\']+["\']',
                            r'aws_secret_access_key\s*=\s*["\'][^"\']+["\']'
                        ]
                        
                        for pattern in aws_patterns:
                            matches = re.finditer(pattern, content, re.MULTILINE)
                            for match in matches:
                                line_number = content[:match.start()].count('\n') + 1
                                
                                aws_issues.append({
                                    'file': file_path,
                                    'line': line_number,
                                    'category': 'aws_credentials',
                                    'severity': 'CRITICAL',
                                    'message': 'Potential AWS credentials detected',
                                    'matched_text': match.group()[:20] + '...',
                                    'pattern': pattern
                                })
                                
                    except Exception as e:
                        print(f"Error checking AWS credentials in {file_path}: {e}")
        
        return aws_issues
    
    def check_dockerfile_security(self) -> List[Dict[str, Any]]:
        """Check Dockerfile for security issues"""
        docker_issues = []
        
        for root, dirs, files in os.walk('.'):
            for file in files:
                if file.lower() in ['dockerfile', 'dockerfile.dev', 'dockerfile.prod']:
                    file_path = os.path.join(root, file)
                    
                    try:
                        with open(file_path, 'r', encoding='utf-8') as f:
                            lines = f.readlines()
                            
                        for i, line in enumerate(lines, 1):
                            line = line.strip().lower()
                            
                            # Check for security issues
                            if line.startswith('user root') or 'user 0' in line:
                                docker_issues.append({
                                    'file': file_path,
                                    'line': i,
                                    'category': 'dockerfile_security',
                                    'severity': 'HIGH',
                                    'message': 'Running as root user',
                                    'matched_text': line
                                })
                            
                            if '--privileged' in line:
                                docker_issues.append({
                                    'file': file_path,
                                    'line': i,
                                    'category': 'dockerfile_security',
                                    'severity': 'CRITICAL',
                                    'message': 'Privileged container detected',
                                    'matched_text': line
                                })
                                
                    except Exception as e:
                        print(f"Error checking Dockerfile {file_path}: {e}")
        
        return docker_issues
    
    def generate_report(self) -> Dict[str, Any]:
        """Generate comprehensive security report"""
        file_issues = self.scan_files()
        aws_issues = self.check_aws_credentials()
        docker_issues = self.check_dockerfile_security()
        
        all_issues = file_issues + aws_issues + docker_issues
        
        # Categorize by severity
        severity_counts = {'CRITICAL': 0, 'HIGH': 0, 'MEDIUM': 0, 'LOW': 0}
        for issue in all_issues:
            severity_counts[issue['severity']] += 1
        
        # Categorize by type
        category_counts = {}
        for issue in all_issues:
            category = issue['category']
            category_counts[category] = category_counts.get(category, 0) + 1
        
        return {
            'summary': {
                'total_issues': len(all_issues),
                'severity_breakdown': severity_counts,
                'category_breakdown': category_counts,
                'scan_timestamp': str(datetime.utcnow())
            },
            'issues': all_issues,
            'recommendations': self.get_recommendations(all_issues)
        }
    
    def get_recommendations(self, issues: List[Dict[str, Any]]) -> List[str]:
        """Get security recommendations based on issues found"""
        recommendations = []
        
        categories = set(issue['category'] for issue in issues)
        
        if 'hardcoded_secrets' in categories:
            recommendations.append("Use environment variables or AWS Secrets Manager for sensitive data")
        
        if 'sql_injection' in categories:
            recommendations.append("Use parameterized queries or ORM to prevent SQL injection")
        
        if 'xss_vulnerabilities' in categories:
            recommendations.append("Sanitize user input and use Content Security Policy (CSP)")
        
        if 'insecure_random' in categories:
            recommendations.append("Use cryptographically secure random number generators")
        
        if 'weak_crypto' in categories:
            recommendations.append("Use strong cryptographic algorithms (AES, SHA-256, etc.)")
        
        if 'aws_credentials' in categories:
            recommendations.append("Remove hardcoded AWS credentials, use IAM roles instead")
        
        if 'dockerfile_security' in categories:
            recommendations.append("Follow Docker security best practices, avoid running as root")
        
        return recommendations

if __name__ == "__main__":
    checker = SecurityChecker()
    report = checker.generate_report()
    
    # Save report
    with open('custom-security-report.json', 'w') as f:
        json.dump(report, f, indent=2)
    
    # Exit with error code if critical issues found
    if report['summary']['severity_breakdown']['CRITICAL'] > 0:
        print(f"CRITICAL security issues found: {report['summary']['severity_breakdown']['CRITICAL']}")
        exit(1)
    elif report['summary']['severity_breakdown']['HIGH'] > 0:
        print(f"HIGH security issues found: {report['summary']['severity_breakdown']['HIGH']}")
        exit(1)
    
    print("Security scan completed successfully")
```

**Security Policy Enforcement**:
```python
# .github/scripts/security-policy.py
import json
import sys
from typing import Dict, List, Any

class SecurityPolicy:
    def __init__(self):
        self.policies = {
            'max_critical_issues': 0,
            'max_high_issues': 5,
            'max_medium_issues': 20,
            'blocked_dependencies': [
                'lodash@4.17.15',  # Known vulnerabilities
                'moment@2.29.1',   # Deprecated
            ],
            'required_security_headers': [
                'Content-Security-Policy',
                'X-Frame-Options',
                'X-Content-Type-Options',
                'Strict-Transport-Security'
            ],
            'encryption_requirements': {
                'min_key_size': 2048,
                'allowed_algorithms': ['AES-256', 'RSA-2048', 'SHA-256']
            }
        }
    
    def evaluate_vulnerability_report(self, report: Dict[str, Any]) -> Dict[str, Any]:
        """Evaluate vulnerability report against security policies"""
        policy_violations = []
        
        # Check severity limits
        summary = report.get('summary', {})
        severity_breakdown = summary.get('severity_breakdown', {})
        
        if severity_breakdown.get('CRITICAL', 0) > self.policies['max_critical_issues']:
            policy_violations.append({
                'policy': 'max_critical_issues',
                'violation': f"Found {severity_breakdown['CRITICAL']} critical issues, max allowed: {self.policies['max_critical_issues']}",
                'severity': 'CRITICAL'
            })
        
        if severity_breakdown.get('HIGH', 0) > self.policies['max_high_issues']:
            policy_violations.append({
                'policy': 'max_high_issues',
                'violation': f"Found {severity_breakdown['HIGH']} high issues, max allowed: {self.policies['max_high_issues']}",
                'severity': 'HIGH'
            })
        
        if severity_breakdown.get('MEDIUM', 0) > self.policies['max_medium_issues']:
            policy_violations.append({
                'policy': 'max_medium_issues',
                'violation': f"Found {severity_breakdown['MEDIUM']} medium issues, max allowed: {self.policies['max_medium_issues']}",
                'severity': 'MEDIUM'
            })
        
        # Check for blocked dependencies
        issues = report.get('issues', [])
        for issue in issues:
            if issue.get('category') == 'dependency_vulnerability':
                dependency = issue.get('dependency', '')
                if dependency in self.policies['blocked_dependencies']:
                    policy_violations.append({
                        'policy': 'blocked_dependencies',
                        'violation': f"Blocked dependency found: {dependency}",
                        'severity': 'HIGH'
                    })
        
        return {
            'policy_compliant': len(policy_violations) == 0,
            'violations': policy_violations,
            'total_violations': len(policy_violations)
        }
    
    def generate_security_badge(self, report: Dict[str, Any]) -> str:
        """Generate security badge status"""
        summary = report.get('summary', {})
        severity_breakdown = summary.get('severity_breakdown', {})
        
        if severity_breakdown.get('CRITICAL', 0) > 0:
            return 'critical'
        elif severity_breakdown.get('HIGH', 0) > 0:
            return 'high'
        elif severity_breakdown.get('MEDIUM', 0) > 0:
            return 'medium'
        else:
            return 'secure'

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python security-policy.py <vulnerability-report.json>")
        sys.exit(1)
    
    report_file = sys.argv[1]
    
    with open(report_file, 'r') as f:
        report = json.load(f)
    
    policy = SecurityPolicy()
    policy_result = policy.evaluate_vulnerability_report(report)
    
    # Save policy evaluation
    with open('security-policy-result.json', 'w') as f:
        json.dump(policy_result, f, indent=2)
    
    # Generate badge
    badge = policy.generate_security_badge(report)
    with open('security-badge.txt', 'w') as f:
        f.write(badge)
    
    # Exit with appropriate code
    if not policy_result['policy_compliant']:
        print(f"Security policy violations found: {policy_result['total_violations']}")
        sys.exit(1)
    
    print("Security policy compliance verified")
```

**Integration with Error Bus**:
```python
# Security event publishing to Error Bus
def publish_security_event(security_issue: Dict[str, Any]):
    """Publish security issue to Error Bus"""
    event_data = {
        'eventId': str(uuid.uuid4()),
        'correlationId': f"security-{security_issue['file']}-{security_issue['line']}",
        'timestamp': datetime.utcnow().isoformat(),
        'version': '1.0',
        'source': 'security-scanner',
        'eventType': 'SecurityIssueDetected',
        'severity': security_issue['severity'],
        'data': {
            'file': security_issue['file'],
            'line': security_issue['line'],
            'category': security_issue['category'],
            'message': security_issue['message'],
            'recommendation': get_recommendation(security_issue['category'])
        },
        'metadata': {
            'scanner': 'custom-security-scanner',
            'scanTimestamp': datetime.utcnow().isoformat(),
            'canRetry': False
        }
    }
    
    eventbridge.put_events(
        Entries=[
            {
                'EventBusName': 'skafu-error-bus',
                'Source': 'security-scanner',
                'DetailType': 'SecurityIssueDetected',
                'Detail': json.dumps(event_data)
            }
        ]
    )
```

### Consequences

**Good**:
* **Comprehensive Coverage**: Multiple scanning tools cover different types of security issues
* **CI/CD Integration**: Automated scanning in development pipeline
* **GitHub Native**: Leverages GitHub's security features and ecosystem
* **Cost Effective**: Uses mostly free and open-source tools
* **Policy Enforcement**: Automated policy compliance checking
* **Developer Experience**: Clear feedback and actionable recommendations
* **Early Detection**: Catches security issues before production deployment
* **Compliance**: Supports regulatory compliance requirements

**Bad**:
* **False Positives**: May generate false positive security alerts
* **Build Time**: Additional scanning time in CI/CD pipeline
* **Tool Maintenance**: Multiple tools require updates and maintenance
* **Learning Curve**: Developers need to understand security scanning results
* **Alert Fatigue**: Risk of too many security alerts
* **GitHub Dependency**: Heavily dependent on GitHub's security features

## Security Scanning Categories

**Static Application Security Testing (SAST)**:
- Code vulnerability detection
- Security anti-patterns identification
- Data flow analysis
- Control flow analysis

**Software Composition Analysis (SCA)**:
- Dependency vulnerability scanning
- License compliance checking
- Outdated package detection
- Supply chain security

**Secret Detection**:
- API key detection
- Password identification
- Certificate scanning
- Token discovery

**Infrastructure Security**:
- Dockerfile security scanning
- Configuration drift detection
- Cloud security posture
- Network security validation

## Security Metrics

**Vulnerability Metrics**:
- Total vulnerabilities by severity
- Mean time to remediation
- Vulnerability density per KLOC
- Security debt accumulation

**Process Metrics**:
- Scan coverage percentage
- Policy compliance rate
- False positive rate
- Developer security training completion

## Implementation Guidelines

1. **Tool Configuration**: Properly configure all scanning tools
2. **Policy Definition**: Define clear security policies and thresholds
3. **Developer Training**: Train developers on security scanning results
4. **Integration**: Integrate with existing monitoring and alerting systems
5. **Continuous Improvement**: Regularly review and update security policies

## More Information

* [GitHub Security Documentation](https://docs.github.com/en/code-security)
* [OWASP Secure Coding Practices](https://owasp.org/www-project-secure-coding-practices-quick-reference-guide/)
* [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework)
* Related ADRs: ADR-0009 (GitHub Actions), ADR-0017 (Security Monitoring), ADR-0016 (Secrets Manager)