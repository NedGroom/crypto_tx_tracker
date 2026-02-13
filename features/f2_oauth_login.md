# F2: Google OAuth Login

## 1. Introduction

This feature adds Google OAuth authentication to the app so that each user has a unique identity. The login gate is the first thing a user sees — no app functionality is accessible without authenticating.

We use **AWS Cognito** as the auth service because:
- It integrates natively with the existing AWS/Amplify infrastructure from F1.
- It handles the full OAuth 2.0 flow, token management, and session refresh out of the box.
- It supports Google as a federated identity provider with minimal configuration.
- It issues **JSON Web Tokens (JWTs)** that can later be used to authorize API calls — but that concern is deferred to future features.

### What is a JWT?

A **JSON Web Token** is a compact, URL-safe string made of three Base64-encoded parts separated by dots:

```
header.payload.signature
```

| Part | Contains | Example Fields |
|---|---|---|
| **Header** | Token type and signing algorithm | `{ "alg": "RS256", "typ": "JWT" }` |
| **Payload** | Claims — assertions about the user and token metadata | `sub`, `email`, `iss`, `exp`, `iat` |
| **Signature** | Cryptographic signature over header + payload using a secret or key pair | Verifies the token hasn't been tampered with |

Cognito issues **three** JWTs after a successful login:

| Token | Purpose | Where Used |
|---|---|---|
| **ID Token** | Contains user identity claims (email, name, `sub`) | Frontend — to display user info and identify the user |
| **Access Token** | Authorizes API requests | Backend — passed as `Authorization: Bearer <token>` header |
| **Refresh Token** | Obtains new ID/Access tokens when they expire (typically 1 hour) | Stored securely; sent to Cognito's token endpoint silently |

For F2, we only care about the **ID Token** (to know who is logged in) and the **Refresh Token** (to keep the session alive). The Access Token becomes relevant when we build backend APIs in later features.

### What is the `sub` claim?

The `sub` (subject) field in the JWT payload is a **globally unique, immutable identifier** that Cognito assigns to each user. It is a UUID like `a1b2c3d4-e5f6-7890-abcd-ef1234567890`.

Key properties:
- **Unique per user** — no two users in the same User Pool share a `sub`.
- **Immutable** — it never changes, even if the user changes their email or display name.
- **Stable across sessions** — the same `sub` is returned every time the user logs in.
- **Not the email** — emails can be changed or shared across providers; `sub` cannot.

This makes `sub` the correct key for associating user data in any future database tables. When we later decide on table design (shared vs per-user), we will use `sub` as the foreign key or partition key. **That decision is explicitly deferred — F2 only captures and stores the `sub` in the Redux store.**

---

## 2. Requirements

### 2.1 First Stage (F2 Scope)

1. **Google login via Cognito** — user clicks "Sign in with Google", is redirected to Google's consent screen, and is returned to the app authenticated.
2. **Auth state in Redux** — the app knows whether a user is logged in, and holds their `sub`, email, and token expiry in a centralised store.
3. **Route protection** — unauthenticated users are redirected to a login page; authenticated users see the app.
4. **Logout** — user can sign out, which clears tokens and Redux state.
5. **Token refresh** — sessions survive browser refresh and tokens are silently refreshed before expiry using the refresh token.
6. **Login page UI** — a simple branded page with a single "Sign in with Google" button.

### 2.2 Next Steps (Deferred — Not F2)

- **Multi-provider support** — adding Apple, GitHub, or email/password sign-in (Cognito makes this easy to add later via additional identity providers on the same User Pool).
- **MFA / 2FA** — Cognito supports TOTP-based MFA; can be enabled on the User Pool without frontend changes beyond an MFA prompt component.
- **API authorization** — sending the Access Token to a backend API and validating it server-side.
- **User data association** — linking the `sub` to database rows (transaction tables, settings, etc.).
- **Role-based access control** — Cognito User Pool groups can assign roles; not needed for a single-user-type app yet.

---

## 3. Design Options

### 3.1 Auth Service

Cognito is the clear choice given the existing AWS infrastructure. No comparison table needed — alternatives (Auth0, Firebase Auth, Supabase Auth) would all require adding a new external dependency and wouldn't integrate with our Amplify hosting as cleanly.

### 3.2 Auth Client Library

| | **Option A: AWS Amplify JS v6** | **Option B: amazon-cognito-identity-js** | **Option C: Custom OAuth (manual)** |
|---|---|---|---|
| **Method** | High-level `signInWithRedirect()` / `fetchAuthSession()` API from `@aws-amplify/auth` | Lower-level Cognito SDK; manual token handling | Build OAuth 2.0 PKCE flow by hand using `fetch()` calls to Cognito endpoints |
| **Pros** | Minimal boilerplate; handles token storage, refresh, and redirect automatically; well-documented; framework-agnostic despite the "Amplify" name | Lighter dependency; no Amplify coupling; full control over token storage | Zero dependencies; complete control; deepest understanding |
| **Cons** | Adds `@aws-amplify/auth` + `@aws-amplify/core` as dependencies (~50KB gzipped); abstraction hides some details | More manual work for token refresh, redirect handling, and storage; less maintained | Significant implementation effort; easy to introduce security bugs; must handle PKCE, nonce, token validation manually |
| **Decision Criteria** | Best when using Amplify hosting and wanting fast, correct implementation with minimal auth code | Best when you want minimal dependencies and are comfortable managing tokens yourself | Best when you have unusual OAuth requirements or want to avoid any SDK |
| **Chosen** | **Yes** | | |

**Rationale:** We are already on AWS Amplify for hosting. The Amplify JS auth library is purpose-built for Cognito, handles all the security-sensitive token lifecycle correctly, and lets us write ~20 lines of auth code instead of ~200. The dependency size is acceptable for a web app.

### 3.3 Route Protection

| | **Option A: Wrapper Component** | **Option B: Route Middleware / Loader** | **Option C: Layout Route Guard** |
|---|---|---|---|
| **Method** | A `<ProtectedRoute>` component wraps each protected route's element. It checks auth state and redirects to `/login` if unauthenticated. | React Router v7 `loader` functions check auth before rendering. If unauthenticated, the loader returns a redirect. | A parent layout route checks auth once; all child routes inherit the protection automatically. |
| **Pros** | Simple and explicit; easy to understand; well-established React pattern; can show loading state per-route. | Auth check happens before any component renders; clean separation of data loading and rendering; no flash of protected content. | Single check point for all protected routes; less repetition than wrapping each route; scales well as routes grow. |
| **Cons** | Must remember to wrap every new protected route; slightly more JSX nesting; brief render before redirect if not handled carefully. | Requires restructuring routes to use `loader` pattern; loaders are designed for data fetching — using them for auth is a secondary concern; tighter coupling to React Router API. | Slightly less explicit — new developers must understand the layout hierarchy; auth logic lives in one place which could become complex if different routes need different access levels. |
| **Decision Criteria** | Best for small apps with few routes, or when different routes need different auth logic. | Best when already using React Router loaders for data fetching and want a consistent pattern. | Best when all routes behind login share the same auth requirement and you want DRY protection. |
| **Chosen** | | | **Yes** |

**Rationale:** All app routes (F3–F8) require the same level of authentication — logged in or not. A layout route guard at the top of the route tree means we write the auth check once, and every child route is automatically protected. As the app grows with more views, no per-route wrapping is needed. If we later need role-based access for specific routes, we can nest additional layout guards within the tree.

### 3.4 Redux Store — What It Is and How It Works Here

#### What is Redux / Redux Toolkit?

Redux is a **predictable state container** for JavaScript apps. It provides a single, centralised **store** that holds all app-wide state, and enforces a strict pattern for how that state can change.

The core pattern is:

```
UI dispatches an Action → Reducer processes it → Store updates → UI re-renders
```

**Key concepts:**

| Concept | What It Is |
|---|---|
| **Store** | A single JavaScript object that holds the entire app state tree. There is only one store per app. Components read from it using **selectors** and write to it by **dispatching actions**. |
| **Action** | A plain object describing *what happened*: `{ type: "auth/loginSuccess", payload: { sub: "abc123", email: "user@example.com" } }`. Actions are the only way to trigger state changes. |
| **Reducer** | A pure function that takes the current state and an action, and returns the new state. It must not mutate the existing state — it returns a new object. (Redux Toolkit uses Immer under the hood, so you can write "mutating" syntax and it produces immutable updates automatically.) |
| **Slice** | A Redux Toolkit concept — a bundle of reducer logic plus action creators for a single feature/domain. Each slice owns a portion of the store. For example, an `authSlice` owns `state.auth`. |
| **Selector** | A function that extracts a specific piece of state from the store. Components use `useSelector(selectIsAuthenticated)` to read state reactively — the component re-renders only when that selected value changes. |
| **Dispatch** | The function components call to send an action to the store: `dispatch(loginSuccess({ sub, email }))`. |

#### Why Redux for Auth?

Auth state (is the user logged in? who are they?) is needed by many parts of the app:
- The route guard checks `isAuthenticated` to decide whether to show the app or redirect to login.
- The header/navbar may display the user's email or avatar.
- Future API calls will read the token from the store.

Putting this in Redux means any component can access auth state without prop-drilling, and state changes (login, logout, token refresh) flow through a single predictable path.

#### Auth Slice Shape

```typescript
interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;       // true while checking session on app load
  user: {
    sub: string;            // Cognito unique user ID
    email: string;
  } | null;
  error: string | null;
}

const initialState: AuthState = {
  isAuthenticated: false,
  isLoading: true,          // starts true — we check for an existing session on mount
  user: null,
  error: null,
};
```

The slice will expose these action creators:
- `loginStart()` — sets `isLoading: true`
- `loginSuccess({ sub, email })` — sets `isAuthenticated: true`, populates `user`
- `loginFailure(errorMessage)` — sets error state
- `logout()` — resets to initial state

And these selectors:
- `selectIsAuthenticated(state)` — returns `boolean`
- `selectAuthUser(state)` — returns `user` object or `null`
- `selectAuthLoading(state)` — returns `boolean`

---

## 4. Logical Flow (After Choosing)

### 4.1 First-Time Login

```
1. User navigates to the app URL
2. App mounts → React renders <AppLayout>
3. AppLayout runs useEffect → calls Amplify's fetchAuthSession()
4. No existing session found → dispatch(loginFailure())
   → isAuthenticated = false, isLoading = false
5. Layout route guard sees isAuthenticated === false
   → renders <Navigate to="/login" />
6. LoginPage renders with "Sign in with Google" button
7. User clicks button → calls Amplify's signInWithRedirect({ provider: 'Google' })
8. Browser redirects to Cognito Hosted UI → Google consent screen
9. User grants consent → Google redirects back to Cognito
10. Cognito issues tokens → redirects to app callback URL
11. App remounts → fetchAuthSession() finds valid tokens
    → dispatch(loginSuccess({ sub, email }))
    → isAuthenticated = true
12. Layout route guard passes → app content renders
```

### 4.2 Returning User (Session Exists)

```
1. User navigates to the app URL
2. App mounts → fetchAuthSession() finds tokens in browser storage
3. If tokens are expired, Amplify silently uses the refresh token
4. dispatch(loginSuccess({ sub, email }))
5. Layout route guard passes → app content renders immediately
```

### 4.3 Logout

```
1. User clicks "Sign out" button
2. App calls Amplify's signOut()
3. Amplify clears tokens from browser storage
4. dispatch(logout()) → resets Redux state
5. Layout route guard redirects to /login
```

---

## 5. Technical Design

This section is structured as step-by-step implementation instructions. Each subsection corresponds to a unit of work and maps to one or more tasks in the Task List (section 7). Where pieces connect to each other, the relationship is noted.

### 5.1 Google Cloud Console — OAuth Credentials

Before any AWS work, we need Google OAuth credentials so that Cognito can identify itself to Google during the sign-in redirect.

**Steps:**
1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a project (or use an existing one) — e.g. `crypto-tx-tracker`.
3. Navigate to **APIs & Services → Credentials → Create Credentials → OAuth Client ID**.
4. Application type: **Web application**.
5. Authorised JavaScript origins: leave blank (Cognito uses server-side token exchange, not implicit flow).
6. Authorised redirect URIs: add the Cognito callback URL. This is `https://<cognito-domain>.auth.<region>.amazoncognito.com/oauth2/idpresponse`. You won't know the exact domain until you create the Cognito User Pool (section 5.3), so you may need to come back and update this.
7. Copy the resulting **Client ID** and **Client Secret**.
8. Store both values in AWS Secrets Manager as a single secret (e.g. `crypto_tx_tracker_google_oauth`) with keys `clientId` and `clientSecret`. This keeps them out of source code and accessible to CDK.

**Connection to other sections:** The secret name from step 8 is referenced in the CDK code in section 5.3.

### 5.2 CDK — Shared Infrastructure Config

Before creating new stacks, create a central config file so that region, account, and other shared constants are defined in one place rather than hardcoded across stacks.

**New file: `infra/lib/config.ts`**

```typescript
// infra/lib/config.ts
// Central configuration for all CDK stacks. Change values here rather than
// hardcoding region/account in individual stacks or bin/infra.ts.

export const cdkConfig = {
  account: '533267126035',
  region: 'eu-west-2',
  amplifyAppUrl: 'https://main.d3augyns3og6c7.amplifyapp.com',
};
```

Update `infra/bin/infra.ts` to import from this config instead of hardcoding the region (see section 5.3).

### 5.3 CDK — Cognito User Pool and Google Identity Provider

We add Cognito resources in a **new `AuthStack`**, separate from the existing `AmplifyStack`. This keeps hosting and auth concerns isolated. The Cognito outputs (User Pool ID, App Client ID, domain) will be passed to the `AmplifyStack` as environment variables for the frontend build (see section 5.14).

**New file: `infra/lib/auth-stack.ts`**

Create a new CDK stack with the following resources:

1. **`UserPool`** — the Cognito User Pool itself.
   ```typescript
   import * as cognito from 'aws-cdk-lib/aws-cognito';

   const userPool = new cognito.UserPool(this, 'CryptoTxTrackerUserPool', {
     userPoolName: 'crypto-tx-tracker-users',
     selfSignUpEnabled: false,
     // selfSignUpEnabled controls whether users can create a Cognito-native account
     // by typing an email + password into a sign-up form. When false, the only way
     // into the User Pool is via a federated identity provider (Google). Cognito
     // automatically creates a linked user record on first Google login. Set this
     // to true only if you later add email/password as an alternative login method.
     signInAliases: { email: true },    // email is the sign-in identifier
     autoVerify: { email: true },       // email is auto-verified because Google already verified it
     standardAttributes: {
       email: { required: true, mutable: true },
     },
     accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
     removalPolicy: cdk.RemovalPolicy.RETAIN,  // don't delete the user pool if the stack is destroyed
   });
   ```

2. **`UserPoolDomain`** — gives Cognito a hosted UI URL prefix.
   ```typescript
   const userPoolDomain = userPool.addDomain('CognitoDomain', {
     cognitoDomain: {
       domainPrefix: 'crypto-tx-tracker',  // becomes crypto-tx-tracker.auth.<region>.amazoncognito.com
     },
   });
   ```
   > Note: The domain prefix must be globally unique across all AWS accounts. If `crypto-tx-tracker` is taken, append a suffix.

3. **`UserPoolIdentityProviderGoogle`** — registers Google as a federated identity provider.
   ```typescript
   const googleIdp = new cognito.UserPoolIdentityProviderGoogle(this, 'GoogleIdP', {
     userPool,
     clientId: cdk.SecretValue.secretsManager('crypto_tx_tracker_google_oauth', {
       jsonField: 'clientId',
     }).unsafeUnwrap(),
     clientSecretValue: cdk.SecretValue.secretsManager('crypto_tx_tracker_google_oauth', {
       jsonField: 'clientSecret',
     }),
     scopes: ['openid', 'email', 'profile'],
     attributeMapping: {
       email: cognito.ProviderAttribute.GOOGLE_EMAIL,
       fullname: cognito.ProviderAttribute.GOOGLE_NAME,
     },
   });
   ```

4. **`UserPoolClient`** — the app client that the frontend uses. Must be a public client (no secret) because this is a browser-based SPA.
   ```typescript
   const userPoolClient = userPool.addClient('WebAppClient', {
     userPoolClientName: 'web-app',
     generateSecret: false,                     // public client — no secret for SPAs
     supportedIdentityProviders: [
       cognito.UserPoolClientIdentityProvider.GOOGLE,
     ],
     oAuth: {
       flows: { authorizationCodeGrant: true },  // Authorization Code + PKCE
       scopes: [
         cognito.OAuthScope.OPENID,
         cognito.OAuthScope.EMAIL,
         cognito.OAuthScope.PROFILE,
       ],
       callbackUrls: [
         'http://localhost:5173/',                          // local dev
         'https://main.d3augyns3og6c7.amplifyapp.com/',    // production
       ],
       logoutUrls: [
         'http://localhost:5173/login',
         'https://main.d3augyns3og6c7.amplifyapp.com/login',
       ],
     },
   });
   // Ensure the Google IdP is created before the client references it
   userPoolClient.node.addDependency(googleIdp);
   ```
   > The production URLs above use the Amplify domain from the F1 deployment. These are also defined in `infra/lib/config.ts` so they can be referenced programmatically rather than hardcoded as strings — see section 5.2.

5. **Stack outputs** — export the values the frontend needs.
   ```typescript
   new cdk.CfnOutput(this, 'UserPoolId', {
     value: userPool.userPoolId,
   });
   new cdk.CfnOutput(this, 'UserPoolClientId', {
     value: userPoolClient.userPoolClientId,
   });
   new cdk.CfnOutput(this, 'CognitoDomain', {
     value: `${userPoolDomain.domainName}.auth.${this.region}.amazoncognito.com`,
   });
   ```

6. **Update `infra/bin/infra.ts`** to use the central config and register the new stack:
   ```typescript
   import { cdkConfig } from '../lib/config';
   import { AmplifyStack } from '../lib/amplify-stack';
   import { AuthStack } from '../lib/auth-stack';

   const app = new cdk.App();
   const env = { account: cdkConfig.account, region: cdkConfig.region };

   const authStack = new AuthStack(app, 'AuthStack', { env });

   new AmplifyStack(app, 'CryptoTxTrackerAmplify', {
     env,
     description: 'Amplify hosting for Crypto Transaction Tracker React app',
     // Pass Cognito outputs so Amplify can set them as build-time env vars (see section 5.14)
     userPoolId: authStack.userPoolId,
     userPoolClientId: authStack.userPoolClientId,
     cognitoDomain: authStack.cognitoDomain,
   });
   ```
   The `AuthStack` exports its Cognito values as public readonly properties so `AmplifyStack` can reference them. This creates a cross-stack dependency — CDK will deploy `AuthStack` first.

**After deploying**, go back to the Google Cloud Console and update the authorised redirect URI to `https://<cognito-domain>.auth.eu-west-2.amazoncognito.com/oauth2/idpresponse` (using the actual CognitoDomain output from step 5).

### 5.4 Install Amplify JS in the App

From the `app/` directory, install the Amplify JS library:

```bash
npm install aws-amplify
```

This installs `aws-amplify` v6, which includes `@aws-amplify/auth` and `@aws-amplify/core` as internal modules. No separate `@aws-amplify/auth` install is needed — it's tree-shakeable via the main package.

This is the only new frontend dependency for F2. `@reduxjs/toolkit` and `react-redux` are already in `package.json` from the F1 scaffold.

### 5.5 Amplify Configuration File — `app/src/config/amplify.ts`

Create a new file that calls `Amplify.configure()` with the Cognito settings. This must run **once, before any auth calls** — so it will be imported at the top of `main.tsx`.

```typescript
// app/src/config/amplify.ts
import { Amplify } from 'aws-amplify';

Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID,
      userPoolClientId: import.meta.env.VITE_COGNITO_CLIENT_ID,
      loginWith: {
        oauth: {
          domain: import.meta.env.VITE_COGNITO_DOMAIN,
          scopes: ['openid', 'email', 'profile'],
          redirectSignIn: [import.meta.env.VITE_REDIRECT_SIGN_IN],
          redirectSignOut: [import.meta.env.VITE_REDIRECT_SIGN_OUT],
          responseType: 'code',
        },
      },
    },
  },
});
```

The `VITE_`-prefixed environment variables are set in two places:

- **Production build:** Set by CDK via the `AmplifyStack` `environmentVariables` property (see section 5.14). Amplify injects them at build time.
- **Local development:** Create `app/.env` with localhost values (see section 5.14). Add `app/.env` to `.gitignore`.

Vite requires the `VITE_` prefix to expose env vars to browser code — anything without the prefix is stripped from the client bundle for security.

**Connection to other sections:** `main.tsx` (section 5.9) imports this file as a side-effect import. The env var values come from section 5.14.

### 5.6 Redux Store — `app/src/store/index.ts`

Create the Redux store configuration. This is a thin file — Redux Toolkit's `configureStore` creates the store and wires up Redux DevTools automatically.

```typescript
// app/src/store/index.ts
import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    // Future slices (e.g. transactions, settings) will be added here
  },
});

// Infer TypeScript types from the store itself — used throughout the app
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
```

The `RootState` and `AppDispatch` types are exported so that components can use typed versions of `useSelector` and `useDispatch`. This avoids casting everywhere.

**Connection to other sections:** The store is provided to the React tree via `<Provider>` in `main.tsx` (section 5.9). The `authReducer` comes from `authSlice.ts` (section 5.7).

### 5.7 Auth Slice — `app/src/store/authSlice.ts`

Create the Redux slice that manages all authentication state. This file defines the state shape, reducers (actions), and selectors.

```typescript
// app/src/store/authSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from './index';

// State shape
interface AuthUser {
  sub: string;    // Cognito unique user ID (UUID)
  email: string;  // User's email from Google
}

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;       // true while checking for an existing session on app mount
  user: AuthUser | null;
  error: string | null;
}

const initialState: AuthState = {
  isAuthenticated: false,
  isLoading: true,           // starts true — the app checks for a session before rendering content
  user: null,
  error: null,
};

// Slice definition
const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    loginStart(state) {
      state.isLoading = true;
      state.error = null;
    },
    loginSuccess(state, action: PayloadAction<AuthUser>) {
      state.isAuthenticated = true;
      state.isLoading = false;
      state.user = action.payload;
      state.error = null;
    },
    loginFailure(state, action: PayloadAction<string>) {
      state.isAuthenticated = false;
      state.isLoading = false;
      state.user = null;
      state.error = action.payload;
    },
    logout(state) {
      state.isAuthenticated = false;
      state.isLoading = false;
      state.user = null;
      state.error = null;
    },
  },
});

// Action creators — auto-generated by createSlice
export const { loginStart, loginSuccess, loginFailure, logout } = authSlice.actions;

// Selectors — used by components via useSelector(selectXxx)
export const selectIsAuthenticated = (state: RootState) => state.auth.isAuthenticated;
export const selectAuthUser = (state: RootState) => state.auth.user;
export const selectAuthLoading = (state: RootState) => state.auth.isLoading;
export const selectAuthError = (state: RootState) => state.auth.error;

export default authSlice.reducer;
```

**How it works in practice:**
- On app mount, the auth initialisation logic (section 5.10) dispatches `loginStart()`, then either `loginSuccess(...)` or `loginFailure(...)`.
- When the user clicks "Sign out", the logout handler dispatches `logout()`.
- Any component can read auth state by calling e.g. `useSelector(selectIsAuthenticated)` — React will re-render that component whenever the selected value changes.

### 5.8 Login Page — `app/src/pages/LoginPage.tsx`

Create a simple login page with a single "Sign in with Google" button. This is the only page accessible to unauthenticated users.

```tsx
// app/src/pages/LoginPage.tsx
import { signInWithRedirect } from 'aws-amplify/auth';

function LoginPage() {
  const handleGoogleSignIn = () => {
    signInWithRedirect({ provider: 'Google' });
  };

  return (
    <div className="login-page">
      <h1>Crypto Transaction Tracker</h1>
      <p>Sign in to manage your transactions.</p>
      <button onClick={handleGoogleSignIn}>
        Sign in with Google
      </button>
    </div>
  );
}

export default LoginPage;
```

**Notes:**
- `signInWithRedirect` triggers the full OAuth flow: browser → Cognito Hosted UI → Google consent → callback to app. The user leaves the page and returns after authenticating.
- Styling is minimal for now — just enough to be usable. A branded login page can be refined later.
- No Redux interaction happens here — the login result is handled by the auth initialisation logic (section 5.10) when the app remounts after the OAuth redirect.

### 5.9 App Entry Point Updates — `app/src/main.tsx`

Modify `main.tsx` to:
1. Import the Amplify config (side-effect import — runs `Amplify.configure()` on load).
2. Wrap the app in the Redux `<Provider>`.

```tsx
// app/src/main.tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { store } from './store';
import App from './App.tsx';
import './config/amplify';       // side-effect: calls Amplify.configure()
import './styles/index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Provider store={store}>
      <App />
    </Provider>
  </StrictMode>,
);
```

**Why the order matters:** `./config/amplify` must be imported before any component that calls Amplify auth functions. Placing it early in `main.tsx` guarantees this.

### 5.10 Auth Initialisation — `app/src/hooks/useAuthInit.ts`

Create a custom hook that runs once on app mount to check if the user already has a valid session. This bridges Amplify's auth state into Redux.

```typescript
// app/src/hooks/useAuthInit.ts
import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { getCurrentUser, fetchAuthSession } from 'aws-amplify/auth';
import { loginStart, loginSuccess, loginFailure } from '../store/authSlice';

export function useAuthInit() {
  const dispatch = useDispatch();

  useEffect(() => {
    async function checkSession() {
      dispatch(loginStart());
      try {
        // getCurrentUser throws if no user is signed in
        const user = await getCurrentUser();
        const session = await fetchAuthSession();
        const idToken = session.tokens?.idToken;

        dispatch(loginSuccess({
          sub: user.userId,                              // Cognito sub
          email: idToken?.payload?.email as string ?? '', // email from ID token claims
        }));
      } catch {
        // No active session — user is not logged in (this is normal, not an error)
        dispatch(loginFailure(''));
      }
    }

    checkSession();
  }, [dispatch]);
}
```

**How this connects:**
- This hook is called inside `AppLayout` (section 5.11). It runs on mount, checks Amplify's stored tokens, and dispatches the result to Redux.
- If the user just completed the OAuth redirect, Amplify will have stored the tokens in `localStorage` automatically. `getCurrentUser()` will succeed.
- If there's no session (first visit, or after logout), `getCurrentUser()` throws and we dispatch `loginFailure('')` with an empty error message (it's not an error — the user simply isn't logged in yet).
- Amplify handles token refresh internally — if the ID/Access tokens are expired but the refresh token is still valid, `fetchAuthSession()` silently refreshes them.

### 5.11 Layout Route Guard — `app/src/components/AppLayout.tsx`

Create the layout component that protects all authenticated routes. It serves as both the auth gate and the app shell (header with sign-out button, `<Outlet />` for child routes).

```tsx
// app/src/components/AppLayout.tsx
import { Outlet, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { signOut } from 'aws-amplify/auth';
import { useDispatch } from 'react-redux';
import { selectIsAuthenticated, selectAuthLoading, selectAuthUser, logout } from '../store/authSlice';
import { useAuthInit } from '../hooks/useAuthInit';

function AppLayout() {
  // Check for existing session on mount and sync to Redux
  useAuthInit();

  const isAuthenticated = useSelector(selectIsAuthenticated);
  const isLoading = useSelector(selectAuthLoading);
  const user = useSelector(selectAuthUser);
  const dispatch = useDispatch();

  const handleSignOut = async () => {
    await signOut();
    dispatch(logout());
  };

  // While checking session, show a loading indicator (prevents flash of login page)
  if (isLoading) {
    return <div className="loading">Loading...</div>;
  }

  // Not authenticated — redirect to login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Authenticated — render the app shell with child routes
  return (
    <div className="app-layout">
      <header>
        <span>Crypto Transaction Tracker</span>
        <span>{user?.email}</span>
        <button onClick={handleSignOut}>Sign out</button>
      </header>
      <main>
        <Outlet />
      </main>
    </div>
  );
}

export default AppLayout;
```

**Behaviour summary:**
- `useAuthInit()` fires on mount → dispatches `loginStart()` → then `loginSuccess()` or `loginFailure()`.
- While `isLoading` is true, a loading screen renders (not the login page, and not the app content — prevents any flash).
- Once loading completes, the guard either redirects to `/login` or renders the `<Outlet />` which contains whatever child route matched.
- The sign-out button calls Amplify's `signOut()` (clears tokens from browser storage) then dispatches `logout()` to clear Redux state. The guard immediately redirects to `/login` because `isAuthenticated` is now false.

### 5.12 App Routing — `app/src/App.tsx`

Replace the current placeholder `App.tsx` with React Router routes. The structure separates the public `/login` route from the protected layout route.

```tsx
// app/src/App.tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import AppLayout from './components/AppLayout';
import LoginPage from './pages/LoginPage';
import HomePage from './pages/HomePage';
import './styles/App.css';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public route — no auth required */}
        <Route path="/login" element={<LoginPage />} />

        {/* Protected routes — AppLayout checks auth and renders Outlet */}
        <Route element={<AppLayout />}>
          <Route path="/" element={<HomePage />} />
          {/* Future feature routes (F3, F4, ...) are added here as siblings */}
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
```

**How future routes work:** To add a new protected page (e.g. F3's exchange auth page), simply add another `<Route>` as a child of the `<Route element={<AppLayout />}>`. The layout guard applies automatically — no wrapping needed.

### 5.13 Home Page Placeholder — `app/src/pages/HomePage.tsx`

A minimal placeholder page displayed after successful authentication. This will be replaced by real feature content in later features.

```tsx
// app/src/pages/HomePage.tsx
function HomePage() {
  return (
    <div className="home-page">
      <h2>Dashboard</h2>
      <p>You are authenticated. Feature views will appear here in future features.</p>
    </div>
  );
}

export default HomePage;
```

### 5.14 Environment Variables for Dev and Production

Two sets of environment variables are needed — one for local development and one for the Amplify production build. The production values are set **in CDK code** rather than manually in the Amplify Console, so that infrastructure config stays in version control.

**Production — via CDK `AmplifyStack` `environmentVariables`:**

Update the `AmplifyStack` to accept Cognito values from the `AuthStack` (passed as constructor props in `bin/infra.ts` — see section 5.3 step 6) and set them as Amplify build-time environment variables:

```typescript
// In amplify-stack.ts constructor, after creating the Amplify app:
environmentVariables: {
  VITE_COGNITO_USER_POOL_ID: props.userPoolId,
  VITE_COGNITO_CLIENT_ID: props.userPoolClientId,
  VITE_COGNITO_DOMAIN: props.cognitoDomain,
  VITE_REDIRECT_SIGN_IN: 'https://main.d3augyns3og6c7.amplifyapp.com/',
  VITE_REDIRECT_SIGN_OUT: 'https://main.d3augyns3og6c7.amplifyapp.com/login',
},
```

The `AmplifyStack` props interface needs to be extended to accept `userPoolId`, `userPoolClientId`, and `cognitoDomain` as strings. These are wired from the `AuthStack` outputs in `bin/infra.ts`.

**Local development — `app/.env`:**

Create this file with localhost values (it is gitignored):
```
VITE_COGNITO_USER_POOL_ID=eu-west-2_XXXXXXXXX
VITE_COGNITO_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx
VITE_COGNITO_DOMAIN=crypto-tx-tracker.auth.eu-west-2.amazoncognito.com
VITE_REDIRECT_SIGN_IN=http://localhost:5173/
VITE_REDIRECT_SIGN_OUT=http://localhost:5173/login
```

The placeholder values (`XXXXXXXXX`, etc.) are filled in after deploying the `AuthStack` (T3), using the CDK output values. Add `app/.env` to `.gitignore`.

### 5.15 File / Folder Structure Summary

After all changes, the new and modified files are:

```
infra/
  lib/
    config.ts                       # NEW — central config (region, account, Amplify URL)
    auth-stack.ts                   # NEW — Cognito User Pool, Google IdP, App Client, domain
    amplify-stack.ts                # MODIFIED — accept Cognito props, set env vars
  bin/
    infra.ts                        # MODIFIED — import config, instantiate AuthStack, wire props

app/
  .env                              # NEW — local dev environment variables (gitignored)
  src/
    config/
      amplify.ts                    # NEW — Amplify.configure() with Cognito settings
    store/
      index.ts                      # NEW — Redux store (configureStore + type exports)
      authSlice.ts                  # NEW — Auth state, actions, selectors
    hooks/
      useAuthInit.ts                # NEW — Custom hook: check session on mount, sync to Redux
    components/
      AppLayout.tsx                 # NEW — Layout route guard + app shell (header, sign-out, Outlet)
    pages/
      LoginPage.tsx                 # NEW — "Sign in with Google" button page
      HomePage.tsx                  # NEW — Authenticated placeholder page
    App.tsx                         # MODIFIED — replaced placeholder with BrowserRouter + Routes
    main.tsx                        # MODIFIED — added Provider, Amplify config import
```

---

## 6. Testing Plan

| Test | Method | Pass Criteria |
|---|---|---|
| Unauthenticated redirect | Open app in incognito → should land on `/login` | Login page renders; no flash of app content |
| Google sign-in flow | Click "Sign in with Google" → complete Google consent | Redirected back to app; app content visible; user email shown |
| Auth state in Redux | Use Redux DevTools after login | `state.auth.isAuthenticated === true`, `user.sub` and `user.email` populated |
| Session persistence | Log in → close tab → reopen app | App loads directly to authenticated state without re-prompting login |
| Logout | Click "Sign out" | Redirected to `/login`; reopening app shows login page (session cleared) |
| Token refresh | Log in → wait >1 hour (or manually expire token) → interact with app | App remains usable; no forced logout |

---

## 7. Task List

Tasks are ordered to match the Technical Design subsections above. Each task references the relevant section.

- [ ] **T1: Google Cloud Console setup** (§5.1) — create a Google Cloud project, generate OAuth Client ID + Client Secret, store them in AWS Secrets Manager
- [ ] **T2: Central CDK config** (§5.2) — create `infra/lib/config.ts` with account, region, and Amplify URL; update `infra/bin/infra.ts` to import from it
- [ ] **T3: CDK — Auth Stack** (§5.3) — create `infra/lib/auth-stack.ts` with Cognito User Pool, Google IdP, App Client, domain; register in `infra/bin/infra.ts`; wire Cognito outputs to `AmplifyStack` props
- [ ] **T4: Deploy Cognito** (§5.3) — run `cdk deploy AuthStack`; note the output values (Pool ID, Client ID, domain); update Google Console redirect URI with the Cognito domain
- [ ] **T5: Install Amplify JS** (§5.4) — run `npm install aws-amplify` in `app/`
- [ ] **T6: Amplify config file** (§5.5) — create `app/src/config/amplify.ts` with Cognito settings using `import.meta.env` values
- [ ] **T7: Redux store** (§5.6) — create `app/src/store/index.ts` with `configureStore`, `RootState`, and `AppDispatch` types
- [ ] **T8: Auth slice** (§5.7) — create `app/src/store/authSlice.ts` with state shape, reducers, action creators, and selectors
- [ ] **T9: Login page** (§5.8) — create `app/src/pages/LoginPage.tsx` with "Sign in with Google" button calling `signInWithRedirect`
- [ ] **T10: Wire main.tsx** (§5.9) — update `app/src/main.tsx` to import Amplify config and wrap `<App />` in Redux `<Provider>`
- [ ] **T11: Auth init hook** (§5.10) — create `app/src/hooks/useAuthInit.ts` to check session on mount and dispatch to Redux
- [ ] **T12: AppLayout guard** (§5.11) — create `app/src/components/AppLayout.tsx` with auth check, loading state, redirect, sign-out button, and `<Outlet />`
- [ ] **T13: App.tsx routing** (§5.12) — replace `App.tsx` with `BrowserRouter` + `Routes` (public `/login`, protected layout route)
- [ ] **T14: Home page placeholder** (§5.13) — create `app/src/pages/HomePage.tsx` as the default authenticated landing page
- [ ] **T15: Environment variables** (§5.14) — update `AmplifyStack` to accept Cognito props and set `environmentVariables`; create `app/.env` for local dev; add `.env` to `.gitignore`
- [ ] **T16: Deploy full stack** — run `cdk deploy --all` to deploy both stacks with env vars wired; verify Amplify rebuilds with the new variables
- [ ] **T17: Test full flow** (§6) — run through the testing plan in both local dev and deployed Amplify environments

### Implementation Batches

Tasks are grouped into batches based on dependencies. Complete each batch before starting the next.

| Batch | Tasks | Description | Who |
|---|---|---|---|
| **A** | T1 | Google Cloud Console: create OAuth credentials, store in Secrets Manager | Manual + CLI |
| **B** | T2, T3, T15 (CDK part) | CDK infrastructure: `config.ts`, `auth-stack.ts`, `amplify-stack.ts` updates, `infra.ts` wiring | Agent |
| **C** | T4 | Deploy `AuthStack`, note Cognito output values, update Google Console redirect URI | Manual CLI |
| **D** | T5–T14 | All frontend code: install Amplify JS, create config/store/slice/hooks/components/pages, update `App.tsx` and `main.tsx` | Agent |
| **E** | T15 (.env), T16, T17 | Wire `.env` with real Cognito values, `cdk deploy --all`, run test plan | Manual + Agent |
