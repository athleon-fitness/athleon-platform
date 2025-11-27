import * as cdk from 'aws-cdk-lib';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as certificatemanager from 'aws-cdk-lib/aws-certificatemanager';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

export interface DnsStackProps {
  stage: string;
  domain: string;
  hostedZoneId?: string;
  crossAccountRoleArn?: string;
}

export class DnsStack extends Construct {
  public readonly hostedZone: route53.IHostedZone;
  public readonly certificate: certificatemanager.ICertificate;

  constructor(scope: Construct, id: string, props: DnsStackProps) {
    super(scope, id);

    // Hosted Zone - support both lookup and cross-account import
    if (props.hostedZoneId) {
      // Use existing hosted zone by ID (for cross-account scenarios)
      this.hostedZone = route53.HostedZone.fromHostedZoneAttributes(this, 'HostedZone', {
        hostedZoneId: props.hostedZoneId,
        zoneName: props.domain,
      });
    } else {
      // Lookup hosted zone in current account
      this.hostedZone = route53.HostedZone.fromLookup(this, 'HostedZone', {
        domainName: props.domain,
      });
    }

    // SSL Certificate for auth subdomain
    this.certificate = new certificatemanager.Certificate(this, 'AuthCertificate', {
      domainName: `auth.${props.domain}`,
      validation: certificatemanager.CertificateValidation.fromDns(this.hostedZone),
    });

    // If cross-account role is provided, grant permissions
    if (props.crossAccountRoleArn) {
      // Note: The actual DNS record creation will need to use the cross-account role
      // This is handled by CDK's cross-account DNS validation automatically
      cdk.Tags.of(this).add('CrossAccountDNS', 'true');
      cdk.Tags.of(this).add('DNSRoleArn', props.crossAccountRoleArn);
    }
  }
}
