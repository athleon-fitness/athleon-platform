# CDK Deployment Guide - DDD Implementation

## Overview

This guide explains how to deploy the new DDD-aligned Lambda function alongside the legacy handler for safe migration.

## What Changed in CDK

### 1. Competitions Stack (`competitions-stack.ts`)

**Added:**
- `competitionsDddLambda` - New Lambda function using `handler-ddd.handler`
- Increased memory to 512MB for domain logic processing
- Proper environment variable naming (`EVENT_BUS_NAME` instead of `DOMAIN_EVENT_BUS`)
- CloudWatch outputs for monitoring

**Kept:**
- `competitionsLambda` - Legacy handler for backward compatibility
- All existing tables and permissions
- EventBridge bus configuration

### 2. Main Stack (`main-stack.ts`)

**Added:**
- `/competitions-v2` API Gateway resource
- Routes to new DDD Lambda function
- Parallel deployment strategy

**Kept:**
- `/competitions` routes to legacy Lambda
- `/events` routes to legacy Lambda (backward compatibility)

## Deployment Strategy

### Phase 1: Parallel Deployment (Current)

Both handlers run side-by-side:

```
/competitions      → Legacy Lambda (index.handler)
/competitions-v2   → DDD Lambda (handler-ddd.handler)
/events            → Legacy Lambda (backward compatibility)
```

### Phase 2: Full Migration (Future)

After testing and validation:

```
/competitions      → DDD Lambda (handler-ddd.handler)
/events            → DDD Lambda (handler-ddd.handler)
```

## Deployment Steps

### Prerequisites

```bash
# Install dependencies
npm install

# Ensure AWS credentials are configured
aws configure
```

### Step 1: Synthesize CloudFormation

```bash
cd infrastructure
npm run build
cdk synth
```

This will generate CloudFormation templates. Review the changes:
- New Lambda function: `CompetitionsDddLambda`
- New API Gateway resources: `/competitions-v2`
- New IAM permissions

### Step 2: Deploy to Dev/Staging

```bash
# Deploy to dev environment
cdk deploy --context stage=dev

# Or deploy specific stack
cdk deploy CalisthenicsStack-dev --context stage=dev
```

### Step 3: Verify Deployment

```bash
# Check Lambda functions
aws lambda list-functions --query 'Functions[?contains(FunctionName, `Competitions`)]'

# Check API Gateway endpoints
aws apigateway get-rest-apis

# Check EventBridge bus
aws events list-event-buses --query 'EventBuses[?contains(Name, `competitions`)]'
```

### Step 4: Test New Endpoint

```bash
# Get API URL from CDK output
API_URL=$(aws cloudformation describe-stacks \
  --stack-name CalisthenicsStack-dev \
  --query 'Stacks[0].Outputs[?OutputKey==`ApiUrl`].OutputValue' \
  --output text)

# Test legacy endpoint
curl -X GET "$API_URL/competitions" \
  -H "Authorization: Bearer $TOKEN"

# Test new DDD endpoint
curl -X GET "$API_URL/competitions-v2" \
  -H "Authorization: Bearer $TOKEN"
```

### Step 5: Monitor Domain Events

```bash
# Get EventBridge bus name from CDK output
EVENT_BUS=$(aws cloudformation describe-stacks \
  --stack-name CalisthenicsStack-dev \
  --query 'Stacks[0].Outputs[?OutputKey==`CompetitionsEventBusName`].OutputValue' \
  --output text)

# Create test rule to log all events
aws events put-rule \
  --name test-competitions-events \
  --event-bus-name $EVENT_BUS \
  --event-pattern '{"source":["competitions.event"]}'

# View events in CloudWatch Logs
aws logs tail /aws/events/test-competitions-events --follow
```

## Environment Variables

### Legacy Lambda
```
EVENTS_TABLE
EVENT_DAYS_TABLE
EVENT_IMAGES_BUCKET
ORGANIZATION_EVENTS_TABLE
ORGANIZATION_MEMBERS_TABLE
SCORING_SYSTEMS_TABLE
DOMAIN_EVENT_BUS
CENTRAL_EVENT_BUS
```

### DDD Lambda
```
EVENTS_TABLE
EVENT_DAYS_TABLE
EVENT_IMAGES_BUCKET
ORGANIZATION_EVENTS_TABLE
ORGANIZATION_MEMBERS_TABLE
SCORING_SYSTEMS_TABLE
EVENT_BUS_NAME          ← Changed from DOMAIN_EVENT_BUS
CENTRAL_EVENT_BUS
```

## Monitoring

### CloudWatch Dashboards

Create a dashboard to compare both handlers:

```typescript
// Add to main-stack.ts
const dashboard = new cloudwatch.Dashboard(this, 'CompetitionsDashboard', {
  dashboardName: `competitions-${props.stage}`,
});

dashboard.addWidgets(
  new cloudwatch.GraphWidget({
    title: 'Lambda Invocations',
    left: [
      competitionsStack.competitionsLambda.metricInvocations(),
      competitionsStack.competitionsDddLambda.metricInvocations(),
    ],
  }),
  new cloudwatch.GraphWidget({
    title: 'Lambda Errors',
    left: [
      competitionsStack.competitionsLambda.metricErrors(),
      competitionsStack.competitionsDddLambda.metricErrors(),
    ],
  }),
  new cloudwatch.GraphWidget({
    title: 'Lambda Duration',
    left: [
      competitionsStack.competitionsLambda.metricDuration(),
      competitionsStack.competitionsDddLambda.metricDuration(),
    ],
  })
);
```

### CloudWatch Logs Insights

Query domain events:

```sql
fields @timestamp, detail.eventType, detail.eventId, detail.changedBy
| filter @message like /LeaderboardVisibilityChanged/
| sort @timestamp desc
| limit 100
```

Query errors:

```sql
fields @timestamp, @message
| filter @message like /ERROR/
| sort @timestamp desc
| limit 50
```

## Cost Considerations

### Additional Resources

- **Lambda Function**: ~$0.20 per 1M requests + compute time
- **EventBridge Events**: $1.00 per 1M events
- **CloudWatch Logs**: $0.50 per GB ingested

### Optimization Tips

1. **Use Lambda Layers** for shared dependencies
2. **Enable X-Ray** only in dev/staging
3. **Set appropriate log retention** (7-30 days)
4. **Use reserved concurrency** if needed

## Rollback Plan

### Quick Rollback (API Gateway)

Update API Gateway to point back to legacy Lambda:

```bash
# This requires manual API Gateway update or CDK change
# Revert main-stack.ts changes and redeploy
```

### Full Rollback (CDK)

```bash
# Checkout previous commit
git checkout HEAD~1 infrastructure/

# Redeploy
cdk deploy --context stage=dev
```

## Migration Checklist

- [ ] Deploy to dev environment
- [ ] Test all endpoints on `/competitions-v2`
- [ ] Verify domain events in EventBridge
- [ ] Monitor CloudWatch metrics for 24 hours
- [ ] Update frontend to use `/competitions-v2`
- [ ] Test in staging environment
- [ ] Deploy to production
- [ ] Monitor production for 1 week
- [ ] Switch `/competitions` to DDD handler
- [ ] Remove legacy Lambda function

## Troubleshooting

### Issue: Lambda timeout

**Solution:** Increase timeout in `competitions-stack.ts`:

```typescript
timeout: cdk.Duration.seconds(60), // Increased from 30
```

### Issue: Domain events not appearing

**Solution:** Check EventBridge permissions:

```bash
aws lambda get-policy --function-name CompetitionsDddLambda
```

### Issue: DynamoDB throttling

**Solution:** Check table metrics and consider on-demand billing:

```typescript
billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
```

## Next Steps

1. **Deploy to dev** and test thoroughly
2. **Update frontend** to use new endpoints
3. **Monitor metrics** and domain events
4. **Gradually migrate** traffic to DDD handler
5. **Remove legacy handler** after successful migration

## Support

For deployment issues:
- Check CloudFormation stack events
- Review Lambda logs in CloudWatch
- Verify IAM permissions
- Contact DevOps team

## References

- [AWS CDK Documentation](https://docs.aws.amazon.com/cdk/)
- [Lambda Best Practices](https://docs.aws.amazon.com/lambda/latest/dg/best-practices.html)
- [EventBridge Documentation](https://docs.aws.amazon.com/eventbridge/)
- [DDD Implementation Guide](./README-DDD.md)
- [Migration Guide](../../lambda/competitions/MIGRATION-GUIDE.md)
