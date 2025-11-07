import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';

export interface AthleonSharedLayerProps {
  stage: string;
}

export class AthleonSharedLayer extends Construct {
  public readonly layer: lambda.LayerVersion;

  constructor(scope: Construct, id: string, props: AthleonSharedLayerProps) {
    super(scope, id);

    // Create Lambda layer with shared utilities
    this.layer = new lambda.LayerVersion(this, 'AthleonSharedLayer', {
      layerVersionName: `athleon-shared-${props.stage}`,
      code: lambda.Code.fromAsset('layers/athleon-shared'),
      compatibleRuntimes: [lambda.Runtime.NODEJS_18_X, lambda.Runtime.NODEJS_20_X],
      description: 'Shared utilities for Athleon Lambda functions (auth, logger, etc.)',
    });

    // Output layer ARN for reference
    new cdk.CfnOutput(this, 'LayerArn', {
      value: this.layer.layerVersionArn,
      description: 'Athleon Shared Layer ARN',
      exportName: `AthleonSharedLayer-${props.stage}`,
    });
  }
}
