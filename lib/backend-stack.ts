import * as cdk from 'aws-cdk-lib/core';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as alb from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as targets from 'aws-cdk-lib/aws-route53-targets';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as dynamo from 'aws-cdk-lib/aws-dynamodb';

export interface BackendStackProps extends cdk.StackProps {
  domainName: string;
  vpc: ec2.Vpc;
  hostedZone: route53.IHostedZone;
  loadBalancer: alb.ApplicationLoadBalancer;
  listener: alb.ApplicationListener;
  albSecurityGroup: ec2.SecurityGroup;
  orderTopic: sns.Topic;
  tables: {
    user: dynamo.ITable; products: dynamo.ITable; cart: dynamo.ITable;
    orders: dynamo.ITable; analytics: dynamo.ITable; inventory: dynamo.ITable;
  };
}

export class BackendStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: BackendStackProps) {
    super(scope, id, props);

    const cluster = new ecs.Cluster(this, 'Cluster', { vpc: props.vpc });

    const executionRole = new iam.Role(this, 'ExecutionRoleECR', {
      assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
      managedPolicies: [iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AmazonECSTaskExecutionRolePolicy')],
    });

    const taskRole = new iam.Role(this, 'TaskRolecontainer', {
      assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
    });
    Object.values(props.tables).forEach(t => t.grantReadWriteData(taskRole));
    props.orderTopic.grantPublish(taskRole);

    const taskDefinition = new ecs.FargateTaskDefinition(this, 'TaskDefinition', {
      memoryLimitMiB: 1024, cpu: 512, executionRole, taskRole,
    });

    const repository = ecr.Repository.fromRepositoryName(this, 'BackendRepository', 'backend');

    const containerDefinition = taskDefinition.addContainer('ContainerDefinition', {
      image: ecs.ContainerImage.fromEcrRepository(repository),
      environment: {
        USER_TABLE: props.tables.user.tableName,
        PRODUCTS_TABLE: props.tables.products.tableName,
        CART_TABLE: props.tables.cart.tableName,
        ORDER_TABLE: props.tables.orders.tableName,
        ANALYTICS_TABLE: props.tables.analytics.tableName,
        INVENTORY_TABLE: props.tables.inventory.tableName,
        SNS_TOPIC_ARN: props.orderTopic.topicArn,
      },
      memoryLimitMiB: 512,
      logging: ecs.LogDrivers.awsLogs({ streamPrefix: 'ricemill-api' }),
    });
    containerDefinition.addPortMappings({ containerPort: 3000 });
    
    const taskSg = new ec2.SecurityGroup(this, 'tasksecuritygroupecs', {
      securityGroupName: 'ricemill_ecs_task_sg', vpc: props.vpc,
      description: 'Security group for the task',
    });
    taskSg.addIngressRule(props.albSecurityGroup, ec2.Port.tcp(3000), 'Allow traffic from ALB');

    const ecsService = new ecs.FargateService(this, 'ECSFargateService', {
      cluster, taskDefinition,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      desiredCount: 1,
      serviceName: 'Ricemill_ECS_service',
      securityGroups: [taskSg],
    });

    props.listener.addTargets('ALBtargetGroup', {
      port: 3000, protocol: alb.ApplicationProtocol.HTTP,
      targets: [ecsService],
      healthCheck: { path: '/', healthyHttpCodes: '200' },
    });

    new route53.ARecord(this, 'Aliasrecord_alb', {
      zone: props.hostedZone,
      recordName: `api.${props.domainName}`,
      target: route53.RecordTarget.fromAlias(new targets.LoadBalancerTarget(props.loadBalancer)),
    });
  }
}