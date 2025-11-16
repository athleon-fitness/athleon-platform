#!/bin/bash

API_URL="https://api.dev.athleon.fitness"

echo "🧪 Testing API endpoints..."

echo ""
echo "1. Testing /competitions?organizationId=all (should return 401)"
curl -v "$API_URL/competitions?organizationId=all" 2>&1 | grep -E "(HTTP|access-control|message)"

echo ""
echo "2. Testing /public/events (should work without auth)"
curl -s "$API_URL/public/events" | head -100

echo ""
echo "✅ Basic API tests complete!"
echo ""
echo "📝 To get a JWT token:"
echo "1. Login to your frontend at https://dev.athleon.fitness"
echo "2. Open browser dev tools → Network tab"
echo "3. Make any API call and copy the Authorization header"
echo "4. Use: curl -H 'Authorization: Bearer YOUR_TOKEN' '$API_URL/competitions?organizationId=all'"
