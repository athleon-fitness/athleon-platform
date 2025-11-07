import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as route53 from 'aws-cdk-lib/aws-route53';
import { Construct } from 'constructs';

export interface FrontendStackProps {
  stage: string;
  domain?: string;
  enableWaf?: boolean;
  rateLimiting?: number;
}

export class FrontendStack extends Construct {
  public readonly bucket: s3.Bucket;
  public readonly distribution: cloudfront.Distribution;
  public readonly certificate?: acm.Certificate;

  constructor(scope: Construct, id: string, props: FrontendStackProps) {
    super(scope, id);

    // Create ACM certificate for custom domain (CloudFront requires us-east-1)
    this.certificate = props.domain ? (() => {
      // Each environment has its own hosted zone for isolation
      const hostedZone = route53.HostedZone.fromLookup(this, 'HostedZone', {
        domainName: props.domain, // dev.athleon.fitness, staging.athleon.fitness, athleon.fitness
      });

      return new acm.Certificate(this, 'Certificate', {
        domainName: props.domain,
        subjectAlternativeNames: [`*.${props.domain}`],
        validation: acm.CertificateValidation.fromDns(hostedZone),
      });
    })() : undefined;

    // S3 bucket for static website
    this.bucket = new s3.Bucket(this, 'WebsiteBucket', {
      bucketName: `scoringames-frontend-${props.stage}`,
      websiteIndexDocument: 'index.html',
      websiteErrorDocument: 'index.html',
      publicReadAccess: false,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      autoDeleteObjects: false,
    });

    // CloudFront distribution
    this.distribution = new cloudfront.Distribution(this, 'Distribution', {
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(this.bucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
      },
      domainNames: props.domain ? [props.domain] : undefined,
      certificate: this.certificate,
      defaultRootObject: 'index.html',
      errorResponses: [
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
          ttl: cdk.Duration.minutes(5),
        },
        {
          httpStatus: 403,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
          ttl: cdk.Duration.minutes(5),
        },
      ],
    });
  }
}
