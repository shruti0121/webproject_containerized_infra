# Ricemill E-Commerce Platform — AWS Infrastructure

Containerized e-commerce backend for a rice mill business, deployed on ECS Fargate 
behind an ALB, with a static S3/CloudFront frontend, Cognito auth, and an 
SNS/SQS/Lambda pipeline for async order processing (email, inventory, analytics).

## Architecture

![Architecture Diagram](containerized_webproject.png)

Route 53 splits traffic: frontend subdomain resolves to CloudFront (serving 
the Single page application from S3), and `api.<domain>` resolves to an ALB, which forwards to an ECS 
Fargate service in a private subnet. The backend publishes order events to SNS, 
which fans out to three SQS queues (each with its own DLQ), consumed by dedicated 
Lambdas.

## Why these services

- **ECS Fargate over EC2** — no host patching/AMI management to maintain; scales 
  the container without managing underlying instances.
- **CloudFront + S3 for frontend** — cheap static hosting with edge caching; 
  Origin Access Control means the bucket has no public access, only CloudFront 
  can read it.
- **DynamoDB with PAY_PER_REQUEST** — traffic is unpredictable/low-volume for 
  this project, so on-demand billing avoids paying for idle provisioned capacity.
- **SNS fan-out + SQS with DLQs** — decouples order placement from downstream 
  side effects (email, inventory update, analytics); each queue has a DLQ with 
  `maxReceiveCount: 2` so failed messages are inspectable rather than silently lost.
- **Cognito for auth** — avoids building/maintaining custom auth; handles 
  password policy, email verification, and JWT issuance out of the box.

## Repo structure

    lib/            — one CDK stack per concern (network, data, messaging, backend, frontend)
    lambda/          — SQS consumer functions (email, inventory, analytics)
    frontend/        — static site assets deployed to S3
    bin/             — CDK app entry point, wires stacks together

## Prerequisites

- Node.js 22+, AWS CDK CLI (`npm install -g aws-cdk`)
- An AWS account with an existing Route 53 hosted zone for your domain
- ACM certificates for the domain (CloudFront cert must be in `us-east-1`)
- Copy `.env.example` to `.env` and fill in `DOMAIN_NAME`, `CLOUDFRONT_CERT_ARN`, `ALB_CERT_ARN`

## Deploy

    npm install
    npx cdk synth      # sanity check the synthesized template
    npx cdk deploy --all

CI/CD via GitHub Actions deploys automatically on push to `main` (see 
`.github/workflows/deploy.yml`), using OIDC role assumption — no long-lived AWS 
keys stored in the repo.

## Known limitations / next steps

- Amazon SES: Used by the email-processing Lambda to send notification emails. SES domain/identity configuration was completed manually through the AWS Console and is not currently provisioned by CDK.
- No automated tests yet beyond CDK synth — plan to add `assertions`-based 
  snapshot tests
- Single ECS task (`desiredCount: 1`) — no auto-scaling configured yet

## Cost considerations

- Fargate + ALB are the main fixed costs (~$X/month idle) — no auto-scaling means cost is flat regardless of traffic
- DynamoDB PAY_PER_REQUEST and Lambda are usage-based — near-zero at low traffic
- CloudFront + S3 frontend hosting is negligible for this scale

## Security

- No hardcoded credentials or account IDs — parameterized via `.env` (local) / GitHub Actions secrets (CI)
- OIDC-based GitHub Actions deploy role — no long-lived AWS access keys stored anywhere
- S3 bucket has no public access; only CloudFront can read it via Origin Access Control
- IAM roles scoped to least-privilege grants (`grantReadWriteData`, `grantPublish`) rather than `*FullAccess` managed policies
- ALB listener only accepts port 443 with an ACM certificate; no unencrypted HTTP path exists
- Password policy and email verification enforced by the managed service rather than custom code


## Troubleshooting

**ECS tasks failing health checks / not registering with target group**
1. Check target group health in EC2 Console → Target Groups → look for 
   "Unhealthy" reason
2. Check container logs: CloudWatch → Log groups → `/ricemill-api`
3. Common cause: container not listening on port 3000, or `/` route not 
   returning 200

**Frontend not updating after `cdk deploy`**
- `BucketDeployment` uploads new files but CloudFront may serve stale content 
  from cache — the distribution uses `CACHING_DISABLED`, so this shouldn't 
  happen; if it does, check for a leftover cache invalidation issue

**SQS messages piling up in a DLQ**
- Indicates the corresponding Lambda failed processing `maxReceiveCount` (2) 
  times — check that Lambda's CloudWatch logs for the actual exception before 
  redriving messages back to the source queue

**`cdk deploy` fails with "Missing required env vars"**
- Locally: check `.env` exists and matches `.env.example`'s keys
- In CI: check the GitHub Actions repo secrets (`DOMAIN_NAME`, 
  `CLOUDFRONT_CERT_ARN`, `ALB_CERT_ARN`) are set and referenced in the 
  workflow's `env:` block

  IAM roles use scoped grants (`grantReadWriteData`, `grantPublish`) rather than 
  managed `*FullAccess` policies — see commit history for the least-privilege 
  migration