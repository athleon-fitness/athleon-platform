import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
export interface AthleonStackProps extends cdk.StackProps {
    stage: string;
}
export declare class AthleonStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props: AthleonStackProps);
}
