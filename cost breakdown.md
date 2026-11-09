# Randy Production Platform: Development Proposal and Value Breakdown

**Prepared:** 9 November 2026
**Currency:** Kenyan shillings (KES)
**Proposal type:** Fixed-price freelance development proposal. The amounts
below are a scope-based estimate, not an hourly quote, timesheet, tax invoice,
or independent valuation. An indicative software-company planning estimate is
included for comparison.

## Project understanding and technical assumptions

The estimate reflects the platform's public quote and planning journeys,
Client Portal, Studio and Admin workspaces, authentication and role
boundaries, database and migration setup, responsive/PWA experience, quality
checks, deployment configuration, and documentation. KES 456,000 is the
proposed freelance fee for the defined scope below. It does not imply that
every possible feature or production integration is included.

The deployment plan is **Vercel for application hosting, Supabase for
PostgreSQL, Cloudflare for domain DNS, and Resend for passwordless email**.
The application uses Better Auth for sign-in and connects to Supabase through
its PostgreSQL connection; Supabase Auth is not part of this implementation.

Vercel runtime traffic will use Supabase's transaction pooler, and deployment
migrations will use a separate direct database connection where available.
Cloudflare will manage DNS records that point the custom domain to Vercel;
the recommended configuration leaves those records DNS-only rather than
placing a second proxy in front of Vercel. Service subscriptions, domain
renewal, and usage-based provider charges are operating expenses, separate
from the one-time development fee.

## Investment overview

> **Freelance development fee: KES 456,000**, before VAT if legally
> chargeable. Third-party operating costs and ongoing support are separate.

This fixed-value proposal is based on the business outcomes and deliverables
in the agreed scope—not hours or lines of code. It covers the public enquiry
journey, connected client and operations workspaces, access controls, quality
checks, and handover. It does not guarantee a particular increase in sales or
reduction in operating costs.

For comparison, development of a substantially similar broad platform by a
software company may have an indicative planning budget of **KES 1,800,000 to
KES 2,600,000**, depending on discovery, team size, formal project management
and QA, warranty, support commitments, and integrations. This is a planning
range, not a quotation from a specific company or an official Kenyan tariff;
the deliverables and service levels must be compared directly.

## What the client is paying for

The proposed scope is more than a marketing website. It includes:

- A public website and portfolio, with quote, package-matching, and event
  planning journeys.
- Sign-in and role-based access for clients, invited staff, and administrators.
- A client portal for projects, approvals, payment terms, invoices, payment
  reports, receipts, and timelines.
- A production workspace for jobs, briefs, reviews, schedules, crew,
  collaboration, gear, vendors, merchandise, and case-study workflows.
- An Admin workspace for access invitations, finance, operations, approved
  public updates, and planning guidance.
- Database and migrations, responsive layouts, PWA support, integration
  boundaries, tests, and deployment/handover work.

The platform connects customer acquisition to project delivery: the business
can collect a lead, preserve and review a scope, coordinate production, keep
clients informed, and track approvals and financial records in one product.
This is intended to support more consistent administration and handoffs.
Actual business results depend on adoption and operations and are not
guaranteed by the development work.

## Interface-by-interface explanation

The proposal covers a connected set of interfaces for different users, rather
than a single screen. Each supports a different part of the production
journey. The next section shows how the KES 456,000 freelance fee is allocated
across these outcomes and their shared foundations.

### Public interfaces: prospective clients and visitors

- **Home and main navigation (`/`):** introduces the studio and routes visitors
  to services, examples of work, planning tools, and contact/quote actions.
- **Portfolio and project stories (`/work`, `/cases/:slug`):** lets potential
  clients browse work and understand the studio's production capabilities.
- **Public Studio Updates (`/transparency`):** presents only approved,
  client-safe updates; it is distinct from internal project notes.
- **Quote builder (`/quote`):** lets an organiser select event and service
  options, see an estimate, and prepare a request for the team to review.
- **Package guide (`/match`):** helps visitors choose a starting package and
  carry that choice into the quote flow.
- **Event planner (`/look`):** gathers event details and creative direction so
  a prospective client can form a brief before requesting a quote.

**Where the value goes:** the public-facing allocation covers the customer
journeys, portfolio presentation, planning interactions, and handoff from
exploration into a quote. The recommendation and quote tools are planning
assistance; they do not confirm availability or make an estimate a final
invoice.

### Sign-in, proposal, and booking interfaces

- **Sign-in and account creation (`/login`):** gives clients a way to enter the
  portal and invited staff a way to authenticate before accepting an
  invitation.
- **Proposal and booking (`/book/:quoteId`):** gives an authenticated client a
  place to review the proposed scope and estimate, sign the contract, and
  continue to the project workspace.

**Where the value goes:** the flow connects an enquiry to an identifiable
client/project record and reduces the gap between a quote request and the
project's next steps. Authentication, identity checks, and server-side access
rules are part of the shared backend work as well as the visible screens.

### Client interfaces: project dashboard and project workspace

- **Client dashboard (`/portal`):** gives each client a summary and list of
  their own projects, including work that is active, needs attention, or is
  complete.
- **Project overview (`/portal/:projectId`):** brings together the specific
  project's status, key details, and next actions.
- **Approvals:** lets a client review shared drafts, approve them, or request
  changes with feedback.
- **Billing and receipts:** presents proposed payment terms, invoices, payment
  reporting, and receipts for confirmed payments. An offline payment report
  is not treated as verified until Admin reviews it.
- **Timeline:** shows project progress and relevant event/show cues.
- **Profile and receipt detail (`/portal/profile`,
  `/portal/:projectId/receipts/:receiptId`):** supports account details and
  access to an individual confirmed receipt.

**Where the value goes:** the Client Portal allocation pays for the client
side of project delivery—visibility, approvals, billing context, and updates.
The client sees their project information without gaining access to another
client's records.

### Studio interfaces: staff desk and production tools

- **Studio desk (`/studio`):** a staff dashboard for active jobs, upcoming
  productions, and work needing attention.
- **Job pipeline (`/studio/pipeline`):** a production board for following work
  from job intake through operational stages.
- **Briefs and reviews (`/studio/briefs`, `/studio/reviews`):** tools for
  handling project information and client-facing creative review work.
- **Run sheet and live show view (`/studio/runsheet`,
  `/studio/live/:projectId`):** support schedules, cues, and the active
  production view.
- **Crew (`/studio/crew`):** organizes crew assignments and call information.
- **Team collaboration (`/studio/collaboration`):** gives staff channels and
  shared communication, with message-related collaboration features.
- **Resources (`/studio/gear`, `/studio/vendors`, `/studio/merch`):** support
  equipment, supplier, and merchandise operations.
- **Case Forge (`/studio/marketing`) and team profile
  (`/studio/profile`):** support case-study/testimonial work and staff account
  details.

**Where the value goes:** the Studio allocation is larger because it covers
multiple connected operational interfaces, not just a dashboard. These tools
help staff coordinate the work that must happen after a client says yes. They
are production coordination tools; they do not replace the team's judgement or
guarantee that a physical event will run without issues.

### Admin interfaces: business oversight and control

- **Admin dashboard (`/admin`):** gives administrators an overview of people,
  finance, production readiness, and items requiring follow-up.
- **People and invitations:** lets an Admin prepare and track staff access.
  Invitations are tied to the invited email and do not by themselves grant
  Admin privileges.
- **Finance and receipts (`/admin/receipts`):** provides an administrative
  place to review financial records, offline payment reports, and receipts.
- **Operations:** highlights job readiness and operational follow-up.
- **Public update controls:** allow approved project information to be
  presented publicly without exposing internal/client-only records.
- **Knowledge base:** stores sourced planning guidance used by the package
  guide.

**Where the value goes:** the Admin allocation supports controlled access,
financial oversight, operational review, and the business's ability to decide
what project information is safe to publish. Authorization is enforced on the
server for privileged operations, not only by hiding dashboard links.

### Shared interface foundations

The interface work also includes responsive layouts for phone and desktop,
shared navigation and visual patterns, form states, empty/loading/error
feedback, and installable PWA behavior where supported. Backend and access
work connects the interfaces to persistent records and makes sure each role
can only use the data and actions it is allowed to access. Quality assurance
and handover cover checks across the main journeys, fixes for in-scope defects,
deployment assistance, and operating documentation.

## Value allocation of the KES 456,000 freelancer fee

The following allocation explains what the client is paying to receive. These
are fixed-value portions of one project fee, not hourly charges or separate
third-party supplier quotations.

| Workstream                                           | Value (KES) | Where the value goes                                                                                                                          |
| ---------------------------------------------------- | ----------: | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Product discovery and solution architecture          |      25,000 | Agreeing what each role needs, how visitors become clients, how a job proceeds, and where the service boundaries are.                         |
| UX/UI and responsive design                          |      45,000 | Shared navigation, mobile and desktop layouts, dashboard hierarchy, forms, and useful loading, empty, and error states across the interfaces. |
| Public website and enquiry flows                     |      55,000 | Home, portfolio, case stories, public updates, quote builder, package guide, event planner, and enquiry handoff.                              |
| Client portal and project lifecycle                  |      75,000 | Client project dashboard, project overview, approvals/feedback, payment terms, invoices, confirmed receipts, timeline, and profile.           |
| Studio operations workspace                          |      90,000 | Staff desk, job pipeline, briefs, reviews, run sheet/live view, crew, collaboration, gear, vendors, merchandise, and Case Forge.              |
| Admin, access, and finance workflows                 |      55,000 | Admin overview, staff invitations, finance/receipt review, operational readiness, publication controls, and planning knowledge base.          |
| Backend, database, authentication, and authorization |      55,000 | Connecting interfaces to records, migrations, sign-in, role checks, ownership checks, and protected server-side operations.                   |
| Quality assurance and release hardening              |      35,000 | Walking through the main visitor, client, staff, and Admin journeys; checking responsive behavior; correcting in-scope defects.               |
| Deployment, documentation, and handover              |      21,000 | Vercel deployment configuration, Supabase connection and migration settings, Cloudflare DNS handoff, operating notes, administrator orientation, and handover checklist. |
| **Total**                                            | **456,000** | **Defined freelancer platform build, allocated by interface and business value—not a per-page or hourly charge.**                             |

### Why the backend and security work has a budget

Client projects, staff operations, and financial records are sensitive business
data. The value is not just that each role has a different screen: server
operations must also restrict actions and project records to the appropriate
person. Database migrations, authentication configuration, and checks for
authorization and data ownership help make the workflows reliable as the
business grows.

This allocation does **not** mean the platform has undergone a formal
independent penetration test, legal/privacy review, or certification. Those
should be scoped and quoted explicitly if required.

## What is included—and what is not

### Included in the proposed development scope

- The public, Client, Studio, and Admin interfaces described above.
- The shared responsive layouts, application access controls, and database
  work described in the value allocation.
- Quality checks of the agreed user journeys and correction of in-scope
  defects.
- Deployment assistance, documentation, and handover as described in the
  signed project scope.

### Not included unless added to the signed scope

- Native Android or iOS applications or app-store submission.
- Provider-specific live payment-gateway integration, provider onboarding,
  settlement testing, and reconciliation.
- SMS, WhatsApp, accounting, CRM, calendar, or other external integrations not
  named in the scope.
- Independent penetration testing, security certification, legal advice, or
  regulatory compliance certification.
- New features, unlimited revisions, content entry, photography, video, or
  ongoing copywriting.
- Hosting, domain registration, email sending, database usage, payment fees,
  or other third-party costs.
- Ongoing maintenance, support, or guaranteed uptime after the included
  handover/defect period.

The quote and planning tools produce estimates; they do not confirm
availability, constitute a final invoice, or guarantee that a payment
processor is enabled.

## Proposed payment milestones

Each payment is tied to a visible delivery stage and client review. For the
KES 456,000 freelance development fee:

| Milestone                                    |    Share | Amount (KES) | Trigger                                                                                         |
| -------------------------------------------- | -------: | -----------: | ----------------------------------------------------------------------------------------------- |
| Project start and reserved delivery capacity |      30% |      136,800 | Signed agreement, approved scope, and kickoff.                                                  |
| Approved journeys and interface direction    |      25% |      114,000 | Client approval of the agreed UX/prototype or equivalent design checkpoint.                     |
| Feature-complete staging review              |      25% |      114,000 | The scoped workflows are available for client review on staging.                                |
| Launch and handover                          |      20% |       91,200 | Agreed acceptance checks pass, production handover is complete, and documentation is delivered. |
| **Total**                                    | **100%** |  **456,000** |                                                                                                 |

The final agreement will specify review windows, acceptance criteria, defect
reporting, and responsibilities for providing content and approvals. Any
request outside the agreed scope will be estimated and approved in writing
before work begins.

## Running costs after launch

The one-time development fee is separate from the recurring cost of operating
the product. The domain, hosting, database, email, and payment-provider
accounts should be owned and paid for by the client where practical. This
keeps account ownership clear and lets actual provider usage determine the
operating bill.

The planned service categories are:

- **Cloudflare:** domain DNS management and domain renewal depend on the
  selected plan and registrar. DNS records will point the domain to Vercel; the
  recommended setup uses DNS-only records, not Cloudflare's reverse proxy.
- **Vercel:** deployment/build hosting and usage-based platform services. Its
  pricing page lists Hobby at US$0/month and Pro at US$20/month before
  usage-based charges. The selected plan depends on commercial use, features,
  and traffic.
- **Supabase:** budget according to the selected project plan and database
  usage. The application database will be configured for Supabase PostgreSQL;
  database backups and migration connections should be verified before launch.
- **Resend:** email delivery for sign-in links and any other agreed transactional
  email. Charges and sending limits depend on the selected plan, volume, and
  domain verification.
- **Domain, file storage, monitoring, backups, and payment processing:**
  charged according to the selected provider and actual usage. Payment
  processing fees are separate from development and must be confirmed with the
  selected provider.

The handover will identify the production URL, Supabase database owner and
backup responsibility, Cloudflare DNS records, Resend sender configuration,
and billing account for each service.

The [Vercel pricing page](https://vercel.com/pricing) lists Hobby at
US$0/month and Pro at US$20/month before usage-based charges. Actual Supabase,
Cloudflare, and Resend costs depend on the selected plans and usage and should
be confirmed from provider pricing and account details. These provider
charges are not part of the KES 456,000 development fee.

## Optional ongoing support

After the agreed defect-correction period, ongoing support may be arranged as
a separate, renewable agreement. An example limited support package is:

- **KES 15,000–30,000 per month** for a clearly defined, limited support
  package.
- The support agreement will define the response window, covered maintenance
  tasks, exclusions, rollover policy, and process for approving additional
  work.
- Treat new features, major upgrades, incidents caused by third parties, and
  after-hours emergency work as separately quoted unless the agreement
  specifically includes them.

These monthly figures are a planning example, not an externally published
Kenyan tariff. Final support fees depend on the agreed response window,
maintenance coverage, and support commitment.

## Tax and invoicing in Kenya

The Kenya Revenue Authority's VAT guidance says the general VAT rate is **16%**
and that a person supplying, or expecting to supply, taxable goods/services
worth **KES 5 million or more in a year** is required to register for VAT.
The relevant threshold concerns taxable supplies over the year, not just this
one contract. KRA also says VAT-registered persons must onboard on eTIMS.

The recommended freelancer build fee is **KES 456,000 before VAT if VAT is
legally chargeable**. At 16%, VAT on that amount would be KES 72,960, making
the total KES 528,960. If KES 456,000 must instead be the client's all-in
maximum and VAT applies, the pre-VAT fee would be approximately KES 393,103
and VAT approximately KES 62,897. Agree which interpretation applies before
finalizing the agreement. VAT will only be charged where legally applicable
and reflected in a valid tax invoice. KRA's threshold concerns annual taxable
supplies, not only this project; the applicable tax treatment depends on the
supplier's circumstances. The parties should confirm the applicable treatment
with KRA or a qualified Kenyan tax professional before invoicing.

## Proposal basis and acceptance

This document is a development proposal and scope-based estimate, not a tax
invoice or a claim that the fee is automatically payable for work performed
before an agreement. The project begins when both parties approve the written
scope, schedule, acceptance criteria, payment milestones, and ownership and
handover terms.

If the full scope does not fit the approved budget, the parties may agree to
phase or reduce deliverables before work begins. Any feature, integration, or
support commitment outside the signed scope will be separately estimated and
approved in writing.

## Kenya market and pricing sources

These public sources provide context for the proposal. They do not establish
a single official Kenyan market rate:

1. [Clutch: Top Software Developers in Kenya](https://clutch.co/ke/developers) —
   directory accessed 9 November 2026; its listing for Nairobi-based Segue
   Interactive showed a **US$1,000+ minimum project size**. This is one
   vendor's advertised directory profile and is not a quote for this project's
   scope. Clutch notes it may earn fees for some placements.
2. [Kenya Revenue Authority: Value Added Tax](https://www.kra.go.ke/individual/filing-paying/types-of-taxes/value-added-tax) —
   source for the general VAT rate, registration threshold, and eTIMS guidance
   summarized above. Applicable rules should be confirmed before invoicing.
3. [Vercel pricing](https://vercel.com/pricing) — source for the example
   deployment plan prices. Supabase, Cloudflare, and Resend charges are
   account-specific operating expenses based on their selected plans and
   usage.

Because public Kenyan software-company prices are limited and not directly
comparable, the **KES 1,800,000–2,600,000 company range is an indicative
planning estimate**, not a formal quotation. Actual company fees depend on the
agreed deliverables, service levels, integrations, and support arrangements.
