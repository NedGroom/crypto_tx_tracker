// app/src/pages/LoginPage.tsx
// Public login page — the only page accessible without authentication.
// Renders a single "Sign in with Google" button that triggers the Cognito OAuth flow.

import { useEffect } from 'react';
import { signInWithRedirect } from 'aws-amplify/auth';

const oauthDomain = import.meta.env.VITE_COGNITO_DOMAIN;
const oauthClientId = import.meta.env.VITE_COGNITO_CLIENT_ID;
const redirectSignOut = import.meta.env.VITE_REDIRECT_SIGN_OUT;
const OAUTH_LOGOUT_THEN_SIGNIN_FLAG = 'oauth_logout_then_signin';

function LoginPage() {
  useEffect(() => {
    const shouldResumeSignIn =
      sessionStorage.getItem(OAUTH_LOGOUT_THEN_SIGNIN_FLAG) === '1';

    if (!shouldResumeSignIn) {
      return;
    }

    sessionStorage.removeItem(OAUTH_LOGOUT_THEN_SIGNIN_FLAG);

    void signInWithRedirect({
      provider: 'Google',
      options: {
        prompt: 'SELECT_ACCOUNT',
      },
    });
  }, []);

  const handleGoogleSignIn = async () => {
    if (oauthDomain && oauthClientId && redirectSignOut) {
      // Clear Cognito hosted session first, then continue sign-in from /login.
      sessionStorage.setItem(OAUTH_LOGOUT_THEN_SIGNIN_FLAG, '1');

      const logoutParams = new URLSearchParams({
        client_id: oauthClientId,
        logout_uri: redirectSignOut,
      });

      window.location.assign(
        `https://${oauthDomain}/logout?${logoutParams.toString()}`,
      );
      return;
    }

    await signInWithRedirect({
      provider: 'Google',
      options: {
        prompt: 'SELECT_ACCOUNT',
      },
    });
  };

  return (
    <div className="login-page">
      <h1>Crypto Transaction Tracker</h1>
      <p>Sign in to manage your transactions.</p>
      <button onClick={handleGoogleSignIn}>Sign in with Google</button>
    </div>
  );
}

export default LoginPage;
