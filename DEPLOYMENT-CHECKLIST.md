# Deployment Checklist - DDD Implementation

## Pre-Deployment Checklist

### Code Review
- [ ] Review all DDD domain entities
- [ ] Review application service logic
- [ ] Review infrastructure implementations
- [ ] Review Lambda handler code
- [ ] Review unit tests
- [ ] Verify no syntax errors

### CDK Review
- [ ] Review `competitions-stack.ts` changes
- [ ] Review `main-stack.ts` changes
- [ ] Verify environment variables
- [ ] Check IAM permissions
- [ ] Review CloudWatch outputs

### Documentation Review
- [ ] Read `README-DDD.md`
- [ ] Read `MIGRATION-GUIDE.md`
- [ ] Read `CDK-DEPLOYMENT-GUIDE.md`
- [ ] Understand business rules
- [ ] Understand domain events

## Deployment Steps

### Step 1: Build & Synthesize
```bash
cd infrastructure
npm run build
cdk synth
```
- [ ] Build completes successfully
- [ ] No TypeScript errors
- [ ] CloudFormation template generated
- [ ] Review template changes

### Step 2: Deploy to Dev
```bash
cdk deploy --context stage=dev
```
- [ ] Deployment starts
- [ ] CloudFormation stack updates
- [ ] No errors during deployment
- [ ] Stack status: UPDATE_COMPLETE

### Step 3: Verify Resources
```bash
# Check Lambda functions
aws lambda list-functions --query 'Functions[?contains(FunctionName, `Competitions`)]'

# Check API Gateway
aws apigateway get-rest-apis

# Check EventBridge
aws events list-event-buses --query 'EventBuses[?contains(Name, `competitions`)]'
```
- [ ] CompetitionsLambda exists
- [ ] CompetitionsDddLambda exists
- [ ] API Gateway has /competitions-v2 route
- [ ] EventBridge bus exists

### Step 4: Test New Endpoints

#### Test 1: Create Event
```bash
curl -X POST https://api.example.com/competitions-v2 \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Event",
    "startDate": "2025-06-01",
    "endDate": "2025-06-03",
    "location": "Test Location",
    "description": "Test Description",
    "organizationId": "org-123"
  }'
```
- [ ] Returns 201 Created
- [ ] Event created in DynamoDB
- [ ] Response includes eventId

#### Test 2: Publish Event
```bash
curl -X POST https://api.example.com/competitions-v2/evt-123/publish \
  -H "Authorization: Bearer $TOKEN"
```
- [ ] Returns 200 OK
- [ ] Event published = true
- [ ] Domain event emitted

#### Test 3: Make Leaderboard Public
```bash
curl -X POST https://api.example.com/competitions-v2/evt-123/leaderboard/public \
  -H "Authorization: Bearer $TOKEN"
```
- [ ] Returns 200 OK
- [ ] publicLeaderboard = true
- [ ] Domain event emitted

#### Test 4: Try Invalid Operation
```bash
# Try to make leaderboard public for unpublished event
curl -X POST https://api.example.com/competitions-v2/evt-456/leaderboard/public \
  -H "Authorization: Bearer $TOKEN"
```
- [ ] Returns 400 or 500 with error message
- [ ] Error: "Cannot make leaderboard public for unpublished event"

### Step 5: Verify Domain Events
```bash
# Check EventBridge for events
aws events list-rules --event-bus-name competitions-domain-dev

# View CloudWatch logs
aws logs tail /aws/lambda/CompetitionsDddLambda-dev --follow
```
- [ ] EventBridge rules exist
- [ ] Domain events visible in logs
- [ ] Events have correct structure

### Step 6: Monitor Metrics
```bash
# Check Lambda metrics
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name Invocations \
  --dimensions Name=FunctionName,Value=CompetitionsDddLambda-dev \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Sum
```
- [ ] Invocations recorded
- [ ] No errors
- [ ] Duration acceptable
- [ ] No throttles

## Post-Deployment Verification

### Functional Tests
- [ ] Create event works
- [ ] Update event works
- [ ] Publish event works
- [ ] Unpublish event works
- [ ] Make leaderboard public works
- [ ] Make leaderboard private works
- [ ] Delete event works
- [ ] Get event works
- [ ] List events works

### Business Rules Tests
- [ ] Cannot make leaderboard public for unpublished event
- [ ] Unpublishing makes leaderboard private
- [ ] Date validation works
- [ ] Required fields validation works

### Domain Events Tests
- [ ] LeaderboardVisibilityChanged emitted
- [ ] EventPublished emitted
- [ ] EventUnpublished emitted
- [ ] EventDeleted emitted
- [ ] Events have correct structure
- [ ] Events include userId

### Performance Tests
- [ ] Response time < 1 second
- [ ] Cold start < 3 seconds
- [ ] No memory issues
- [ ] No timeout issues

### Security Tests
- [ ] Authentication required
- [ ] Authorization works
- [ ] CORS configured
- [ ] No sensitive data in logs

## Frontend Integration

### Update API Calls
- [ ] Update event creation to use /competitions-v2
- [ ] Update event update to use /competitions-v2
- [ ] Update publish/unpublish to use new endpoints
- [ ] Update leaderboard visibility to use new endpoints
- [ ] Test all frontend flows

### Frontend Tests
- [ ] Create event from UI
- [ ] Edit event from UI
- [ ] Toggle publicLeaderboard checkbox
- [ ] Publish event from UI
- [ ] View public event detail
- [ ] Verify leaderboard visibility

## Monitoring Setup

### CloudWatch Dashboards
- [ ] Create dashboard for DDD Lambda
- [ ] Add invocation metrics
- [ ] Add error metrics
- [ ] Add duration metrics
- [ ] Add throttle metrics

### CloudWatch Alarms
- [ ] Create alarm for errors > 10
- [ ] Create alarm for throttles > 5
- [ ] Create alarm for duration > 5s
- [ ] Test alarm notifications

### CloudWatch Logs Insights
- [ ] Save query for domain events
- [ ] Save query for errors
- [ ] Save query for performance
- [ ] Test queries work

## Staging Deployment

### Deploy to Staging
```bash
cdk deploy --context stage=staging
```
- [ ] Deployment successful
- [ ] All tests pass
- [ ] Performance acceptable
- [ ] No errors

### User Acceptance Testing
- [ ] Product owner tests
- [ ] QA team tests
- [ ] Stakeholder review
- [ ] Sign-off received

## Production Deployment

### Pre-Production Checklist
- [ ] All staging tests passed
- [ ] Performance benchmarks met
- [ ] Security review completed
- [ ] Documentation updated
- [ ] Team trained
- [ ] Rollback plan ready

### Deploy to Production
```bash
cdk deploy --context stage=prod
```
- [ ] Deployment successful
- [ ] Smoke tests pass
- [ ] Monitoring active
- [ ] No immediate errors

### Post-Production Monitoring
- [ ] Monitor for 1 hour
- [ ] Check error rates
- [ ] Check performance
- [ ] Check domain events
- [ ] Verify user reports

## Migration to DDD Handler

### Week 1: Parallel Running
- [ ] Both handlers running
- [ ] Monitor metrics
- [ ] Compare performance
- [ ] No issues reported

### Week 2: Gradual Migration
- [ ] Route 10% to DDD handler
- [ ] Monitor for 24 hours
- [ ] Route 50% to DDD handler
- [ ] Monitor for 24 hours

### Week 3: Full Migration
- [ ] Route 100% to DDD handler
- [ ] Monitor for 48 hours
- [ ] Update /competitions route
- [ ] Update /events route

### Week 4: Cleanup
- [ ] Remove legacy handler
- [ ] Remove /competitions-v2 route
- [ ] Update documentation
- [ ] Archive old code

## Rollback Procedures

### If Issues Found
1. [ ] Identify issue in CloudWatch logs
2. [ ] Determine if rollback needed
3. [ ] Execute rollback if necessary

### Rollback Steps
```bash
# Option 1: Point API Gateway back to legacy
# Update main-stack.ts and redeploy

# Option 2: Full CDK rollback
git checkout HEAD~1 infrastructure/
cdk deploy --context stage=prod
```
- [ ] Rollback executed
- [ ] Service restored
- [ ] Users notified
- [ ] Post-mortem scheduled

## Success Criteria

### Technical
- [ ] All tests passing
- [ ] No errors in production
- [ ] Performance within SLA
- [ ] Domain events working
- [ ] Monitoring active

### Business
- [ ] Organizers can control leaderboard visibility
- [ ] Spectators can view public leaderboards
- [ ] Audit trail complete
- [ ] User satisfaction high

### Operational
- [ ] Team trained
- [ ] Documentation complete
- [ ] Monitoring setup
- [ ] Runbooks updated

## Sign-Off

### Development Team
- [ ] Code reviewed
- [ ] Tests passed
- [ ] Documentation complete
- Signed: _________________ Date: _______

### DevOps Team
- [ ] Infrastructure reviewed
- [ ] Deployment successful
- [ ] Monitoring active
- Signed: _________________ Date: _______

### Product Owner
- [ ] Features verified
- [ ] User acceptance passed
- [ ] Ready for production
- Signed: _________________ Date: _______

### QA Team
- [ ] All tests passed
- [ ] No critical bugs
- [ ] Performance acceptable
- Signed: _________________ Date: _______

---

**Deployment Status**: ⏳ Pending  
**Target Date**: __________  
**Deployed By**: __________  
**Deployment Time**: __________  
**Issues Found**: __________  
**Resolution**: __________
