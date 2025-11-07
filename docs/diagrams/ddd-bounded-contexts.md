# DDD Bounded Context Architecture

## Bounded Context Overview

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                            Athleon Platform                                    │
│                         (Multi-Tenant SaaS)                                    │
└─────────────────────────────────────────────────────────────────────────────────┘
                                      │
                    ┌─────────────────┼─────────────────┐
                    │                 │                 │
                    ▼                 ▼                 ▼
        ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
        │  Shared Context │ │ Network Context │ │ Event Context   │
        │                 │ │                 │ │                 │
        │ • Cognito       │ │ • API Gateway   │ │ • EventBridge   │
        │ • S3 Buckets    │ │ • Authorizer    │ │ • Cross-Domain  │
        │ • Lambda Layer  │ │ • Custom Domain │ │   Communication │
        └─────────────────┘ └─────────────────┘ └─────────────────┘
                                      │
        ┌─────────────────────────────┼─────────────────────────────┐
        │                             │                             │
        ▼                             ▼                             ▼
┌─────────────────┐         ┌─────────────────┐         ┌─────────────────┐
│ Organizations   │         │  Competitions   │         │    Athletes     │
│    Context      │         │    Context      │         │    Context      │
└─────────────────┘         └─────────────────┘         └─────────────────┘
        │                             │                             │
        ▼                             ▼                             ▼
┌─────────────────┐         ┌─────────────────┐         ┌─────────────────┐
│    Scoring      │         │   Scheduling    │         │   Categories    │
│    Context      │         │    Context      │         │    Context      │
└─────────────────┘         └─────────────────┘         └─────────────────┘
        │                             │                             │
        ▼                             ▼                             ▼
┌─────────────────┐         ┌─────────────────┐         ┌─────────────────┐
│     WODs        │         │ Authorization   │         │    Frontend     │
│    Context      │         │    Context      │         │    Context      │
└─────────────────┘         └─────────────────┘         └─────────────────┘
```

## Organizations Context

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           Organizations Bounded Context                        │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  Domain Responsibility: Multi-tenant RBAC and Organization Management          │
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                            Domain Model                                 │   │
│  │                                                                         │   │
│  │  Organization Aggregate:                                                │   │
│  │  • organizationId (PK)                                                  │   │
│  │  • name, description, settings                                          │   │
│  │  • createdAt, createdBy                                                 │   │
│  │                                                                         │   │
│  │  OrganizationMember Aggregate:                                          │   │
│  │  • organizationId (PK), userId (SK)                                     │   │
│  │  • role (owner/admin/member)                                            │   │
│  │  • joinedAt, invitedBy                                                  │   │
│  │                                                                         │   │
│  │  OrganizationEvent Aggregate:                                           │   │
│  │  • organizationId (PK), eventId (SK)                                    │   │
│  │  • createdAt, createdBy                                                 │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                         API Endpoints                                   │   │
│  │                                                                         │   │
│  │  POST   /organizations                    Create organization           │   │
│  │  GET    /organizations                    List user's organizations     │   │
│  │  PUT    /organizations/{id}               Update organization           │   │
│  │  GET    /organizations/{id}/members       List members                  │   │
│  │  POST   /organizations/{id}/members       Add member                    │   │
│  │  PUT    /organizations/{id}/members/{uid} Update member role            │   │
│  │  DELETE /organizations/{id}/members/{uid} Remove member                 │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
│  Events Published:                                                              │
│  • OrganizationCreated, MemberAdded, MemberRemoved, RoleChanged                │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## Competitions Context

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                          Competitions Bounded Context                          │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  Domain Responsibility: Event Lifecycle and Competition Management             │
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                            Domain Model                                 │   │
│  │                                                                         │   │
│  │  Event Aggregate:                                                       │   │
│  │  • eventId (PK)                                                         │   │
│  │  • name, description, location                                          │   │
│  │  • startDate, endDate, published                                        │   │
│  │  • maxParticipants, imageUrl                                            │   │
│  │                                                                         │   │
│  │  EventDay Aggregate:                                                    │   │
│  │  • eventId (PK), dayId (SK)                                             │   │
│  │  • date, name, description                                              │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                         API Endpoints                                   │   │
│  │                                                                         │   │
│  │  GET    /competitions?organizationId={id} List organization events      │   │
│  │  POST   /competitions                     Create event                  │   │
│  │  PUT    /competitions/{id}                Update event                  │   │
│  │  DELETE /competitions/{id}                Delete event                  │   │
│  │  POST   /competitions/{id}/upload-url     Generate S3 upload URL       │   │
│  │  GET    /competitions/{id}/days           List event days               │   │
│  │  POST   /competitions/{id}/days           Create event day              │   │
│  │                                                                         │   │
│  │  GET    /public/events                    List published events         │   │
│  │  GET    /public/events/{id}               Get published event           │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
│  Events Published:                                                              │
│  • EventCreated, EventPublished, EventUpdated, EventDeleted                    │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## Athletes Context

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                            Athletes Bounded Context                            │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  Domain Responsibility: Athlete Profiles and Event Registrations               │
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                            Domain Model                                 │   │
│  │                                                                         │   │
│  │  Athlete Aggregate:                                                     │   │
│  │  • userId (PK)                                                          │   │
│  │  • firstName, lastName, email                                           │   │
│  │  • dateOfBirth, gender, country                                         │   │
│  │  • categoryId                                                           │   │
│  │                                                                         │   │
│  │  AthleteEvent Aggregate:                                                │   │
│  │  • userId (PK), eventId (SK)                                            │   │
│  │  • categoryId, registeredAt                                             │   │
│  │  • status (registered/cancelled/completed)                              │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                         API Endpoints                                   │   │
│  │                                                                         │   │
│  │  GET    /athletes                         List all athletes             │   │
│  │  GET    /athletes/{id}                    Get athlete profile           │   │
│  │  POST   /athletes                         Create athlete profile        │   │
│  │  PUT    /athletes/{id}                    Update athlete profile        │   │
│  │  POST   /athletes/{id}/competitions       Register for event            │   │
│  │  GET    /athletes/{id}/competitions       Get registered events         │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
│  Events Published:                                                              │
│  • AthleteRegistered, AthleteUnregistered, ProfileUpdated                      │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## Scoring Context

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                             Scoring Bounded Context                            │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  Domain Responsibility: Score Calculation and Leaderboard Management           │
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                            Domain Model                                 │   │
│  │                                                                         │   │
│  │  Score Aggregate:                                                       │   │
│  │  • eventId (PK), scoreId (SK)                                           │   │
│  │  • athleteId, wodId, categoryId                                         │   │
│  │  • score, scoringSystemId, rawData                                      │   │
│  │  • breakdown, submittedAt, judgeId                                      │   │
│  │                                                                         │   │
│  │  ScoringSystem Aggregate:                                               │   │
│  │  • eventId (PK), scoringSystemId (SK)                                   │   │
│  │  • name, type (classic/advanced)                                        │   │
│  │  • config, createdBy, createdAt                                         │   │
│  │                                                                         │   │
│  │  Exercise Aggregate:                                                    │   │
│  │  • exerciseId (PK)                                                      │   │
│  │  • name, category, baseScore                                            │   │
│  │  • modifiers, isGlobal                                                  │   │
│  │                                                                         │   │
│  │  LeaderboardCache Aggregate:                                            │   │
│  │  • leaderboardId (PK)                                                   │   │
│  │  • eventId, wodId, categoryId                                           │   │
│  │  • leaderboard, updatedAt, ttl                                          │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                         API Endpoints                                   │   │
│  │                                                                         │   │
│  │  POST   /scores                           Submit score                  │   │
│  │  GET    /scores?eventId={id}              Get event scores              │   │
│  │  GET    /leaderboard?eventId={id}         Get leaderboard               │   │
│  │  GET    /exercises                        List exercises                │   │
│  │  POST   /exercises                        Create exercise               │   │
│  │  GET    /events/{id}/scoring-systems      List scoring systems          │   │
│  │  POST   /events/{id}/scoring-systems      Create scoring system         │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
│  Events Published:                                                              │
│  • ScoreSubmitted, ScoreCalculated, LeaderboardUpdated                         │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## Cross-Context Communication

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                          EventBridge Communication                             │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌─────────────────┐    EventBridge    ┌─────────────────┐                     │
│  │  Organizations  │ ──────────────────→│   Competitions  │                     │
│  │    Context      │    MemberAdded     │    Context      │                     │
│  └─────────────────┘                    └─────────────────┘                     │
│           │                                       │                             │
│           │ RoleChanged                          │ EventPublished              │
│           ▼                                       ▼                             │
│  ┌─────────────────┐                    ┌─────────────────┐                     │
│  │   Authorization │                    │    Athletes     │                     │
│  │    Context      │                    │    Context      │                     │
│  └─────────────────┘                    └─────────────────┘                     │
│                                                  │                             │
│                                                  │ AthleteRegistered           │
│                                                  ▼                             │
│  ┌─────────────────┐    ScoreSubmitted  ┌─────────────────┐                     │
│  │    Scoring      │ ◄──────────────────│   Scheduling    │                     │
│  │    Context      │                    │    Context      │                     │
│  └─────────────────┘                    └─────────────────┘                     │
│           │                                                                     │
│           │ ScoreCalculated                                                     │
│           ▼                                                                     │
│  ┌─────────────────┐                                                           │
│  │  Leaderboard    │                                                           │
│  │  Calculator     │                                                           │
│  └─────────────────┘                                                           │
│                                                                                 │
│  Event Flow Rules:                                                              │
│  • No direct database access across contexts                                   │
│  • All cross-context communication via EventBridge                             │
│  • Read-only access for authorization checks only                              │
│  • Eventual consistency between contexts                                       │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## Infrastructure Mapping

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                        CDK Stack to Context Mapping                           │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  infrastructure/shared/                                                         │
│  ├── shared-stack.ts          → Shared Context                                 │
│  ├── network-stack.ts         → Network Context                                │
│  └── event-routing.ts         → Event Context                                  │
│                                                                                 │
│  infrastructure/organizations/ → Organizations Context                          │
│  infrastructure/competitions/  → Competitions Context                           │
│  infrastructure/athletes/      → Athletes Context                               │
│  infrastructure/scoring/       → Scoring Context                               │
│  infrastructure/scheduling/    → Scheduling Context                             │
│  infrastructure/categories/    → Categories Context                             │
│  infrastructure/wods/          → WODs Context                                   │
│  infrastructure/authorization/ → Authorization Context                          │
│  infrastructure/frontend/      → Frontend Context                               │
│                                                                                 │
│  Deployment Order:                                                              │
│  1. SharedStack (Foundation)                                                    │
│  2. NetworkStack (API Gateway)                                                  │
│  3. OrganizationsStack (RBAC)                                                   │
│  4. Domain Stacks (Parallel)                                                    │
│  5. FrontendStack (UI)                                                          │
└─────────────────────────────────────────────────────────────────────────────────┘
```
