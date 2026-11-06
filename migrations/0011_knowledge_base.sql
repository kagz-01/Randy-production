create table if not exists knowledge_entries (
  id text primary key,
  title text not null,
  content text not null,
  tags text not null default '',
  source_name text not null,
  source_url text,
  source_published_at date,
  source_checked_at date not null default current_date,
  jurisdiction text not null default 'Kenya',
  evidence_type text not null check (
    evidence_type in (
      'official_guidance',
      'practice_reference',
      'company_practice',
      'project_learning',
      'vendor_learning'
    )
  ),
  visibility text not null default 'internal' check (visibility in ('internal', 'public')),
  status text not null default 'draft' check (status in ('draft', 'approved', 'archived')),
  created_by text,
  anonymized_by text,
  anonymized_at timestamptz,
  reviewed_by text,
  reviewed_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (visibility != 'public' or source_url is not null or evidence_type in ('company_practice', 'project_learning', 'vendor_learning'))
);

create index if not exists knowledge_entries_public_idx
  on knowledge_entries (status, visibility, source_checked_at desc);

create index if not exists knowledge_entries_updated_idx
  on knowledge_entries (updated_at desc);

insert into knowledge_entries (
  id, title, content, tags, source_name, source_url, jurisdiction, evidence_type, visibility, status, reviewed_by, reviewed_at
) values
(
  'kb-kmd-outdoor-weather',
  'Outdoor events: use current county weather forecasts and warnings',
  'The Kenya Meteorological Department provides daily forecasts, 5-day and 7-day outlooks, county-level forecasts, and warnings for hazards including heavy rainfall, flooding, and strong winds. For an outdoor event, check the relevant county forecast during planning and again close to event day. Agree a wet-weather decision point, covered alternative, safe equipment protection, and a clear way to communicate any change. Forecasts are time-sensitive; this entry is planning guidance, not a forecast.',
  'outdoor,weather,forecast,rain,flooding,wind,garden,venue,event-day,contingency',
  'Kenya Meteorological Department — Weather Forecasting',
  'https://meteo.go.ke/Services/weather-forecasting/',
  'Kenya',
  'official_guidance',
  'public',
  'approved',
  'system-curated',
  now()
),
(
  'kb-kmd-weather-alerts',
  'Outdoor production: monitor official severe-weather alerts',
  'KMD publishes weather warnings and alerts. For outdoor production, assign someone to monitor official updates and agree in advance who can pause setup, protect equipment, move guests, or activate the covered alternative. Do not treat an old alert or forecast as current; check the official warning page and its issue time.',
  'outdoor,weather,alerts,rain,flooding,wind,production,safety,contingency',
  'Kenya Meteorological Department — Weather Warnings',
  'https://meteo.go.ke/weather-warnings/',
  'Kenya',
  'official_guidance',
  'public',
  'approved',
  'system-curated',
  now()
),
(
  'kb-who-all-hazards',
  'Larger gatherings: use an all-hazards planning approach',
  'WHO describes mass-gathering readiness in terms of risk assessment, surveillance and response, emergency and mass-casualty planning, transport procedures, and current health advice. For a larger or higher-complexity event, identify credible hazards before event day, name the people responsible for decisions, confirm how emergency services can reach the venue, and make attendee-facing emergency information easy to find. Scale the plan to the event; this is general public-health guidance, not a substitute for local authority direction.',
  'large-event,high-complexity,risk-assessment,emergency,medical,transport,attendees,health,all-hazards',
  'World Health Organization — Managing health risks during mass gatherings',
  'https://www.who.int/activities/managing-health-risks-during-mass-gatherings',
  'International',
  'official_guidance',
  'public',
  'approved',
  'system-curated',
  now()
),
(
  'kb-hse-event-safety-reference',
  'Event planning: identify the organiser, venue, contractor, and supervisor roles',
  'The UK Health and Safety Executive event-safety resource identifies organisers, contractors, volunteers, venue owners, and supervisors as distinct audiences for event-safety guidance. Use this as a prompt to name responsibilities and handoffs in the production plan. This is UK reference material, not Kenyan law or a statement of Kenyan permit requirements; verify local obligations with the relevant Kenyan authority.',
  'roles,organiser,venue,contractor,supervisor,volunteer,operations,responsibility',
  'UK Health and Safety Executive — Event Safety',
  'https://www.hse.gov.uk/event-safety/',
  'United Kingdom — reference only',
  'practice_reference',
  'public',
  'approved',
  'system-curated',
  now()
),
(
  'kb-studio-venue-survey',
  'Studio checklist: capture venue constraints before locking production scope',
  'Before confirming production scope, record venue access and loading windows, setup and strike timings, available power and its location, permitted rigging or fixing points, service routes, and any restrictions that affect sound, lighting, décor, or guest movement. Confirm the details with the venue rather than assuming them from photos. This is a Randy Production checklist for staff review and should be adapted to the specific venue.',
  'venue,site-survey,access,power,rigging,loading,setup,strike,sound,lighting,decor',
  'Randy Production — proposed venue survey checklist',
  null,
  'Randy Production',
  'company_practice',
  'internal',
  'draft',
  null,
  null
)
on conflict (id) do nothing;
