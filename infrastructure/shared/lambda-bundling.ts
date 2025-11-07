import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as cdk from 'aws-cdk-lib';

export interface BundledLambdaProps {
  runtime?: lambda.Runtime;
  handler?: string;
  timeout?: cdk.Duration;
  memorySize?: number;
  environment?: { [key: string]: string };
  layers?: lambda.LayerVersion[];
}

export function createBundledLambda(
  scope: any, 
  id: string, 
  domainPath: string, 
  props: BundledLambdaProps = {}
): lambda.Function {
  return new lambda.Function(scope, id, {
    runtime: props.runtime || lambda.Runtime.NODEJS_18_X,
    handler: props.handler || 'index.handler',
    code: lambda.Code.fromAsset(`lambda/${domainPath}`),
    timeout: props.timeout || cdk.Duration.seconds(30),
    memorySize: props.memorySize || 256,
    environment: props.environment || {},
    layers: props.layers || []
  });
}
