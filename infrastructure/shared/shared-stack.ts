import * as cdk from 'aws-cdk-lib';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as events from 'aws-cdk-lib/aws-events';
import * as certificatemanager from 'aws-cdk-lib/aws-certificatemanager';
import * as route53 from 'aws-cdk-lib/aws-route53';
import { Construct } from 'constructs';
import { AthleonSharedLayer } from './lambda-layer';

export interface SharedStackProps {
  stage: string;
  config?: any;
}

export class SharedStack extends Construct {
  public readonly userPool: cognito.UserPool;
  public readonly userPoolClient: cognito.UserPoolClient;
  public readonly eventBus: events.EventBus;
  public readonly eventImagesBucket: s3.Bucket;
  public readonly sharedLayer: AthleonSharedLayer;

  constructor(scope: Construct, id: string, props: SharedStackProps) {
    super(scope, id);

    // Get domain configuration based on stage
    const domainConfig = this.getDomainConfig(props.stage);

    // Cognito User Pool
    this.userPool = new cognito.UserPool(this, 'UserPool', {
      userPoolName: `athleon-${props.stage}`,
      selfSignUpEnabled: true,
      signInAliases: { email: true },
      autoVerify: { email: true },
      standardAttributes: {
        email: { required: true, mutable: true },
        givenName: { required: true, mutable: true },
        familyName: { required: true, mutable: true },
      },
      customAttributes: {
        role: new cognito.StringAttribute({ mutable: true }),
      },
      passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: false,
      },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    this.userPoolClient = this.userPool.addClient('UserPoolClient', {
      authFlows: {
        userPassword: true,
        userSrp: true,
      },
      generateSecret: false,
      readAttributes: new cognito.ClientAttributes()
        .withStandardAttributes({ email: true, emailVerified: true, givenName: true, familyName: true })
        .withCustomAttributes('role'),
      writeAttributes: new cognito.ClientAttributes()
        .withStandardAttributes({ email: true, givenName: true, familyName: true })
        .withCustomAttributes('role'),
    });

    // Custom Domain Setup
    if (domainConfig.useCustomDomain) {
      // Lookup existing hosted zone
      const hostedZone = route53.HostedZone.fromLookup(this, 'HostedZone', {
        domainName: domainConfig.rootDomain,
      });

      // Create certificate for auth subdomain
      const certificate = new certificatemanager.Certificate(this, 'AuthCertificate', {
        domainName: domainConfig.authDomain,
        validation: certificatemanager.CertificateValidation.fromDns(hostedZone),
      });

      // Add custom domain to User Pool
      const userPoolDomain = this.userPool.addDomain('UserPoolDomain', {
        customDomain: {
          domainName: domainConfig.authDomain,
          certificate: certificate,
        },
      });

      // Output custom auth domain
      new cdk.CfnOutput(this, 'AuthDomain', {
        value: domainConfig.authDomain,
        description: 'Custom auth domain',
      });
    } else {
      // Use Cognito domain for development
      this.userPool.addDomain('UserPoolDomain', {
        cognitoDomain: {
          domainPrefix: `athleon-${props.stage}`,
        },
      });
    }

    // Central EventBridge Bus for cross-domain events
    this.eventBus = new events.EventBus(this, 'CentralEventBus', {
      eventBusName: `athleon-central-${props.stage}`,
    });

    // S3 Bucket for event images
    this.eventImagesBucket = new s3.Bucket(this, 'EventImagesBucket', {
      bucketName: `athleon-event-images-${props.stage}`,
      cors: [{
        allowedMethods: [s3.HttpMethods.GET, s3.HttpMethods.PUT, s3.HttpMethods.POST],
        allowedOrigins: ['*'],
        allowedHeaders: ['*'],
      }],
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    // Lambda Layer for shared utilities
    this.sharedLayer = new AthleonSharedLayer(this, 'SharedLayer', {
      stage: props.stage,
    });
  }

  private getDomainConfig(stage: string) {
    const configs: Record<string, any> = {
      development: {
        useCustomDomain: false, // Disable for now
        rootDomain: 'dev.athleon.fitness',
        authDomain: 'auth.dev.athleon.fitness',
      },
      staging: {
        useCustomDomain: false, // Disable for now
        rootDomain: 'staging.athleon.fitness',
        authDomain: 'auth.staging.athleon.fitness',
      },
      production: {
        useCustomDomain: true,
        rootDomain: 'athleon.fitness',
        authDomain: 'auth.athleon.fitness',
      },
    };

    return configs[stage] || { useCustomDomain: false };
  }
}
