#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { cdkConfig } from '../lib/config';
import { AmplifyStack } from '../lib/amplify-stack';
import { AuthStack } from '../lib/auth-stack';

const app = new cdk.App();
const env = { account: cdkConfig.account, region: cdkConfig.region };

// Auth stack — Cognito User Pool + Google IdP
const authStack = new AuthStack(app, 'AuthStack', { env });

// Amplify hosting — receives Cognito values as build-time env vars
new AmplifyStack(app, 'CryptoTxTrackerAmplify', {
  env,
  description: 'Amplify hosting for Crypto Transaction Tracker React app',
  userPoolId: authStack.userPoolId,
  userPoolClientId: authStack.userPoolClientId,
  cognitoDomain: authStack.cognitoDomain,
});
