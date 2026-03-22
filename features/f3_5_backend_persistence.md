# F3.5: Backend Persistence for Data Sources

## 1. Introduction

F3 built the data sources UI — users can add, edit, and delete data sources with optional API credentials. Currently all state lives in Redux and is lost on page refresh. F3.5 adds a persistent backend so that data sources survive across sessions and devices.

This feature involves two decisions:

1. **Where to store the data** — the database or storage layer.
2. **How to serve requests** — the API layer between the frontend and the storage.

These are coupled but not identical: some options bundle both (e.g. Supabase gives you a database *and* an auto-generated API), while others require assembling them separately (e.g. DynamoDB for storage + API Gateway + Lambda for the API).

### What needs to be stored

At F3.5 scope, the data is small and simple:

| Field | Type | Notes |
|---|---|---|
| `userId` | `string` | Cognito `sub` — partition key to isolate each user's data |
| `id` | `string` | UUID per data source |
| `platformId` | `string` | e.g. `'binance'`, `'custom'` |
| `customPlatformName` | `string?` | Only when `platformId === 'custom'` |
| `displayName` | `string` | User-facing label |
| `credentials` | `object?` | `{ apiKey, apiSecret }` — **must be encrypted at rest** |
| `createdAt` | `string` | ISO timestamp |

This is a handful of records per user (likely < 20), with simple CRUD access patterns: list all for a user, get one, create, update, delete. No joins, no aggregation, no full-text search.

However, **future features (F4–F8) will store transaction data** — potentially thousands of rows per user with relational queries (joins, ordering, aggregation, grouping). The storage choice now should at least not *block* those future needs, even if we don't need to solve them today.

### Credential encryption

API keys and secrets are sensitive. Regardless of which storage option is chosen, credentials must be encrypted before being written to the database. The standard AWS approach is envelope encryption via **KMS** (Key Management Service): a KMS key encrypts a data key, and the data key encrypts the credential fields. This works with any storage layer and costs $1/month per KMS key + $0.03 per 10,000 API calls (negligible at this scale).

For non-AWS options (e.g. Supabase), encryption would need to happen application-side before writing, using a KMS key fetched from AWS or a library like `tweetnacl`. The important principle is: **credentials must never be stored in plaintext**, regardless of the storage engine.

---

## 2. Requirements

### 2.1 First Stage (F3.5 Scope)

1. **Persist data sources** — data sources survive page refresh, browser close, and device switch.
2. **User isolation** — each user sees only their own data sources, enforced server-side.
3. **CRUD API** — create, read (list + single), update, delete operations for data sources.
4. **Auth integration** — the API must verify the user's identity using the existing Cognito tokens.
5. **Credential encryption** — API key/secret pairs are encrypted at rest; the frontend never sends credentials in plaintext URL parameters.
6. **Infrastructure** — the Cognito pre-token Lambda trigger is defined in CDK; the Supabase project and schema are managed via the Supabase CLI (migrations committed to git).
7. **Frontend integration** — the Redux slice is updated to load from and write to the API instead of (or in addition to) local state.

### 2.2 Next Steps (Deferred — Not F3.5)

- **Transaction storage** (F4+) — larger data volumes, relational queries, joins.
- **Offline support / optimistic updates** — caching API results in Redux or localStorage for faster UX.
- **API key rotation** — re-encrypting credentials with a new KMS key version.
- **Connection testing** — verifying credentials work by calling the upstream platform API.

---

## 3. Design Options

### 3.1 Storage + API Layer

Four options are compared below. Each represents a complete storage + serving approach.

---

#### Option A: DynamoDB + API Gateway + Lambda

| Aspect | Detail |
|---|---|
| **Storage** | DynamoDB table in on-demand (pay-per-request) mode. Partition key = `userId`, sort key = `id`. |
| **API** | API Gateway REST API with Cognito User Pool authoriser. Each route triggers a Lambda function (or a single Lambda with path-based routing). |
| **Auth** | API Gateway's built-in Cognito authoriser validates the JWT; `userId` is extracted from the token's `sub` claim inside the Lambda. |
| **Encryption** | Lambda encrypts credential fields using a KMS key before writing to DynamoDB; decrypts on read. |
| **CDK** | All resources (table, API, Lambda, KMS key, IAM roles) defined in a new `DataStack` or added to an existing stack. Extends the current `infra/` project naturally. |

**Pricing (at personal-project scale):**

| Resource | Free Tier | After Free Tier |
|---|---|---|
| DynamoDB on-demand | 25 WCU / 25 RCU always free | $1.25 per million writes, $0.25 per million reads |
| Lambda | 1M invocations + 400,000 GB-s/month | ~$0/month at this scale |
| API Gateway | 1M calls/month for 12 months | $3.50 per million after that |
| KMS | 1 key = $1/month | + $0.03/10K API calls |
| **Estimated monthly cost** | **~$1** (KMS key only) | **~$1–2** |

**Pros:**
- Cheapest option at low traffic — effectively free minus the KMS key
- Fully serverless — nothing to manage, scales to zero
- Native AWS — uses the same CDK, IAM, and Cognito patterns already in the project
- Cognito authoriser on API Gateway is a one-liner in CDK
- DynamoDB handles the F3.5 access patterns (key-value CRUD per user) perfectly

**Cons:**
- DynamoDB is NoSQL; future features (F4–F8) with relational queries (joins, ordering across tables, aggregation) will be harder — may need a different storage layer later or use DynamoDB single-table design patterns
- Single-table design in DynamoDB requires upfront access pattern planning
- More boilerplate: Lambda handler code, IAM permissions, API Gateway route definitions

---

#### Option B: Supabase (Hosted Postgres + Auto-generated REST API)

| Aspect | Detail |
|---|---|
| **Storage** | Managed PostgreSQL database hosted by Supabase. Schema defined via SQL migrations. |
| **API** | Supabase auto-generates a RESTful API (PostgREST) over the database schema — no backend code needed for basic CRUD. |
| **Auth** | Supabase can validate JWTs. We'd configure it to accept Cognito-issued JWTs by setting the JWT secret/JWKS URL. Row-Level Security (RLS) policies enforce `userId` isolation directly in the database. Alternatively, we could switch auth to Supabase Auth entirely (but this means replacing Cognito). |
| **Encryption** | Must be handled application-side (JavaScript in the frontend or in an Edge Function) before sending to Supabase, since Supabase doesn't offer KMS-like envelope encryption natively. Could still use AWS KMS from an Edge Function, or use a client-side encryption library. |
| **CDK** | Supabase is not an AWS service — the database and API are created via the Supabase dashboard or CLI, not CDK. The CDK project would only define the KMS key (if using AWS KMS for encryption). This breaks the "all infrastructure in CDK" pattern. |

**Pricing:**

| Plan | Includes | Cost |
|---|---|---|
| Free | 500MB database, unlimited API requests, 2 projects, 50K monthly active users | $0/month |
| Pro | 8GB database, daily backups, 100K MAU, remove Free limits | $25/month |
| **Estimated monthly cost** | **$0** (Free tier is generous for a personal project) | |

**Pros:**
- Fastest path to working CRUD — the REST API is auto-generated from the schema, potentially zero backend code
- Full PostgreSQL — proper relational database with SQL, joins, indexes, constraints; naturally supports F4–F8's relational needs
- Generous free tier — $0/month for F3.5 and likely for a long time
- Row-Level Security is elegant for user isolation
- Realtime subscriptions built-in (useful later, not needed now)

**Cons:**
- External dependency outside AWS — infrastructure is split between AWS (Cognito, Amplify, CDK) and Supabase (database, API)
- Cognito JWT integration with Supabase is possible but non-trivial — need to configure JWKS endpoint, and RLS policies must parse the Cognito `sub` from the JWT. Alternatively, replacing Cognito with Supabase Auth means reworking F2
- Credential encryption is more awkward without native KMS — need an Edge Function or client-side encryption
- No CDK management — the database and API are configured outside the CDK workflow
- Vendor coupling to Supabase specifically (migrations are Postgres-standard, but the API layer and auth integration are Supabase-specific)

---

#### Option C: S3 JSON Files + API Gateway + Lambda

| Aspect | Detail |
|---|---|
| **Storage** | An S3 bucket. Each user's data sources are stored as a single JSON file at a key like `{userId}/data-sources.json`. |
| **API** | API Gateway + Lambda, same pattern as Option A. Lambda reads/writes the JSON file. |
| **Auth** | Same as Option A — Cognito authoriser on API Gateway. |
| **Encryption** | S3 server-side encryption (SSE-KMS) encrypts the entire file at rest. Alternatively, credential fields can be encrypted application-side before JSON serialisation for defence in depth. |
| **CDK** | S3 bucket, API Gateway, Lambda, KMS key — all standard CDK constructs. |

**Pricing:**

| Resource | Cost |
|---|---|
| S3 storage | $0.023/GB (< 1KB per user — effectively free) |
| S3 requests | $0.005/1,000 PUT, $0.0004/1,000 GET |
| Lambda + API Gateway | Same as Option A (free tier) |
| KMS | $1/month |
| **Estimated monthly cost** | **~$1** |

**Pros:**
- Simplest possible backend — a JSON file per user, no database schema, no ORM, no query language
- Cheapest — S3 costs are negligible; comparable to Option A
- Full CDK management
- SSE-KMS encrypts the entire file transparently

**Cons:**
- No query capability — every read loads the entire file; every write rewrites it. Fine for < 20 data sources, but fundamentally incompatible with F4–F8's transaction storage needs
- Race conditions — concurrent writes (e.g. two browser tabs) overwrite each other. S3 is eventually consistent for overwrites
- No indexes, no filtering, no pagination server-side
- Will definitely need to be replaced with a real database when F4+ arrives — this is a throwaway solution
- Not a natural backend pattern — feels hacky, harder for others to understand

---

#### Option D: RDS PostgreSQL + API Gateway + Lambda

| Aspect | Detail |
|---|---|
| **Storage** | Amazon RDS managed PostgreSQL instance (db.t4g.micro). Schema defined via SQL migrations bundled in the Lambda or run separately. |
| **API** | API Gateway + Lambda, same pattern as Option A. Lambda connects to RDS via connection string. |
| **Auth** | Same as Option A — Cognito authoriser on API Gateway. |
| **Encryption** | Lambda encrypts credential fields with KMS before writing. RDS also supports storage encryption at rest (AES-256). |
| **CDK** | RDS instance, security group/VPC, API Gateway, Lambda (in VPC), KMS key. Somewhat more complex CDK than Option A due to VPC networking. |

**Pricing:**

| Resource | Free Tier (12 months) | After Free Tier |
|---|---|---|
| RDS db.t4g.micro | 750 hours/month free | ~$12/month |
| RDS storage (20GB gp2) | Free for 12 months | ~$2.30/month |
| RDS Proxy (recommended for Lambda) | No free tier | ~$15/month |
| Lambda + API Gateway | Free tier | Same as Option A |
| KMS | $1/month | $1/month |
| **Estimated monthly cost** | **~$1** (first year) | **~$30/month** (after free tier, with RDS Proxy) |

**Pros:**
- Full PostgreSQL — same relational power as Option B, but on AWS
- All infrastructure in CDK — no external dependencies
- Most future-proof for F4–F8 transaction data (relational queries, joins, aggregation)
- Mature ecosystem — standard Postgres tooling, SQL, ORMs

**Cons:**
- Most expensive option — $30/month after the free tier runs out; significant for a personal project
- Not serverless — the RDS instance runs 24/7 even when idle
- VPC complexity — Lambda needs to be in a VPC to reach RDS; adds NAT Gateway costs if Lambda also needs internet access (for KMS calls), or requires VPC endpoints
- Cold connection overhead — Lambda establishing TCP connections to Postgres on each invocation is slow; RDS Proxy mitigates this but adds cost
- Over-engineered for F3.5's simple CRUD; the relational benefits don't materialise until F4+

---

### 3.2 Comparison Summary

| Factor | A: DynamoDB + APIGW + Lambda | B: Supabase | C: S3 JSON + APIGW + Lambda | D: RDS Postgres + APIGW + Lambda |
|---|---|---|---|---|
| **Monthly cost** | ~$1 | $0 (free tier) | ~$1 | ~$1 (yr 1), ~$30 (yr 2+) |
| **Serverless** | Yes | Yes (managed) | Yes | No (always-on instance) |
| **CDK-managed** | Yes | No (external) | Yes | Yes |
| **Cognito integration** | Native (APIGW authoriser) | Possible but non-trivial | Native | Native |
| **Credential encryption** | KMS in Lambda | Manual (app-side) | SSE-KMS (automatic) | KMS in Lambda |
| **F3.5 complexity** | Medium — Lambda CRUD code, IAM, DynamoDB table | Low — auto-generated API, SQL schema | Low — simple JSON read/write | High — VPC, RDS instance, proxy, migrations |
| **Future-proofing (F4–F8)** | Medium — NoSQL limits relational queries; possible to add a relational DB later | High — full Postgres from day one | Low — must be replaced entirely | High — full Postgres from day one |
| **Ecosystem consistency** | All AWS, all CDK | Mixed (AWS + Supabase) | All AWS, all CDK | All AWS, all CDK |
| **Setup effort** | Medium | Low (if auth bridging works smoothly) | Low | High |

---

### 3.3 Recommendation Framing

There is no single "correct" answer — the right choice depends on which trade-offs matter most to you:

- **If minimising cost and staying fully within AWS/CDK matters most** → **Option A (DynamoDB)** is the natural fit. It handles F3.5 perfectly and is nearly free. The trade-off is that DynamoDB may not be the right database for F4–F8's relational needs — but you can add a relational DB later without throwing away the F3.5 work (data sources stay in DynamoDB, transactions go in Postgres).

- **If you want the strongest relational foundation for F4–F8 and don't mind a dependency outside AWS** → **Option B (Supabase)** gives you Postgres for free with almost no backend code. The trade-off is split infrastructure and a non-trivial Cognito-to-Supabase auth bridge.

- **If you want the cheapest throwaway backend to unblock F4 quickly** → **Option C (S3 JSON)** is the simplest possible thing that works. The trade-off is that it's definitively temporary and adds no value toward future features.

- **If you want full Postgres on AWS with everything in CDK** → **Option D (RDS)** is the most future-proof all-AWS option. The trade-off is monthly cost (~$30 after year one) and VPC complexity that's over-engineered for F3.5.

### 3.4 Decision: Option B — Supabase

**Chosen: Option B (Supabase — Hosted Postgres + auto-generated REST API).**

The two primary reasons:

1. **Cost** — Supabase's free tier ($0/month) beats every AWS-native option. DynamoDB is ~$1/month (KMS), RDS is $15–30/month. For a personal project with low traffic, free wins.
2. **Relational foundation** — Future features (F4–F8) need relational queries: joins across data sources and transactions, aggregation, ordering, JSONB for raw import data. Starting with Postgres now avoids a storage migration later. DynamoDB's NoSQL model would either require complex single-table patterns or a second database when relational needs arrive.

**Why Supabase over other hosted-Postgres platforms (Nhost, Appwrite, Convex):**

- **Cognito integration** — Supabase is the only platform with first-class AWS Cognito docs. A 3-line TOML config (`[auth.third_party.aws_cognito]`) enables Cognito JWT validation, and Row-Level Security policies use the Cognito `sub` claim directly. Nhost, Appwrite, and Convex all push their own auth systems with no documented Cognito bridge.
- **REST API** — Supabase auto-generates a REST API (PostgREST) that maps naturally to the existing Redux slice CRUD pattern. Nhost only offers GraphQL (via Hasura), which is a larger integration change. Appwrite and Convex use proprietary query APIs.
- **CLI + IaC** — Supabase has both a CLI (`supabase init`, `supabase start`, `supabase db diff`) for local development and an official Terraform provider for programmatic management. Nhost has a TOML-based CLI config but no Terraform provider. Appwrite and Convex have CLIs but neither integrates with Terraform.
- **Database** — Appwrite and Convex use document/NoSQL stores, not Postgres, so they can't provide JSONB columns or SQL queries needed for F4+.

**Trade-offs accepted:**
- Infrastructure is split across three tools: CDK (Cognito Lambda trigger), Terraform (Supabase project + auth config), and Supabase CLI (SQL migrations). This is more tooling than a pure-AWS approach, but each tool manages what it's best at.
- Credential encryption must be handled application-side (in the frontend before sending to Supabase) since Supabase doesn't offer KMS-like envelope encryption. We'll use a symmetric encryption approach with a key stored as an environment variable.

---

## 4. Logical Flow

### 4.1 App boot — load data sources

1. User opens the app → Cognito session is restored (`useAuthInit` hook).
2. Once `isAuthenticated` becomes `true`, the app dispatches a `fetchDataSources` async thunk.
3. The thunk calls Supabase's REST API: `GET /rest/v1/data_sources` with the Cognito access token in the `Authorization` header.
4. Supabase validates the Cognito JWT, extracts the `sub` claim, and RLS restricts the query to rows where `user_id = sub`.
5. The response (array of data source rows) is dispatched to Redux via `fetchDataSources.fulfilled`, replacing the in-memory state.

### 4.2 Create a data source

1. User fills out the modal and clicks Save.
2. The app dispatches a `createDataSource` async thunk with the form data.
3. The thunk calls `POST /rest/v1/data_sources` with the JSON body (credentials encrypted client-side if present).
4. Supabase inserts the row (RLS confirms the `user_id` matches the JWT `sub`).
5. The response includes the created row; Redux state is updated optimistically or on success.

### 4.3 Update a data source

1. User edits fields in the modal and clicks Save.
2. The app dispatches an `updateDataSource` async thunk.
3. The thunk calls `PATCH /rest/v1/data_sources?id=eq.<id>` with the changed fields.
4. RLS confirms ownership. Redux state updates on success.

### 4.4 Delete a data source

1. User clicks Delete and confirms.
2. The app dispatches a `deleteDataSource` async thunk.
3. The thunk calls `DELETE /rest/v1/data_sources?id=eq.<id>`.
4. RLS confirms ownership. Redux removes the item on success.

---

## 5. Technical Design

### 5.1 Supabase Project Setup (Terraform)

**Done via Terraform using the official Supabase provider (`supabase/supabase`).**

**New folder: `infra/terraform/`** containing:

**`infra/terraform/main.tf`:**
```hcl
terraform {
  required_providers {
    supabase = {
      source  = "supabase/supabase"
      version = "~> 1.0"
    }
  }
}

provider "supabase" {
  access_token = var.supabase_access_token
}

resource "supabase_project" "crypto_tracker" {
  organization_id   = var.supabase_org_id
  name              = "crypto-tx-tracker"
  database_password  = var.supabase_db_password
  region            = "eu-west-2"
}

resource "supabase_settings" "crypto_tracker" {
  project_ref = supabase_project.crypto_tracker.id

  auth = jsonencode({
    third_party = {
      aws_cognito = {
        enabled        = true
        user_pool_id   = "eu-west-2_vLIzAhvnA"
        user_pool_region = "eu-west-2"
      }
    }
  })
}

output "project_url" {
  value = "https://${supabase_project.crypto_tracker.id}.supabase.co"
}

output "anon_key" {
  value     = supabase_project.crypto_tracker.anon_key
  sensitive = true
}
```

**`infra/terraform/variables.tf`:**
```hcl
variable "supabase_access_token" {
  type      = string
  sensitive = true
}

variable "supabase_org_id" {
  type = string
}

variable "supabase_db_password" {
  type      = string
  sensitive = true
}
```

**`infra/terraform/terraform.tfvars`** (gitignored):
```hcl
supabase_access_token = "sbp_..."
supabase_org_id       = "<org-id-from-supabase-dashboard>"
supabase_db_password   = "<strong-random-password>"
```

To apply:
```bash
cd infra/terraform
terraform init
terraform plan
terraform apply
```

This creates the project and configures Cognito third-party auth in one step. The `project_url` and `anon_key` outputs are used for the frontend env vars.

> **Note:** The Terraform provider requires a Supabase access token (generated at supabase.com/dashboard/account/tokens). The `terraform.tfvars` file containing secrets is gitignored; only `main.tf` and `variables.tf` are committed.

Additionally, a **Pre-Token Generation Lambda trigger** must be added to the Cognito User Pool (via CDK — see 5.2) so that JWTs contain `"role": "authenticated"`. This is required for Supabase to assign the correct Postgres role.

### 5.2 Cognito Pre-Token Generation Lambda

**New file: `infra/lambda/pre-token-generation/index.mjs`**

A minimal Lambda that Cognito invokes before issuing tokens. It adds a `role` claim:

```js
export const handler = async (event) => {
  event.response = {
    claimsOverrideDetails: {
      claimsToAddOrOverride: {
        role: 'authenticated',
      },
    },
  };
  return event;
};
```

**CDK addition: in `infra/lib/auth-stack.ts`**

- Create a `NodejsFunction` (or `lambda.Function`) for the pre-token trigger.
- Attach it to the existing Cognito User Pool as a `PRE_TOKEN_GENERATION` Lambda trigger.

### 5.3 Database Schema — `data_sources` Table

**Created via Supabase SQL migration (`supabase/migrations/YYYYMMDD_create_data_sources.sql`):**

```sql
create table public.data_sources (
  id          uuid primary key default gen_random_uuid(),
  user_id     text not null,
  platform_id text not null,
  custom_platform_name text,
  display_name text not null,
  credentials_encrypted text,  -- encrypted JSON string, or null
  created_at  timestamptz not null default now()
);

-- Index for fast per-user lookups
create index idx_data_sources_user_id on public.data_sources (user_id);

-- Row-Level Security: each user can only see/modify their own rows
alter table public.data_sources enable row level security;

create policy "Users can view own data sources"
  on public.data_sources for select
  using (user_id = (current_setting('request.jwt.claims', true)::json->>'sub'));

create policy "Users can insert own data sources"
  on public.data_sources for insert
  with check (user_id = (current_setting('request.jwt.claims', true)::json->>'sub'));

create policy "Users can update own data sources"
  on public.data_sources for update
  using (user_id = (current_setting('request.jwt.claims', true)::json->>'sub'));

create policy "Users can delete own data sources"
  on public.data_sources for delete
  using (user_id = (current_setting('request.jwt.claims', true)::json->>'sub'));
```

Notes:
- `credentials_encrypted` stores the **encrypted** JSON string of `{ apiKey, apiSecret }`, or `null` if no credentials are set. The frontend encrypts before sending and decrypts after receiving.
- `user_id` stores the Cognito `sub` (a UUID string). RLS policies extract it from the JWT claims.
- Column naming uses `snake_case` (Postgres convention); the frontend maps to `camelCase` in the Supabase client or manually.

### 5.4 Credential Encryption

Since we're not using AWS KMS, credentials are encrypted client-side before being sent to Supabase. Approach:

1. Use the **Web Crypto API** (`SubtleCrypto`) — built into all modern browsers, no dependencies.
2. An AES-256-GCM symmetric key is derived from a secret stored as a **Supabase Vault secret** or as a `VITE_` environment variable (for now, an env var is simplest; Vault can be added later).
3. Before writing: `JSON.stringify(credentials)` → encrypt with AES-256-GCM → base64-encode → store in `credentials_encrypted`.
4. After reading: base64-decode → decrypt → `JSON.parse()` → `ApiCredentials` object.

**New file: `app/src/utils/crypto.ts`**

Exports:
- `encryptCredentials(creds: ApiCredentials): Promise<string>` — returns base64 ciphertext.
- `decryptCredentials(encrypted: string): Promise<ApiCredentials>` — returns the original object.

Implementation uses `window.crypto.subtle.importKey()` + `encrypt()` / `decrypt()` with AES-256-GCM. The encryption key is derived from `import.meta.env.VITE_ENCRYPTION_KEY` using PBKDF2 or used directly as a raw key.

### 5.5 Supabase Client Setup

**New file: `app/src/config/supabase.ts`**

```ts
import { createClient } from '@supabase/supabase-js';
import { fetchAuthSession } from 'aws-amplify/auth';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  accessToken: async () => {
    const session = await fetchAuthSession();
    return session.tokens?.accessToken?.toString() ?? '';
  },
});
```

This configures the Supabase JS client to use the Cognito access token for every request, as documented in Supabase's AWS Cognito third-party auth guide.

**New dependency:** `@supabase/supabase-js` (install in `app/`).

**New env vars** (added to `app/.env` and Amplify build settings):
- `VITE_SUPABASE_URL` — e.g. `https://abc123.supabase.co`
- `VITE_SUPABASE_ANON_KEY` — the public `anon` key from the Supabase dashboard
- `VITE_ENCRYPTION_KEY` — a random 32-byte hex string for credential encryption

### 5.6 API Service Layer

**New file: `app/src/services/dataSourcesService.ts`**

A thin service layer that wraps Supabase calls and handles encryption/decryption + snake_case ↔ camelCase mapping. This keeps the Redux slice clean.

Exports:
- `fetchAll(): Promise<DataSource[]>` — queries `data_sources`, decrypts credentials, maps to `DataSource[]`.
- `create(input: Omit<DataSource, 'id' | 'createdAt'>): Promise<DataSource>` — encrypts credentials, inserts row, returns mapped result.
- `update(id: string, changes: Partial<DataSource>): Promise<DataSource>` — encrypts credentials if changed, patches row.
- `remove(id: string): Promise<void>` — deletes the row.

Each function:
1. Gets the Supabase client (which auto-attaches the Cognito token).
2. Calls the relevant Supabase query method (`.from('data_sources').select()`, `.insert()`, `.update()`, `.delete()`).
3. Maps between the Postgres `snake_case` column names and the TypeScript `camelCase` field names.
4. Encrypts/decrypts `credentials_encrypted` ↔ `credentials`.

### 5.7 Redux Slice Updates

**Modified file: `app/src/store/dataSourcesSlice.ts`**

Replace the synchronous reducers with `createAsyncThunk` operations:

- `fetchDataSources` — calls `dataSourcesService.fetchAll()`, sets `sources` on fulfilled.
- `createDataSource` — calls `dataSourcesService.create()`, pushes to `sources` on fulfilled.
- `updateDataSource` — calls `dataSourcesService.update()`, merges changes on fulfilled.
- `deleteDataSource` — calls `dataSourcesService.remove()`, filters out on fulfilled.

Add loading/error state:
```ts
interface DataSourcesState {
  sources: DataSource[];
  loading: boolean;  // true while any API call is in flight
  error: string | null;
}
```

The existing synchronous actions (`addSource`, `updateSource`, `removeSource`, `setCredentials`) can be kept temporarily for backwards compatibility but should eventually be removed once all callers use the async thunks.

### 5.8 Frontend Integration Points

**Modified file: `app/src/pages/DataSourcesPage.tsx`**
- On mount (or when auth state changes), dispatch `fetchDataSources`.
- Show a loading spinner while `loading` is true.
- Show error state if `error` is non-null.

**Modified file: `app/src/components/DataSourceModal.tsx`**
- On save, dispatch `createDataSource` or `updateDataSource` (async thunks) instead of the synchronous `addSource` / `updateSource`.
- On delete, dispatch `deleteDataSource` instead of `removeSource`.
- Disable the save button while the API call is in flight.

### 5.9 Environment & Deployment

**Updated file: `app/.env` (local development):**
```
VITE_COGNITO_USER_POOL_ID=eu-west-2_vLIzAhvnA
VITE_COGNITO_CLIENT_ID=49201onul289kk1rumo2orbdts
VITE_COGNITO_DOMAIN=crypto-tx-tracker.auth.eu-west-2.amazoncognito.com
VITE_REDIRECT_SIGN_IN=http://localhost:5173
VITE_REDIRECT_SIGN_OUT=http://localhost:5173/login
VITE_SUPABASE_URL=https://<ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>
VITE_ENCRYPTION_KEY=<random-32-byte-hex>
```

**Amplify environment variables** (set via CDK or Amplify console):
- Add the three new `VITE_SUPABASE_*` and `VITE_ENCRYPTION_KEY` env vars to the Amplify build settings so production builds have them.

### 5.10 Supabase CLI & Local Development

For ongoing schema changes, use the Supabase CLI:

```bash
# Install (dev dependency in app/ or globally)
npm install supabase --save-dev

# Initialise (creates supabase/ folder with config.toml)
npx supabase init

# Link to remote project
npx supabase link --project-ref <ref>

# Create a new migration
npx supabase migration new create_data_sources

# Apply migrations to remote
npx supabase db push

# Generate TypeScript types from the schema (optional, for type safety)
npx supabase gen types typescript --linked > app/src/types/supabase.ts
```

The `supabase/` folder (containing `config.toml` and `migrations/`) is committed to git.

---

## 6. Testing Plan

| # | Test | Method | Pass Criteria |
|---|---|---|---|
| 1 | Cognito JWT accepted by Supabase | Manual — sign in, make a Supabase query from the browser console | Request succeeds (200), not 401 |
| 2 | Pre-token Lambda adds `role` claim | Manual — inspect the decoded JWT after login (e.g. in jwt.io) | JWT contains `"role": "authenticated"` |
| 3 | RLS enforces user isolation | Manual — create data sources as user A, sign in as user B, verify user B sees none of A's data | Query returns empty array for user B |
| 4 | Create data source persists | Manual — add a data source, refresh the page | Data source still appears after refresh |
| 5 | Update data source persists | Manual — edit a data source's name, refresh | Updated name persists |
| 6 | Delete data source persists | Manual — delete a data source, refresh | Data source is gone |
| 7 | Credentials encrypted at rest | Manual — check the `credentials_encrypted` column in Supabase Table Editor | Column contains a base64 ciphertext string, not plaintext JSON |
| 8 | Credentials decrypt correctly | Manual — add credentials, navigate away and back, open edit modal | Decrypted credentials display correctly (masked) |
| 9 | Loading state shown | Manual — throttle network in DevTools, trigger a fetch | Loading spinner appears while request is in flight |
| 10 | Error state shown | Manual — disconnect network, try to create a data source | Error message appears in the UI |

---

## 7. Task List

- [ ] **Batch A — Supabase project (Terraform) & Cognito trigger (CDK)**
  - [ ] A1: Create Supabase access token + note org ID from dashboard
  - [ ] A2: Write Terraform config (`infra/terraform/main.tf`, `variables.tf`)
  - [ ] A3: Run `terraform init` + `terraform apply` to create Supabase project + Cognito auth config
  - [ ] A4: Note project URL and anon key from Terraform outputs
  - [ ] A5: Write Pre-Token Generation Lambda (`infra/lambda/pre-token-generation/index.mjs`)
  - [ ] A6: Add Lambda + trigger to `auth-stack.ts` in CDK
  - [ ] A7: Deploy AuthStack, verify JWT now contains `role: authenticated`
  - [ ] A8: Run `supabase init` and `supabase link` in the repo
- [ ] **Batch B — Database schema & RLS**
  - [ ] B1: Write SQL migration for `data_sources` table + RLS policies
  - [ ] B2: Push migration to Supabase (`supabase db push`)
  - [ ] B3: Verify table and policies exist in Supabase dashboard
- [ ] **Batch C — Frontend integration**
  - [ ] C1: Install `@supabase/supabase-js` in `app/`
  - [ ] C2: Create `app/src/config/supabase.ts` (client with Cognito token)
  - [ ] C3: Create `app/src/utils/crypto.ts` (encrypt/decrypt credentials)
  - [ ] C4: Create `app/src/services/dataSourcesService.ts` (CRUD + mapping)
  - [ ] C5: Update `dataSourcesSlice.ts` with async thunks + loading/error state
  - [ ] C6: Update `DataSourcesPage.tsx` to dispatch `fetchDataSources` on mount, show loading/error
  - [ ] C7: Update `DataSourceModal.tsx` to use async thunks
  - [ ] C8: Add `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_ENCRYPTION_KEY` to `app/.env`
- [ ] **Batch D — Deploy & verify**
  - [ ] D1: Add Supabase + encryption env vars to Amplify build settings
  - [ ] D2: Build, typecheck, deploy
  - [ ] D3: Run through testing plan (tests 1–10)
  - [ ] D4: Commit and write release notes
