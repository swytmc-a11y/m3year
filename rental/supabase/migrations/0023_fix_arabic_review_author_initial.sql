-- "أحمد المطيري" was becoming "أحمد ا." — taking the first letter of a
-- surname is an English-name habit, and almost every Arabic surname starts
-- with the definite article "ال", so nearly every reviewer collapsed to the
-- same meaningless initial. Strip the article first.
create or replace function public.set_review_author_name()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_full text;
  v_parts text[];
  v_last text;
begin
  select full_name into v_full from public.profiles where id = new.author_id;
  v_full := nullif(btrim(coalesce(v_full, '')), '');

  if v_full is null then
    new.author_name := 'عميل';
    return new;
  end if;

  v_parts := regexp_split_to_array(v_full, '\s+');

  if array_length(v_parts, 1) = 1 then
    new.author_name := v_parts[1];
    return new;
  end if;

  v_last := v_parts[array_length(v_parts, 1)];
  -- Drop a leading definite article so the initial carries real information.
  v_last := regexp_replace(v_last, '^(ال|أل|إل)', '');
  v_last := nullif(btrim(v_last), '');

  if v_last is null then
    new.author_name := v_parts[1];
  else
    new.author_name := v_parts[1] || ' ' || left(v_last, 1) || '.';
  end if;

  return new;
end;
$$;
