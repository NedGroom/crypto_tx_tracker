#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { AmplifyStack } from '../lib/amplify-stack';

const app = new cdk.App();

new AmplifyStack(app, 'CryptoTxTrackerAmplify', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: 'eu-west-2',
  },
  description: 'Amplify hosting for Crypto Transaction Tracker React app',
});
