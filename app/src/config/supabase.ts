// app/src/config/supabase.ts
// Configures the Supabase JS client to use Cognito access tokens.
// Every request to Supabase includes the current user's JWT automatically.

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
