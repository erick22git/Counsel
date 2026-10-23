-- Corpus DEMO ficticio para probar el flujo de IA sin cargar leyes reales.
-- NO es norma vigente. Para cargar el corpus real: npm run ingest:leyes (Lexivox, GFDL).
insert into law_sources (code, title, kind, source_name, source_url, license, is_demo)
values
  ('DEMO-ARR', 'Norma de ejemplo sobre arrendamientos (ficticia)', 'demo', 'Texto ficticio de prueba', null, 'Sin licencia (inventado para pruebas)', true),
  ('DEMO-PLZ', 'Norma de ejemplo sobre plazos procesales (ficticia)', 'demo', 'Texto ficticio de prueba', null, 'Sin licencia (inventado para pruebas)', true)
on conflict (code) do nothing;

insert into law_chunks (source_id, article, heading, content)
select s.id, v.article, v.heading, v.content
from law_sources s
join (values
  ('DEMO-ARR', 'Artículo 1', 'Disposiciones generales', 'DEMO: El arrendamiento es un contrato ficticio por el cual una parte cede a otra el uso de un inmueble a cambio de un canon. Este texto es inventado solo para probar el sistema.'),
  ('DEMO-ARR', 'Artículo 2', 'Disposiciones generales', 'DEMO: El canon de arrendamiento ficticio debe pagarse dentro de los primeros cinco días de cada mes. Texto inventado, no vigente.'),
  ('DEMO-PLZ', 'Artículo 1', 'Plazos', 'DEMO: El plazo ficticio para contestar una demanda de ejemplo es de treinta días calendario. Texto inventado, no vigente; verifique siempre la norma real en la Gaceta Oficial de Bolivia.')
) as v(code, article, heading, content) on v.code = s.code
where not exists (select 1 from law_chunks c where c.source_id = s.id and c.article = v.article);
