# Feature Flags Configuration

This directory contains environment-specific feature flag configurations for the Athleon platform.

## Files

- `development.json` - Development environment flags (all features enabled for testing)
- `staging.json` - Staging environment flags (production-like with selected features)
- `production.json` - Production environment flags (stable features only)

## Available Feature Flags

### `newScoringSystem`
- **Description**: Enable the new advanced scoring system
- **Default**: `false` in production, `true` in dev/staging
- **Impact**: Changes scoring calculation logic

### `advancedScheduler`
- **Description**: Enable advanced tournament scheduling features
- **Default**: `false` in production/staging, `true` in development
- **Impact**: Adds complex scheduling algorithms

### `realTimeLeaderboard`
- **Description**: Enable real-time leaderboard updates
- **Default**: `true` in all environments
- **Impact**: WebSocket-based live updates

### `betaFeatures`
- **Description**: Enable experimental beta features
- **Default**: `false` in production/staging, `true` in development
- **Impact**: Access to unreleased features

### `organizationAnalytics`
- **Description**: Enable organization-level analytics dashboard
- **Default**: `false` in production, `true` in dev/staging
- **Impact**: Additional analytics endpoints and UI

### `mobileApp`
- **Description**: Enable mobile app specific features
- **Default**: `false` in all environments (not ready)
- **Impact**: Mobile-optimized APIs and features

## Configuration Values

### `maxConcurrentUsers`
- **Description**: Maximum concurrent users allowed
- **Development**: 1000
- **Staging**: 500
- **Production**: 10000

### `scoringTimeout`
- **Description**: Timeout for score calculations (seconds)
- **Development**: 30
- **Staging**: 60
- **Production**: 120

### `leaderboardRefreshInterval`
- **Description**: Leaderboard refresh interval (seconds)
- **Development**: 5
- **Staging**: 10
- **Production**: 30

## Deployment

### Automatic (CI/CD)
Feature flags are automatically deployed when changes are pushed to:
- `develop` branch → development environment
- `staging` branch → staging environment
- `main` branch → production environment

### Manual Deployment
```bash
# Deploy to development
./scripts/deploy-feature-flags.sh development

# Deploy to staging
./scripts/deploy-feature-flags.sh staging

# Deploy to production
./scripts/deploy-feature-flags.sh production
```

## Usage

### Backend (Lambda)
```javascript
const { isFeatureEnabled, getFeatureValue } = require('/opt/nodejs/utils/featureFlags');

// Check if feature is enabled
const isEnabled = await isFeatureEnabled('newScoringSystem');

// Get configuration value
const timeout = await getFeatureValue('scoringTimeout', 60);
```

### Frontend (React)
```javascript
import { useFeatureFlag, FeatureFlag } from '../hooks/useFeatureFlags';

// Hook usage
const { isEnabled } = useFeatureFlag('newScoringSystem');

// Component usage
<FeatureFlag flag="organizationAnalytics">
  <AnalyticsDashboard />
</FeatureFlag>
```

## Best Practices

1. **Keep flags temporary** - Remove flags after full rollout
2. **Test both paths** - Ensure code works with flags on/off
3. **Document impact** - Clearly describe what each flag affects
4. **Gradual rollout** - Enable in dev → staging → production
5. **Monitor usage** - Track flag evaluation and performance
6. **Clean up** - Remove unused flags regularly

## Monitoring

Monitor feature flag deployments in AWS AppConfig console:
- Application: `athleon-{environment}`
- Environment: `{environment}`
- Configuration Profile: `feature-flags`

## Emergency Rollback

If a feature flag causes issues, you can quickly disable it:

```bash
# Update the JSON file to disable the flag
# Then deploy immediately
./scripts/deploy-feature-flags.sh production
```

Or use the AWS Console to rollback to a previous configuration version.
