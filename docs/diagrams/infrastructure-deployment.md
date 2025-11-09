# Infrastructure Deployment Architecture

## CDK Stack Deployment Flow

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                            CDK Deployment Pipeline                             │
└─────────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              1. Foundation Layer                               │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐            │
│  │  SharedStack    │    │  NetworkStack   │    │ FrontendStack   │            │
│  │                 │    │                 │    │                 │            │
│  │ • Cognito       │    │ • API Gateway   │    │ • S3 Bucket     │            │
│  │ • EventBridge   │    │ • Authorizer    │    │ • CloudFront    │            │
│  │ • S3 Buckets    │    │ • Custom Domain │    │ • ACM Cert      │            │
│  │ • Lambda Layer  │    │ • CORS Config   │    │ • Route 53      │            │
│  └─────────────────┘    └─────────────────┘    └─────────────────┘            │
│           │                       │                       │                   │
│           └───────────────────────┼───────────────────────┘                   │
│                                   │                                           │
└───────────────────────────────────┼───────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              2. RBAC Foundation                                │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                        OrganizationsStack                               │   │
│  │                                                                         │   │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐        │   │
│  │  │ Organizations   │  │ Organization    │  │ Organization    │        │   │
│  │  │     Table       │  │  Members Table  │  │  Events Table   │        │   │
│  │  │                 │  │                 │  │                 │        │   │
│  │  │ • Multi-tenant  │  │ • RBAC Roles    │  │ • Event Links   │        │   │
│  │  │ • Isolation     │  │ • Permissions   │  │ • Ownership     │        │   │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────┘        │   │
│  │                                                                         │   │
│  │  ┌─────────────────────────────────────────────────────────────────┐   │   │
│  │  │                   Organizations Lambda                          │   │   │
│  │  │                                                                 │   │   │
│  │  │  • Organization CRUD                                            │   │   │
│  │  │  • Member management                                            │   │   │
│  │  │  • Role assignment                                              │   │   │
│  │  │  • Authorization foundation                                     │   │   │
│  │  └─────────────────────────────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              3. Domain Services                                │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐                │
│  │ CompetitionsStack│  │  AthletesStack  │  │  ScoringStack   │                │
│  │                 │  │                 │  │                 │                │
│  │ • Events Table  │  │ • Athletes Table│  │ • Scores Table  │                │
│  │ • EventDays     │  │ • Registrations │  │ • Scoring Sys   │                │
│  │ • S3 Images     │  │ • Profiles      │  │ • Exercises     │                │
│  │ • Event Lambda  │  │ • Athletes λ    │  │ • Leaderboards  │                │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘                │
│                                                                                 │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐                │
│  │ SchedulingStack │  │ CategoriesStack │  │   WodsStack     │                │
│  │                 │  │                 │  │                 │                │
│  │ • Schedules     │  │ • Categories    │  │ • WODs Table    │                │
│  │ • Heats         │  │ • Event Links   │  │ • Templates     │                │
│  │ • Filters       │  │ • Age Groups    │  │ • Sharing       │                │
│  │ • Scheduler λ   │  │ • Categories λ  │  │ • WODs Lambda   │                │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘                │
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                        AuthorizationStack                               │   │
│  │                                                                         │   │
│  │  • Legacy authorization service                                         │   │
│  │  • Permission caching                                                   │   │
│  │  • External auth integration                                            │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                            4. Cross-Domain Events                              │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                          EventRouting                                   │   │
│  │                                                                         │   │
│  │  Central EventBridge Bus                                                │   │
│  │  ┌─────────────────────────────────────────────────────────────────┐   │   │
│  │  │                                                                 │   │   │
│  │  │  competitions-domain-{stage} ──┐                                │   │   │
│  │  │  organizations-domain-{stage} ──┤                                │   │   │
│  │  │  athletes-domain-{stage} ───────┼→ athleon-central-{stage}  │   │   │
│  │  │  scoring-domain-{stage} ────────┤                                │   │   │
│  │  │  scheduling-domain-{stage} ─────┘                                │   │   │
│  │  │                                                                 │   │   │
│  │  └─────────────────────────────────────────────────────────────────┘   │   │
│  │                                                                         │   │
│  │  Event Types:                                                           │   │
│  │  • OrganizationCreated, MemberAdded                                     │   │
│  │  • EventCreated, EventPublished                                         │   │
│  │  • AthleteRegistered, ScoreSubmitted                                    │   │
│  │  • ScheduleGenerated, LeaderboardUpdated                                │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## API Gateway Integration

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                            API Gateway Routing                                │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  Custom Domain: api.{environment}.athleon.fitness                              │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                                                                         │   │
│  │  /organizations/*     → OrganizationsLambda                             │   │
│  │  /competitions/*      → CompetitionsLambda                              │   │
│  │  /events/*           → CompetitionsLambda (alias)                       │   │
│  │  /athletes/*         → AthletesLambda                                    │   │
│  │  /scores             → ScoringLambda                                     │   │
│  │  /exercises          → ExercisesLambda                                   │   │
│  │  /categories/*       → CategoriesLambda                                  │   │
│  │  /wods/*             → WodsLambda                                        │   │
│  │  /scheduler/*        → SchedulingLambda                                  │   │
│  │  /authorization/*    → AuthorizationLambda                               │   │
│  │                                                                         │   │
│  │  Public Endpoints (No Auth):                                            │   │
│  │  /public/events      → CompetitionsLambda                               │   │
│  │  /public/wods        → WodsLambda                                        │   │
│  │                                                                         │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
│  Authentication: Cognito User Pool Authorizer                                  │
│  CORS: Environment-specific origins                                             │
│  Rate Limiting: WAF (Production only)                                          │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## Lambda Layer Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                            Lambda Layer Structure                              │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                      AthleonSharedLayer                                 │   │
│  │                                                                         │   │
│  │  /opt/nodejs/utils/                                                     │   │
│  │  ├── auth.js          → JWT verification, RBAC, super admin            │   │
│  │  ├── logger.js        → Structured logging (info, error, warn)         │   │
│  │  └── calculator.js    → Score calculation engine                       │   │
│  │                                                                         │   │
│  │  /opt/nodejs/test/                                                      │   │
│  │  └── helpers.js       → Test utilities and mocks                       │   │
│  │                                                                         │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                    │                                           │
│                                    │ Used by all Lambda functions             │
│                                    ▼                                           │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                        Domain Lambda Functions                          │   │
│  │                                                                         │   │
│  │  const { verifyToken } = require('/opt/nodejs/utils/auth');             │   │
│  │  const logger = require('/opt/nodejs/utils/logger');                    │   │
│  │                                                                         │   │
│  │  Benefits:                                                              │   │
│  │  • Single source of truth for shared utilities                          │   │
│  │  • Consistent authentication across all domains                         │   │
│  │  • Smaller Lambda packages (shared code in layer)                       │   │
│  │  • Faster cold starts (layer cached by AWS)                             │   │
│  │  • Easier maintenance (update once, deploy everywhere)                  │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## Environment-Specific Configuration

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                        Environment Configuration Matrix                        │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌─────────────┬─────────────────┬─────────────────┬─────────────────┐        │
│  │ Component   │   Development   │     Staging     │   Production    │        │
│  ├─────────────┼─────────────────┼─────────────────┼─────────────────┤        │
│  │ Domain      │ dev.athleon.fit │ staging.athleon │ athleon.fitness │        │
│  │ Account     │ 123456789012    │ 234567890123    │ 345678901234    │        │
│  │ Lambda Mem  │ 256MB           │ 512MB           │ 1024MB          │        │
│  │ Log Level   │ DEBUG           │ INFO            │ WARN            │        │
│  │ Log Retain  │ 7 days          │ 14 days         │ 30 days         │        │
│  │ MFA         │ OFF             │ OPTIONAL        │ REQUIRED        │        │
│  │ CORS        │ *               │ staging domain  │ prod domain     │        │
│  │ WAF         │ Disabled        │ Disabled        │ Enabled         │        │
│  │ Monitoring  │ Basic           │ Enhanced        │ Full + Alerts   │        │
│  │ Backup      │ None            │ PITR            │ PITR + Cross    │        │
│  └─────────────┴─────────────────┴─────────────────┴─────────────────┘        │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## Deployment Commands

```bash
# Deploy specific environment
cdk deploy Athleon --profile {environment-profile} --context stage={environment}

# Deploy all stacks
cdk deploy --all --profile {environment-profile} --context stage={environment}

# Deploy specific stack
cdk deploy Athleon/Organizations --profile {environment-profile}

# Environment examples
cdk deploy Athleon --profile dev-profile --context stage=development
cdk deploy Athleon --profile staging-profile --context stage=staging  
cdk deploy Athleon --profile prod-profile --context stage=production
```
