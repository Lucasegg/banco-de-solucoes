begin;

-- Purpose-built candidates: archived, unrelated/popular, category-only and tag-rich.
insert into public.problems(id,author_id,title,summary,description,category,city,state,status,tags,likes,updated_at)
values
 ('34000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000010','Arquivado','Alagamentos','Drenagem','Infraestrutura','São Paulo','SP','Arquivado',array['drenagem'],0,'2026-01-01'),
 ('34000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000010','Categoria apenas','Outro assunto','Outro assunto','Infraestrutura','Recife','PE','Aberto','{}',0,'2026-01-02'),
 ('34000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000010','Tags de drenagem','Alagamentos','Drenagem urbana','Infraestrutura','Recife','PE','Aberto',array['drenagem','drenagem'],0,'2026-01-03'),
 ('34000000-0000-0000-0000-000000000004','00000000-0000-0000-0000-000000000010','Popular sem relação','Cultura','Bibliotecas','Cultura','Manaus','AM','Aberto',array['livros'],2147483647,'2026-01-04'),
 ('34000000-0000-0000-0000-000000000005','00000000-0000-0000-0000-000000000010','Sem coordenadas','Alagamentos','Drenagem','Infraestrutura','Recife','PE','Aberto',array['drenagem'],0,'2026-01-05');

insert into public.problems(id,author_id,title,summary,description,category,city,state,status,tags,updated_at)
select ('34000000-0000-0000-0001-'||lpad(g::text,12,'0'))::uuid,'00000000-0000-0000-0000-000000000010','Candidato '||g,'Alagamentos','Drenagem','Infraestrutura','São Paulo','SP','Aberto',array['drenagem'],'2026-02-01'
from generate_series(1,30) g;

insert into public.solutions(id,author_id,title,summary,description,category,organization,status,impact_metric,tags,evidence_links,latitude,longitude,updated_at)
values
 ('34000000-0000-0000-0000-000000000010','00000000-0000-0000-0000-000000000010','Solução vinculada','Drenagem','Drenagem','Infraestrutura','Org','Proposta','Impacto',array['drenagem'],'{}',null,null,'2026-01-01'),
 ('34000000-0000-0000-0000-000000000011','00000000-0000-0000-0000-000000000010','Solução candidata','Drenagem','Drenagem','Infraestrutura','Org','Proposta','Impacto',array['drenagem'],array['https://example.test/evidencia'],null,null,'2026-01-02'),
 ('34000000-0000-0000-0000-000000000012','00000000-0000-0000-0000-000000000010','Solução arquivada','Drenagem','Drenagem','Infraestrutura','Org','Arquivada','Impacto',array['drenagem'],'{}',null,null,'2026-01-03');
insert into public.solution_problems(solution_id,problem_id) values('34000000-0000-0000-0000-000000000010','00000000-0000-0000-0000-000000000001');

do $$
declare category_score numeric; tag_score numeric; popular_score numeric; expected bigint; actual bigint;
begin
 if to_regprocedure('public.get_related_problems(uuid,integer,integer)') is null
 or to_regprocedure('public.get_recommended_solutions(uuid,integer,integer)') is null
 or to_regprocedure('public.get_related_problems_for_solution(uuid,integer,integer)') is null then raise exception 'Sprint 34 RPC signatures missing'; end if;

 if has_function_privilege('anon','public.recommendation_distance_km(double precision,double precision,double precision,double precision)','execute')
 or has_function_privilege('authenticated','public.recommendation_distance_km(double precision,double precision,double precision,double precision)','execute')
 or exists(select 1 from pg_proc p,cross join lateral aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a where p.oid='public.recommendation_distance_km(double precision,double precision,double precision,double precision)'::regprocedure and a.grantee=0 and a.privilege_type='EXECUTE') then raise exception 'distance helper is directly executable'; end if;
 if not has_function_privilege('anon','public.get_related_problems(uuid,integer,integer)','execute') or not has_function_privilege('authenticated','public.get_related_problems(uuid,integer,integer)','execute')
 or not has_function_privilege('anon','public.get_recommended_solutions(uuid,integer,integer)','execute') or not has_function_privilege('authenticated','public.get_recommended_solutions(uuid,integer,integer)','execute')
 or not has_function_privilege('anon','public.get_related_problems_for_solution(uuid,integer,integer)','execute') or not has_function_privilege('authenticated','public.get_related_problems_for_solution(uuid,integer,integer)','execute') then raise exception 'recommendation grants missing'; end if;
 if exists(select 1 from pg_proc p,cross join lateral aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a where p.oid in ('public.get_related_problems(uuid,integer,integer)'::regprocedure,'public.get_recommended_solutions(uuid,integer,integer)'::regprocedure,'public.get_related_problems_for_solution(uuid,integer,integer)'::regprocedure) and a.grantee=0 and a.privilege_type='EXECUTE') then raise exception 'PUBLIC recommendation grant found'; end if;

 if exists(select 1 from public.get_related_problems('00000000-0000-0000-0000-000000000001') where id in ('00000000-0000-0000-0000-000000000001','34000000-0000-0000-0000-000000000001')) then raise exception 'self or archived problem returned'; end if;
 if exists(select 1 from public.get_recommended_solutions('00000000-0000-0000-0000-000000000001') where id in ('34000000-0000-0000-0000-000000000010','34000000-0000-0000-0000-000000000012')) then raise exception 'linked or archived solution returned'; end if;
 select recommendation_score into category_score from public.get_related_problems('00000000-0000-0000-0000-000000000001',24,0) where id='34000000-0000-0000-0000-000000000002';
 select recommendation_score into tag_score from public.get_related_problems('00000000-0000-0000-0000-000000000001',24,0) where id='34000000-0000-0000-0000-000000000003';
 select recommendation_score into popular_score from public.get_related_problems('00000000-0000-0000-0000-000000000001',24,0) where id='34000000-0000-0000-0000-000000000004';
 if tag_score<=category_score or tag_score<=popular_score then raise exception 'category/tags/popularity weighting failed'; end if;
 if exists(select 1 from public.get_related_problems('00000000-0000-0000-0000-000000000001',24,0) g where recommendation_score<0 or exists(select 1 from unnest(g.recommendation_reasons) r where not (r=any(array['Mesma categoria','Descrição semelhante','Mesma cidade','Mesmo estado','Próximo da localização do problema']) or r ~ '^[1-5] tags? em comum$'))) then raise exception 'score or public reasons failed'; end if;
 if not exists(select 1 from public.get_related_problems('00000000-0000-0000-0000-000000000001',24,0) where id='34000000-0000-0000-0000-000000000005') then raise exception 'candidate without coordinates omitted'; end if;
 if (select count(*) from public.get_related_problems('00000000-0000-0000-0000-000000000001',100,0))<>24 then raise exception 'maximum limit failed'; end if;
 if (select array_agg(id order by recommendation_score desc,updated_at desc,id) from public.get_related_problems('00000000-0000-0000-0000-000000000001',6,-9)) is distinct from (select array_agg(id order by recommendation_score desc,updated_at desc,id) from public.get_related_problems('00000000-0000-0000-0000-000000000001',6,0)) then raise exception 'negative offset failed'; end if;
 select count(*) into expected from public.get_related_problems('00000000-0000-0000-0000-000000000001',24,0);
 select total_count into actual from public.get_related_problems('00000000-0000-0000-0000-000000000001',1,0);
 if actual<expected or actual is null then raise exception 'total_count failed'; end if;
 if exists(with x as(select *,lag(recommendation_score) over() ps,lag(updated_at) over() pu,lag(id) over() pi from public.get_related_problems('00000000-0000-0000-0000-000000000001',24,0)) select 1 from x where ps<recommendation_score or (ps=recommendation_score and pu<updated_at) or (ps=recommendation_score and pu=updated_at and pi>id)) then raise exception 'stable ordering failed'; end if;
end $$;

rollback;
