-- Bachea: esquema inicial.
-- Modelo de acceso:
--   * El público nunca habla directo con la base: pasa por rutas del servidor (service role)
--     que seleccionan solo columnas públicas.
--   * Los administradores usan su sesión; RLS exige que estén en public.admins.

create type public.report_status as enum ('recibido', 'verificado', 'programado', 'tapado', 'descartado');
create type public.report_severity as enum ('leve', 'moderado', 'peligroso'); -- el orden importa: priorización
create type public.photo_kind as enum ('antes', 'despues');
create type public.work_day_status as enum ('planificada', 'en_curso', 'completada');
create type public.location_source as enum ('gps', 'mapa');

create table public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create function public.is_admin() returns boolean
language sql stable security definer set search_path = ''
as $$ select exists (select 1 from public.admins where user_id = auth.uid()) $$;

create table public.crews (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 80),
  phone text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.work_days (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 2 and 120),
  scheduled_on date not null,
  crew_id uuid references public.crews (id) on delete set null,
  status public.work_day_status not null default 'planificada',
  notes text,
  created_at timestamptz not null default now()
);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  folio text not null unique,
  lat double precision not null check (lat between -90 and 90),
  lng double precision not null check (lng between -180 and 180),
  accuracy_m real,
  location_source public.location_source not null,
  address text,
  zona smallint check (zona between 1 and 25),
  colonia text check (char_length(colonia) <= 120),
  description text check (char_length(description) <= 500),
  severity public.report_severity not null,
  status public.report_status not null default 'recibido',
  reporter_name text check (char_length(reporter_name) <= 80),
  reporter_phone text check (char_length(reporter_phone) <= 20),
  support_count integer not null default 0,
  work_day_id uuid references public.work_days (id) on delete set null,
  route_order integer,
  admin_notes text,
  resolved_at timestamptz,
  resolution_note text check (char_length(resolution_note) <= 500), -- visible en el feed
  materials text,   -- interno
  cost_gtq numeric(10, 2) check (cost_gtq >= 0), -- interno
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint published_only_when_patched check (published_at is null or status = 'tapado')
);
create index reports_status_idx on public.reports (status, created_at desc);
create index reports_geo_idx on public.reports (lat, lng);
create index reports_published_idx on public.reports (published_at desc) where published_at is not null;
create index reports_work_day_idx on public.reports (work_day_id, route_order);

create table public.report_photos (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.reports (id) on delete cascade,
  storage_path text not null unique,
  kind public.photo_kind not null,
  is_public boolean not null default false,
  created_at timestamptz not null default now()
);
create index report_photos_report_idx on public.report_photos (report_id);

create table public.report_status_history (
  id bigint generated always as identity primary key,
  report_id uuid not null references public.reports (id) on delete cascade,
  status public.report_status not null,
  changed_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);
create index report_status_history_report_idx on public.report_status_history (report_id, created_at);

create table public.report_supports (
  report_id uuid not null references public.reports (id) on delete cascade,
  device_hash text not null,
  created_at timestamptz not null default now(),
  primary key (report_id, device_hash)
);

create table public.rate_limits (
  key text not null,
  window_start timestamptz not null,
  hits integer not null default 1,
  primary key (key, window_start)
);

-- Estado: fechas coherentes, historial automático ---------------------------------------------
create function public.reports_before_write() returns trigger
language plpgsql set search_path = ''
as $$
begin
  new.updated_at := now();
  if tg_op = 'UPDATE' and new.status is distinct from old.status then
    if new.status = 'tapado' then
      new.resolved_at := coalesce(new.resolved_at, now());
    else
      new.resolved_at := null;
      new.published_at := null; -- dejar de estar tapado lo retira del feed
    end if;
  end if;
  return new;
end $$;

create trigger reports_before_write before insert or update on public.reports
for each row execute function public.reports_before_write();

create function public.reports_log_status() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if tg_op = 'INSERT' or new.status is distinct from old.status then
    insert into public.report_status_history (report_id, status, changed_by)
    values (new.id, new.status, auth.uid());
  end if;
  return null;
end $$;

create trigger reports_log_status after insert or update on public.reports
for each row execute function public.reports_log_status();

-- Funciones para las rutas públicas del servidor -----------------------------------------------
create function public.nearby_reports(p_lat double precision, p_lng double precision, p_radius_m integer default 40)
returns table (id uuid, severity public.report_severity, status public.report_status,
               support_count integer, created_at timestamptz, distance_m double precision)
language sql stable set search_path = ''
as $$
  select id, severity, status, support_count, created_at, distance_m
  from (
    select r.*, 2 * 6371000 * asin(sqrt(
      power(sin(radians(r.lat - p_lat) / 2), 2) +
      cos(radians(p_lat)) * cos(radians(r.lat)) * power(sin(radians(r.lng - p_lng) / 2), 2)
    )) as distance_m
    from public.reports r
    where r.status in ('recibido', 'verificado', 'programado')
      and r.lat between p_lat - 0.002 and p_lat + 0.002
      and r.lng between p_lng - 0.002 and p_lng + 0.002
  ) c
  where distance_m <= p_radius_m
  order by distance_m
  limit 5
$$;

create function public.add_support(p_report uuid, p_device text)
returns table (folio text, support_count integer, added boolean)
language plpgsql set search_path = ''
as $$
declare v_added boolean := false; v_rows integer;
begin
  perform 1 from public.reports r where r.id = p_report and r.status in ('recibido', 'verificado', 'programado');
  if not found then return; end if;

  insert into public.report_supports (report_id, device_hash) values (p_report, p_device)
  on conflict do nothing;
  get diagnostics v_rows = row_count;
  v_added := v_rows > 0;
  if v_added then
    update public.reports r set support_count = r.support_count + 1 where r.id = p_report;
  end if;

  return query select r.folio, r.support_count, v_added from public.reports r where r.id = p_report;
end $$;

create function public.rate_limit_hit(p_key text, p_window_seconds integer, p_max integer)
returns boolean
language plpgsql set search_path = ''
as $$
declare
  v_window timestamptz := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  v_hits integer;
begin
  insert into public.rate_limits as rl (key, window_start) values (p_key, v_window)
  on conflict (key, window_start) do update set hits = rl.hits + 1
  returning hits into v_hits;
  if random() < 0.01 then
    delete from public.rate_limits where window_start < now() - interval '2 days';
  end if;
  return v_hits <= p_max;
end $$;

create function public.public_stats()
returns table (patched bigint, received bigint, zones bigint, avg_days numeric)
language sql stable set search_path = ''
as $$
  select
    count(*) filter (where published_at is not null),
    count(*) filter (where status <> 'descartado'),
    count(distinct zona) filter (where published_at is not null),
    round(avg(extract(epoch from resolved_at - created_at) / 86400)
          filter (where published_at is not null)::numeric, 1)
  from public.reports
$$;

-- Permisos ------------------------------------------------------------------------------------
revoke all on all tables in schema public from anon, authenticated;
revoke all on all functions in schema public from public, anon, authenticated;
grant all on all tables in schema public to service_role;
grant all on all functions in schema public to service_role;
grant usage on all sequences in schema public to service_role;
grant execute on function public.is_admin() to authenticated;
grant select, insert, update, delete on public.crews, public.work_days, public.reports, public.report_photos to authenticated;
grant select on public.report_status_history, public.admins to authenticated;

alter table public.admins enable row level security;
alter table public.crews enable row level security;
alter table public.work_days enable row level security;
alter table public.reports enable row level security;
alter table public.report_photos enable row level security;
alter table public.report_status_history enable row level security;
alter table public.report_supports enable row level security;
alter table public.rate_limits enable row level security;

create policy "cada admin ve su fila" on public.admins for select to authenticated using (user_id = auth.uid());
create policy "admin total" on public.crews for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin total" on public.work_days for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin total" on public.reports for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin total" on public.report_photos for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin lee historial" on public.report_status_history for select to authenticated using (public.is_admin());
-- report_supports y rate_limits: sin políticas, solo service role.

-- Fotos: bucket privado. Se entregan con URLs firmadas tras decidir el servidor qué es público.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('report-photos', 'report-photos', false, 3145728, array['image/webp']);
