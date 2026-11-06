# Google sign-in setup

The deployed app uses Better Auth's native Google OAuth provider. Its Google
callback is on the app's own domain; the live App Builder preview continues to
use its broker because preview hostnames are temporary.

## Google Cloud Console

1. Select or create the Google Cloud project for Randy Production.
2. Open **Google Auth Platform** and configure the app's branding and audience.
   Use **External** if clients outside your Google Workspace will sign in. While
   the audience is in testing, add the Google accounts that should be allowed
   to test.
3. Under **Clients**, create an OAuth client ID with application type **Web
   application**.
4. Add this authorized JavaScript origin:

   ```text
   https://randy-production.vercel.app
   ```

5. Add this authorized redirect URI:

   ```text
   https://randy-production.vercel.app/api/auth/callback/google
   ```

6. Save the client and keep its client secret private.

## Vercel environment variables

In the Randy Production Vercel project, add these variables for **Production**:

| Variable | Value |
| --- | --- |
| `GOOGLE_CLIENT_ID` | The OAuth client ID from Google Cloud |
| `GOOGLE_CLIENT_SECRET` | The OAuth client secret from Google Cloud |
| `BETTER_AUTH_URL` | `https://randy-production.vercel.app` |

The production deployment must also have `BETTER_AUTH_SECRET` and `DATABASE_URL`
configured. Keep all secrets in Vercel's environment settings; do not commit them,
put them in client-side `VITE_` variables, or send them in chat. Redeploy after
changing environment variables.

This Google client is configured for the stable production domain. Vercel preview
deployment URLs and the live App Builder preview have different callback hosts
and are not covered by this setup.
