import * as cdk from 'aws-cdk-lib/core';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as alb from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';

export interface NetworkStackProps extends cdk.StackProps {
  domainName: string;
  albCertArn: string;
}

export class NetworkStack extends cdk.Stack {
  public readonly vpc: ec2.Vpc;
  public readonly hostedZone: route53.IHostedZone;
  public readonly loadBalancer: alb.ApplicationLoadBalancer;
  public readonly listener: alb.ApplicationListener;
  public readonly albSecurityGroup: ec2.SecurityGroup;

  constructor(scope: Construct, id: string, props: NetworkStackProps) {
    super(scope, id, props);

    this.hostedZone = route53.HostedZone.fromLookup(this, 'ExistingZone', {
      domainName: props.domainName,
    });

    this.vpc = new ec2.Vpc(this, 'VPC', {
      ipAddresses: ec2.IpAddresses.cidr('10.16.0.0/18'),
      availabilityZones: ['us-east-1a', 'us-east-1b'],
      subnetConfiguration: [
        { name: 'Web', subnetType: ec2.SubnetType.PUBLIC, cidrMask: 21 },
        { name: 'Application', subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS, cidrMask: 21 },
        { name: 'Database', subnetType: ec2.SubnetType.PRIVATE_ISOLATED, cidrMask: 21 },
      ],
      vpcName: 'Ricemill_vpc',
    });

    this.albSecurityGroup = new ec2.SecurityGroup(this, 'albsecuritygroup', {
      securityGroupName: 'ricemill_alb_sg',
      vpc: this.vpc,
      description: 'Security group for the ALB',
    });
    this.albSecurityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(443), 'Allow HTTPS traffic');

    const albCertificate = acm.Certificate.fromCertificateArn(this, 'ALBcertificate', props.albCertArn);

    this.loadBalancer = new alb.ApplicationLoadBalancer(this, 'loadbalancer', {
      loadBalancerName: 'ricemill-load-balancer',
      vpc: this.vpc,
      internetFacing: true,
      vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
      securityGroup: this.albSecurityGroup,
    });

    this.listener = this.loadBalancer.addListener('ALBlistener', {
      protocol: alb.ApplicationProtocol.HTTPS,
      port: 443,
      certificates: [albCertificate],
    });
  }
}