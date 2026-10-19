-- Skjermtidsligaen: databaseoppsett for Supabase.
-- Lim inn hele filen i Supabase → SQL Editor → Run.

-- ---------- tabeller ----------

create table public.profiler (
  id uuid primary key references auth.users on delete cascade,
  navn text not null check (char_length(navn) between 1 and 30),
  opprettet timestamptz not null default now()
);

create table public.ligaer (
  id uuid primary key default gen_random_uuid(),
  navn text not null check (char_length(navn) between 1 and 40),
  kode text not null unique,
  eier uuid not null references public.profiler on delete cascade,
  opprettet timestamptz not null default now()
);

create table public.liga_medlemmer (
  liga_id uuid not null references public.ligaer on delete cascade,
  uid uuid not null references public.profiler on delete cascade,
  ble_med timestamptz not null default now(),
  primary key (liga_id, uid)
);
create index on public.liga_medlemmer (uid);

create table public.registreringer (
  uid uuid not null default auth.uid() references public.profiler on delete cascade,
  dato date not null,
  minutter int not null check (minutter between 0 and 1440),
  oppdatert timestamptz not null default now(),
  primary key (uid, dato)
);

-- ---------- hjelpefunksjoner ----------

-- Er innlogget bruker med i ligaen?
create function public.er_medlem(l uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.liga_medlemmer where liga_id = l and uid = auth.uid());
$$;

-- Er brukeren meg selv, eller er vi med i minst én felles liga?
create function public.deler_liga(annen uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select annen = auth.uid() or exists (
    select 1
    from public.liga_medlemmer a
    join public.liga_medlemmer b on a.liga_id = b.liga_id
    where a.uid = auth.uid() and b.uid = annen
  );
$$;

-- Lag profil automatisk når noen oppretter konto (e-post eller Google)
create function public.ny_bruker() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiler (id, navn)
  values (
    new.id,
    left(coalesce(
      nullif(trim(new.raw_user_meta_data ->> 'navn'), ''),
      nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
      split_part(new.email, '@', 1)
    ), 30)
  );
  return new;
end $$;

create trigger ved_ny_bruker
  after insert on auth.users
  for each row execute function public.ny_bruker();

-- ---------- tilgangsregler (RLS) ----------
-- Du ser bare navn og skjermtid til folk du deler en liga med,
-- og du kan bare endre dine egne data.

alter table public.profiler enable row level security;
alter table public.ligaer enable row level security;
alter table public.liga_medlemmer enable row level security;
alter table public.registreringer enable row level security;

create policy "se ligavenner" on public.profiler
  for select to authenticated using (public.deler_liga(id));
create policy "endre egen profil" on public.profiler
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create policy "se egne ligaer" on public.ligaer
  for select to authenticated using (public.er_medlem(id));
create policy "eier kan endre" on public.ligaer
  for update to authenticated using (eier = auth.uid()) with check (eier = auth.uid());

create policy "se medlemmer" on public.liga_medlemmer
  for select to authenticated using (public.er_medlem(liga_id));
create policy "forlate liga" on public.liga_medlemmer
  for delete to authenticated using (uid = auth.uid());

create policy "se ligavenners tid" on public.registreringer
  for select to authenticated using (public.deler_liga(uid));
create policy "legge inn egen tid" on public.registreringer
  for insert to authenticated with check (uid = auth.uid());
create policy "endre egen tid" on public.registreringer
  for update to authenticated using (uid = auth.uid()) with check (uid = auth.uid());
create policy "slette egen tid" on public.registreringer
  for delete to authenticated using (uid = auth.uid());

-- ---------- funksjoner appen kaller ----------

create function public.opprett_liga(p_navn text) returns public.ligaer
language plpgsql security definer set search_path = '' as $$
declare
  ny public.ligaer;
  k text;
  tegn constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
begin
  if auth.uid() is null then raise exception 'ikke innlogget'; end if;
  loop
    k := '';
    for i in 1..6 loop
      k := k || substr(tegn, 1 + floor(random() * length(tegn))::int, 1);
    end loop;
    exit when not exists (select 1 from public.ligaer where kode = k);
  end loop;
  insert into public.ligaer (navn, kode, eier) values (trim(p_navn), k, auth.uid()) returning * into ny;
  insert into public.liga_medlemmer (liga_id, uid) values (ny.id, auth.uid());
  return ny;
end $$;

create function public.bli_med_i_liga(p_kode text) returns public.ligaer
language plpgsql security definer set search_path = '' as $$
declare
  l public.ligaer;
begin
  if auth.uid() is null then raise exception 'ikke innlogget'; end if;
  select * into l from public.ligaer where kode = upper(regexp_replace(p_kode, '[^A-Za-z0-9]', '', 'g'));
  if l.id is null then raise exception 'ukjent-kode'; end if;
  insert into public.liga_medlemmer (liga_id, uid) values (l.id, auth.uid()) on conflict do nothing;
  return l;
end $$;

revoke execute on function public.opprett_liga(text), public.bli_med_i_liga(text) from anon;

-- ---------- sanntid ----------
-- Gjør at tabellen oppdateres hos alle med en gang noen legger inn tid.
alter publication supabase_realtime add table public.registreringer, public.liga_medlemmer;
