#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENT=${1}
PROFILE=${2}
REGION=${3}

# Validate inputs
if [ -z "$ENVIRONMENT" ]; then
  echo -e "${RED}❌ Environment is required${NC}"
  echo "Usage: $0 <environment> [profile] [region]"
  echo "Available environments:"
  ls environments/*.json 2>/dev/null | sed 's/environments\///g' | sed 's/\.json//g' | sed 's/^/  - /'
  exit 1
fi

# Check if environment config exists
if [ ! -f "environments/${ENVIRONMENT}.json" ]; then
  echo -e "${RED}❌ Environment configuration not found: environments/${ENVIRONMENT}.json${NC}"
  echo "Available environments:"
  ls environments/*.json 2>/dev/null | sed 's/environments\///g' | sed 's/\.json//g' | sed 's/^/  - /'
  exit 1
fi

# Load environment configuration
ACCOUNT=$(jq -r '.account' "environments/${ENVIRONMENT}.json")
DEFAULT_REGION=$(jq -r '.region' "environments/${ENVIRONMENT}.json")
DOMAIN=$(jq -r '.domain' "environments/${ENVIRONMENT}.json")

# Set defaults
PROFILE=${PROFILE:-default}
REGION=${REGION:-$DEFAULT_REGION}
STACK_NAME="Athleon-${ENVIRONMENT}"

echo -e "${BLUE}🚀 Deploying Athleon to ${ENVIRONMENT} environment${NC}"
echo "Environment: $ENVIRONMENT"
echo "Account: $ACCOUNT"
echo "Region: $REGION"
echo "Profile: $PROFILE"
echo "Domain: $DOMAIN"
echo ""

# Verify AWS credentials
echo -e "${YELLOW}🔐 Verifying AWS credentials...${NC}"
CURRENT_ACCOUNT=$(aws sts get-caller-identity --profile $PROFILE --query Account --output text 2>/dev/null || echo "")

if [ -z "$CURRENT_ACCOUNT" ]; then
  echo -e "${RED}❌ Failed to get AWS account info. Check your profile: $PROFILE${NC}"
  exit 1
fi

if [ "$CURRENT_ACCOUNT" != "$ACCOUNT" ]; then
  echo -e "${RED}❌ Account mismatch!${NC}"
  echo "  Current account: $CURRENT_ACCOUNT"
  echo "  Expected account: $ACCOUNT"
  echo "  Environment: $ENVIRONMENT"
  exit 1
fi

echo -e "${GREEN}✓ AWS credentials verified${NC}"
echo ""

# Step 1: Bootstrap CDK (if needed)
echo -e "${YELLOW}🥾 Step 1: Checking CDK bootstrap...${NC}"
aws cloudformation describe-stacks \
  --stack-name CDKToolkit \
  --profile $PROFILE \
  --region $REGION \
  >/dev/null 2>&1 || {
  echo "CDK not bootstrapped. Bootstrapping..."
  AWS_PROFILE=$PROFILE cdk bootstrap aws://$ACCOUNT/$REGION
}
echo -e "${GREEN}✓ CDK bootstrap verified${NC}"
echo ""

# Step 2: Deploy CDK Stack
echo -e "${YELLOW}📦 Step 2: Deploying CDK infrastructure...${NC}"
cd "$(dirname "$0")/.."

AWS_PROFILE=$PROFILE cdk deploy $STACK_NAME \
  --context environment=$ENVIRONMENT \
  --require-approval never \
  --region $REGION

if [ $? -ne 0 ]; then
  echo -e "${RED}❌ CDK deployment failed${NC}"
  exit 1
fi
echo -e "${GREEN}✓ CDK deployment complete${NC}"
echo ""

# Step 3: Get Stack Outputs
echo -e "${YELLOW}🔍 Step 3: Retrieving stack outputs...${NC}"

get_output() {
  aws cloudformation describe-stacks \
    --stack-name $STACK_NAME \
    --query "Stacks[0].Outputs[?OutputKey=='$1'].OutputValue" \
    --output text \
    --profile $PROFILE \
    --region $REGION
}

API_URL=$(get_output "ApiUrl")
USER_POOL_ID=$(get_output "UserPoolId")
USER_POOL_CLIENT_ID=$(get_output "UserPoolClientId")
FRONTEND_BUCKET=$(get_output "FrontendBucket")
DISTRIBUTION_ID=$(get_output "FrontendDistributionId")
FRONTEND_URL=$(get_output "FrontendUrl")

echo "API URL: $API_URL"
echo "User Pool ID: $USER_POOL_ID"
echo "Frontend Bucket: $FRONTEND_BUCKET"
echo "Distribution ID: $DISTRIBUTION_ID"
echo "Frontend URL: $FRONTEND_URL"
echo ""

# Step 4: Create Frontend Config
echo -e "${YELLOW}⚙️  Step 4: Creating frontend configuration...${NC}"
cd frontend

# Create environment-specific config
cat > src/aws-config.json << EOF
{
  "environment": "$ENVIRONMENT",
  "apiUrl": "$API_URL",
  "userPoolId": "$USER_POOL_ID",
  "userPoolClientId": "$USER_POOL_CLIENT_ID",
  "region": "$REGION",
  "domain": "$DOMAIN"
}
EOF

# Set environment variables for build
export REACT_APP_ENVIRONMENT=$ENVIRONMENT
export REACT_APP_API_URL=$API_URL
export REACT_APP_USER_POOL_ID=$USER_POOL_ID
export REACT_APP_USER_POOL_CLIENT_ID=$USER_POOL_CLIENT_ID
export REACT_APP_REGION=$REGION

echo -e "${GREEN}✓ Configuration created${NC}"
echo ""

# Step 5: Build Frontend
echo -e "${YELLOW}🔨 Step 5: Building frontend...${NC}"
npm run build

if [ $? -ne 0 ]; then
  echo -e "${RED}❌ Frontend build failed${NC}"
  exit 1
fi
echo -e "${GREEN}✓ Frontend build complete${NC}"
echo ""

# Step 6: Deploy to S3
echo -e "${YELLOW}☁️  Step 6: Deploying to S3...${NC}"
aws s3 sync build/ s3://$FRONTEND_BUCKET \
  --delete \
  --profile $PROFILE \
  --region $REGION

if [ $? -ne 0 ]; then
  echo -e "${RED}❌ S3 sync failed${NC}"
  exit 1
fi
echo -e "${GREEN}✓ S3 deployment complete${NC}"
echo ""

# Step 7: Invalidate CloudFront
echo -e "${YELLOW}🔄 Step 7: Invalidating CloudFront cache...${NC}"
INVALIDATION_ID=$(aws cloudfront create-invalidation \
  --distribution-id $DISTRIBUTION_ID \
  --paths "/*" \
  --profile $PROFILE \
  --query 'Invalidation.Id' \
  --output text)

echo "Invalidation ID: $INVALIDATION_ID"
echo -e "${GREEN}✓ CloudFront invalidation created${NC}"
echo ""

# Step 8: Create Super Admin (if development)
if [ "$ENVIRONMENT" = "development" ]; then
  echo -e "${YELLOW}👤 Step 8: Creating super admin user...${NC}"
  cd ../
  node scripts/create-super-admin-user.js --environment $ENVIRONMENT --profile $PROFILE
  echo -e "${GREEN}✓ Super admin user created${NC}"
  echo ""
fi

echo -e "${GREEN}✅ Deployment Complete!${NC}"
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}🌐 Frontend URL: $FRONTEND_URL${NC}"
echo -e "${GREEN}🔗 API URL: $API_URL${NC}"
echo -e "${GREEN}🏷️  Environment: $ENVIRONMENT${NC}"
echo -e "${GREEN}🏦 Account: $ACCOUNT${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

if [ "$ENVIRONMENT" = "development" ]; then
  echo -e "${YELLOW}Development Environment Notes:${NC}"
  echo "• Super admin: admin@athleon.fitness / Admin123!"
  echo "• Debug logging enabled"
  echo "• CORS allows all origins"
fi

echo ""
echo "Note: CloudFront invalidation may take 1-2 minutes to complete."
echo "Use Ctrl+Shift+R to hard refresh your browser."