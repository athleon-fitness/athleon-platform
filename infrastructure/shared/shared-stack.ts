import * as cdk from 'aws-cdk-lib';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as events from 'aws-cdk-lib/aws-events';
import * as certificatemanager from 'aws-cdk-lib/aws-certificatemanager';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import { Construct } from 'constructs';
import { AthleonSharedLayer } from './lambda-layer';
// import { SocialProviders } from './social-providers'; // Temporarily disabled

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

    // CloudWatch Log Groups for Lambda triggers with retention policy
    const preSignupLogGroup = new logs.LogGroup(this, 'PreSignupTriggerLogGroup', {
      logGroupName: `/aws/lambda/athleon-${props.stage}-pre-signup-trigger`,
      retention: logs.RetentionDays.ONE_MONTH,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const preTokenGenerationLogGroup = new logs.LogGroup(this, 'PreTokenGenerationTriggerLogGroup', {
      logGroupName: `/aws/lambda/athleon-${props.stage}-pre-token-generation-trigger`,
      retention: logs.RetentionDays.ONE_MONTH,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Pre-signup Lambda trigger to set custom:role attribute
    const preSignupTrigger = new lambda.Function(this, 'PreSignupTrigger', {
      functionName: `athleon-${props.stage}-pre-signup-trigger`,
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'pre-signup-trigger.handler',
      code: lambda.Code.fromAsset('lambda/auth'),
      description: 'Cognito Pre-signup trigger to set custom:role attribute',
      timeout: cdk.Duration.seconds(10),
      logGroup: preSignupLogGroup,
    });

    // Pre Token Generation Lambda trigger to add custom:role to ID token
    const preTokenGenerationTrigger = new lambda.Function(this, 'PreTokenGenerationTrigger', {
      functionName: `athleon-${props.stage}-pre-token-generation-trigger`,
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'pre-token-generation.handler',
      code: lambda.Code.fromAsset('lambda/auth'),
      description: 'Cognito Pre Token Generation trigger to add custom:role to ID token',
      timeout: cdk.Duration.seconds(10),
      logGroup: preTokenGenerationLogGroup,
    });

    // Grant Cognito permission to invoke Lambda triggers
    preSignupTrigger.addPermission('CognitoInvokePermission', {
      principal: new iam.ServicePrincipal('cognito-idp.amazonaws.com'),
      sourceArn: `arn:aws:cognito-idp:${cdk.Stack.of(this).region}:${cdk.Stack.of(this).account}:userpool/*`,
    });

    preTokenGenerationTrigger.addPermission('CognitoInvokePermission', {
      principal: new iam.ServicePrincipal('cognito-idp.amazonaws.com'),
      sourceArn: `arn:aws:cognito-idp:${cdk.Stack.of(this).region}:${cdk.Stack.of(this).account}:userpool/*`,
    });

    // Cognito User Pool (V2 with Lambda trigger)
    this.userPool = new cognito.UserPool(this, 'UserPoolV2', {
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
        alias: new cognito.StringAttribute({ mutable: true }),
      },
      passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: false,
      },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      lambdaTriggers: {
        preSignUp: preSignupTrigger,
        preTokenGeneration: preTokenGenerationTrigger,
      },
    });

    this.userPoolClient = this.userPool.addClient('UserPoolClient', {
      authFlows: {
        userPassword: true,
        userSrp: true,
      },
      generateSecret: false,
      readAttributes: new cognito.ClientAttributes()
        .withStandardAttributes({ email: true, emailVerified: true, givenName: true, familyName: true })
        .withCustomAttributes('role', 'alias'),
      writeAttributes: new cognito.ClientAttributes()
        .withStandardAttributes({ email: true, givenName: true, familyName: true })
        .withCustomAttributes('role', 'alias'),
      // Ensure custom attributes are included in ID token
      idTokenValidity: cdk.Duration.hours(24),
      accessTokenValidity: cdk.Duration.hours(24),
      refreshTokenValidity: cdk.Duration.days(30),
      supportedIdentityProviders: [cognito.UserPoolClientIdentityProvider.COGNITO],
    });

    // Custom Domain Setup for Cognito (optional)
    if (props.config?.frontend?.customDomain && props.config?.domain && props.config?.dns?.cognitoCustomDomain) {
      const authDomain = `auth.${props.config.domain}`;
      let authCertificate;

      if (props.config?.dns?.certificateParameterNames?.auth) {
        // Import certificate from Parameter Store (cross-account)
        const certArn = ssm.StringParameter.valueForStringParameter(
          this,
          props.config.dns.certificateParameterNames.auth
        );
        authCertificate = certificatemanager.Certificate.fromCertificateArn(
          this,
          'AuthCertificate',
          certArn
        );
      } else {
        // Create certificate (same account) - must be in us-east-1 for Cognito
        const hostedZone = route53.HostedZone.fromLookup(this, 'AuthHostedZone', {
          domainName: props.config.domain,
        });
        
        authCertificate = new certificatemanager.DnsValidatedCertificate(this, 'AuthCertificate', {
          domainName: authDomain,
          hostedZone: hostedZone,
          region: 'us-east-1',  // Cognito requires us-east-1
        });
      }

      const userPoolDomain = this.userPool.addDomain('UserPoolDomain', {
        customDomain: {
          domainName: authDomain,
          certificate: authCertificate,
        },
      });

      // Output the CloudFront domain for manual A record creation
      new cdk.CfnOutput(this, 'AuthDomain', {
        value: authDomain,
        description: 'Custom auth domain',
      });
      
      new cdk.CfnOutput(this, 'AuthCloudFrontDomain', {
        value: userPoolDomain.cloudFrontDomainName,
        description: 'CloudFront domain for auth - create A record pointing to this',
      });
    } else {
      // Use Cognito domain
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

    // Outputs for monitoring and debugging
    new cdk.CfnOutput(this, 'PreSignupTriggerLogGroupOutput', {
      value: preSignupLogGroup.logGroupName,
      description: 'CloudWatch Log Group for Pre-Signup Trigger',
    });

    new cdk.CfnOutput(this, 'PreTokenGenerationTriggerLogGroupOutput', {
      value: preTokenGenerationLogGroup.logGroupName,
      description: 'CloudWatch Log Group for Pre-Token Generation Trigger',
    });

    new cdk.CfnOutput(this, 'PreSignupTriggerArn', {
      value: preSignupTrigger.functionArn,
      description: 'ARN of Pre-Signup Lambda Trigger',
    });

    new cdk.CfnOutput(this, 'PreTokenGenerationTriggerArn', {
      value: preTokenGenerationTrigger.functionArn,
      description: 'ARN of Pre-Token Generation Lambda Trigger',
    });
  }

  private getCallbackUrls(stage: string): string[] {
    const urls: Record<string, string[]> = {
      development: [
        'http://localhost:3000',
        'http://localhost:3000/auth/callback',
      ],
      staging: [
        'https://staging.athleon.fitness',
        'https://staging.athleon.fitness/auth/callback',
      ],
      production: [
        'https://athleon.fitness',
        'https://app.athleon.fitness',
        'https://athleon.fitness/auth/callback',
        'https://app.athleon.fitness/auth/callback',
      ],
    };

    return urls[stage] || urls.development;
  }

  private getLogoutUrls(stage: string): string[] {
    const urls: Record<string, string[]> = {
      development: [
        'http://localhost:3000',
      ],
      staging: [
        'https://staging.athleon.fitness',
      ],
      production: [
        'https://athleon.fitness',
        'https://app.athleon.fitness',
      ],
    };

    return urls[stage] || urls.development;
  }
}
