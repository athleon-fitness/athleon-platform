# Lambda Layer Refactor - Shared Utilities

## 🎯 **Problem Identified**

Each Lambda domain had its own `shared/` folder with **duplicated code**:

```
lambda/
├── scoring/shared/utils/auth.js     # Different implementation
├── organizations/shared/utils/auth.js # Different implementation  
├── competitions/shared/utils/auth.js  # Different implementation
├── shared/utils/auth.js              # Legacy implementation
└── ...
```

### **Why Different Implementations?**

1. **Legacy Authorization Service** (Main shared/)
   - External HTTP calls to authorization service
   - Permission caching
   - Complex RBAC system

2. **Direct DynamoDB RBAC** (Domain shared/)
   - Direct DynamoDB queries
   - Organization-based access control
   - Faster, simpler implementation

## ✅ **Solution: Unified Lambda Layer**

### **1. Created Lambda Layer Structure**
```
layers/athleon-shared/
└── nodejs/
    ├── package.json
    └── utils/
        ├── auth.js      # Unified auth implementation
        └── logger.js    # Structured logging
```

### **2. Unified Auth Implementation**
```javascript
// /opt/nodejs/utils/auth.js (Lambda Layer)
const { verifyToken, isSuperAdmin, checkOrganizationAccess } = require('/opt/nodejs/utils/auth');

// Features:
- JWT token verification
- Super admin detection (admin@athleon.fitness)
- Organization membership checks
- Event organization lookup
```

### **3. CDK Integration**
```typescript
// infrastructure/shared/lambda-layer.ts
export class AthleonSharedLayer extends Construct {
  public readonly layer: lambda.LayerVersion;
  
  constructor(scope: Construct, id: string, props: AthleonSharedLayerProps) {
    this.layer = new lambda.LayerVersion(this, 'AthleonSharedLayer', {
      layerVersionName: `athleon-shared-${props.stage}`,
      code: lambda.Code.fromAsset('layers/athleon-shared'),
      compatibleRuntimes: [lambda.Runtime.NODEJS_18_X, lambda.Runtime.NODEJS_20_X],
    });
  }
}
```

### **4. Lambda Function Updates**
```typescript
// Before
code: lambda.Code.fromAsset('lambda/scoring'),

// After  
code: lambda.Code.fromAsset('lambda/scoring'),
layers: [props.sharedLayer.layer],
```

## 🔄 **Migration Steps**

### **1. Update Lambda Code**
```javascript
// Before (local shared folder)
const { verifyToken } = require('../shared/utils/auth');
const logger = require('../shared/utils/logger');

// After (Lambda Layer)
const { verifyToken } = require('/opt/nodejs/utils/auth');
const logger = require('/opt/nodejs/utils/logger');
```

### **2. Update CDK Stacks**
```typescript
// Add to stack props
export interface DomainStackProps {
  sharedLayer: AthleonSharedLayer;
}

// Add to Lambda functions
layers: [props.sharedLayer.layer],
```

### **3. Remove Duplicated Folders**
```bash
./scripts/cleanup-shared-folders.sh
```

## 📊 **Benefits**

### **Before Refactor**
- ❌ **8 duplicated shared folders** (one per domain)
- ❌ **Different auth implementations** causing inconsistency
- ❌ **Larger deployment packages** (shared code in each Lambda)
- ❌ **Maintenance overhead** (update 8 places for changes)

### **After Refactor**
- ✅ **Single source of truth** for shared utilities
- ✅ **Consistent auth implementation** across all domains
- ✅ **Smaller Lambda packages** (shared code in layer)
- ✅ **Easier maintenance** (update once, deploy everywhere)
- ✅ **Faster cold starts** (layer cached by AWS)
- ✅ **Version control** for shared utilities

## 🚀 **Deployment**

### **1. Deploy Layer**
```bash
cd /home/labvel/projects/athleon/web_app_athleon
cdk deploy Athleon --profile labvel-dev
```

### **2. Verify Layer**
```bash
aws lambda list-layers --profile labvel-dev --region us-east-2
```

### **3. Test Lambda Functions**
```bash
# Test that functions can import from layer
aws lambda invoke --function-name AthleonScoresLambda --payload '{}' response.json --profile labvel-dev
```

## 📋 **Migration Checklist**

### **Completed**
- ✅ Created unified Lambda layer structure
- ✅ Implemented unified auth utilities
- ✅ Updated CDK shared stack with layer
- ✅ Updated scoring stack to use layer
- ✅ Updated scoring Lambda to import from layer
- ✅ Created cleanup script for duplicated folders

### **TODO**
- [ ] Update all remaining domain stacks to use layer
- [ ] Update all Lambda functions to import from layer
- [ ] Remove duplicated shared folders
- [ ] Test all Lambda functions
- [ ] Deploy and verify

## 🔧 **Layer Contents**

### **auth.js**
```javascript
verifyToken(event)              // Extract JWT claims
isSuperAdmin(userEmail)         // Check super admin status  
checkOrganizationAccess(...)    // Verify org membership
getEventOrganization(eventId)   // Get event's organization
```

### **logger.js**
```javascript
logger.info(message, data)      // Structured info logging
logger.error(message, error)    // Structured error logging
logger.warn(message, data)      // Structured warning logging
```

## 💡 **Best Practices**

1. **Layer Versioning**: Each deployment creates new layer version
2. **Backward Compatibility**: Keep layer API stable
3. **Size Limits**: Layer + function code < 250MB unzipped
4. **Runtime Compatibility**: Support Node.js 18.x and 20.x
5. **Import Paths**: Always use `/opt/nodejs/` prefix

## 🎯 **Next Steps**

1. **Complete Migration**: Update all remaining Lambda functions
2. **Remove Duplicates**: Run cleanup script to remove shared folders  
3. **Add More Utilities**: Extend layer with common functions
4. **Monitoring**: Add CloudWatch metrics for layer usage
5. **Documentation**: Update all Lambda READMEs with layer usage

This refactor eliminates code duplication, ensures consistency, and provides a foundation for shared utilities across all Athleon Lambda functions! 🚀
