import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as certificatemanager from 'aws-cdk-lib/aws-certificatemanager';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as targets from 'aws-cdk-lib/aws-route53-targets';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import { Construct } from 'constructs';

export interface FrontendStackProps {
  stage: string;
  domain?: string;
  hostedZoneId?: string;
  skipDnsRecords?: boolean;  // Skip DNS record creation for cross-account scenarios
  certificateParameterNames?: {
    cloudfront?: string;
    api?: string;
  };
  enableWaf?: boolean;
  rateLimiting?: number;
  eventImagesBucket: s3.Bucket;
}

export class FrontendStack extends Construct {
  public readonly bucket: s3.Bucket;
  public readonly distribution: cloudfront.Distribution;
  public readonly cloudfrontCertificate?: acm.Certificate;
  public readonly apiCertificate?: acm.Certificate;
  public readonly hostedZone?: route53.IHostedZone;

  constructor(scope: Construct, id: string, props: FrontendStackProps) {
    super(scope, id);

    // Setup custom domain with certificates and hosted zone
    if (props.domain) {
      // Lookup hosted zone (same account scenario)
      if (!props.skipDnsRecords) {
        if (props.hostedZoneId) {
          this.hostedZone = route53.HostedZone.fromHostedZoneAttributes(this, 'HostedZone', {
            hostedZoneId: props.hostedZoneId,
            zoneName: props.domain,
          });
        } else {
          this.hostedZone = route53.HostedZone.fromLookup(this, 'HostedZone', {
            domainName: props.domain,
          });
        }
      }

      // Create or import certificates
      if (props.certificateParameterNames) {
        // Import from Parameter Store (cross-account scenario)
        if (props.certificateParameterNames.cloudfront) {
          const certArn = ssm.StringParameter.valueForStringParameter(
            this,
            props.certificateParameterNames.cloudfront
          );
          this.cloudfrontCertificate = acm.Certificate.fromCertificateArn(
            this,
            'CloudFrontCertificate',
            certArn
          ) as acm.Certificate;
        }

        if (props.certificateParameterNames.api) {
          const certArn = ssm.StringParameter.valueForStringParameter(
            this,
            props.certificateParameterNames.api
          );
          this.apiCertificate = acm.Certificate.fromCertificateArn(
            this,
            'ApiCertificate',
            certArn
          ) as acm.Certificate;
        }
      } else if (this.hostedZone) {
        // Create certificates (same account scenario)
        // CloudFront requires certificate in us-east-1
        this.cloudfrontCertificate = new acm.DnsValidatedCertificate(this, 'CloudFrontCertificate', {
          domainName: props.domain,
          hostedZone: this.hostedZone,
          region: 'us-east-1',  // CloudFront requirement
        });

        this.apiCertificate = new acm.Certificate(this, 'ApiCertificate', {
          domainName: `api.${props.domain}`,
          validation: acm.CertificateValidation.fromDns(this.hostedZone),
        });
      }
    }

    // S3 bucket for static website
    this.bucket = new s3.Bucket(this, 'WebsiteBucket', {
      bucketName: `athleon-frontend-${props.stage}`,
      websiteIndexDocument: 'index.html',
      websiteErrorDocument: 'index.html',
      publicReadAccess: false,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      autoDeleteObjects: false,
    });

    // Dynamic CSP policy based on environment
    const apiDomain = props.domain ? `https://api.${props.domain}` : `https://api.${props.stage}.athleon.fitness`;
    const cognitoRegion = cdk.Stack.of(this).region;
    const s3BucketDomain = `https://athleon-event-images-${props.stage}.s3.${cognitoRegion}.amazonaws.com`;
    
    const cspPolicy = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "media-src 'self' data:",
      "font-src 'self' data:",
      `connect-src 'self' ${apiDomain} https://cognito-idp.${cognitoRegion}.amazonaws.com ${s3BucketDomain}`,
      "frame-ancestors 'none'"
    ].join('; ');

    // Security headers policy
    const securityHeadersPolicy = new cloudfront.ResponseHeadersPolicy(this, 'SecurityHeaders', {
      responseHeadersPolicyName: `athleon-security-headers-${props.stage}`,
      securityHeadersBehavior: {
        contentSecurityPolicy: {
          contentSecurityPolicy: cspPolicy,
          override: true,
        },
        contentTypeOptions: { override: true },
        frameOptions: { frameOption: cloudfront.HeadersFrameOption.DENY, override: true },
        referrerPolicy: { referrerPolicy: cloudfront.HeadersReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN, override: true },
        strictTransportSecurity: {
          accessControlMaxAge: cdk.Duration.seconds(31536000),
          includeSubdomains: true,
          preload: true,
          override: true,
        },
      },
    });

    // CloudFront function to handle SPA routing vs asset requests
    const spaRoutingFunction = new cloudfront.Function(this, 'SpaRoutingFunction', {
      functionName: `athleon-spa-routing-${props.stage}`,
      code: cloudfront.FunctionCode.fromInline(`
function handler(event) {
  var request = event.request;
  var uri = request.uri;
  
  // If request is for an asset (has file extension), don't modify
  if (uri.match(/\\.[a-zA-Z0-9]+$/)) {
    return request;
  }
  
  // If request is for a route (no extension), serve index.html
  if (!uri.match(/\\.[a-zA-Z0-9]+$/) && uri !== '/') {
    request.uri = '/index.html';
  }
  
  return request;
}
      `),
    });

    // CloudFront distribution
    this.distribution = new cloudfront.Distribution(this, 'Distribution', {
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(this.bucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        responseHeadersPolicy: securityHeadersPolicy,
        functionAssociations: [{
          function: spaRoutingFunction,
          eventType: cloudfront.FunctionEventType.VIEWER_REQUEST,
        }],
      },
      additionalBehaviors: {
        // Handle Vite assets with proper caching
        '/assets/*': {
          origin: origins.S3BucketOrigin.withOriginAccessControl(this.bucket),
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED_FOR_UNCOMPRESSED_OBJECTS,
          originRequestPolicy: cloudfront.OriginRequestPolicy.CORS_S3_ORIGIN,
        },
        '/images/*': {
          origin: origins.S3BucketOrigin.withOriginAccessControl(props.eventImagesBucket),
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
          functionAssociations: [{
            function: new cloudfront.Function(this, 'ImagePathRewriteFunction', {
              functionName: `athleon-image-path-rewrite-${props.stage}`,
              code: cloudfront.FunctionCode.fromInline(`
function handler(event) {
  var request = event.request;
  // Remove /images prefix from the URI
  request.uri = request.uri.replace(/^\\/images\\//, '/');
  return request;
}
              `),
            }),
            eventType: cloudfront.FunctionEventType.VIEWER_REQUEST,
          }],
        },
      },
      domainNames: props.domain ? [props.domain] : undefined,
      certificate: this.cloudfrontCertificate,
      defaultRootObject: 'index.html',
      // Remove error responses - let the function handle routing
    });

    // Note: Bucket policy for CloudFront access is added in SharedStack
    // to avoid circular dependency with distribution.distributionId

    // Create Route 53 A Record for custom domain
    // Skip for cross-account scenarios (create manually instead)
    if (props.domain && this.hostedZone && !props.skipDnsRecords) {
      new route53.ARecord(this, 'AliasRecord', {
        zone: this.hostedZone,
        recordName: props.domain,
        target: route53.RecordTarget.fromAlias(new targets.CloudFrontTarget(this.distribution)),
      });
    }
  }
}
