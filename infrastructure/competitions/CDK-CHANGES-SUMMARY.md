# CDK Infrastructure Changes Summary

## ✅ Changes Made

### 1. **competitions-stack.ts**

#### Added New Lambda Function
```typescript
this.competitionsDddLambda = createBundledLambda(this, 'CompetitionsDddLambda', 'competitions', {
  handler: 'handler-ddd.handler',  // ← New DDD handler
  timeout: cdk.Duration.seconds(30),
  memorySize: 512,  // ← Increased for domain logic
  environment: {
    EVENT_BUS_NAME: this.competitionsEventBus.eventBusName,  // ← Renamed
    // ... other env vars
  },
});
```

#### Added CloudWatch Outputs
```typescript
new cdk.CfnOutput(this, 'CompetitionsDddLambdaName', {
  value: this.competitionsDddLambda.functionName,
  description: 'DDD Lambda function name for monitoring',
});

new cdk.CfnOutput(this, 'CompetitionsEventBusName', {
  value: this.competitionsEventBus.eventBusName,
  description: 'EventBridge bus for domain events',
});
```

#### Granted Permissions
- DynamoDB read/write for both tables
- S3 put for event images
- EventBridge put events
- Organization tables read access

### 2. **competitions-stack.d.ts**

Added type definition:
```typescript
readonly competitionsDddLambda: lambda.Function;
```

### 3. **main-stack.ts**

#### Added New API Gateway Routes
```typescript
// New /competitions-v2 endpoint for DDD handler
const competitionsV2 = networkStack.api.root.addResource('competitions-v2');
competitionsV2.addMethod('ANY', 
  new apigateway.LambdaIntegration(competitionsStack.competitionsDddLambda),
  { authorizer: networkStack.authorizer }
);
competitionsV2.addResource('{proxy+}').addMethod('ANY', 
  new apigateway.LambdaIntegration(competitionsStack.competitionsDddLambda),
  { authorizer: networkStack.authorizer }
);
```

#### Kept Legacy Routes
```typescript
// /competitions → Legacy Lambda
// /events → Legacy Lambda (backward compatibility)
```

## 📊 Resource Comparison

| Resource | Legacy | DDD | Notes |
|----------|--------|-----|-------|
| **Lambda Function** | CompetitionsLambda | CompetitionsDddLambda | Both active |
| **Handler** | index.handler | handler-ddd.handler | Different entry points |
| **Memory** | 256 MB | 512 MB | More for domain logic |
| **Timeout** | 30s | 30s | Same |
| **API Routes** | /competitions, /events | /competitions-v2 | Parallel deployment |
| **EventBridge** | DOMAIN_EVENT_BUS | EVENT_BUS_NAME | Renamed env var |

## 🔄 Deployment Flow

```
┌─────────────────────────────────────────────────────────────┐
│                     API Gateway                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  /competitions      →  CompetitionsLambda (Legacy)          │
│  /competitions-v2   →  CompetitionsDddLambda (New)          │
│  /events            →  CompetitionsLambda (Legacy)          │
│                                                              │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    Lambda Functions                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  CompetitionsLambda          CompetitionsDddLambda          │
│  ├─ index.handler            ├─ handler-ddd.handler         │
│  ├─ 256 MB                   ├─ 512 MB                      │
│  └─ Direct DB access         └─ DDD layers                  │
│                                  ├─ Domain                   │
│                                  ├─ Application              │
│                                  └─ Infrastructure           │
│                                                              │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    Data Layer                                │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  EventsTable                 EventBridge                     │
│  EventDaysTable              ├─ LeaderboardVisibilityChanged│
│  OrganizationEventsTable     ├─ EventPublished              │
│  S3 Event Images             ├─ EventUnpublished            │
│                              └─ EventDeleted                 │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## 🎯 Migration Strategy

### Phase 1: Parallel Deployment (Current)
- ✅ Both Lambdas deployed
- ✅ Legacy routes unchanged
- ✅ New routes at `/competitions-v2`
- ✅ Can test without affecting production

### Phase 2: Gradual Migration
- Update frontend to use `/competitions-v2`
- Monitor metrics and errors
- Compare performance
- Validate domain events

### Phase 3: Full Cutover
- Update `/competitions` to use DDD Lambda
- Update `/events` to use DDD Lambda
- Keep legacy Lambda for rollback

### Phase 4: Cleanup
- Remove legacy Lambda
- Remove `/competitions-v2` routes
- Update documentation

## 📈 Monitoring Setup

### CloudWatch Metrics to Track

1. **Lambda Invocations**
   - CompetitionsLambda vs CompetitionsDddLambda
   - Compare request counts

2. **Lambda Duration**
   - Check if DDD handler is slower
   - Optimize if needed

3. **Lambda Errors**
   - Monitor error rates
   - Alert on spikes

4. **EventBridge Events**
   - Count domain events published
   - Verify event delivery

### CloudWatch Alarms

```typescript
// Add to competitions-stack.ts
new cloudwatch.Alarm(this, 'DddLambdaErrors', {
  metric: this.competitionsDddLambda.metricErrors(),
  threshold: 10,
  evaluationPeriods: 1,
  alarmDescription: 'DDD Lambda error rate too high',
});

new cloudwatch.Alarm(this, 'DddLambdaThrottles', {
  metric: this.competitionsDddLambda.metricThrottles(),
  threshold: 5,
  evaluationPeriods: 1,
  alarmDescription: 'DDD Lambda being throttled',
});
```

## 💰 Cost Impact

### Additional Costs

1. **Lambda Function**
   - ~$0.20 per 1M requests
   - Compute: $0.0000166667 per GB-second
   - With 512MB: ~2x compute cost vs 256MB

2. **EventBridge Events**
   - $1.00 per 1M events
   - Estimated: 4 events per request (create, update, publish, leaderboard)
   - ~$0.004 per 1000 requests

3. **CloudWatch Logs**
   - $0.50 per GB ingested
   - Estimated: 1KB per request
   - ~$0.50 per 1M requests

### Total Estimated Additional Cost
- **Low traffic** (10K requests/month): ~$0.50/month
- **Medium traffic** (100K requests/month): ~$5/month
- **High traffic** (1M requests/month): ~$50/month

### Cost Optimization
- Use Lambda layers for shared code
- Set appropriate log retention (7-30 days)
- Use reserved concurrency if predictable load
- Consider provisioned concurrency for consistent performance

## 🔒 Security Considerations

### IAM Permissions

Both Lambdas have identical permissions:
- ✅ DynamoDB read/write on events tables
- ✅ S3 put on event images bucket
- ✅ EventBridge put events
- ✅ CloudWatch Logs write

### API Gateway Authorization

Both endpoints use Cognito User Pools:
- ✅ JWT token validation
- ✅ User identity in request context
- ✅ Same authorization rules

### EventBridge Security

- ✅ Events published to domain-specific bus
- ✅ Cross-account access disabled by default
- ✅ Event patterns for filtering

## 🧪 Testing Checklist

### Pre-Deployment
- [ ] Run `cdk synth` successfully
- [ ] Review CloudFormation changes
- [ ] Verify IAM permissions
- [ ] Check environment variables

### Post-Deployment
- [ ] Verify Lambda functions exist
- [ ] Test `/competitions-v2` endpoints
- [ ] Verify domain events in EventBridge
- [ ] Check CloudWatch logs
- [ ] Monitor error rates
- [ ] Compare performance metrics

### Integration Testing
- [ ] Create event via new endpoint
- [ ] Update event
- [ ] Publish event
- [ ] Make leaderboard public
- [ ] Verify domain events published
- [ ] Check audit trail

## 📚 Documentation

### Created Files
1. `CDK-DEPLOYMENT-GUIDE.md` - Deployment instructions
2. `CDK-CHANGES-SUMMARY.md` - This file
3. `../../lambda/competitions/README-DDD.md` - DDD architecture
4. `../../lambda/competitions/MIGRATION-GUIDE.md` - Migration steps
5. `../../lambda/competitions/DDD-IMPLEMENTATION-SUMMARY.md` - Implementation details

### Updated Files
1. `competitions-stack.ts` - Added DDD Lambda
2. `competitions-stack.d.ts` - Added type definition
3. `main-stack.ts` - Added API Gateway routes

## 🚀 Deployment Commands

```bash
# Synthesize CloudFormation
cd infrastructure
npm run build
cdk synth

# Deploy to dev
cdk deploy --context stage=dev

# Deploy to staging
cdk deploy --context stage=staging

# Deploy to production (after testing)
cdk deploy --context stage=prod

# Destroy (if needed)
cdk destroy --context stage=dev
```

## 🔍 Verification Commands

```bash
# List Lambda functions
aws lambda list-functions \
  --query 'Functions[?contains(FunctionName, `Competitions`)].[FunctionName,Runtime,MemorySize]' \
  --output table

# Get API Gateway endpoints
aws apigateway get-rest-apis \
  --query 'items[?name==`CalisthenicsAPI`].[id,name]' \
  --output table

# List EventBridge buses
aws events list-event-buses \
  --query 'EventBuses[?contains(Name, `competitions`)].[Name,Arn]' \
  --output table

# Check CloudWatch logs
aws logs tail /aws/lambda/CompetitionsDddLambda --follow
```

## ✨ Benefits of This Approach

1. **Zero Downtime**: Parallel deployment ensures no service interruption
2. **Safe Migration**: Can test thoroughly before switching traffic
3. **Easy Rollback**: Just point API Gateway back to legacy Lambda
4. **Gradual Adoption**: Migrate endpoints one at a time
5. **Complete Audit Trail**: Domain events provide full history
6. **Better Monitoring**: Separate metrics for each handler
7. **Future-Proof**: DDD architecture scales better

## 🎓 Next Steps

1. **Deploy to dev** environment
2. **Test all endpoints** thoroughly
3. **Monitor metrics** for 24-48 hours
4. **Update frontend** to use new endpoints
5. **Deploy to staging** and test
6. **Deploy to production** with monitoring
7. **Gradually migrate** all traffic
8. **Remove legacy handler** after validation

## 📞 Support

For CDK deployment issues:
- Check CloudFormation console for stack events
- Review Lambda logs in CloudWatch
- Verify IAM permissions in IAM console
- Check API Gateway configuration
- Contact DevOps team

---

**Status**: ✅ Ready for deployment  
**Risk Level**: 🟢 Low (parallel deployment)  
**Estimated Deployment Time**: 10-15 minutes  
**Rollback Time**: < 5 minutes
