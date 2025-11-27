import * as fs from 'fs';
import * as path from 'path';

export interface EnvironmentConfig {
  environment: string;
  account: string;
  region: string;
  domain: string;
  
  dns?: {
    hostedZoneId?: string;
    skipDnsRecords?: boolean;
    cognitoCustomDomain?: boolean;
    certificateParameterNames?: {
      cloudfront?: string;
      api?: string;
      auth?: string;
    };
  };

  cognito: {
    passwordPolicy: {
      minLength: number;
      requireUppercase: boolean;
      requireLowercase: boolean;
      requireNumbers: boolean;
      requireSymbols: boolean;
    };
    mfaConfiguration: 'OFF' | 'OPTIONAL' | 'REQUIRED';
    emailVerification: boolean;
  };
  dynamodb: {
    billingMode: 'PAY_PER_REQUEST' | 'PROVISIONED';
    pointInTimeRecovery: boolean;
    deletionProtection: boolean;
  };
  lambda: {
    logRetention: number;
    memorySize: number;
    timeout: number;
    environment: Record<string, string>;
  };
  s3: {
    versioning: boolean;
    lifecycleRules: any[];
  };
  monitoring: {
    enableXRay: boolean;
    enableDetailedMetrics: boolean;
    alarmNotifications: boolean;
    notificationEmail?: string;
    enableDashboard?: boolean;
  };
  frontend: {
    customDomain: boolean;
    caching: {
      defaultTtl: number;
      maxTtl: number;
    };
    waf?: {
      enabled: boolean;
      rateLimiting: number;
    };
  };
}

export class EnvironmentConfigLoader {
  static load(environment: string): EnvironmentConfig {
    const configPath = path.join(process.cwd(), 'environments', `${environment}.json`);
    
    if (!fs.existsSync(configPath)) {
      throw new Error(`Environment configuration not found: ${configPath}`);
    }

    const configContent = fs.readFileSync(configPath, 'utf-8');
    const config = JSON.parse(configContent) as EnvironmentConfig;

    // Validate required fields
    this.validateConfig(config, environment);

    return config;
  }

  private static validateConfig(config: EnvironmentConfig, environment: string): void {
    const required = ['environment', 'account', 'region', 'domain'];
    
    for (const field of required) {
      if (!config[field as keyof EnvironmentConfig]) {
        throw new Error(`Missing required field '${field}' in ${environment} environment config`);
      }
    }

    // Validate account format
    if (!/^\d{12}$/.test(config.account)) {
      throw new Error(`Invalid AWS account ID format in ${environment} environment config`);
    }

    // Validate environment matches filename
    if (config.environment !== environment) {
      throw new Error(`Environment mismatch: config says '${config.environment}' but file is '${environment}.json'`);
    }
  }

  static getAvailableEnvironments(): string[] {
    const envDir = path.join(process.cwd(), 'environments');
    
    if (!fs.existsSync(envDir)) {
      return [];
    }

    return fs.readdirSync(envDir)
      .filter(file => file.endsWith('.json'))
      .map(file => file.replace('.json', ''))
      .filter(env => env !== 'README');
  }
}