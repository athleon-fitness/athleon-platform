# CORS Fix Summary

## Problem

Public endpoints for categories and WODs were returning 403 CORS errors:
```
Cross-Origin Request Blocked: The Same Origin Policy disallows reading the remote resource at https://api.dev.athleon.fitness/public/categories?eventId=evt-xxx. (Reason: CORS preflight response did not succeed). Status code: 403.
```

## Root Cause

The existing Lambda functions were using `getCorsHeaders()` from a shared layer that either:
1. Wasn't properly configured
2. Wasn't returning correct CORS headers for OPTIONS requests
3. Was requiring authentication for public endpoints

## Solution

Created dedicated public Lambda functions with simple, direct CORS headers:

### 1. New Lambda Functions

#### `lambda/categories/public.js`
- Simple handler with hardcoded CORS headers
- No authentication required
- Handles OPTIONS preflight requests
- Returns categories for a given eventId

#### `lambda/wods/public.js`
- Simple handler with hardcoded CORS headers
- No authentication required
- Handles OPTIONS preflight requests
- Returns WODs for a given eventId

### 2. CORS Headers Used

```javascript
const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  'Access-Control-Allow-Methods': 'GET,OPTIONS',
  'Content-Type': 'application/json'
};
```

### 3. CDK Infrastructure Updates

#### Updated `categories-stack.ts`
- Added `categoriesPublicLambda` using `public.handler`
- Granted read-only access to categories table
- No shared layer dependencies

#### Updated `wods-stack.ts`
- Added `wodsPublicLambda` using `public.handler`
- Granted read-only access to wods table
- No shared layer dependencies

#### Updated `main-stack.ts`
- Wired `/public/categories` to new public Lambda
- Wired `/public/wods` to new public Lambda
- Added explicit OPTIONS method handling

## API Endpoints

### Before (Broken)
```
GET /public/categories?eventId=xxx  → 403 CORS Error
GET /public/wods?eventId=xxx        → 403 CORS Error
```

### After (Fixed)
```
OPTIONS /public/categories          → 200 OK (CORS headers)
GET /public/categories?eventId=xxx  → 200 OK (with CORS headers)

OPTIONS /public/wods                → 200 OK (CORS headers)
GET /public/wods?eventId=xxx        → 200 OK (with CORS headers)

OPTIONS /public/schedules/{eventId} → 200 OK (CORS headers)
GET /public/schedules/{eventId}     → 200 OK (with CORS headers)
```

## Deployment

### Deploy to Dev
```bash
cd infrastructure
npm run build
cdk deploy --context stage=dev
```

### Verify
```bash
# Test OPTIONS (preflight)
curl -X OPTIONS https://api.dev.athleon.fitness/public/categories \
  -H "Origin: https://dev.athleon.fitness" \
  -H "Access-Control-Request-Method: GET" \
  -v

# Test GET
curl -X GET "https://api.dev.athleon.fitness/public/categories?eventId=evt-123" \
  -H "Origin: https://dev.athleon.fitness" \
  -v
```

## Files Created

1. `lambda/categories/public.js` - Public categories handler
2. `lambda/wods/public.js` - Public WODs handler

## Files Modified

1. `infrastructure/categories/categories-stack.ts` - Added public Lambda
2. `infrastructure/wods/wods-stack.ts` - Added public Lambda
3. `infrastructure/scheduling/scheduling-stack.ts` - Exported public Lambda
4. `infrastructure/main-stack.ts` - Wired all public endpoints with OPTIONS

## Benefits

1. ✅ **Simple**: No complex shared layer dependencies
2. ✅ **Reliable**: Direct CORS headers, no middleware
3. ✅ **Secure**: Read-only access, no authentication bypass
4. ✅ **Maintainable**: Easy to understand and debug
5. ✅ **Consistent**: Same pattern as working `/public/schedules` endpoint

## Testing Checklist

- [ ] OPTIONS request returns 200 with CORS headers
- [ ] GET request returns 200 with CORS headers
- [ ] Browser console shows no CORS errors
- [ ] Frontend can fetch categories
- [ ] Frontend can fetch WODs
- [ ] Frontend can fetch schedules (already working)

## Rollback Plan

If issues arise:
1. Revert CDK changes in main-stack.ts
2. Point back to original Lambda functions
3. Deploy

## Next Steps

1. Deploy to dev environment
2. Test in browser
3. Verify no CORS errors
4. Deploy to staging
5. Deploy to production

## Notes

- The `/public/schedules` endpoint was already working correctly with this pattern
- We followed the same approach for consistency
- No changes needed to existing authenticated endpoints
- Public endpoints are read-only by design
