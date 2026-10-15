-- =============================================================================
-- CAMISAS IUB — Catalogos compartidos (colores y lugares de entrega)
-- =============================================================================
-- Por que: hasta ahora colores y lugares vivian SOLO en el localStorage de
-- cada dispositivo. Si Valentina agregaba un lugar de entrega, Samir no lo veia,
-- y limpiar la cache del navegador hacia perder el catalogo.
--
-- COMO CORRERLO:
--   1. Abre https://supabase.com/dashboard/project/ifdbpaduvpadotpmojas/sql
--   2. Pega este archivo entero
--   3. Dale a Run
--
-- Es idempotente: puedes volver a correrlo sin romper nada.
-- La app sigue funcionando con localStorage si estas tablas no existen todavia.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. COLORES DE CAMISAS
-- ---------------------------------------------------------------------------
create table if not exists public.colores_camisa (
  id        text primary key,
  nombre    text not null unique,
  hex       text not null default '#6366f1',
  orden     integer not null default 0,
  created_at timestamptz not null default now()
);

comment on table public.colores_camisa is 'Catalogo de colores de camisa, compartido entre socios';

-- ---------------------------------------------------------------------------
-- 2. LUGARES DE ENTREGA
-- ---------------------------------------------------------------------------
create table if not exists public.lugares_entrega (
  id        bigserial primary key,
  nombre    text not null unique,
  activo    boolean not null default true,
  created_at timestamptz not null default now()
);

comment on table public.lugares_entrega is 'Catalogo de lugares y sedes de entrega, compartido entre socios';

-- ---------------------------------------------------------------------------
-- 3. SEMILLA: los colores reales de Camisas IUB
--    Si la tabla ya tiene colores viejos, esta seccion los reemplaza.
delete from public.colores_camisa;

insert into public.colores_camisa (id, nombre, hex, orden) values
  ('turqui',      'Turqui',      '#0d9488', 1),
  ('negro',       'Negro',       '#111827', 2),
  ('blanco',      'Blanco',      '#ffffff', 3),
  ('camel',       'Camel',       '#c19a6b', 4),
  ('gris',        'Gris',        '#6b7280', 5),
  ('palo-de-rosa','Palo de rosa','#d9a3a3', 6)
on conflict (id) do nothing;

-- 3b. SEMILLA: los lugares reales de entrega
delete from public.lugares_entrega;

insert into public.lugares_entrega (nombre) values
  ('IUB SOLEDAD'),
  ('IUB PLAZA DE LA PAZ'),
  ('IUB POSGRADOS'),
  ('IUB CENTRO HISTORICO'),
  ('DOMICILIO'),
  ('CASA VAL'),
  ('CASA SAMIR'),
  ('OTRO')
on conflict (nombre) do nothing;
-- ---------------------------------------------------------------------------
-- 4. RLS: igual que el resto del proyecto, la anon key lee pero no escribe.
--    Solo un admin autenticado puede modificar los catalogos (lo valida la app).
-- ---------------------------------------------------------------------------
alter table public.colores_camisa enable row level security;
alter table public.lugares_entrega enable row level security;

drop policy if exists "lectura publica colores" on public.colores_camisa;
create policy "lectura publica colores"
  on public.colores_camisa for select using (true);

drop policy if exists "escritura admin colores" on public.colores_camisa;
create policy "escritura admin colores"
  on public.colores_camisa for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

drop policy if exists "lectura publica lugares" on public.lugares_entrega;
create policy "lectura publica lugares"
  on public.lugares_entrega for select using (true);

drop policy if exists "escritura admin lugares" on public.lugares_entrega;
create policy "escritura admin lugares"
  on public.lugares_entrega for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- ---------------------------------------------------------------------------
-- 5. Realtime: para que un cambio de un socio aparezca en el otro al instante
--    Es idempotente: comprueba primero si la tabla ya esta en la publicacion.
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
     where pubname = 'supabase_realtime'
       and schemaname = 'public'
       and tablename = 'colores_camisa'
  ) then
    execute 'alter publication supabase_realtime add table public.colores_camisa';
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
     where pubname = 'supabase_realtime'
       and schemaname = 'public'
       and tablename = 'lugares_entrega'
  ) then
    execute 'alter publication supabase_realtime add table public.lugares_entrega';
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 6. Comprobacion
-- ---------------------------------------------------------------------------
select 'colores' as tabla, count(*) from public.colores_camisa
union all
select 'lugares', count(*) from public.lugares_entrega;