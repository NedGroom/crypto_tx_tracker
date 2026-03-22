// infra/lambda/pre-token-generation/index.mjs
// Cognito Pre-Token Generation trigger (V1_0).
// Adds a "role" claim so Supabase assigns the "authenticated" Postgres role.

export const handler = async (event) => {
  event.response = {
    claimsOverrideDetails: {
      claimsToAddOrOverride: {
        role: 'authenticated',
      },
    },
  };
  return event;
};
