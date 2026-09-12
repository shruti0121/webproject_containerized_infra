#!/usr/bin/env node
import 'dotenv/config';
import * as cdk from 'aws-cdk-lib';
import { NetworkStack } from '../lib/network-stack';
import { DataStack } from '../lib/data-stack';
import { MessagingStack } from '../lib/messaging-stack';
import { BackendStack } from '../lib/backend-stack';
import { FrontendStack } from '../lib/frontend-stack';

const domainName = process.env.DOMAIN_NAME;
const cloudfrontCertArn = process.env.CLOUDFRONT_CERT_ARN;
const albCertArn = process.env.ALB_CERT_ARN;

if (!domainName || !cloudfrontCertArn || !albCertArn) {
  throw new Error('Missing required env vars — check your .env file against .env.example');
}
const app = new cdk.App();

const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: 'us-east-1',
};

const network = new NetworkStack(app, 'RicemillNetworkStack', { domainName, albCertArn, env });
const data = new DataStack(app, 'RicemillDataStack', { env });
const messaging = new MessagingStack(app, 'RicemillMessagingStack', {
  analyticsTable: data.analyticsTable,
  inventoryTable: data.inventoryTable,
  env,
});
new BackendStack(app, 'RicemillBackendStack', {
  domainName,
  vpc: network.vpc,
  hostedZone: network.hostedZone,
  loadBalancer: network.loadBalancer,
  listener: network.listener,
  albSecurityGroup: network.albSecurityGroup,
  orderTopic: messaging.orderTopic,
  tables: {
    user: data.userTable, products: data.productsTable, cart: data.cartTable,
    orders: data.ordersTable, analytics: data.analyticsTable, inventory: data.inventoryTable,
  },
  env,
});
new FrontendStack(app, 'RicemillFrontendStack', { domainName, cloudfrontCertArn, hostedZone: network.hostedZone, env });