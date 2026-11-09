# Randy Production

Randy Production is a production-services platform for events, film, branding,
and live experiences. It combines a public portfolio and planning tools with
private client project workspaces and internal Studio and Admin workspaces.

This README describes the product as it exists in the repository: its audiences,
main journeys, role boundaries, operational areas, and developer setup.

## Platform at a glance

| Area | Who it is for | What it does |
| --- | --- | --- |
| Public website | Everyone | Explains services, showcases approved work, and helps prospective clients plan or request a quote. |
| Client Portal | Signed-in clients | Shows a client's own projects, approvals, invoices, receipts, and project timeline. |
| Studio | Invited production team | Coordinates jobs, briefs, reviews, schedules, crew, collaboration, and production resources. |
| Admin | Studio administrators | Manages team access, finance, operational oversight, public project listings, and the knowledge base. |

The application is responsive and installable as a Progressive Web App (PWA).
On supported phones it offers an install prompt; browsers that do not support
native installation show browser-specific instructions instead.

## Roles and access

Roles are stored on the user's profile. Hiding a screen in the interface is not
the security boundary: server operations also verify the signed-in user and
required role.

| Role | How access is obtained | Main access |
| --- | --- | --- |
| Visitor | No account required | Public pages, portfolio, project updates, package guidance, event planner, and quote builder. |
| Client | Signs in with Google or an email sign-in link | Client Portal and only the projects associated with that account. |
| Staff | Accepts a valid Studio invitation using the invited email account | Studio workflows and shared production information. |
| Admin | The configured, verified administrator account | Admin functions and Studio functions. |

New accounts receive the client role by default. An administrator creates
time-limited, single-use Studio invitations tied to an email address. Accepting
an invitation with that same account grants staff access. The invitation's
role/title field describes the team member's work; it does not grant Admin
permissions. Admin access is reserved for the configured administrator.

Signing in or creating a client account takes the user to the Client Portal.
A Studio invitation is the exception: after sign-in, it returns the invited
person to the invitation so they can accept it.

## Customer journey

### 1. Explore

Visitors can learn about the studio and choose a starting point:

- **Home (`/`)** introduces the services, selected work, and the next-step options.
- **Our Work (`/work`)** displays project stories and filters them by service.
- **A project story (`/cases/:slug`)** gives a closer look at an individual portfolio entry.
- **Studio Updates (`/transparency`)** lists only projects explicitly approved for public sharing. It is read-only and does not expose client contact details, budgets, or internal notes.

### 2. Plan

Prospective clients can use any of three related tools:

- **Get a Quote (`/quote`)** builds a scope and a live planning estimate in Kenyan shillings. The client chooses an event, production tier, venue setting, and services, then enters organiser details.
- **Help Me Choose (`/match`)** recommends a starting package from the event type, guest range, venue, and main priority. The result explains the match and can prefill the quote builder.
- **Plan Your Event (`/look`)** captures event context, visual direction, room focal points, and a creative brief. The browser saves the working draft locally. The client can carry the brief into Get a Quote.

These are planning tools, not confirmation of availability or a final price.
An estimate is not an invoice. The production team reviews the scope and
confirms project details with the client.

### 3. Sign in and submit

Google sign-in and passwordless email links are available when configured. To
submit a quote, the organiser provides a name and at least one contact method.
The quote is saved to the signed-in account and opens its booking page.

If a visitor starts the quote submission before signing in, the browser
temporarily saves the quote draft and sends them to sign in. Successful client
sign-in goes to the Client Portal. The visitor can return to Get a Quote in the
same browser to continue the saved draft; browser-local drafts do not sync
between devices.

### 4. Review the proposal and book

On the booking page (`/book/:quoteId`), the client can:

1. Review the planning estimate and its line-item breakdown.
2. E-sign the proposal contract.
3. Open the linked project workspace.
4. Review payment terms when the team proposes them.

The client reviews and accepts or requests changes to payment milestones in the
project workspace. An invoice is issued after the terms are accepted. Online
payment is available only when a live payment integration is configured. A
client can also report an offline payment; it remains unconfirmed until an
administrator verifies it. Receipts are available after payment confirmation.

### 5. Follow the project

The Client Portal provides:

- **Project list (`/portal`)** — active, attention-needed, and completed work.
- **Project workspace (`/portal/:projectId`)** — overview, client approvals,
  invoices and receipts, and the show timeline.
- **Receipt (`/portal/:projectId/receipts/:receiptId`)** — a digital receipt
  for a confirmed payment.
- **Client profile (`/portal/profile`)** — account information.

Clients can approve shared project drafts or request changes, respond to
payment terms, report offline payments, and view cues and progress. Project
access is restricted to the account that owns the project.

## Studio and Admin workflows

### Studio workspace

The Studio is private to staff and administrators:

- **Desk (`/studio`)** summarizes active work, upcoming shows, and actions that
  need attention.
- **Jobs (`/studio/pipeline`)** manages production records and the job board.
- **Briefs (`/studio/briefs`)** handles project briefs.
- **Client reviews (`/studio/reviews`)** manages client-facing review material.
- **Run sheet (`/studio/runsheet`)** manages production schedules and cues.
- **Crew (`/studio/crew`)** coordinates crew assignments and call information.
- **Team chat (`/studio/collaboration`)** provides channels, messages,
  attachments, reactions, and presence.
- **Gear (`/studio/gear`)**, **Vendors (`/studio/vendors`)**, and
  **Merch (`/studio/merch`)** provide production resource and catalog tools.
- **Case Forge (`/studio/marketing`)** supports case-study and testimonial work.
- **Show day (`/studio/live/:projectId`)** provides the live production view.
- **Profile (`/studio/profile`)** contains the team member's profile.

Administrators can use Studio workflows as well as Admin functions. Staff do
not receive Admin access simply by being able to work on Studio projects.

### Admin workspace

Admin is restricted to administrators:

- **Overview (`/admin`)** brings together people, finance, production, and
  closeout priorities.
- **People & access** creates and tracks staff invitations and onboarding,
  and manages team records.
- **Finance & receipts** reviews financial and closeout information.
- **Production operations** highlights readiness gaps and work needing review.
- **Studio Updates** controls which eligible projects are approved for public
  display.
- **Knowledge base** curates sourced planning guidance used by Help Me Choose.
- **Finance ledger (`/admin/receipts`)** reviews offline-payment reports,
  issued receipts, and related finance records.

Admin functions are checked on the server. A staff or client account cannot
gain administrator access by navigating directly to an Admin URL.

## Route reference

| Path | Purpose |
| --- | --- |
| `/` | Public home |
| `/work` | Portfolio and service filters |
| `/cases/:slug` | Portfolio story |
| `/transparency` | Approved public project updates |
| `/quote` | Quote and estimate builder |
| `/match` | Package recommendation guide |
| `/look` | Event and room planner |
| `/login` | Sign-in and account creation |
| `/book/:quoteId` | Proposal, contract, and booking flow |
| `/portal` | Client project dashboard |
| `/portal/:projectId` | Client project workspace |
| `/portal/:projectId/receipts/:receiptId` | Client digital receipt |
| `/portal/profile` | Client profile |
| `/studio` | Studio production desk |
| `/studio/pipeline` | Production jobs |
| `/studio/briefs` | Briefs |
| `/studio/reviews` | Client reviews |
| `/studio/runsheet` | Production run sheet |
| `/studio/crew` | Crew workspace |
| `/studio/collaboration` | Team chat |
| `/studio/live/:projectId` | Live project view |
| `/studio/gear`, `/studio/vendors`, `/studio/merch` | Production resources |
| `/studio/marketing` | Case Forge |
| `/studio/profile` | Team profile |
| `/admin` | Admin dashboard |
| `/admin/receipts` | Finance ledger |
| `/api/auth/*` | Authentication endpoints |

Compatibility paths `/client`, `/studio/admin`, and `/studio/receipts` redirect
to the current Client Portal or Admin destinations.

## Data and integrations

- **Database:** Supabase PostgreSQL via `DATABASE_URL` in deployed
  environments. Use Supabase's shared transaction pooler for Vercel serverless
  requests. Database migrations use `DATABASE_MIGRATION_URL` when configured,
  preferably the Supabase direct connection string. Development without a
  database URL uses embedded, in-memory PGlite; that data is lost when the
  process restarts and must not be used for production.
- **Schema:** `migrations/schema.sql` is the canonical baseline. Incremental
  migrations live in `migrations/`.
- **Authentication:** Better Auth manages the app's own sessions. Production
  supports Google OAuth and passwordless email links. Email links require a
  configured sender service. See [Google sign-in setup](./docs/google-auth-setup.md).
- **Payments:** A trusted payment adapter must be configured for live online
  payments. Payment handling defaults to disabled; demo payments are not
  recorded as real client payments. Supported offline reports include M-Pesa,
  bank transfer, and cash, and require Admin verification.
- **Planning guidance:** Package recommendations are calculated by the app.
  Approved knowledge-base entries provide optional cited guidance; an
  AI-generated insight is supplemental and does not replace the recommendation
  or a team's professional review.
- **Email:** Passwordless sign-in email uses a configured email-sending service.
- **PWA:** The service worker caches same-origin static app assets, not private
  pages or user data.

## Run locally

Use Node.js 24 and npm, consistent with the deployment runtime.

```sh
npm install
npm run dev
```

The development server uses port `8080`. Open `http://localhost:8080`.

Useful checks:

```sh
npm run typecheck
npm test
npm run lint
npm run check:catalog
npm run check:auth
```

For an isolated local role preview, use synthetic fixture data:

```sh
npm run dev:fixtures -- client
npm run dev:fixtures -- staff
npm run dev:fixtures -- admin
```

Fixture mode is limited to development and uses an in-memory database with
external integrations disabled. It requires the fixture guard conditions in
`src/lib/env.server.ts`; it is not a production authentication bypass and must
not be used with a configured database.

Build and preview commands:

```sh
npm run build:dev
npm run preview
```

`npm run build` performs the production build and applies pending migrations.
On Vercel, configure `DATABASE_URL` and `DATABASE_MIGRATION_URL`; deployments
without a persistent database URL fail instead of silently using per-instance
memory. `DATABASE_URL` should use the Supabase transaction pooler for runtime
serverless queries. `DATABASE_MIGRATION_URL` should use the Supabase direct
connection for migrations when the build environment can reach it. Run builds
only with the intended deployment database configured.
`npm run db:bootstrap` is for an empty database only and refuses to bootstrap
a non-empty schema.

## Configuration and deployment

The production deployment uses Vercel, Supabase PostgreSQL, Cloudflare DNS, and
Resend for transactional email. Keep secrets in Vercel's server-side
environment settings. Do not commit credentials, place them in browser-visible
`VITE_` variables, or copy secret values into this README. For direct traffic
to Vercel through Cloudflare DNS, use the exact records Vercel displays and
leave the Cloudflare records DNS-only (proxy disabled). See
[Google sign-in and domain setup](./docs/google-auth-setup.md).

Common server-side configuration:

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Supabase transaction-pooler PostgreSQL connection for app/serverless runtime. |
| `DATABASE_MIGRATION_URL` | Supabase direct PostgreSQL connection for build-time schema migrations. Falls back to `DATABASE_URL` if unset. |
| `BETTER_AUTH_URL` | Canonical public app URL used by authentication; use the verified custom domain when configured. |
| `BETTER_AUTH_SECRET` | Secret used to protect authentication sessions. |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Google OAuth credentials. |
| `RESEND_API_KEY`, `RESEND_FROM_EMAIL` | Optional passwordless sign-in email delivery. |
| `STUDIO_ADMIN_EMAIL` | Verified email that receives initial Admin access. |
| `PAYMENT_MODE` or `PAYMENT_PROVIDER_MODE` | Payment mode; live payments require a trusted adapter. |
| `PAYMENT_PROVIDER`, `PAYMENT_PROVIDER_URL`, `PAYMENT_PROVIDER_API_KEY` | Trusted payment adapter configuration. |
| `PAYMENT_CURRENCY` | Payment currency; defaults to `KES`. |

The authentication, Cloudflare DNS, and callback URL setup are documented in
[docs/google-auth-setup.md](./docs/google-auth-setup.md). Configure production
authentication, database access, email, and payment settings in the deployment
environment before enabling the corresponding features.

For a custom domain, add the domain to the Vercel project first, then configure
the exact DNS records Vercel provides in Cloudflare. Use DNS-only records for
direct Vercel traffic. Update `BETTER_AUTH_URL` and the Google OAuth authorized
origin/callback to the canonical HTTPS domain. Resend's domain-verification
records should also be copied from Resend into Cloudflare DNS.

## Project layout

```text
src/
  components/       Shared site, Admin, and UI components
  data/             Service catalog and portfolio content
  lib/auth/         Client and server authentication
  lib/server/       Server-side data operations
  routes/           Public, Client Portal, Studio, and Admin routes
migrations/         Database baseline and incremental SQL migrations
public/             Brand, portfolio, PWA, and static assets
scripts/            Build, migration, validation, and local preview tools
docs/               Setup documentation
```

Generated route metadata is maintained in `src/routeTree.gen.ts`; add or
rename application routes in `src/routes/` and use the repository's existing
TanStack Router conventions.
