-- Hotfix: allow solutions to exist independently from problems while preserving optional links.
-- Replaces the existing RPCs with their original signatures so PostgREST clients remain compatible.
begin;

create or replace function public.create_solution_with_problems(
  p_author_id uuid,
  p_author_name text,
  p_title text,
  p_summary text,
  p_description text,
  p_category text,
  p_image_url text,
  p_organization text,
  p_status text,
  p_maturity_level text,
  p_implementation_difficulty text,
  p_estimated_cost text,
  p_implementation_time text,
  p_location text,
  p_country text,
  p_impact_metric text,
  p_tags text[],
  p_evidence_links text[],
  p_problem_ids uuid[]
)
returns uuid
language plpgsql
set search_path = public
as $$
declare
  new_solution_id uuid;
  problem_id uuid;
begin
  if auth.uid() is null or auth.uid() <> p_author_id then
    raise exception 'Only the authenticated author can create a solution' using errcode = '42501';
  end if;

  insert into public.solutions (
    author_id,
    author_name,
    title,
    summary,
    description,
    category,
    image_url,
    organization,
    status,
    maturity_level,
    implementation_difficulty,
    estimated_cost,
    implementation_time,
    location,
    country,
    impact_metric,
    tags,
    evidence_links
  ) values (
    p_author_id,
    nullif(trim(p_author_name), ''),
    trim(p_title),
    trim(p_summary),
    trim(p_description),
    p_category,
    nullif(trim(p_image_url), ''),
    trim(p_organization),
    p_status,
    p_maturity_level,
    p_implementation_difficulty,
    nullif(trim(p_estimated_cost), ''),
    nullif(trim(p_implementation_time), ''),
    trim(p_location),
    trim(p_country),
    trim(p_impact_metric),
    coalesce(p_tags, '{}'::text[]),
    coalesce(p_evidence_links, '{}'::text[])
  ) returning id into new_solution_id;

  foreach problem_id in array coalesce(p_problem_ids, '{}'::uuid[]) loop
    insert into public.solution_problems (solution_id, problem_id)
    values (new_solution_id, problem_id);
  end loop;

  return new_solution_id;
end;
$$;

create or replace function public.update_solution_with_problems(
  p_solution_id uuid,
  p_title text default null,
  p_summary text default null,
  p_description text default null,
  p_category text default null,
  p_image_url text default null,
  p_organization text default null,
  p_author_name text default null,
  p_status text default null,
  p_maturity_level text default null,
  p_implementation_difficulty text default null,
  p_estimated_cost text default null,
  p_implementation_time text default null,
  p_location text default null,
  p_country text default null,
  p_impact_metric text default null,
  p_tags text[] default null,
  p_evidence_links text[] default null,
  p_problem_ids uuid[] default null
)
returns uuid
language plpgsql
set search_path = public
as $$
declare
  problem_id uuid;
begin
  if not exists (select 1 from public.solutions where id = p_solution_id and author_id = auth.uid()) then
    raise exception 'Only the author can update this solution' using errcode = '42501';
  end if;

  update public.solutions set
    title = coalesce(trim(p_title), title),
    summary = coalesce(trim(p_summary), summary),
    description = coalesce(trim(p_description), description),
    category = coalesce(p_category, category),
    image_url = case when p_image_url is null then image_url else nullif(trim(p_image_url), '') end,
    organization = coalesce(trim(p_organization), organization),
    author_name = case when p_author_name is null then author_name else nullif(trim(p_author_name), '') end,
    status = coalesce(p_status, status),
    maturity_level = coalesce(p_maturity_level, maturity_level),
    implementation_difficulty = coalesce(p_implementation_difficulty, implementation_difficulty),
    estimated_cost = case when p_estimated_cost is null then estimated_cost else nullif(trim(p_estimated_cost), '') end,
    implementation_time = case when p_implementation_time is null then implementation_time else nullif(trim(p_implementation_time), '') end,
    location = coalesce(trim(p_location), location),
    country = coalesce(trim(p_country), country),
    impact_metric = coalesce(trim(p_impact_metric), impact_metric),
    tags = coalesce(p_tags, tags),
    evidence_links = coalesce(p_evidence_links, evidence_links)
  where id = p_solution_id;

  if p_problem_ids is not null then
    delete from public.solution_problems where solution_id = p_solution_id;

    foreach problem_id in array coalesce(p_problem_ids, '{}'::uuid[]) loop
      insert into public.solution_problems (solution_id, problem_id)
      values (p_solution_id, problem_id);
    end loop;
  end if;

  return p_solution_id;
end;
$$;

commit;
