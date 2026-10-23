-- SafeMed private TXT storage and atomic clinician review.
-- Apply only after reviewing the policies in a Supabase project. Synthetic data only.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('medical-records', 'medical-records', false, 5242880, array['text/plain'])
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create or replace function public.owns_storage_patient_path(object_name text)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select
    object_name ~ '^patients/[0-9a-fA-F-]{36}/documents/[^/]+$'
    and exists (
      select 1
      from public.patients p
      where p.id::text = split_part(object_name, '/', 2)
        and p.owner_id = (select auth.uid())
    );
$$;

revoke all on function public.owns_storage_patient_path(text) from public;
grant execute on function public.owns_storage_patient_path(text) to authenticated;

create policy "SafeMed authorized patient document read"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'medical-records'
  and public.owns_storage_patient_path(name)
);

create policy "SafeMed authorized patient document upload"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'medical-records'
  and public.owns_storage_patient_path(name)
);

-- No UPDATE or DELETE policy is created for ordinary users.
-- The path format is patients/<patient-uuid>/documents/<document-uuid>.txt.

create or replace function public.submit_review(
  p_fact_id uuid,
  p_conflict_id uuid,
  p_action text,
  p_decision_note text default null,
  p_correction jsonb default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_patient_id uuid;
  v_review_id uuid;
  v_created_at timestamptz;
  v_entity_id uuid;
begin
  if v_actor is null then
    raise exception using errcode = '28000', message = 'Authentication required';
  end if;

  if (p_fact_id is null) = (p_conflict_id is null) then
    raise exception using errcode = '22023', message = 'Provide exactly one factId or conflictId';
  end if;

  if p_fact_id is not null then
    select f.patient_id into v_patient_id
    from public.medical_facts f
    where f.id = p_fact_id;

    if not found then
      raise exception using errcode = 'P0002', message = 'Fact not found';
    end if;

    if p_action not in ('confirm', 'correct', 'flag_for_review') then
      raise exception using errcode = '22023', message = 'Action is not valid for a fact';
    end if;

    if (p_action = 'correct') <> (p_correction is not null) then
      raise exception using errcode = '22023', message = 'A correction payload is required only for correct actions';
    end if;

    v_entity_id := p_fact_id;
  else
    select c.patient_id into v_patient_id
    from public.conflicts c
    where c.id = p_conflict_id;

    if not found then
      raise exception using errcode = 'P0002', message = 'Conflict not found';
    end if;

    if p_action not in ('flag_for_review', 'mark_not_a_conflict') then
      raise exception using errcode = '22023', message = 'Action is not valid for a conflict';
    end if;

    if p_correction is not null then
      raise exception using errcode = '22023', message = 'Corrections apply to facts, not conflicts';
    end if;

    v_entity_id := p_conflict_id;
  end if;

  if not exists (
    select 1 from public.patients p
    where p.id = v_patient_id and p.owner_id = v_actor
  ) then
    raise exception using errcode = '42501', message = 'Not authorized for this patient';
  end if;

  insert into public.reviews (
    patient_id, reviewer_id, fact_id, conflict_id,
    action, decision_note, correction
  )
  values (
    v_patient_id, v_actor, p_fact_id, p_conflict_id,
    p_action, p_decision_note, p_correction
  )
  returning id, created_at into v_review_id, v_created_at;

  if p_fact_id is not null then
    update public.medical_facts
    set verification_status = case p_action
      when 'confirm' then 'confirmed'
      when 'correct' then 'corrected'
      when 'flag_for_review' then 'needs_review'
    end
    where id = p_fact_id and patient_id = v_patient_id;
  else
    update public.conflicts
    set status = case p_action
        when 'flag_for_review' then 'needs_review'
        when 'mark_not_a_conflict' then 'not_a_conflict'
      end,
      reviewed_at = v_created_at
    where id = p_conflict_id and patient_id = v_patient_id;
  end if;

  insert into public.audit_events (
    patient_id, actor_id, event_type, entity_type, entity_id, metadata
  )
  values (
    v_patient_id,
    v_actor,
    'review.' || p_action,
    case when p_fact_id is not null then 'medical_fact' else 'conflict' end,
    v_entity_id,
    jsonb_build_object(
      'review_id', v_review_id,
      'decision_note', p_decision_note,
      'correction', p_correction
    )
  );

  return jsonb_build_object(
    'reviewId', v_review_id,
    'patientId', v_patient_id,
    'factId', p_fact_id,
    'conflictId', p_conflict_id,
    'action', p_action,
    'createdAt', v_created_at
  );
end;
$$;

revoke all on function public.submit_review(uuid, uuid, text, text, jsonb) from public;
revoke all on function public.submit_review(uuid, uuid, text, text, jsonb) from anon;
grant execute on function public.submit_review(uuid, uuid, text, text, jsonb) to authenticated;
