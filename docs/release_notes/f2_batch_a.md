# F2 — Batch A: Google OAuth Credentials

**Date:** 2026-02-13
**Tasks:** T1

## What was done

### Google Cloud Console (Manual)
- Created Google Cloud project `crypto-tx-tracker`
- Created OAuth 2.0 Client ID (Web application type)
  - Client ID: `714795111419-hqn5el5ll22b04nua8ckadjvgpksqqve.apps.googleusercontent.com`
  - Authorised redirect URIs: left blank (to be updated after AuthStack deploy in Batch C)

### AWS Secrets Manager (CLI)
- Created secret `crypto_tx_tracker_google_oauth` in `eu-west-2`
  - ARN: `arn:aws:secretsmanager:eu-west-2:533267126035:secret:crypto_tx_tracker_google_oauth-diccvc`
  - Keys: `clientId`, `clientSecret`

## Pending
- Update Google Console redirect URI after Cognito domain is known (Batch C)
