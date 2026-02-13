// app/src/pages/LoginPage.tsx
// Public login page — the only page accessible without authentication.
// Renders a single "Sign in with Google" button that triggers the Cognito OAuth flow.

import { signInWithRedirect } from 'aws-amplify/auth';

function LoginPage() {
  const handleGoogleSignIn = () => {
    signInWithRedirect({ provider: 'Google' });
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
