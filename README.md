# Rice Mill Management Platform

A cloud-native e-commerce application built using AWS CDK, with a containerized backend running on Amazon ECS Fargate.

This project demonstrates a production-style AWS architecture using Infrastructure as Code (IaC), a three-tier VPC network, event-driven order processing, and separate CI/CD pipelines for the frontend and backend.

---

# Architecture

![Architecture Diagram](containerized_webproject.png)

The application uses:

- **S3 + CloudFront** - Frontend hosting
- **Amazon VPC (3-tier)** - Public and private subnets with a NAT Gateway
- **Application Load Balancer (ALB)** - Public entry point for the backend API, deployed in the public subnet
- **Amazon ECS Fargate** - Containerized Express.js backend, deployed in the private subnet
- **Amazon ECR** - Docker image registry for backend container images
- **DynamoDB** - Database storage
- **Amazon Cognito** - User authentication
- **SNS + SQS** - Event-driven order processing, published directly from the Express backend
- **AWS CDK** - Infrastructure as Code
- **GitHub Actions** - Separate CI/CD pipelines for frontend and backend, using GitHub OIDC

> **Note:** The backend was originally built on API Gateway and AWS Lambda. It has since been migrated to a containerized Express.js service running on ECS Fargate behind an ALB, for greater control over long-running workflows and service scaling. The event-driven order processing flow (SNS → SQS → Lambda consumers) is unchanged.

---

# Prerequisites

Before deploying, install:

- Node.js 22
- AWS CDK Toolkit
- Docker (required locally — CDK builds and pushes the backend container image during deployment)

## Install Node.js

Download and install Node.js:

https://nodejs.org/en

Verify installation:

```bash
node -v
npm -v
```

---

## Install Docker

Download and install Docker Desktop (or Docker Engine on Linux):

https://www.docker.com/products/docker-desktop

Verify installation and that the Docker daemon is running:

```bash
docker --version
docker info
```
---

## Install AWS CDK

Install the AWS CDK CLI globally:

```bash
npm install -g aws-cdk
```

Verify:

```bash
cdk --version
```

---

## Configure AWS Credentials

Configure your AWS account:

```bash
aws configure
```

You will need:

- AWS Access Key ID
- AWS Secret Access Key
- Default region

---

# Deployment Instructions

## 1. Clone Repository

```bash
git clone https://github.com/shruti0121/webproject-cdk-ci-cd.git

cd webproject-cdk-ci-cd
```

---

## 2. Install Dependencies

Install project dependencies:

```bash
npm install
```

---

## 3. Bootstrap CDK

CDK bootstrap is required the first time you deploy CDK applications
in an AWS account and region.

```bash
cdk bootstrap
```

This creates the AWS resources required by CDK, including the CDK toolkit stack.

---

## 4. Deploy AWS Infrastructure

Make sure Docker is running, then deploy:

```bash
cdk deploy
```

During deployment, CDK will:

- Build the backend Docker image from the Express.js service
- Push the image to Amazon ECR
- Provision the VPC (public and private subnets, NAT Gateway)
- Provision the ALB in the public subnet
- Provision the ECS cluster and Fargate service in the private subnet
- Create DynamoDB tables
- Create Cognito resources
- Create SNS topics and SQS queues
- Create IAM roles
- Create S3 resources

After deployment, CDK will output required values such as:

- ALB DNS name (backend API base URL)
- Cognito User Pool ID
- Cognito Client ID

---

# Frontend Configuration

After deploying the backend, update:

```
ricemill-web-app-files/config.js
```

with your deployed AWS resources:

```javascript
window.APP_CONFIG = {
  region: "your-region",

  cognito: {
      userPoolId: "your-user-pool-id",
      clientId: "your-client-id"
  },

  api: {
      baseUrl: "your-alb-dns-name"
  }
};
```

The frontend requires these values to communicate with AWS services.

---

# CI/CD Pipelines

This project uses separate GitHub Actions pipelines for the frontend and backend, both triggered on every push to `main`.

## Backend Pipeline

1. Checks out the repository
2. Installs Node.js dependencies
3. Builds the Docker image for the Express.js backend
4. Authenticates with AWS using GitHub OIDC
5. Pushes the image to Amazon ECR
6. Deploys the updated ECS Fargate service via CDK

Workflow file:

```
.github/workflows/deploy-backend.yml
```

## Frontend Pipeline

1. Checks out the repository
2. Installs Node.js dependencies
3. Builds the frontend
4. Authenticates with AWS using GitHub OIDC
5. Syncs build output to Amazon S3
6. Invalidates the CloudFront distribution cache

Workflow file:

```
.github/workflows/deploy-frontend.yml
```

---

# Infrastructure Deployment Flow

## Frontend

```
GitHub Push
      |
      v
GitHub Actions
      |
      v
OIDC Authentication
      |
      v
AWS IAM Role
      |
      v
Build Frontend
      |
      v
Sync to S3
      |
      v
CloudFront Cache Invalidation
```

---

# Useful CDK Commands

## Build project

```bash
npm run build
```

## Run tests

```bash
npm run test
```

## Synthesize CloudFormation template

```bash
cdk synth
```

## Compare deployed stack changes

```bash
cdk diff
```

## Deploy stack

```bash
cdk deploy
```

---

# Technologies Used

- TypeScript
- Node.js
- Express.js
- Docker
- AWS CDK
- Amazon VPC
- Application Load Balancer
- Amazon ECS (Fargate)
- Amazon ECR
- Amazon DynamoDB
- Amazon Cognito
- Amazon SNS
- Amazon SQS
- Amazon S3
- Amazon CloudFront
- GitHub Actions
- GitHub OIDC