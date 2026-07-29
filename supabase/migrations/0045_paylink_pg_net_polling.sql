-- Miyar (معيار) — split the pg_net Paylink call into start + poll.
--
-- pg_net_json_request (0044) blocked inside one SQL statement while polling
-- net._http_response with pg_sleep, and Postgres's statement_timeout for the
-- service_role connection (8s) killed it before Paylink ever replied —
-- confirmed live: "canceling statement due to statement timeout" at exactly
-- ~8s. A single query cannot wait longer than that timeout, so the wait has
-- to move out of SQL: start the request in one fast call, then let the
-- caller (the edge function) poll a second fast call in a loop.

drop function if exists public.pg_net_json_request(text, text, jsonb, jsonb);

create or replace function public.pg_net_start_request(
  p_method text,
  p_url text,
  p_headers jsonb,
  p_body jsonb default null
) returns bigint
language plpgsql
security definer
set search_path = public, net
as $$
declare
  v_request_id bigint;
begin
  if p_method = 'POST' then
    v_request_id := net.http_post(
      url := p_url,
      headers := p_headers,
      body := coalesce(p_body, '{}'::jsonb),
      timeout_milliseconds := 20000
    );
  elsif p_method = 'GET' then
    v_request_id := net.http_get(
      url := p_url,
      headers := p_headers,
      timeout_milliseconds := 20000
    );
  else
    raise exception 'unsupported method %', p_method;
  end if;
  return v_request_id;
end;
$$;

create or replace function public.pg_net_poll_request(p_request_id bigint)
returns jsonb
language sql
security definer
set search_path = public, net
as $$
  select case
    when r.status_code is not null then jsonb_build_object('status', r.status_code, 'body', r.content)
    when r.timed_out then jsonb_build_object('error', 'timed_out')
    when r.error_msg is not null then jsonb_build_object('error', r.error_msg)
    else null
  end
  from net._http_response r
  where r.id = p_request_id;
$$;

revoke all on function public.pg_net_start_request(text, text, jsonb, jsonb) from public;
revoke all on function public.pg_net_poll_request(bigint) from public;
grant execute on function public.pg_net_start_request(text, text, jsonb, jsonb) to service_role;
grant execute on function public.pg_net_poll_request(bigint) to service_role;
