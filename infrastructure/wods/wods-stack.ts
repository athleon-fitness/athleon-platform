import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as events from 'aws-cdk-lib/aws-events';
import { Construct } from 'constructs';
import { createBundledLambda } from '../shared/lambda-bundling';

export interface WodsStackProps  {
  stage: string;  eventBus: events.EventBus;
  organizationEventsTable: dynamodb.Table;
  organizationMembersTable: dynamodb.Table;
  scoresTable: dynamodb.Table;
}

export class WodsStack extends Construct {
  public readonly wodsLambda: lambda.Function;
  public readonly wodsTable: dynamodb.Table;
  public readonly wodsEventBus: events.EventBus;

  constructor(scope: Construct, id: string, props: WodsStackProps) {
    super(scope, id);

    // Domain-specific EventBridge Bus
    this.wodsEventBus = new events.EventBus(this, 'WodsEventBus', {
      eventBusName: `wods-domain-${props.stage}`,
    });

    // WODs Table
    this.wodsTable = new dynamodb.Table(this, 'WodsTable', {
      partitionKey: { name: 'eventId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'wodId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // WODs Lambda
    this.wodsLambda = createBundledLambda(this, 'WodsLambda', 'wods', {
      environment: {
        WODS_TABLE: this.wodsTable.tableName,
        ORGANIZATION_EVENTS_TABLE: props.organizationEventsTable.tableName,
        ORGANIZATION_MEMBERS_TABLE: props.organizationMembersTable.tableName,
        SCORES_TABLE: props.scoresTable.tableName,
        DOMAIN_EVENT_BUS: this.wodsEventBus.eventBusName,
        CENTRAL_EVENT_BUS: props.eventBus.eventBusName,
      },
    });

    // Grant permissions
    this.wodsTable.grantReadWriteData(this.wodsLambda);
    props.organizationEventsTable.grantReadData(this.wodsLambda);
    props.organizationMembersTable.grantReadData(this.wodsLambda);
    props.scoresTable.grantReadData(this.wodsLambda);
    this.wodsEventBus.grantPutEventsTo(this.wodsLambda);
    props.eventBus.grantPutEventsTo(this.wodsLambda);

    // Outputs
  }
}
