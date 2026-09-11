import * as cdk from 'aws-cdk-lib/core';
import { Construct } from 'constructs';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as sns_sub from 'aws-cdk-lib/aws-sns-subscriptions';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as lambdatriggers from 'aws-cdk-lib/aws-lambda-event-sources';
import * as dynamo from 'aws-cdk-lib/aws-dynamodb';

export interface MessagingStackProps extends cdk.StackProps {
  analyticsTable: dynamo.ITable;
  inventoryTable: dynamo.ITable;
}

export class MessagingStack extends cdk.Stack {
  public readonly orderTopic: sns.Topic;

  constructor(scope: Construct, id: string, props: MessagingStackProps) {
    super(scope, id, props);

    this.orderTopic = new sns.Topic(this, 'SNS', {
      displayName: 'ricemill_snstopic',
      topicName: 'ricemill_snstopic_orderplaced',
      fifo: false,
    });

    const emailDlq = new sqs.Queue(this, 'SQS-email-dlq', { queueName: 'SQS-email-dlq' });
    const inventoryDlq = new sqs.Queue(this, 'SQS-inventory-dlq', { queueName: 'SQS-inventory-dlq' });
    const analyticsDlq = new sqs.Queue(this, 'SQS-analytics-dlq', { queueName: 'SQS-analytics-dlq' });

    const emailQueue = new sqs.Queue(this, 'SQS-email', {
      queueName: 'SQS-email',
      deadLetterQueue: { queue: emailDlq, maxReceiveCount: 2 },
    });
    const inventoryQueue = new sqs.Queue(this, 'SQS-inventory', {
      queueName: 'SQS-inventory',
      deadLetterQueue: { queue: inventoryDlq, maxReceiveCount: 2 },
    });
    const analyticsQueue = new sqs.Queue(this, 'SQS-analytics', {
      queueName: 'SQS-analytics',
      deadLetterQueue: { queue: analyticsDlq, maxReceiveCount: 2 },
    });

    const sqsPolicy = new sqs.QueuePolicy(this, 'SQS-policy', {
      queues: [emailDlq, inventoryDlq, analyticsDlq],
    });
    sqsPolicy.document.addStatements(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      principals: [new iam.ServicePrincipal('sns.amazonaws.com')],
      actions: ['sqs:SendMessage'],
      resources: [emailDlq.queueArn, inventoryDlq.queueArn, analyticsDlq.queueArn],
      conditions: { ArnEquals: { 'aws:SourceArn': this.orderTopic.topicArn } },
    }));

    this.orderTopic.addSubscription(new sns_sub.SqsSubscription(emailQueue));
    this.orderTopic.addSubscription(new sns_sub.SqsSubscription(inventoryQueue));
    this.orderTopic.addSubscription(new sns_sub.SqsSubscription(analyticsQueue));

    const emailLambdaRole = new iam.Role(this, 'sqslambdaiam_email', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
      ],
    });
      emailLambdaRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          "ses:SendEmail"
        ],
        resources: ["*"],
      })
    );
    
    const dataLambdaRole = new iam.Role(this, 'sqslambdaiam', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
      ],
    });
    props.analyticsTable.grantReadWriteData(dataLambdaRole);
    props.inventoryTable.grantReadWriteData(dataLambdaRole);

    const emailLambda = new lambda.Function(this, 'sqsemaillambda', {
      runtime: lambda.Runtime.NODEJS_24_X,
      handler: 'sqsemail.handler',
      code: lambda.Code.fromAsset('lambda'),
      role: emailLambdaRole,
    });
    emailQueue.grantConsumeMessages(emailLambda);


    const analyticsLambda = new lambda.Function(this, 'sqs_analytics_lambda', {
      runtime: lambda.Runtime.NODEJS_24_X,
      handler: 'sqsanalytics.handler',
      code: lambda.Code.fromAsset('lambda'),
      role: dataLambdaRole,
    });
    analyticsQueue.grantConsumeMessages(analyticsLambda);
   
    const inventoryLambda = new lambda.Function(this, 'sqs_inventory_lambda', {
      runtime: lambda.Runtime.NODEJS_24_X,
      handler: 'sqsinventory.handler',
      code: lambda.Code.fromAsset('lambda'),
      role: dataLambdaRole,
    });
    inventoryQueue.grantConsumeMessages(inventoryLambda);


    emailLambda.addEventSource(new lambdatriggers.SqsEventSource(emailQueue));
    inventoryLambda.addEventSource(new lambdatriggers.SqsEventSource(inventoryQueue));
    analyticsLambda.addEventSource(new lambdatriggers.SqsEventSource(analyticsQueue));
  }
}