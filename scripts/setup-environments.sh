#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🏗️  Setting up multi-environment infrastructure${NC}"
echo ""

# Function to create IAM deployment role
create_deployment_role() {
  local account=$1
  local environment=$2
  local profile=$3
  
  echo -e "${YELLOW}Creating deployment role for $environment (Account: $account)...${NC}"
  
  # Create trust policy
  cat > /tmp/trust-policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::$account:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
        },
        "StringLike": {
          "token.actions.githubusercontent.com:sub": "repo:your-org/athleon:*"
        }
      }
    }
  ]
}
EOF

  # Create role
  aws iam create-role \
    --role-name AthleonDeploymentRole \
    --assume-role-policy-document file:///tmp/trust-policy.json \
    --profile $profile \
    --region us-east-2 || echo "Role may already exist"

  # Attach policies
  aws iam attach-role-policy \
    --role-name AthleonDeploymentRole \
    --policy-arn arn:aws:iam::aws:policy/AdministratorAccess \
    --profile $profile \
    --region us-east-2 || echo "Policy may already be attached"

  echo -e "${GREEN}✓ Deployment role created for $environment${NC}"
}

# Function to setup OIDC provider
setup_oidc_provider() {
  local account=$1
  local profile=$2
  
  echo -e "${YELLOW}Setting up GitHub OIDC provider for account $account...${NC}"
  
  # Create OIDC provider
  aws iam create-open-id-connect-provider \
    --url https://token.actions.githubusercontent.com \
    --client-id-list sts.amazonaws.com \
    --thumbprint-list 6938fd4d98bab03faadb97b34396831e3780aea1 \
    --profile $profile \
    --region us-east-2 || echo "OIDC provider may already exist"

  echo -e "${GREEN}✓ OIDC provider configured${NC}"
}

# Function to bootstrap CDK
bootstrap_cdk() {
  local account=$1
  local region=$2
  local environment=$3
  local profile=$4
  
  echo -e "${YELLOW}Bootstrapping CDK for $environment...${NC}"
  
  AWS_PROFILE=$profile cdk bootstrap aws://$account/$region \
    --cloudformation-execution-policies arn:aws:iam::aws:policy/AdministratorAccess \
    --qualifier $environment

  echo -e "${GREEN}✓ CDK bootstrapped for $environment${NC}"
}

# Read environment configurations
echo -e "${YELLOW}📋 Reading environment configurations...${NC}"

# Development
DEV_ACCOUNT=$(jq -r '.account' environments/development.json)
DEV_REGION=$(jq -r '.region' environments/development.json)

# Staging  
STAGING_ACCOUNT=$(jq -r '.account' environments/staging.json)
STAGING_REGION=$(jq -r '.region' environments/staging.json)

# Production
PROD_ACCOUNT=$(jq -r '.account' environments/production.json)
PROD_REGION=$(jq -r '.region' environments/production.json)

echo "Development: $DEV_ACCOUNT ($DEV_REGION)"
echo "Staging: $STAGING_ACCOUNT ($STAGING_REGION)"
echo "Production: $PROD_ACCOUNT ($PROD_REGION)"
echo ""

# Prompt for AWS profiles
read -p "Enter AWS profile for development account: " DEV_PROFILE
read -p "Enter AWS profile for staging account: " STAGING_PROFILE
read -p "Enter AWS profile for production account: " PROD_PROFILE

echo ""

# Setup each environment
echo -e "${BLUE}🔧 Setting up development environment...${NC}"
setup_oidc_provider $DEV_ACCOUNT $DEV_PROFILE
create_deployment_role $DEV_ACCOUNT "development" $DEV_PROFILE
bootstrap_cdk $DEV_ACCOUNT $DEV_REGION "development" $DEV_PROFILE
echo ""

echo -e "${BLUE}🔧 Setting up staging environment...${NC}"
setup_oidc_provider $STAGING_ACCOUNT $STAGING_PROFILE
create_deployment_role $STAGING_ACCOUNT "staging" $STAGING_PROFILE
bootstrap_cdk $STAGING_ACCOUNT $STAGING_REGION "staging" $STAGING_PROFILE
echo ""

echo -e "${BLUE}🔧 Setting up production environment...${NC}"
setup_oidc_provider $PROD_ACCOUNT $PROD_PROFILE
create_deployment_role $PROD_ACCOUNT "production" $PROD_PROFILE
bootstrap_cdk $PROD_ACCOUNT $PROD_REGION "production" $PROD_PROFILE
echo ""

# Create GitHub secrets documentation
cat > GITHUB_SECRETS.md << EOF
# GitHub Secrets Configuration

Add these secrets to your GitHub repository:

## Repository Secrets

\`\`\`
AWS_ACCESS_KEY_ID=<your-access-key-id>
AWS_SECRET_ACCESS_KEY=<your-secret-access-key>
\`\`\`

## Environment Secrets

### Development Environment
- No additional secrets needed (uses OIDC)

### Staging Environment  
- No additional secrets needed (uses OIDC)

### Production Environment
- No additional secrets needed (uses OIDC)

## OIDC Configuration

The following IAM roles have been created:
- Development: arn:aws:iam::$DEV_ACCOUNT:role/AthleonDeploymentRole
- Staging: arn:aws:iam::$STAGING_ACCOUNT:role/AthleonDeploymentRole  
- Production: arn:aws:iam::$PROD_ACCOUNT:role/AthleonDeploymentRole

## Manual Steps

1. Update the GitHub workflow file (.github/workflows/deploy.yml)
2. Replace 'your-org/athleon' with your actual repository path
3. Add the repository secrets in GitHub Settings > Secrets and variables > Actions
EOF

echo -e "${GREEN}✅ Multi-environment setup complete!${NC}"
echo ""
echo -e "${BLUE}📝 Next steps:${NC}"
echo "1. Review and update GITHUB_SECRETS.md"
echo "2. Add secrets to your GitHub repository"
echo "3. Update .github/workflows/deploy.yml with your repository path"
echo "4. Test deployment: ./scripts/deploy-multi-env.sh development"
echo ""
echo -e "${YELLOW}⚠️  Important:${NC}"
echo "• Update environment configurations with real account IDs"
echo "• Replace certificate ARNs with actual values"
echo "• Configure custom domains in Route 53"
echo "• Set up monitoring and alerting"