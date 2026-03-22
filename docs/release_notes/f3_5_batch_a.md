# F3.5 — Batch A: Supabase Backend Persistence

**Date:** 2026-03-22
**Branch:** `feature/f3.5/database-setup`

## What was created

### `infra/terraform/main.tf` (new)
- Terraform config for Supabase project provisioning via `supabase/supabase` provider
- `supabase_project` resource for project creation in `eu-west-2`
- `supabase_settings` resource for auth settings
- `supabase_apikeys` data source for retrieving `anon_key`
- Outputs for `project_ref`, `project_url`, and `anon_key`

### `infra/terraform/variables.tf` (new)
- Variables for `supabase_access_token`, `supabase_org_id`, `supabase_db_password`
- Sensitive flags on token/password variables

### `infra/lambda/pre-token-generation/index.mjs` (new)
- Cognito Pre-Token Generation trigger
- Adds `role: authenticated` claim to JWTs for Supabase role mapping

### `app/src/config/supabase.ts` (new)
- Supabase client setup using `@supabase/supabase-js`
- Uses current Cognito access token from Amplify `fetchAuthSession()` per request

### `app/src/utils/crypto.ts` (new)
- AES-256-GCM credential encryption/decryption using Web Crypto API
- Imports key from `VITE_ENCRYPTION_KEY` (64 hex chars)
- Stores IV + ciphertext as base64

### `app/src/services/dataSourcesService.ts` (new)
- Supabase CRUD service for `data_sources`
- `snake_case` database mapping to frontend `camelCase`
- Encrypts credentials before writes and decrypts after reads

### `supabase/migrations/20250101000000_create_data_sources.sql` (new)
- `public.data_sources` table
- `user_id` index for per-user queries
- Row-Level Security enabled
- Four RLS policies for select/insert/update/delete ownership checks using JWT `sub`

### `app/.env.example` (new)
- Template for Supabase URL/key and encryption key setup

## What was modified

### `infra/lib/auth-stack.ts`
- Added Lambda function resource for pre-token generation
- Attached function to Cognito User Pool as `PRE_TOKEN_GENERATION` trigger

### `app/src/store/dataSourcesSlice.ts`
- Replaced synchronous reducers with async thunks:
  - `fetchDataSources`
  - `createDataSource`
  - `updateDataSource`
  - `deleteDataSource`
- Added `loading` and `error` state handling
- Added selectors for loading and error states

### `app/src/pages/DataSourcesPage.tsx`
- Dispatches `fetchDataSources` on authenticated mount
- Added loading state and error banner handling

### `app/src/components/DataSourceModal.tsx`
- Migrated create/update/delete operations to async thunks
- Replaced credential removal action with async update thunk
- Save button disabled while async operation is in flight

### `app/package.json` / `app/package-lock.json`
- Added `@supabase/supabase-js`

### `.gitignore`
- Added Terraform state/artifact ignore entries under `infra/terraform/`

### `SETUP.md`
- Added Terraform and Supabase CLI prerequisites
- Added Supabase one-time setup section (provisioning, config push, migrations, env vars)

### `supabase/config.toml`
- Enabled `auth.third_party.aws_cognito`
- Set Cognito user pool ID and region

## Manual steps and deployment actions

- Installed Terraform locally via Homebrew
- Ran `terraform init`, `terraform plan`, `terraform apply` in `infra/terraform`
- Provisioned Supabase project:
  - `project_ref`: `msbtuqsmtidbjugudgoy`
  - `project_url`: `https://msbtuqsmtidbjugudgoy.supabase.co`
- Retrieved `anon_key` from Terraform output and updated local `app/.env`
- Generated and set `VITE_ENCRYPTION_KEY` in local `app/.env`
- Installed/used Supabase CLI via `npx supabase` workflow
- Linked Supabase project and initialized local Supabase config
- Applied SQL migration to remote database via Supabase Management API
- Deployed CDK `AuthStack` after `npx tsc --noEmit`

## Issues encountered and resolutions

- `terraform plan` failed because `supabase_project.crypto_tracker.anon_key` does not exist in provider schema
  - Resolution: switched to `data "supabase_apikeys"` and output `data.supabase_apikeys.keys.anon_key`

- Homebrew install for Supabase CLI failed due outdated Xcode Command Line Tools
  - Resolution: used `npx supabase` instead of global CLI install

- Supabase requests returned 401 with `No suitable key or wrong key type`
  - Resolution: configured Supabase third-party auth for Cognito OIDC issuer and verified resolved JWKS

- Initial third-party auth API attempts created invalid/empty custom entries
  - Resolution: removed stale entries and retained valid Cognito entry

## Verification

- `npm run typecheck` in `app/` passes
- `npm run build` in `app/` passes
- `npx tsc --noEmit` in `infra/` passes
- `npx cdk deploy AuthStack` succeeded
- Data Sources UI now persists rows in Supabase and reloads correctly after refresh
