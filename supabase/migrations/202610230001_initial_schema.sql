-- SafeMed initial schema proposal. Synthetic data only for the hackathon.
create extension if not exists pgcrypto;

create table public.patients (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  patient_ref text not null,
  created_at timestamptz not null default now(),
  unique (owner_id, patient_ref)
);

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  uploaded_by uuid not null references auth.users(id),
  source_name text not null,
  file_name text not null,
  mime_type text not null,
  storage_path text not null unique,
  content_sha256 text,
  processing_status text not null default 'uploaded'
    check (processing_status in ('uploaded','processing','processed','needs_review','failed')),
  created_at timestamptz not null default now(),
  unique (patient_id, id)
);

create table public.medical_facts (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  document_id uuid not null,
  fact_type text not null,
  normalized_key text not null,
  value jsonb not null,
  event_date date,
  page_number integer check (page_number is null or page_number > 0),
  evidence_excerpt text not null,
  verification_status text not null default 'unverified'
    check (verification_status in ('unverified','confirmed','corrected','needs_review','unsupported')),
  uncertainty jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  unique (patient_id, id),
  foreign key (patient_id, document_id) references public.documents(patient_id, id) on delete restrict
);

create table public.conflicts (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  normalized_key text not null,
  conflict_type text not null
    check (conflict_type in ('same_time_disagreement','chronology_candidate','duplicate_candidate','ambiguous')),
  status text not null default 'open'
    check (status in ('open','needs_review','resolved_by_reviewer','not_a_conflict')),
  explanation text not null,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  unique (patient_id, id)
);

create table public.conflict_facts (
  patient_id uuid not null references public.patients(id) on delete cascade,
  conflict_id uuid not null references public.conflicts(id) on delete cascade,
  fact_id uuid not null references public.medical_facts(id) on delete restrict,
  primary key (conflict_id, fact_id),
  foreign key (patient_id, conflict_id) references public.conflicts(patient_id, id) on delete cascade,
  foreign key (patient_id, fact_id) references public.medical_facts(patient_id, id) on delete restrict
);

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  reviewer_id uuid not null references auth.users(id),
  fact_id uuid,
  conflict_id uuid,
  action text not null check (action in ('confirm','correct','flag_for_review','mark_not_a_conflict')),
  decision_note text,
  correction jsonb,
  created_at timestamptz not null default now(),
  check (fact_id is not null or conflict_id is not null),
  foreign key (patient_id, fact_id) references public.medical_facts(patient_id, id) on delete restrict,
  foreign key (patient_id, conflict_id) references public.conflicts(patient_id, id) on delete restrict
);

create table public.audit_events (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  actor_id uuid not null references auth.users(id),
  event_type text not null,
  entity_type text not null,
  entity_id uuid not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index documents_patient_created_idx on public.documents(patient_id, created_at desc);
create index facts_patient_key_date_idx on public.medical_facts(patient_id, normalized_key, event_date);
create index conflicts_patient_status_idx on public.conflicts(patient_id, status, created_at desc);
create index reviews_patient_created_idx on public.reviews(patient_id, created_at desc);
create index audit_patient_created_idx on public.audit_events(patient_id, created_at desc);

-- Row ownership helpers. These are invoker-safe and rely on RLS beneath the
-- authenticated role; never give the browser service-role credentials.
create function public.owns_patient(target_patient uuid)
returns boolean language sql stable security invoker set search_path = '' as $$
  select exists (
    select 1 from public.patients p
    where p.id = target_patient and p.owner_id = (select auth.uid())
  );
$$;

alter table public.patients enable row level security;
alter table public.documents enable row level security;
alter table public.medical_facts enable row level security;
alter table public.conflicts enable row level security;
alter table public.conflict_facts enable row level security;
alter table public.reviews enable row level security;
alter table public.audit_events enable row level security;

create policy patients_owner_access on public.patients
  for all to authenticated using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));
create policy documents_owner_access on public.documents
  for all to authenticated using (public.owns_patient(patient_id))
  with check (public.owns_patient(patient_id) and uploaded_by = (select auth.uid()));
create policy facts_owner_access on public.medical_facts
  for all to authenticated using (public.owns_patient(patient_id))
  with check (public.owns_patient(patient_id));
create policy conflicts_owner_access on public.conflicts
  for all to authenticated using (public.owns_patient(patient_id))
  with check (public.owns_patient(patient_id));
create policy conflict_facts_owner_access on public.conflict_facts
  for all to authenticated using (public.owns_patient(patient_id))
  with check (public.owns_patient(patient_id));
create policy reviews_owner_read on public.reviews
  for select to authenticated using (public.owns_patient(patient_id));
create policy reviews_owner_insert on public.reviews
  for insert to authenticated with check (
    public.owns_patient(patient_id) and reviewer_id = (select auth.uid())
  );
create policy audit_owner_read on public.audit_events
  for select to authenticated using (public.owns_patient(patient_id));

-- Intentionally no client UPDATE/DELETE policy for audit_events. Append review
-- events from a trusted server-side function; don't let clients rewrite history.
-- Validate storage policies, RPC/Edge Function access, and tests before use.
