# Google sign-in and production domain setup

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
4. Add the public production origin as an authorized JavaScript origin. The
   current default is:

   ```text
   https://randy-production.vercel.app
   ```

5. Add the matching authorized redirect URI. The current default is:

   ```text
   https://randy-production.vercel.app/api/auth/callback/google
   ```

6. Save the client and keep its client secret private.

When a custom domain is connected, add the custom domain's HTTPS origin and
`/api/auth/callback/google` redirect URI in Google Cloud. Set `BETTER_AUTH_URL`
to that same canonical HTTPS origin in Vercel, then redeploy. Keep the existing
`vercel.app` origin only if it is intentionally used for sign-in.

## Cloudflare DNS for Vercel

Cloudflare manages DNS for the domain; Vercel hosts and serves the application.
For the recommended direct-traffic setup:

1. Add the custom domain in the Vercel project's **Settings → Domains**.
2. In Cloudflare DNS, create or update the records using the exact record type,
   name, and target Vercel displays for that domain. Do not rely on fixed
   example IPs or copy a record from another project.
3. Set the website records to **DNS only** (proxy disabled / gray cloud) so
   visitors connect directly to Vercel. Vercel already provides its own
   delivery network. Proxying through Cloudflare adds a second cache and
   additional certificate and security configuration.
4. Wait for Vercel to verify the domain and issue its certificate. Confirm
   HTTPS works before making the custom domain canonical.
5. Set `BETTER_AUTH_URL` to the canonical custom HTTPS origin and update the
   Google authorized origin and callback URI above.

Add any Resend domain-verification, DKIM, SPF, or MX records using the exact
values Resend provides. DNS TXT and MX records are not proxied. If an SPF TXT
record already exists, update it as instructed by the mail providers rather
than creating multiple SPF records for the same domain.

Vercel recommends DNS-only Cloudflare records for direct connections. A
Cloudflare reverse proxy in front of Vercel is a different architecture and
requires additional proxy, caching, and TLS configuration.

## Supabase PostgreSQL

The application uses a PostgreSQL driver and Better Auth; it does not use
Supabase Auth or the Supabase browser SDK for database access. Keep database
connection strings server-side in Vercel environment variables and never put
them in `VITE_` variables or browser code.

Configure these values from the Supabase project's **Connect** panel:

| Variable | Connection type | Used for |
| --- | --- | --- |
| `DATABASE_URL` | Supabase shared transaction pooler | App and Better Auth queries from Vercel serverless functions. |
| `DATABASE_MIGRATION_URL` | Supabase direct PostgreSQL connection | Schema migrations during deployment builds. |

Supabase recommends transaction pooling for serverless workloads and direct
connections for migrations. Direct database connections may require IPv6
connectivity; verify that the Vercel build environment can reach the selected
endpoint. If not, use a Supabase-supported migration connection compatible
with the build environment and test it before production deployment.

The build applies files from `migrations/` using `DATABASE_MIGRATION_URL`,
falling back to `DATABASE_URL` if the migration URL is absent. Set both in
Vercel so runtime traffic uses the pooler while migrations use the intended
migration connection. Vercel deployments fail rather than using ephemeral
in-memory PGlite if the persistent database URL is missing.

The database schema and Better Auth tables are managed by this application's
SQL migrations. Do not enable Supabase Auth as a substitute without a separate
authentication migration and implementation.

## Vercel environment variables

In the Randy Production Vercel project, add these variables for **Production**:

| Variable               | Value                                     |
| ---------------------- | ----------------------------------------- |
| `GOOGLE_CLIENT_ID`     | The OAuth client ID from Google Cloud     |
| `GOOGLE_CLIENT_SECRET` | The OAuth client secret from Google Cloud |
| `BETTER_AUTH_URL`      | Canonical HTTPS domain, e.g. `https://randy-production.vercel.app` |

The production deployment must also have `BETTER_AUTH_SECRET`, `DATABASE_URL`,
and `DATABASE_MIGRATION_URL` configured. Keep all secrets in Vercel's
environment settings; do not commit them, put them in client-side `VITE_`
variables, or send them in chat. Redeploy after changing environment variables.

This Google client is configured for the stable production domain. Vercel preview
deployment URLs and the live App Builder preview have different callback hosts
and are not covered by this setup.

## Email magic links

The login page also supports passwordless email sign-in. Configure these server-
only variables in Vercel for each environment where email sign-in should work:

| Variable            | Value                                                                      |
| ------------------- | -------------------------------------------------------------------------- |
| `RESEND_API_KEY`    | A private Resend API key                                                   |
| `RESEND_FROM_EMAIL` | A sender address or `Name <email@your-verified-domain>` verified in Resend |

The email link expires after 10 minutes and can be used once. Requests are rate
limited. Without both variables, email sign-in fails safely and the Google
option remains available. Do not expose the Resend key through a `VITE_` variable
or commit it to the repository.
