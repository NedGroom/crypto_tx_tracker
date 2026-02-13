import * as cdk from 'aws-cdk-lib';
import * as amplify from '@aws-cdk/aws-amplify-alpha';
import * as codebuild from 'aws-cdk-lib/aws-codebuild';
import { Construct } from 'constructs';
import { cdkConfig } from './config';

/** Props passed from AuthStack so Amplify can inject Cognito values at build time */
interface AmplifyStackProps extends cdk.StackProps {
  userPoolId: string;
  userPoolClientId: string;
  cognitoDomain: string;
}

export class AmplifyStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: AmplifyStackProps) {
    super(scope, id, props);

    // Create the Amplify app connected to the GitHub repo
    const amplifyApp = new amplify.App(this, 'CryptoTxTrackerApp', {
      appName: 'crypto-tx-tracker',
      sourceCodeProvider: new amplify.GitHubSourceCodeProvider({
        owner: 'NedGroom',
        repository: 'crypto_tx_tracker',
        oauthToken: cdk.SecretValue.secretsManager('crypto_tx_tracker_github_token_amplify'),
      }),
      // Build settings — Amplify runs this on every push
      buildSpec: codebuild.BuildSpec.fromObjectToYaml({
        version: 1,
        frontend: {
          phases: {
            preBuild: {
              commands: ['cd app', 'npm ci --include=dev'],
            },
            build: {
              commands: ['npm run build'],
            },
          },
          artifacts: {
            baseDirectory: 'app/dist',
            files: ['**/*'],
          },
          cache: {
            paths: ['app/node_modules/**/*'],
          },
        },
      }),
      // Environment variables injected at build time.
      // Note: do NOT set NODE_ENV=production here — it causes npm ci to skip
      // devDependencies (typescript, vite, etc.) which are needed for the build.
      // Cognito values come from AuthStack via props (cross-stack wiring).
      environmentVariables: {
        VITE_COGNITO_USER_POOL_ID: props.userPoolId,
        VITE_COGNITO_CLIENT_ID: props.userPoolClientId,
        VITE_COGNITO_DOMAIN: props.cognitoDomain,
        VITE_REDIRECT_SIGN_IN: `${cdkConfig.amplifyAppUrl}/`,
        VITE_REDIRECT_SIGN_OUT: `${cdkConfig.amplifyAppUrl}/login`,
      },
    });

    // Connect the main branch — auto-deploys on every push
    const mainBranch = amplifyApp.addBranch('main', {
      autoBuild: true,
      stage: 'PRODUCTION',
    });

    // SPA rewrite rule: serve index.html for all non-file routes
    // This ensures React Router handles client-side routing correctly
    amplifyApp.addCustomRule(amplify.CustomRule.SINGLE_PAGE_APPLICATION_REDIRECT);

    // Output the app URL after deploy
    new cdk.CfnOutput(this, 'AmplifyAppUrl', {
      value: `https://main.${amplifyApp.appId}.amplifyapp.com`,
      description: 'URL of the deployed Amplify app',
    });

    new cdk.CfnOutput(this, 'AmplifyAppId', {
      value: amplifyApp.appId,
      description: 'Amplify App ID (for console access)',
    });
  }
}
