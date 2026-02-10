import * as cdk from 'aws-cdk-lib';
import * as amplify from '@aws-cdk/aws-amplify-alpha';
import * as codebuild from 'aws-cdk-lib/aws-codebuild';
import { Construct } from 'constructs';

export class AmplifyStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
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
      // Environment variables for the build (add more as needed)
      // Note: do NOT set NODE_ENV=production here — it causes npm ci to skip
      // devDependencies (typescript, vite, etc.) which are needed for the build.
      environmentVariables: {},
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
