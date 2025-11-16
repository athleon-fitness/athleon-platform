#!/bin/bash

# AWS Cognito config from frontend
USER_POOL_ID="us-east-2_Wsuyp4eVw"
CLIENT_ID="1rglkkj6deko7i7k0lgu78uhvu"
API_URL="https://api.dev.athleon.fitness"

# Test credentials (use existing test user)
USERNAME="admin@athleon.fitness"
PASSWORD="TempPass123!"

echo "🔐 Getting JWT token for $USERNAME..."

# Get JWT token
TOKEN_RESPONSE=$(aws cognito-idp admin-initiate-auth \
  --user-pool-id $USER_POOL_ID \
  --client-id $CLIENT_ID \
  --auth-flow ADMIN_NO_SRP_AUTH \
  --auth-parameters USERNAME=$USERNAME,PASSWORD=$PASSWORD \
  --profile labvel-dev \
  --region us-east-2 2>/dev/null)

if [ $? -ne 0 ]; then
  echo "❌ Failed to get token. User might not exist or password incorrect."
  echo "Creating test user..."
  
  # Create user if doesn't exist
  aws cognito-idp admin-create-user \
    --user-pool-id $USER_POOL_ID \
    --username $USERNAME \
    --user-attributes Name=email,Value=$USERNAME Name=email_verified,Value=true \
    --temporary-password $PASSWORD \
    --message-action SUPPRESS \
    --profile labvel-dev \
    --region us-east-2
    
  # Set permanent password
  aws cognito-idp admin-set-user-password \
    --user-pool-id $USER_POOL_ID \
    --username $USERNAME \
    --password $PASSWORD \
    --permanent \
    --profile labvel-dev \
    --region us-east-2
    
  # Try again
  TOKEN_RESPONSE=$(aws cognito-idp admin-initiate-auth \
    --user-pool-id $USER_POOL_ID \
    --client-id $CLIENT_ID \
    --auth-flow ADMIN_NO_SRP_AUTH \
    --auth-parameters USERNAME=$USERNAME,PASSWORD=$PASSWORD \
    --profile labvel-dev \
    --region us-east-2 2>/dev/null)
fi

# Extract token
TOKEN=$(echo $TOKEN_RESPONSE | jq -r '.AuthenticationResult.AccessToken')

if [ "$TOKEN" = "null" ] || [ -z "$TOKEN" ]; then
  echo "❌ Failed to get token"
  exit 1
fi

echo "✅ Got token: ${TOKEN:0:50}..."

# Test API endpoints
echo ""
echo "🧪 Testing API endpoints..."

echo ""
echo "1. Testing /competitions?organizationId=all"
curl -s -H "Authorization: Bearer $TOKEN" \
  "$API_URL/competitions?organizationId=all" | jq '.' || echo "Response not JSON"

echo ""
echo "2. Testing /public/events (no auth)"
curl -s "$API_URL/public/events" | jq '.' || echo "Response not JSON"

echo ""
echo "✅ API tests complete!"
