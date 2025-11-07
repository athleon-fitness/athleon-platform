# Multi-Environment Deployment Guide

## Overview

This guide explains how to deploy the Athleon platform across multiple environments (development, staging, production) with proper isolation and configuration management.

## Architecture

### Environment Strategy

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Development   │    │     Staging     │    │   Production    │
│                 │    │                 │    │                 │
│ Account: 123... │    │ Account: 234... │    │ Account: 345... │
│ Region: us-e-2  │    │ Region: us-e-2  │    │ Region: us-e-2  │
│                 │    │                 │    │                 │
│ • Rapid dev     │    │ • Pre-prod test │    │ • Live system   │
│ • Debug logs    │    │ • Staging data  │    │ • High security │
│ • Relaxed sec   │    │ • Performance   │    │ • Monitoring    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Benefits

✅ **Complete Isolation**: Separate AWS accounts prevent cross-environment interference  
✅ **Environment-Specific Config**: Different security, performance, and monitoring settings  
✅ **Safe Testing**: Test changes in dev/staging before production  
✅ **Cost Control**: Track costs per environment  
✅ **Security**: Production has stricter access controls  

## Quick Start

### 1. Setup Environments

```bash
# Make scripts executable
chmod +x scripts/*.sh

# Setup all environments (one-time)
./scripts/setup-environments.sh
```

### 2. Deploy to Development

```bash
./scripts/deploy-multi-env.sh development your-dev-profile
```

### 3. Deploy to Staging

```bash
./scripts/deploy-multi-env.sh staging your-staging-profile
```

### 4. Deploy to Production

```bash
./scripts/deploy-multi-env.sh production your-prod-profile
```

## Environment Configurations

### Development (`environments/development.json`)

**Purpose**: Rapid development and testing

**Characteristics**:
- Relaxed security (6-char passwords, no MFA)
- Debug logging enabled
- CORS allows all origins
- Short log retention (7 days)
- No deletion protection
- Auto-creates super admin user

**Use Cases**:
- Feature development
- Bug fixes
- Integration testing
- Developer experimentation

### Staging (`environments/staging.json`)

**Purpose**: Pre-production testing and validation

**Characteristics**:
- Production-like security (8-char passwords, optional MFA)
- Info-level logging
- CORS restricted to staging domain
- Medium log retention (14 days)
- Point-in-time recovery enabled
- Performance monitoring

**Use Cases**:
- User acceptance testing
- Performance testing
- Integration testing
- Demo environment

### Production (`environments/production.json`)

**Purpose**: Live system serving real users

**Characteristics**:
- Maximum security (12-char passwords, required MFA)
- Warn-level logging only
- CORS restricted to production domain
- Long log retention (30 days)
- Full backup and recovery
- Comprehensive monitoring
- WAF protection

**Use Cases**:
- Live user traffic
- Real competitions
- Production data

## Configuration Management

### Environment-Specific Settings

Each environment has its own configuration file with:

```json
{
  "environment": "production",
  "account": "345678901234",
  "region": "us-east-2",
  "domain": "athleon.fitness",
  "cognito": { /* auth settings */ },
  "dynamodb": { /* database settings */ },
  "lambda": { /* function settings */ },
  "monitoring": { /* observability */ },
  "frontend": { /* web settings */ }
}
```

### Resource Naming

Resources are automatically named with environment prefix:

```
Development:
- Stack: Athleon-development
- UserPool: athleon-development
- EventBus: athleon-central-development
- S3: scoringames-frontend-development

Production:
- Stack: Athleon-production  
- UserPool: athleon-production
- EventBus: athleon-central-production
- S3: scoringames-frontend-production
```

## Deployment Workflows

### Manual Deployment

```bash
# Deploy specific environment
./scripts/deploy-multi-env.sh <environment> [profile] [region]

# Examples
./scripts/deploy-multi-env.sh development
./scripts/deploy-multi-env.sh staging aws-staging-profile
./scripts/deploy-multi-env.sh production aws-prod-profile us-west-2
```

### Automated CI/CD

GitHub Actions automatically deploys based on branch:

```
develop branch  → development environment
staging branch  → staging environment  
main branch     → production environment
```

**Workflow**:
1. Developer pushes to `develop` → Auto-deploy to development
2. Create PR to `staging` → Manual review → Merge → Auto-deploy to staging
3. Create PR to `main` → Manual review → Merge → Auto-deploy to production

### Environment Promotion

```bash
# Promote development to staging
git checkout staging
git merge develop
git push origin staging

# Promote staging to production  
git checkout main
git merge staging
git push origin main
```

## Security & Access Control

### AWS Account Isolation

Each environment uses a separate AWS account:
- **Development**: 123456789012 (relaxed policies)
- **Staging**: 234567890123 (medium security)
- **Production**: 345678901234 (maximum security)

### IAM Roles

Each account has an `AthleonDeploymentRole` for CI/CD:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::ACCOUNT:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringLike": {
          "token.actions.githubusercontent.com:sub": "repo:your-org/athleon:*"
        }
      }
    }
  ]
}
```

### Access Patterns

| Environment | Developers | QA Team | DevOps | End Users |
|-------------|------------|---------|--------|-----------|
| Development | Full access | Read access | Full access | No access |
| Staging | Deploy only | Full access | Full access | Limited access |
| Production | No access | No access | Deploy only | Full access |

## Monitoring & Observability

### Environment-Specific Monitoring

**Development**:
- Basic CloudWatch logs
- X-Ray tracing enabled
- No alerting

**Staging**:
- Detailed metrics
- Performance monitoring
- Basic alerting

**Production**:
- Comprehensive monitoring
- Real-time alerting
- Custom dashboards
- Performance insights

### Log Retention

| Environment | Retention | Purpose |
|-------------|-----------|---------|
| Development | 7 days | Short-term debugging |
| Staging | 14 days | Testing cycles |
| Production | 30 days | Compliance & analysis |

## Cost Management

### Cost Allocation

Resources are tagged by environment:

```yaml
Tags:
  Environment: production
  Project: Athleon
  ManagedBy: CDK
```

### Cost Optimization

**Development**:
- On-demand DynamoDB
- Minimal Lambda memory
- No versioning
- Short retention

**Staging**:
- On-demand DynamoDB
- Medium Lambda memory
- Basic versioning
- Medium retention

**Production**:
- Optimized DynamoDB
- Right-sized Lambda
- Full versioning
- Long retention

## Troubleshooting

### Common Issues

**Account Mismatch**:
```bash
❌ Account mismatch!
   Current account: 111111111111
   Expected account: 123456789012
```
**Solution**: Check AWS profile and environment config

**Missing Environment Config**:
```bash
❌ Environment configuration not found: environments/prod.json
```
**Solution**: Use correct environment name (development/staging/production)

**CDK Bootstrap Missing**:
```bash
❌ CDK deployment failed
```
**Solution**: Run `./scripts/setup-environments.sh` first

### Validation Commands

```bash
# Check current AWS account
aws sts get-caller-identity --profile your-profile

# Validate environment config
jq '.' environments/production.json

# Check CDK bootstrap
aws cloudformation describe-stacks --stack-name CDKToolkit --profile your-profile

# List available environments
ls environments/*.json | sed 's/environments\///g' | sed 's/\.json//g'
```

## Best Practices

### ✅ Do

- Always deploy to development first
- Test in staging before production
- Use environment-specific AWS profiles
- Review configuration changes carefully
- Monitor deployment logs
- Keep environment configs in version control

### ❌ Don't

- Deploy directly to production
- Share AWS credentials between environments
- Use production data in development
- Skip staging environment
- Hardcode environment-specific values
- Ignore security warnings

## Migration from Single Environment

If you're migrating from a single-environment setup:

1. **Backup Current State**:
   ```bash
   aws cloudformation describe-stacks --stack-name CalisthenicsAppStack > backup-stack.json
   ```

2. **Create Environment Configs**:
   ```bash
   # Copy current settings to production.json
   # Create development.json and staging.json
   ```

3. **Deploy New Structure**:
   ```bash
   ./scripts/deploy-multi-env.sh development
   ```

4. **Migrate Data** (if needed):
   ```bash
   # Export from old stack
   # Import to new environment
   ```

5. **Update DNS**:
   ```bash
   # Point domains to new CloudFront distributions
   ```

## Next Steps

1. **Setup Monitoring**: Configure CloudWatch dashboards and alarms
2. **Add Secrets**: Use AWS Secrets Manager for sensitive configuration
3. **Custom Domains**: Configure Route 53 and SSL certificates
4. **Backup Strategy**: Implement cross-region backups for production
5. **Disaster Recovery**: Plan for multi-region deployment

## Support

For issues or questions:
- Check the troubleshooting section above
- Review CloudFormation events in AWS Console
- Check GitHub Actions logs for CI/CD issues
- Validate environment configurations with `jq`