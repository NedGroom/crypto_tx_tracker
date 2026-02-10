# Development Setup

## System Prerequisites

These are one-time installs on your development machine.

### 1. Node.js (≥ 18 LTS)

Download from [nodejs.org](https://nodejs.org/) or install via winget:

```powershell
winget install OpenJS.NodeJS.LTS
```

Verify:
```powershell
node --version   # should be ≥ 18
npm --version    # bundled with Node
```

### 2. AWS CLI v2

Required for deploying infrastructure.

```powershell
winget install Amazon.AWSCLI
```

After installing, **restart your terminal**, then configure with your IAM credentials:

```powershell
aws configure
```

It will prompt for:
| Prompt | What to enter |
|---|---|
| AWS Access Key ID | From your IAM user (AWS Console → IAM → Users → Security credentials) |
| AWS Secret Access Key | Shown once when you create the access key — save it |
| Default region | `eu-west-2` |
| Default output format | `json` |

Verify:
```powershell
aws sts get-caller-identity
```

Should return your account ID and user ARN.

### 3. Git

Already installed if you cloned this repo. Verify: `git --version`

---

## Project Setup

### App (React)

```powershell
cd app
npm install
```

### Infrastructure (CDK)

```powershell
cd infra
npm install
```

CDK CLI is installed as a local dependency — use `npx cdk` instead of `cdk`.

---

## AWS One-Time Setup

### 1. Bootstrap CDK

CDK needs a one-time bootstrap per AWS account + region. This creates an S3 bucket and IAM roles that CDK uses internally.

```powershell
cd infra
npx cdk bootstrap aws://ACCOUNT_ID/eu-west-2
```

Replace `ACCOUNT_ID` with the number from `aws sts get-caller-identity`.

### 2. Store GitHub Token in Secrets Manager

Amplify needs a GitHub Personal Access Token to clone the repo and set up webhooks.

1. Go to [GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)](https://github.com/settings/tokens)
2. Generate a new token with the **`repo`** scope (full control of private repos)
3. Copy the token, then store it in AWS Secrets Manager:

```powershell
aws secretsmanager create-secret --name github-token --secret-string "ghp_YOUR_TOKEN_HERE" --region eu-west-2
```

---

## Deploy

```powershell
cd infra
npx cdk deploy
```

This creates the Amplify app in AWS. After the first deploy, Amplify auto-deploys on every push to `main`.

---

## Day-to-Day Commands

| Command | Where | What it does |
|---|---|---|
| `npm run dev` | `app/` | Start local dev server (localhost:5173) |
| `npm run dev -- --host` | `app/` | Dev server accessible on local network (mobile testing) |
| `npm run ci` | `app/` | Run full lint/type/format/build check |
| `npm run build` | `app/` | Production build to `app/dist/` |
| `npx cdk deploy` | `infra/` | Deploy infrastructure changes |
| `npx cdk diff` | `infra/` | Preview infrastructure changes without deploying |
| `npx cdk destroy` | `infra/` | Tear down all infrastructure |
