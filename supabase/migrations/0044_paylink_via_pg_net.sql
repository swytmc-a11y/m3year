-- Miyar (معيار) — route Paylink API calls through pg_net instead of Deno fetch.
--
-- Direct fetch() from inside an Edge Function to restapi.paylink.sa hangs
-- indefinitely (confirmed live: 15s abort, no response) while the exact same
-- request via pg_net from Postgres completes in well under a second. This is
-- a network-path issue specific to the Edge Function runtime reaching this
-- host, not a credentials or DNS problem — pg_net already proved reachable
-- and fast against this same host during earlier diagnostics.
--
-- pg_net_json_request lets edge functions (via the service-role client) make
-- the actual HTTP call through Postgres instead, polling net._http_response
-- until it resolves or a bound is hit. Restricted to service_role since it
-- can reach arbitrary URLs — never exposed to anon/authenticated.

create or replace function public.pg_net_json_request(
  p_method text,
  p_url text,
  p_headers jsonb,
  p_body jsonb default null
) returns jsonb
language plpgsql
security definer
set search_path = public, net
as $$
declare
  v_request_id bigint;
  v_response record;
  v_waited_ms int := 0;
  v_step_ms int := 150;
  v_max_ms int := 20000;
begin
  if p_method = 'POST' then
    v_request_id := net.http_post(
      url := p_url,
      headers := p_headers,
      body := coalesce(p_body, '{}'::jsonb),
      timeout_milliseconds := v_max_ms
    );
  elsif p_method = 'GET' then
    v_request_id := net.http_get(
      url := p_url,
      headers := p_headers,
      timeout_milliseconds := v_max_ms
    );
  else
    raise exception 'unsupported method %', p_method;
  end if;

  loop
    select status_code, content, error_msg, timed_out
      into v_response
      from net._http_response
      where id = v_request_id;

    exit when v_response.status_code is not null
      or v_response.error_msg is not null
      or v_response.timed_out is true;

    if v_waited_ms >= v_max_ms then
      return jsonb_build_object('error', 'pg_net_poll_timeout');
    end if;

    perform pg_sleep(v_step_ms / 1000.0);
    v_waited_ms := v_waited_ms + v_step_ms;
  end loop;

  if v_response.timed_out then
    return jsonb_build_object('error', 'timed_out');
  end if;
  if v_response.error_msg is not null then
    return jsonb_build_object('error', v_response.error_msg);
  end if;

  return jsonb_build_object('status', v_response.status_code, 'body', v_response.content);
end;
$$;

revoke all on function public.pg_net_json_request(text, text, jsonb, jsonb) from public;
grant execute on function public.pg_net_json_request(text, text, jsonb, jsonb) to service_role;
