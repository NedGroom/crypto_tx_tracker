// infra/lib/auth-stack.ts
// Cognito User Pool with Google federated login.
// Exports pool ID, client ID, and domain for use by AmplifyStack (env vars).

import * as cdk from 'aws-cdk-lib';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as path from 'path';
import { Construct } from 'constructs';
import { cdkConfig } from './config';

export class AuthStack extends cdk.Stack {
  /** Cognito User Pool ID — passed to AmplifyStack as a build-time env var */
  public readonly userPoolId: string;

  /** Cognito App Client ID — the public (no-secret) client used by the SPA */
  public readonly userPoolClientId: string;

  /** Fully qualified Cognito hosted UI domain (e.g. crypto-tx-tracker.auth.eu-west-2.amazoncognito.com) */
  public readonly cognitoDomain: string;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // ---------------------------------------------------------------
    // 1. User Pool
    // ---------------------------------------------------------------
    const userPool = new cognito.UserPool(this, 'CryptoTxTrackerUserPool', {
      userPoolName: 'crypto-tx-tracker-users',

      // selfSignUpEnabled = false means the only way into the pool is via
      // a federated identity provider (Google). Cognito auto-creates a linked
      // user record on first Google login. Set to true only if you later add
      // email/password as an alternative login method.
      selfSignUpEnabled: false,

      signInAliases: { email: true },
      autoVerify: { email: true },
      standardAttributes: {
        email: { required: true, mutable: true },
      },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,

      // RETAIN so the user pool survives accidental stack deletion
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // ---------------------------------------------------------------
    // 1b. Pre-Token Generation Lambda trigger
    // ---------------------------------------------------------------
    // Adds a "role": "authenticated" claim to Cognito JWTs so that
    // Supabase assigns the authenticated Postgres role (not anon).
    const preTokenFn = new lambda.Function(this, 'PreTokenGenerationFn', {
      functionName: 'crypto-tx-tracker-pre-token-generation',
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(
        path.join(__dirname, '..', 'lambda', 'pre-token-generation'),
      ),
    });

    userPool.addTrigger(
      cognito.UserPoolOperation.PRE_TOKEN_GENERATION,
      preTokenFn,
    );

    // ---------------------------------------------------------------
    // 2. Hosted UI domain prefix
    // ---------------------------------------------------------------
    // Must be globally unique across all AWS accounts. If 'crypto-tx-tracker'
    // is taken, append a suffix (e.g. 'crypto-tx-tracker-ng').
    const userPoolDomain = userPool.addDomain('CognitoDomain', {
      cognitoDomain: {
        domainPrefix: 'crypto-tx-tracker',
      },
    });

    // ---------------------------------------------------------------
    // 3. Google Identity Provider
    // ---------------------------------------------------------------
    // Reads OAuth client ID and secret from AWS Secrets Manager.
    // The secret was created manually in Batch A (T1).
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

    // ---------------------------------------------------------------
    // 4. App Client (public — no secret, for SPA use)
    // ---------------------------------------------------------------
    const userPoolClient = userPool.addClient('WebAppClient', {
      userPoolClientName: 'web-app',
      generateSecret: false, // public client — no secret for browser-based SPAs
      supportedIdentityProviders: [
        cognito.UserPoolClientIdentityProvider.GOOGLE,
      ],
      oAuth: {
        flows: { authorizationCodeGrant: true }, // Authorization Code + PKCE
        scopes: [
          cognito.OAuthScope.OPENID,
          cognito.OAuthScope.EMAIL,
          cognito.OAuthScope.PROFILE,
        ],
        callbackUrls: [
          'http://localhost:5173/',              // local dev
          `${cdkConfig.amplifyAppUrl}/`,         // production
        ],
        logoutUrls: [
          'http://localhost:5173/login',
          `${cdkConfig.amplifyAppUrl}/login`,    // production
        ],
      },
    });

    // The client references Google as a supported IdP, so ensure the IdP
    // resource is created first to avoid a deployment race condition.
    userPoolClient.node.addDependency(googleIdp);

    // ---------------------------------------------------------------
    // 5. Expose values for cross-stack wiring
    // ---------------------------------------------------------------
    this.userPoolId = userPool.userPoolId;
    this.userPoolClientId = userPoolClient.userPoolClientId;
    this.cognitoDomain = `${userPoolDomain.domainName}.auth.${this.region}.amazoncognito.com`;

    // CloudFormation outputs — visible in the console and in `cdk deploy` output
    new cdk.CfnOutput(this, 'UserPoolId', {
      value: userPool.userPoolId,
    });
    new cdk.CfnOutput(this, 'UserPoolClientId', {
      value: userPoolClient.userPoolClientId,
    });
    new cdk.CfnOutput(this, 'CognitoDomain', {
      value: this.cognitoDomain,
    });
  }
}
