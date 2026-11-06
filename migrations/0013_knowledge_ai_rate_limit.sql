create table if not exists knowledge_ai_usage (
  subject_hash text not null,
  bucket_started_at timestamptz not null,
  request_count integer not null check (request_count between 1 and 5),
  primary key (subject_hash, bucket_started_at)
);

create index if not exists knowledge_ai_usage_bucket_idx
  on knowledge_ai_usage (bucket_started_at);
