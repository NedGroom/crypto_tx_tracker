# F2 — Batch B: CDK Auth Stack & Config

**Date:** 2025-02-13
**Tasks:** T2, T3, T15 (CDK part)

## What was created

### `infra/lib/config.ts` (new)
- Central CDK config: account `533267126035`, region `eu-west-2`, Amplify app URL
- Exported as `cdkConfig` for use by all stacks

### `infra/lib/auth-stack.ts` (new)
- `AuthStack` — Cognito User Pool with email as username
- Google Identity Provider using Secrets Manager secret `crypto_tx_tracker_google_oauth`
- App Client with Authorization Code + PKCE (no client secret)
- Cognito domain prefix: `crypto-tx-tracker`
- Callback/logout URLs: Amplify prod URL + `localhost:5173` (dev)
- Stack outputs: `UserPoolId`, `UserPoolClientId`, `CognitoDomain`

## What was modified

### `infra/lib/amplify-stack.ts`
- Added `AmplifyStackProps` interface with `userPoolId`, `userPoolClientId`, `cognitoDomain`
- Injected `VITE_*` environment variables into Amplify build config:
  - `VITE_COGNITO_USER_POOL_ID`, `VITE_COGNITO_CLIENT_ID`, `VITE_COGNITO_DOMAIN`
  - `VITE_REDIRECT_SIGN_IN`, `VITE_REDIRECT_SIGN_OUT`

### `infra/bin/infra.ts`
- Imports `cdkConfig` for env (replaces `process.env.CDK_DEFAULT_ACCOUNT`)
- Creates `AuthStack` first, then passes Cognito outputs to `AmplifyStack`

## Verification
- `npx tsc --noEmit` — zero errors

## Dependencies introduced
- None (all CDK constructs from existing `aws-cdk-lib`)
