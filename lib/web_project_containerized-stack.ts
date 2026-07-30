import * as cdk from 'aws-cdk-lib/core';
import { Construct } from 'constructs';
import * as targets from 'aws-cdk-lib/aws-route53-targets';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as cognito from "aws-cdk-lib/aws-cognito";
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as alb from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as s3deploy from "aws-cdk-lib/aws-s3-deployment";
import * as dynamo from "aws-cdk-lib/aws-dynamodb";


export class WebProjectContainerizedStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    //Let's describe the infrastructure we have route53 creating record that points to cloudfront distribution dns, we need new distribution which points to 

    // We also need custom api domain for routing requests to backend we can not directly send requests to alb url fron the frontend js so we create custom domain 

    const route53_hostedZone  = route53.HostedZone.fromLookup(this,'ExistingZon',
      {
        domainName: "shruti-singla.com"
  });

  //distribution needs certificate, s3 bucket so we create them first and we also need origin access control policy (oac) so that only cloudfront can access the bucket 
    const mybucket = new s3.Bucket(this,'Ricemillcontainerized',{
      bucketName: "ricemill-containerized",
    });

    new s3deploy.BucketDeployment(this, "DeployWebsite", {
      destinationBucket: mybucket,
      sources: [
        s3deploy.Source.asset("frontend")
      ]
    });


    const oac = new cloudfront.S3OriginAccessControl(this,'s3originaccess',{
      signing : cloudfront.Signing.SIGV4_NO_OVERRIDE
    });



    //once we have origin access control policy we need to copy it in the bucket policy so this is the bucket origin now with oac attached to it
    const s3Origin = origins.S3BucketOrigin.withOriginAccessControl(mybucket, {
      originAccessControl: oac
    })

    const cloudfront_certificate =  acm.Certificate.fromCertificateArn(this, 'Webcertificate',"arn:aws:acm:us-east-1:882885365745:certificate/66f1b971-43d8-4097-948d-036ec82b5388");

    const alb_certificate =  acm.Certificate.fromCertificateArn(this, 'ALBcertificate',"arn:aws:acm:us-east-1:882885365745:certificate/1fcdffb1-e493-4bd7-8fa1-a8c608efe0c9");

    const distribution = new cloudfront.Distribution(this,"webdistribution",{
      defaultBehavior :{
        origin: s3Origin,
        cachePolicy : cloudfront.CachePolicy.CACHING_DISABLED,
      },
      domainNames : ["test.ricemill.shruti-singla.com"],
      certificate: cloudfront_certificate,
      defaultRootObject : "index.html",

    })

   new route53.ARecord(this,'Aliasrecord',{
      zone: route53_hostedZone ,
      recordName : "test.ricemill.shruti-singla.com",
      target: route53.RecordTarget.fromAlias(
        new targets.CloudFrontTarget(distribution),
    )       
  });


  const userPool = new cognito.UserPool(this, "Userpool",{
    selfSignUpEnabled : true,
    passwordPolicy : {
      minLength:6,
      requireSymbols : false,  //default for require upper and lowercase is true and atleast 1 needed 
    },
    // UserVerificationConfig this config email properties for config and we keep the m default

    signInAliases: {
      username: true,
      email: true, // Optional: lets users sign in with either username or email
    },
  
    standardAttributes: {
      email: {
        required: true,
        mutable: true,
      },
    },
  }
  )  //this is userpool Object 

  //once we have userPool then we need userclient named ricemill
  const poolclient = userPool.addClient("RiceMillClient", {
    userPoolClientName : "Ricemill_containerized",
  });  



  const vpc = new ec2.Vpc(this,"VPC",{
    cidr : "10.16.0.0/18", 
    //maxAzs: 2,   ///since n.virgina has 6 az's if we do not specify which az then aws chooses 2 out of 6 az for us 
    availabilityZones: ["us-east-1a","us-east-1b"],
    subnetConfiguration: [
      {
        name: "Web",
        subnetType: ec2.SubnetType.PUBLIC,
        cidrMask: 21,

      },
      {
        name: "Application",
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
        cidrMask: 21,

      },
      {
        name: "Database",
        subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
        cidrMask: 21,

      }
    ],
    vpcName: "Ricemill_vpc"
   //need 6 subnets 3 in each az so we go /18 -> /19 (2 subnets) /19 -> 20 (4 subnets) 20-> 21(8subnets) so we make cidr blocks of /21 ot get 6 subnets 
  //  10.16.00 _ _ _ 000.0/21   //ie network bits borrow 3 bits from hosted zone now these 3 bits could be anything we have 2^3 = 8 diff combinations , 8 diff subnets 
  //  10.16.0.0/21 , 10.16.8.0/21, 10.16.16.0/21,10.16.32.0/21

  });
  const securitygroup = new ec2.SecurityGroup(this, "albsecuritygroup",{
    securityGroupName: "ricemill_alb_sg",
    vpc: vpc,
    description: "Security group for the ALB",
  })
 
  //security groups allow traffic to reach alb now alb need listener port, so alb is listening on port and if request reaches to that port via secutity group then alb decides where to send the traffic to 
  // securitygroup.addIngressRule(
  //   ec2.Peer.anyIpv4(),
  //   ec2.Port.tcp(80),
  //   "Allow HTTP traffic"
  // );

  securitygroup.addIngressRule(
    ec2.Peer.anyIpv4(),
    ec2.Port.tcp(443),
    "Allow HTTPS traffic"
  );


  //now we need another a record for backend where the origin would be alb 
  const loadbalancer = new alb.ApplicationLoadBalancer(this,"loadbalancer",{
      loadBalancerName : "ricemill-load-balancer",
      vpc: vpc,
      internetFacing: true,
       vpcSubnets:{
        subnetType:ec2.SubnetType.PUBLIC,
       },
      securityGroup: securitygroup

  });

  //now we need a listener at port 443 for ALB , we show certificate where this connection ends (ie viewer policy) now we will make new connection with the target 
   const listener = loadbalancer.addListener('ALBlistener',{
    protocol: alb.ApplicationProtocol.HTTPS,
    port:  443,
    certificates : [alb_certificate],
   })
   

   //container definition - which port container uses , which image container uses (essentially layout for 1 running container),env variables if any 
   //task defnition could have 1 container definition or multiple , it stores resources such as cpu , memory , iam role/task role, stores whether task work on ec2 or fargate , 

  //this task definition will need access to ECR to pull up the image listed in the container definition so that it can run the container
  //execution role is automatically created but do we need to attach policies with it, if we use ecr images which is the case for us.
  // now task role lets our container access aws resources lets say my container has backend code that needs access to dynamodb , then it needs task role to achieve this 
  const cluster = new ecs.Cluster(this, "Cluster", {
    vpc: vpc
  });

  const executionRole = new iam.Role(this,'ExecutionRoleECR',{
    assumedBy: new iam.ServicePrincipal("ecs-tasks.amazonaws.com"),
    managedPolicies: [
      iam.ManagedPolicy.fromAwsManagedPolicyName(
        "service-role/AmazonECSTaskExecutionRolePolicy",
      )]
  });

  const taskRole = new iam.Role(this,'TaskRolecontainer',{
    assumedBy: new iam.ServicePrincipal("ecs-tasks.amazonaws.com"),
    managedPolicies: [
      iam.ManagedPolicy.fromAwsManagedPolicyName("AmazonDynamoDBFullAccess")
    ]
  });

   const taskdefinition = new ecs.FargateTaskDefinition(this,'TaskDefinition',{
    memoryLimitMiB: 1024,
    cpu: 512,
    executionRole: executionRole,
    taskRole: taskRole,
   });





   //----------------------------------------------------------------------------//

   const db_user = new dynamo.Table(this, "RicemillUserTable", {
    tableName: "Ricemill_user_cdk",
  
    partitionKey: {
      name: "user_id",
      type: dynamo.AttributeType.STRING
    },
  
    billingMode: dynamo.BillingMode.PAY_PER_REQUEST
  });

const db_products = new dynamo.Table(this, "RicemilproductsTable", {
  tableName: "Ricemill_products_cdk",

  partitionKey: {
    name: "prod_id",
    type: dynamo.AttributeType.STRING
  },

  billingMode: dynamo.BillingMode.PAY_PER_REQUEST
});



const db_getcartcount = new dynamo.Table(this, "RicemillcartcountTable", {
  tableName: "Ricemill_carts_cdk",

  partitionKey: {
    name: "user_id",
    type: dynamo.AttributeType.STRING
  },
  sortKey: {
    name: "product_id",
    type: dynamo.AttributeType.STRING,
  },

  billingMode: dynamo.BillingMode.PAY_PER_REQUEST
});

const db_putorders = new dynamo.Table(this, "RicemillputordersTable", {
  tableName: "Ricemill_orders_cdk",

  partitionKey: {
    name: "user_id",
    type: dynamo.AttributeType.STRING
  },
  sortKey: {
    name: "order_id",
    type: dynamo.AttributeType.STRING,
  },

  billingMode: dynamo.BillingMode.PAY_PER_REQUEST
});

const db_analytics = new dynamo.Table(this, "RicemillanalyticsTable", {
  tableName: "Ricemill_analytics_v3_cdk",

  partitionKey: {
    name: "metric_name",
    type: dynamo.AttributeType.STRING
  },
  billingMode: dynamo.BillingMode.PAY_PER_REQUEST
});


const db_product_inventory = new dynamo.Table(this, "RicemillproductinventoryTable", {
  tableName: "Ricemill_product_inventory_cdk",

  partitionKey: {
    name: "product_id",
    type: dynamo.AttributeType.STRING
  }, 
  billingMode: dynamo.BillingMode.PAY_PER_REQUEST
});

   //----------------------------------------------------------------------------//

   const repository = ecr.Repository.fromRepositoryName(
    this,
    "BackendRepository",
    "backend"
  );        //here since we did not specify the tag container will always pull the image with tag latest so backend:latest
  
    const containerDefinition = taskdefinition.addContainer("ContainerDefinition", {
      image: ecs.ContainerImage.fromEcrRepository(repository),
      environment:{
        USER_TABLE:db_user.tableName,
        PRODUCTS_TABLE:db_products.tableName,
        CART_TABLE:db_getcartcount.tableName,
        ORDER_TABLE:db_putorders.tableName,
        ANALYTICS_TABLE:db_analytics.tableName,
        INVENTORY_TABLE:db_product_inventory.tableName,
        
     },
      memoryLimitMiB: 512,
      logging: ecs.LogDrivers.awsLogs({
        streamPrefix: "ricemill-api"
      })
    });

    containerDefinition.addPortMappings({
      containerPort: 3000
    });


    const securitygrouptask = new ec2.SecurityGroup(this, "tasksecuritygroupecs",{
      securityGroupName: "ricemill_ecs_task_sg",
      vpc: vpc,
      description: "Security group for the task",
    });

    securitygrouptask.addIngressRule(
      securitygroup,   
      ec2.Port.tcp(3000),
      "Allow HTTPS/HTTP traffic"
    );

   

   //lets create ecs Service 
    //- We need task definition 
    const ecsService = new ecs.FargateService(this,'ECSFargateService',{
      cluster: cluster,
      taskDefinition: taskdefinition,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS
      },
      desiredCount: 1,
      serviceName: "Ricemill_ECS_service",
      securityGroups: [securitygrouptask], //this is the security group that will be attached to all the tasks that will be launched now it should have inbound for alb 
    });



    // ecs cluster -> Service -> Tasks(we gets containers,we get security group and ENI,gets iam role) -> Task Definiton (contains images, and the other cpu,ram, defines iam role) 


   //now since target group does not need to make network connection they do not have security groups, now target group is logical collection of all the tasks which are listening on same port so lets say 3000 so target group contains information of that port 
   listener.addTargets('ALBtargetGroup',{
    port:3000,
    protocol: alb.ApplicationProtocol.HTTP,
    targets: [ecsService],  // Create a target group, and register the tasks created by this ECS service as targets on port 3000. lets say we have task definition with 2 images and we want 3 running tasks so create a sevice now we have 6 running containers (ie targets) now they will be attached to the targetgroup so we attach service as the target.Container is running copy of the docker image.
    healthCheck: {
      path: "/",
      healthyHttpCodes: "200"
  }


   });    

  new route53.ARecord(this,'Aliasrecord_alb',{
    zone: route53_hostedZone ,
    recordName : "api.shruti-singla.com",
    target: route53.RecordTarget.fromAlias(
    new targets.LoadBalancerTarget(loadbalancer),
  )       
});



  }
}
