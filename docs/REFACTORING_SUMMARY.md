# CDK Stack Refactoring Summary

## Overview
Refactored monolithic CDK stack into DDD-compliant bounded context stacks following serverless microservices best practices.

## Changes Made

### 1. Infrastructure Organization

#### Before (Monolithic)
```
lib/
└── calisthenics-app-stack.ts  (2000+ lines, all resources)
```

#### After (Bounded Contexts) ✅ COMPLETE
```
infrastructure/
├── shared/
│   ├── shared-stack.ts          # Cognito, EventBridge, S3
│   ├── network-stack.ts         # API Gateway, Authorizer
│   ├── lambda-layer.ts          # Shared utilities layer
│   └── event-routing.ts         # Cross-domain events
├── organizations/
│   └── organizations-stack.ts   # Organizations domain ✅
├── competitions/
│   └── competitions-stack.ts    # Competitions domain ✅
├── athletes/
│   └── athletes-stack.ts        # Athletes domain ✅
├── scoring/
│   └── scoring-stack.ts         # Scoring domain ✅
├── scheduling/
│   └── scheduling-stack.ts      # Scheduling domain ✅
├── categories/
│   └── categories-stack.ts      # Categories domain ✅
├── wods/
│   └── wods-stack.ts           # WODs domain ✅
├── authorization/
│   └── authorization-stack.ts   # Legacy auth ✅
├── frontend/
│   └── frontend-stack.ts        # S3 + CloudFront ✅
└── main-stack.ts                # Orchestrator ✅
```

### 2. Bounded Context Isolation

#### Shared Stack
- **Resources**: Cognito User Pool, EventBridge Bus, S3 Buckets
- **Purpose**: Cross-cutting infrastructure
- **Dependencies**: None

#### Network Stack
- **Resources**: API Gateway, Cognito Authorizer
- **Purpose**: API routing and authentication
- **Dependencies**: Shared Stack (Cognito)

#### Organizations Stack
- **Tables**: Organizations, OrganizationMembers, OrganizationEvents
- **Lambda**: organizations.handler
- **Purpose**: Multi-tenant RBAC foundation
- **Dependencies**: Network Stack

#### Competitions Stack
- **Tables**: Events, EventDays
- **Lambda**: competitions.handler
- **Purpose**: Event management
- **Dependencies**: Organizations Stack (for RBAC)
- **Cross-domain access**: Read-only to OrganizationMembers (authorization)

### 3. Deployment Order

```
1. SharedStack        → Foundation (Cognito, EventBridge, S3)
2. NetworkStack       → API Gateway + Authorizer
3. OrganizationsStack → RBAC foundation
4. Domain Stacks      → Independent deployment possible
```

### 4. DDD Principles Applied

#### Bounded Context Enforcement
- ✅ Each stack owns its tables and Lambda functions
- ✅ No direct cross-domain table writes
- ✅ EventBridge-first communication (domain buses + central bus)
- ✅ Read-only access for authorization checks

#### Event-Driven Architecture
Each domain has:
- **Domain Event Bus**: For domain-specific events (e.g., `competitions-domain-dev`)
- **Central Event Bus**: For cross-domain event aggregation (`athleon-central-dev`)

**Cross-Domain Event Routing:**
```
Competitions → competitionsEventBus → EventCreated
                      ↓
               Event Routing Rules
                      ↓
      ┌───────────────┼───────────────┐
      ↓               ↓               ↓
athletesEventBus  schedulingEventBus  centralEventBus
```

**Domain Events:**
- `competitions.domain`: EventCreated, EventPublished, EventDeleted
- `organizations.domain`: MemberAdded, MemberRemoved, RoleChanged
- `athletes.domain`: AthleteRegistered, AthleteUnregistered
- `scoring.domain`: ScoreSubmitted, ScoreCalculated
- `scheduling.domain`: ScheduleGenerated, SchedulePublished

### 5. Stack Props Pattern

Each domain stack receives:
```typescript
interface DomainStackProps {
  stage: string;                              // Environment
  api: apigateway.RestApi;                    // Shared API Gateway
  authorizer: CognitoUserPoolsAuthorizer;     // Shared authorizer
  eventBus: events.EventBus;                  // EventBridge bus
  // Cross-domain tables (read-only for auth)
  organizationMembersTable?: dynamodb.Table;
  organizationEventsTable?: dynamodb.Table;
}
```

### 6. IAM Permissions Pattern

```typescript
// ✅ Own tables: Read/Write
this.eventsTable.grantReadWriteData(competitionsLambda);
this.eventDaysTable.grantReadWriteData(competitionsLambda);

// ✅ Cross-domain: Read-only for authorization
props.organizationMembersTable.grantReadData(competitionsLambda);

// ✅ Shared resources
props.eventBus.grantPutEventsTo(competitionsLambda);
props.eventImagesBucket.grantPut(competitionsLambda);

// ❌ Violation: Writing to other domain's table
// props.scoresTable.grantReadWriteData(competitionsLambda);
```

## Benefits

### 1. Independent Deployment
- Deploy domains independently without affecting others
- Faster deployment cycles
- Reduced blast radius for changes

### 2. Team Scalability
- Teams can own specific bounded contexts
- Parallel development without conflicts
- Clear ownership boundaries

### 3. Better Separation of Concerns
- Each stack has single responsibility
- Easier to understand and maintain
- Reduced cognitive load

### 4. Improved Testability
- Test domains in isolation
- Mock cross-domain dependencies
- Faster test execution

### 5. Cost Optimization
- Deploy only changed stacks
- Easier to track costs per domain
- Optimize resources per domain

## Migration Path

### Phase 1: Infrastructure (COMPLETED ✅)
- ✅ Create shared infrastructure stacks
- ✅ Create Organizations stack (RBAC foundation)
- ✅ Create Competitions stack
- ✅ Create Athletes stack
- ✅ Create Scoring stack
- ✅ Create Scheduling stack
- ✅ Create Categories stack
- ✅ Create WODs stack
- ✅ Create Authorization stack
- ✅ Create Frontend stack
- ✅ Update Amazon Q rules

### Phase 2: Lambda Code Organization (PARTIAL)
- ✅ Created domain package directories
- ✅ Moved Lambda handlers to domain packages
- ✅ Updated CDK stacks to reference domain packages
- 🔄 Lambda layer migration (infrastructure exists, usage incomplete)

### Phase 3: EventBridge Integration (PARTIAL)
- ✅ Domain event buses created
- ✅ Event routing infrastructure
- 🔄 Domain event publishers (scoring implemented, others pending)
- 🔄 Cross-domain event handlers

### Phase 4: Security Implementation (CRITICAL GAPS)
- ❌ WODs service RBAC authorization
- ❌ Categories service organization validation
- 🔄 Scores service role-based validation

## Amazon Q Rules Updated

### 1. Bounded Context Enforcement
- Updated with new stack structure
- Added strict rules for table access
- Defined allowed cross-context patterns

### 2. CDK Stack Organization (NEW)
- Stack naming conventions
- Props pattern
- Deployment order
- Environment variables pattern
- API integration pattern

### 3. Twelve Factor DDD Microservices
- Updated stack organization section
- Clarified DDD principles
- Added microservices design patterns

## Deployment Commands

### Deploy All (First Time)
```bash
cd /home/labvel/projects/athleon/web_app_athleon
cdk deploy --all --profile labvel-dev
```

### Deploy Single Stack
```bash
cdk deploy Athleon/Shared --profile labvel-dev
cdk deploy Athleon/Network --profile labvel-dev
cdk deploy Athleon/Organizations --profile labvel-dev
cdk deploy Athleon/Competitions --profile labvel-dev
```

### Destroy All
```bash
cdk destroy --all --profile labvel-dev --force
```

## Next Steps

1. **Complete Remaining Stacks**: Athletes, Scoring, Scheduling, Categories, WODs
2. **Refactor Lambda Code**: Organize by domain with proper package structure
3. **Implement EventBridge**: Add event publishers and handlers
4. **Add Tests**: Unit and integration tests per domain
5. **CI/CD Setup**: Automated deployment pipelines
6. **Documentation**: API docs, architecture diagrams
7. **Monitoring**: CloudWatch dashboards per domain

## Notes

- **NOT DEPLOYED YET**: This is a refactoring exercise, no deployment has been made
- **Backward Compatible**: Old monolithic stack still exists in `lib/`
- **Gradual Migration**: Can migrate domains one at a time
- **Testing Required**: Thorough testing before production deployment
