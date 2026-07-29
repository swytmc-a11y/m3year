-- Miyar (معيار) — lock ai_reports.content/model_version to the edge function.
--
-- guard_ai_report_columns already blocks published/published_at/target_type/
-- target_id/requested_by on UPDATE, but never touched content or
-- model_version — so an authenticated owner could PATCH their own pending
-- report straight to status='completed' with fabricated content via
-- PostgREST, entirely bypassing the real Anthropic call in ai-analysis.
-- Impact is currently low (ai-analysis is not deployed/wired up yet — see
-- migration 0025's header), but this closes it before it goes live.
--
-- Same transaction-local-flag pattern as increment_view_count (0041) and the
-- Miyar Index writer (0032): the edge function acts as the calling user's own
-- JWT (deliberately, so RLS still decides what target it can see — see
-- ai-analysis/index.ts), so the guard cannot tell "the function, on this
-- user's behalf" apart from "this user, directly" by role alone. A flag set
-- only inside these two SECURITY DEFINER functions is what makes the
-- distinction; PostgREST exposes no way to set it directly.

create or replace function public.complete_ai_report(
  p_report_id uuid,
  p_content jsonb,
  p_model_version text
) returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform set_config('miyar.internal_ai_write', 'on', true);

  update public.ai_reports
    set status = 'completed',
        model_version = p_model_version,
        content = p_content
    where id = p_report_id
      and requested_by = auth.uid()
      and status = 'pending';

  perform set_config('miyar.internal_ai_write', 'off', true);
end;
$$;

create or replace function public.fail_ai_report(p_report_id uuid) returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.ai_reports
    set status = 'failed'
    where id = p_report_id
      and requested_by = auth.uid()
      and status = 'pending';
end;
$$;

grant execute on function public.complete_ai_report(uuid, jsonb, text) to authenticated;
grant execute on function public.fail_ai_report(uuid) to authenticated;

create or replace function public.guard_ai_report_columns()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if public.is_admin() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.status := 'pending';
    new.content := null;
    new.model_version := null;
    new.published := false;
    new.published_at := null;
    return new;
  end if;

  if new.published is distinct from old.published
     or new.published_at is distinct from old.published_at
     or new.target_type is distinct from old.target_type
     or new.target_id is distinct from old.target_id
     or new.requested_by is distinct from old.requested_by then
    raise exception 'not authorized to modify protected ai_reports fields'
      using errcode = '42501';
  end if;

  if coalesce(current_setting('miyar.internal_ai_write', true), 'off') <> 'on'
     and (new.content is distinct from old.content
          or new.model_version is distinct from old.model_version) then
    raise exception 'not authorized to modify ai_reports content'
      using errcode = '42501';
  end if;

  if new.status not in ('completed', 'failed') then
    raise exception 'not authorized to set ai_reports status to %', new.status
      using errcode = '42501';
  end if;

  return new;
end;
$$;
