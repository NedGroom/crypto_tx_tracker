// app/src/hooks/useAuthInit.ts
// Custom hook that runs once on app mount to check if the user already has
// a valid Cognito session. Bridges Amplify's auth state into Redux.

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

        dispatch(
          loginSuccess({
            sub: user.userId, // Cognito sub (UUID)
            email: (idToken?.payload?.email as string) ?? '',
          }),
        );
      } catch {
        // No active session — user is not logged in (this is normal, not an error)
        dispatch(loginFailure(''));
      }
    }

    checkSession();
  }, [dispatch]);
}
