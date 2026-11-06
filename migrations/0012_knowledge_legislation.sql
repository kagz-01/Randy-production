alter table knowledge_entries
  drop constraint if exists knowledge_entries_evidence_type_check;

alter table knowledge_entries
  add constraint knowledge_entries_evidence_type_check check (
    evidence_type in (
      'official_guidance',
      'practice_reference',
      'company_practice',
      'project_learning',
      'vendor_learning',
      'legislation'
    )
  );

alter table knowledge_entries
  add column if not exists legal_reviewed_by text,
  add column if not exists legal_reviewed_at timestamptz;

alter table knowledge_entries
  add column if not exists search_vector tsvector generated always as (
    setweight(to_tsvector('simple', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(tags, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(content, '')), 'B')
  ) stored;

create index if not exists knowledge_entries_search_idx
  on knowledge_entries using gin (search_vector);

insert into knowledge_entries (
  id, title, content, tags, source_name, source_url,
  source_checked_at, jurisdiction, evidence_type, visibility, status
) values (
  'kb-nema-noise-regulations',
  'Amplified sound and social events: NEMA-hosted 2009 noise regulations',
  'The NEMA-hosted Environmental Management and Co-ordination (Noise and Excessive Vibration Pollution) (Control) Regulations, 2009 includes provisions on sound-amplifying equipment (Regulation 8), parties and social events (Regulation 9), and licensing (Regulation 16). The text addresses noise affecting the public and describes licensing conditions for certain sound sources, including some public-address use outside buildings and some sound audible outside buildings at night. This is a pointer to the source text, not a decision that a particular event needs a licence or is compliant. The available copy is dated 2009; confirm whether it has been amended or superseded, check the event and venue circumstances with NEMA and the relevant local authority, and obtain qualified Kenyan legal advice before relying on it.',
  'Kenya,NEMA,noise,amplified-sound,public-address,parties,social-events,licensing,legal',
  'National Environment Management Authority — Environmental Management and Co-ordination (Noise and Excessive Vibration Pollution) (Control) Regulations, 2009',
  'https://nema.go.ke/wp-content/uploads/2024/10/Noise-Regulations.pdf',
  current_date,
  'Kenya — verify amendments and current applicability',
  'legislation',
  'internal',
  'draft'
)
on conflict (id) do nothing;
