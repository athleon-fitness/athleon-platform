# Multi-Environment Domain Architecture

## Environment Isolation Overview

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              Domain Registrar                                   │
│                            (athleon.fitness)                                    │
└─────────────────────────────┬───────────────────────────────────────────────────┘
                              │
                              │ DNS Delegation
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│  Development  │    │    Staging    │    │  Production   │
│   Account     │    │   Account     │    │   Account     │
│ 123456789012  │    │ 234567890123  │    │ 345678901234  │
└───────────────┘    └───────────────┘    └───────────────┘
```

## Development Environment (Account: 123456789012)

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                        Development AWS Account                                  │
│                           (123456789012)                                       │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                        Route 53 Hosted Zone                             │   │
│  │                      dev.athleon.fitness                                │   │
│  │                                                                         │   │
│  │  ┌─────────────────────┐    ┌─────────────────────────────────────┐    │   │
│  │  │   ACM Certificate   │    │         DNS Records                 │    │   │
│  │  │  dev.athleon.fitness│    │                                     │    │   │
│  │  │  *.dev.athleon.fit..│    │  dev.athleon.fitness                │    │   │
│  │  │                     │    │    → d123.cloudfront.net            │    │   │
│  │  │  DNS Validation     │    │                                     │    │   │
│  │  │  (Automatic)        │    │  api.dev.athleon.fitness            │    │   │
│  │  └─────────────────────┘    │    → d-abc123.execute-api...        │    │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                        Frontend Infrastructure                          │   │
│  │                                                                         │   │
│  │  ┌─────────────────┐    ┌─────────────────────────────────────────┐    │   │
│  │  │   S3 Bucket     │    │        CloudFront Distribution          │    │   │
│  │  │                 │    │                                         │    │   │
│  │  │ scoringames-    │◄───┤  Domain: dev.athleon.fitness            │    │   │
│  │  │ frontend-dev    │    │  Certificate: ACM Certificate           │    │   │
│  │  │                 │    │  Origin: S3 Bucket (OAC)                │    │   │
│  │  │ React SPA       │    │  Caching: 5min (dev settings)           │    │   │
│  │  │ Static Assets   │    │  Error Pages: → /index.html             │    │   │
│  │  └─────────────────┘    └─────────────────────────────────────────┘    │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                         API Infrastructure                              │   │
│  │                                                                         │   │
│  │  ┌─────────────────┐    ┌─────────────────────────────────────────┐    │   │
│  │  │  API Gateway    │    │         Custom Domain                   │    │   │
│  │  │                 │    │                                         │    │   │
│  │  │ Regional API    │◄───┤  Domain: api.dev.athleon.fitness        │    │   │
│  │  │ REST API        │    │  Certificate: ACM Certificate           │    │   │
│  │  │ Cognito Auth    │    │  Endpoint: REGIONAL                     │    │   │
│  │  │ CORS: *         │    │  Base Path Mapping: /                   │    │   │
│  │  └─────────────────┘    └─────────────────────────────────────────┘    │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
│  Configuration:                                                                │
│  • LOG_LEVEL: DEBUG                                                            │
│  • CORS_ORIGINS: *                                                             │
│  • Lambda Memory: 256MB                                                        │
│  • Log Retention: 7 days                                                       │
│  • MFA: OFF                                                                    │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## Staging Environment (Account: 234567890123)

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         Staging AWS Account                                    │
│                           (234567890123)                                       │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                        Route 53 Hosted Zone                             │   │
│  │                    staging.athleon.fitness                              │   │
│  │                                                                         │   │
│  │  ┌─────────────────────┐    ┌─────────────────────────────────────┐    │   │
│  │  │   ACM Certificate   │    │         DNS Records                 │    │   │
│  │  │staging.athleon.fit..│    │                                     │    │   │
│  │  │*.staging.athleon.f..│    │  staging.athleon.fitness            │    │   │
│  │  │                     │    │    → d456.cloudfront.net            │    │   │
│  │  │  DNS Validation     │    │                                     │    │   │
│  │  │  (Automatic)        │    │  api.staging.athleon.fitness        │    │   │
│  │  └─────────────────────┘    │    → d-def456.execute-api...        │    │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                        Frontend Infrastructure                          │   │
│  │                                                                         │   │
│  │  ┌─────────────────┐    ┌─────────────────────────────────────────┐    │   │
│  │  │   S3 Bucket     │    │        CloudFront Distribution          │    │   │
│  │  │                 │    │                                         │    │   │
│  │  │ scoringames-    │◄───┤  Domain: staging.athleon.fitness        │    │   │
│  │  │ frontend-staging│    │  Certificate: ACM Certificate           │    │   │
│  │  │                 │    │  Origin: S3 Bucket (OAC)                │    │   │
│  │  │ React SPA       │    │  Caching: 1hr (staging settings)        │    │   │
│  │  │ Static Assets   │    │  Error Pages: → /index.html             │    │   │
│  │  └─────────────────┘    └─────────────────────────────────────────┘    │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                         API Infrastructure                              │   │
│  │                                                                         │   │
│  │  ┌─────────────────┐    ┌─────────────────────────────────────────┐    │   │
│  │  │  API Gateway    │    │         Custom Domain                   │    │   │
│  │  │                 │    │                                         │    │   │
│  │  │ Regional API    │◄───┤  Domain: api.staging.athleon.fitness    │    │   │
│  │  │ REST API        │    │  Certificate: ACM Certificate           │    │   │
│  │  │ Cognito Auth    │    │  Endpoint: REGIONAL                     │    │   │
│  │  │ CORS: staging   │    │  Base Path Mapping: /                   │    │   │
│  │  └─────────────────┘    └─────────────────────────────────────────┘    │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
│  Configuration:                                                                │
│  • LOG_LEVEL: INFO                                                             │
│  • CORS_ORIGINS: https://staging.athleon.fitness                               │
│  • Lambda Memory: 512MB                                                        │
│  • Log Retention: 14 days                                                      │
│  • MFA: OPTIONAL                                                               │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## Production Environment (Account: 345678901234)

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                        Production AWS Account                                  │
│                           (345678901234)                                       │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                        Route 53 Hosted Zone                             │   │
│  │                        athleon.fitness                                  │   │
│  │                                                                         │   │
│  │  ┌─────────────────────┐    ┌─────────────────────────────────────┐    │   │
│  │  │   ACM Certificate   │    │         DNS Records                 │    │   │
│  │  │  athleon.fitness    │    │                                     │    │   │
│  │  │  *.athleon.fitness  │    │  athleon.fitness                    │    │   │
│  │  │                     │    │    → d789.cloudfront.net            │    │   │
│  │  │  DNS Validation     │    │                                     │    │   │
│  │  │  (Automatic)        │    │  api.athleon.fitness                │    │   │
│  │  └─────────────────────┘    │    → d-ghi789.execute-api...        │    │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                        Frontend Infrastructure                          │   │
│  │                                                                         │   │
│  │  ┌─────────────────┐    ┌─────────────────────────────────────────┐    │   │
│  │  │   S3 Bucket     │    │        CloudFront Distribution          │    │   │
│  │  │                 │    │                                         │    │   │
│  │  │ scoringames-    │◄───┤  Domain: athleon.fitness                │    │   │
│  │  │ frontend-prod   │    │  Certificate: ACM Certificate           │    │   │
│  │  │                 │    │  Origin: S3 Bucket (OAC)                │    │   │
│  │  │ React SPA       │    │  Caching: 24hr (prod settings)          │    │   │
│  │  │ Static Assets   │    │  Error Pages: → /index.html             │    │   │
│  │  │ + WAF Protection│    │  WAF: Rate Limiting (2000 req/min)      │    │   │
│  │  └─────────────────┘    └─────────────────────────────────────────┘    │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                         API Infrastructure                              │   │
│  │                                                                         │   │
│  │  ┌─────────────────┐    ┌─────────────────────────────────────────┐    │   │
│  │  │  API Gateway    │    │         Custom Domain                   │    │   │
│  │  │                 │    │                                         │    │   │
│  │  │ Regional API    │◄───┤  Domain: api.athleon.fitness            │    │   │
│  │  │ REST API        │    │  Certificate: ACM Certificate           │    │   │
│  │  │ Cognito Auth    │    │  Endpoint: REGIONAL                     │    │   │
│  │  │ CORS: prod only │    │  Base Path Mapping: /                   │    │   │
│  │  └─────────────────┘    └─────────────────────────────────────────┘    │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
│  Configuration:                                                                │
│  • LOG_LEVEL: WARN                                                             │
│  • CORS_ORIGINS: https://athleon.fitness                                       │
│  • Lambda Memory: 1024MB                                                       │
│  • Log Retention: 30 days                                                      │
│  • MFA: REQUIRED                                                               │
│  • Deletion Protection: ENABLED                                                │
│  • Point-in-Time Recovery: ENABLED                                             │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## DNS Delegation Flow

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                            Domain Registrar                                    │
│                          (athleon.fitness)                                     │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  NS Records for Subdomain Delegation:                                          │
│                                                                                 │
│  dev.athleon.fitness      NS  →  ns-123.awsdns-12.com                         │
│                               ns-456.awsdns-34.net                             │
│                               ns-789.awsdns-56.org                             │
│                               ns-012.awsdns-78.co.uk                           │
│                               (Development Account Route 53)                   │
│                                                                                 │
│  staging.athleon.fitness  NS  →  ns-234.awsdns-23.com                         │
│                               ns-567.awsdns-45.net                             │
│                               ns-890.awsdns-67.org                             │
│                               ns-123.awsdns-89.co.uk                           │
│                               (Staging Account Route 53)                       │
│                                                                                 │
│  athleon.fitness         NS  →  ns-345.awsdns-34.com                          │
│                               ns-678.awsdns-56.net                             │
│                               ns-901.awsdns-78.org                             │
│                               ns-234.awsdns-90.co.uk                           │
│                               (Production Account Route 53)                    │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## Security & Isolation Benefits

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           Environment Isolation                                │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ✅ Account Isolation                                                          │
│     • Separate AWS accounts prevent cross-environment access                   │
│     • Independent billing and cost tracking                                    │
│     • Isolated IAM policies and permissions                                    │
│                                                                                 │
│  ✅ DNS Isolation                                                              │
│     • Each environment manages its own Route 53 hosted zone                    │
│     • No cross-account DNS dependencies                                        │
│     • Independent certificate management                                       │
│                                                                                 │
│  ✅ Infrastructure Isolation                                                   │
│     • Separate CloudFront distributions                                        │
│     • Independent API Gateway instances                                        │
│     • Isolated DynamoDB tables and Lambda functions                            │
│                                                                                 │
│  ✅ Security Boundaries                                                        │
│     • Production has strictest security (MFA required, WAF enabled)            │
│     • Development has relaxed security for faster iteration                    │
│     • Staging mirrors production security for realistic testing                │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```
