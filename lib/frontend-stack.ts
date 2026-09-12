import * as cdk from 'aws-cdk-lib/core';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as targets from 'aws-cdk-lib/aws-route53-targets';
import * as ssm from 'aws-cdk-lib/aws-ssm';

export interface FrontendStackProps extends cdk.StackProps {
  domainName: string;
  cloudfrontCertArn: string;
  hostedZone: route53.IHostedZone;
}

export class FrontendStack extends cdk.Stack {
  public readonly userPool: cognito.UserPool;
  public readonly userPoolClient: cognito.UserPoolClient;
  public readonly distribution: cloudfront.Distribution;

  constructor(scope: Construct, id: string, props: FrontendStackProps) {
    super(scope, id, props);

    // -------------------- S3 + CloudFront --------------------
    const bucket = new s3.Bucket(this, 'Ricemillcontainerized', {
      bucketName: 'ricemill-containerized',
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });


    const oac = new cloudfront.S3OriginAccessControl(this, 's3originaccess', {
      signing: cloudfront.Signing.SIGV4_NO_OVERRIDE,
    });

    const s3Origin = origins.S3BucketOrigin.withOriginAccessControl(bucket, {
      originAccessControl: oac,
    });

    const cloudfrontCertificate = acm.Certificate.fromCertificateArn(
      this, 'Webcertificate', props.cloudfrontCertArn
    );

    this.distribution = new cloudfront.Distribution(this, 'webdistribution', {
      defaultBehavior: {
        origin: s3Origin,
        cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
      },
      domainNames: [`test.ricemill.${props.domainName}`],
      certificate: cloudfrontCertificate,
      defaultRootObject: 'index.html',
    });

    new route53.ARecord(this, 'Aliasrecord', {
      zone: props.hostedZone,
      recordName: `test.ricemill.${props.domainName}`,
      target: route53.RecordTarget.fromAlias(
        new targets.CloudFrontTarget(this.distribution)
      ),
    });

    // -------------------- Cognito --------------------

    this.userPool = new cognito.UserPool(this, 'Userpool', {
      selfSignUpEnabled: true,
      passwordPolicy: {
        minLength: 6,
        requireSymbols: false,
      },
      signInAliases: {
        username: true,
        email: true,
      },
      standardAttributes: {
        email: {
          required: true,
          mutable: true,
        },
      },
    });

    this.userPoolClient = this.userPool.addClient('RiceMillClient', {
      userPoolClientName: 'Ricemill_containerized',
    });

    new s3deploy.BucketDeployment(this, 'DeployWebsite', {
      destinationBucket: bucket,
      sources: [
        s3deploy.Source.asset('frontend'),
        s3deploy.Source.data(
          'config.js',   
          `window.APP_CONFIG = ${JSON.stringify({
            region: this.region,
            cognito: {
              userPoolId: this.userPool.userPoolId,
              clientId: this.userPoolClient.userPoolClientId,
            },
            api: {
              baseUrl: `https://api.${props.domainName}`,
            },
          }, null, 2)};`  
        ),
      ],
    });

   
  }
}