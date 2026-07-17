-- Pre-production provenance policy and an idempotent, verified initial catalog.
alter table public.problems alter column author_id drop not null;

alter table public.problems
  add column if not exists source_type text,
  add column if not exists source_name text,
  add column if not exists source_url text,
  add column if not exists source_published_at timestamptz,
  add column if not exists source_accessed_at timestamptz,
  add column if not exists source_verified_at timestamptz,
  add column if not exists source_metadata jsonb,
  add column if not exists imported_from_external_source boolean not null default false;

alter table public.problems drop constraint if exists problems_provenance_check;
alter table public.problems add constraint problems_provenance_check check (
  (not imported_from_external_source and author_id is not null)
  or (
    imported_from_external_source
    and author_id is null
    and author_name is null
    and nullif(trim(source_name), '') is not null
    and source_url ~ '^https://[^[:space:]]+$'
    and source_accessed_at is not null
    and source_verified_at is not null
    and jsonb_typeof(source_metadata) = 'object'
    and nullif(trim(source_metadata->>'external_source_key'), '') is not null
  )
);

create or replace function public.is_safe_source_metadata(value jsonb)
returns boolean language plpgsql immutable set search_path = public as $$
declare key text; child jsonb;
begin
  if value is null then return true; end if;
  if jsonb_typeof(value) = 'object' then
    for key, child in select * from jsonb_each(value) loop
      if lower(key) in ('password', 'passwd', 'secret', 'token', 'access_token', 'refresh_token', 'api_key', 'authorization', 'cookie') then return false; end if;
      if not public.is_safe_source_metadata(child) then return false; end if;
    end loop;
  elsif jsonb_typeof(value) = 'array' then
    for child in select * from jsonb_array_elements(value) loop
      if not public.is_safe_source_metadata(child) then return false; end if;
    end loop;
  end if;
  return true;
end; $$;

alter table public.problems drop constraint if exists problems_source_metadata_check;
alter table public.problems add constraint problems_source_metadata_check check (
  source_metadata is null
  or (
    jsonb_typeof(source_metadata) = 'object'
    and octet_length(source_metadata::text) <= 8192
    and public.is_safe_source_metadata(source_metadata)
  )
);

create unique index if not exists problems_external_source_identity_idx
  on public.problems (source_url, (source_metadata->>'external_source_key'))
  where imported_from_external_source and source_metadata ? 'external_source_key';

-- No persisted rows are deleted: the demonstrative catalog existed only in frontend files.
insert into public.problems (
  id, author_id, author_name, title, summary, description, category, city, state,
  country, image_url, status, impact_level, tags, views, likes, comments,
  source_type, source_name, source_url, source_published_at, source_accessed_at,
  source_verified_at, source_metadata, imported_from_external_source
) values
(
  '10000000-0000-4000-8000-000000000001', null, null,
  'Risco recorrente de transbordamento de córregos no Itaim Paulista',
  'Registros do CGE indicaram transbordamentos dos córregos Três Pontes e Itaim durante chuvas intensas na Zona Leste de São Paulo.',
  'O Centro de Gerenciamento de Emergências Climáticas registrou, em 30 de janeiro de 2025, o transbordamento do Córrego Três Pontes, na Avenida Marechal Tito, e do Córrego Itaim, próximo à Rua José Cardoso Pimentel. O registro evidencia a necessidade de ações contínuas de drenagem, monitoramento, prevenção e comunicação de risco.',
  'Infraestrutura', 'São Paulo', 'SP', 'Brasil', null, 'Aberto', 'regional', array['Itaim Paulista'], 0, 0, 0,
  'publicacao_oficial', 'Centro de Gerenciamento de Emergências Climáticas da Prefeitura de São Paulo',
  'https://cge.prefeitura.sp.gov.br/v3/noticias.jsp?data=2025-01-30', '2025-01-30T00:00:00Z', '2026-07-17T00:00:00Z', '2026-07-17T00:00:00Z',
  '{"external_source_key":"prefeitura-sp-cge-2025-01-30-itaim-paulista","location_detail":"Itaim Paulista"}'::jsonb, true
),
(
  '10000000-0000-4000-8000-000000000002', null, null,
  'Vulnerabilidade a alagamentos durante chuvas intensas em São Paulo',
  'Todas as regiões da capital entraram em estado de atenção para alagamentos durante episódio de chuva intensa em abril de 2025.',
  'Em 18 de abril de 2025, o CGE colocou todas as regiões da cidade de São Paulo em estado de atenção para alagamentos. A publicação mencionou chuva forte em bairros das zonas Leste e Sul e possibilidade de formação de pontos intransitáveis.',
  'Infraestrutura', 'São Paulo', 'SP', 'Brasil', null, 'Aberto', 'regional', '{}'::text[], 0, 0, 0,
  'publicacao_oficial', 'Prefeitura de São Paulo — CGE',
  'https://prefeitura.sp.gov.br/w/estado-de-aten%C3%A7%C3%A3o-para-alagamentos-em-todas-as-regi%C3%B5es-da-cidade', '2025-04-18T00:00:00Z', '2026-07-17T00:00:00Z', '2026-07-17T00:00:00Z',
  '{"external_source_key":"prefeitura-sp-cge-2025-04-18-alagamentos-sao-paulo"}'::jsonb, true
),
(
  '10000000-0000-4000-8000-000000000003', null, null,
  'Descarte irregular de resíduos na região da Capela do Socorro',
  'Entulho, móveis, eletrodomésticos e lixo doméstico são descartados irregularmente em terrenos, calçadas e margens de córregos.',
  'A Subprefeitura da Capela do Socorro informou que o descarte irregular de resíduos afeta a qualidade de vida da população e contribui para degradação ambiental, entupimento da drenagem, enchentes e proliferação de vetores de doenças.',
  'Meio Ambiente', 'São Paulo', 'SP', 'Brasil', null, 'Aberto', 'local', array['Capela do Socorro'], 0, 0, 0,
  'publicacao_oficial', 'Subprefeitura da Capela do Socorro — Prefeitura de São Paulo',
  'https://prefeitura.sp.gov.br/web/capela_do_socorro/w/descarte-irregular-de-lixo-ainda-%C3%A9-desafio-na-capela-do-socorro.-ecopontos-s%C3%A3o-solu%C3%A7%C3%A3o-acess%C3%ADvel-e-gratuita.', '2025-10-14T00:00:00Z', '2026-07-17T00:00:00Z', '2026-07-17T00:00:00Z',
  '{"external_source_key":"prefeitura-sp-capela-socorro-descarte-2025-10-14","location_detail":"Capela do Socorro"}'::jsonb, true
),
(
  '10000000-0000-4000-8000-000000000004', null, null,
  'Ponto recorrente de descarte irregular na Vila Pirajussara',
  'Área da Rua dos Milagres foi identificada como ponto recorrente de acúmulo de lixo e entulho.',
  'Uma proposta publicada no portal oficial Participe+ descreve acúmulo recorrente de resíduos, uso inadequado do espaço público e impactos negativos na paisagem, na saúde pública e na circulação de pedestres.',
  'Meio Ambiente', 'São Paulo', 'SP', 'Brasil', null, 'Aberto', 'local', array['Vila Pirajussara'], 0, 0, 0,
  'portal_participacao_publica', 'Participe+ — Prefeitura de São Paulo',
  'https://participemais.prefeitura.sp.gov.br/budgets/7/investments/18349', '2026-05-15T00:00:00Z', '2026-07-17T00:00:00Z', '2026-07-17T00:00:00Z',
  '{"external_source_key":"participe-mais-investment-18349","location_detail":"Rua dos Milagres, Vila Pirajussara","source_scope":"Relato/proposta publicado em portal de participação pública; não constitui diagnóstico técnico definitivo."}'::jsonb, true
),
(
  '10000000-0000-4000-8000-000000000005', null, null,
  'Descarte clandestino de entulho e contaminação do solo na Zona Sul',
  'Operação municipal identificou uma central clandestina de resíduos com materiais potencialmente nocivos e contaminação do solo.',
  'Em fevereiro de 2025, a Prefeitura de São Paulo informou ter localizado uma central clandestina de triagem de entulho em um terreno da Zona Sul. Foram relatados materiais como gesso e amianto e indícios de contaminação do solo.',
  'Meio Ambiente', 'São Paulo', 'SP', 'Brasil', null, 'Aberto', 'regional', array['Zona Sul'], 0, 0, 0,
  'publicacao_oficial', 'Secretaria Municipal de Segurança Urbana — Prefeitura de São Paulo',
  'https://prefeitura.sp.gov.br/web/seguranca_urbana/w/opera%C3%A7%C3%A3o-da-gcm-combate-descarte-irregular-de-entulho-na-zona-sul-de-s%C3%A3o-paulo', '2025-02-13T00:00:00Z', '2026-07-17T00:00:00Z', '2026-07-17T00:00:00Z',
  '{"external_source_key":"prefeitura-sp-gcm-entulho-zona-sul-2025-02-13","location_detail":"Zona Sul"}'::jsonb, true
)
on conflict do nothing;
