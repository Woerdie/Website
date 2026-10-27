-- Borrelplanner: elke borrel heeft een eigen planning met een deellink,
-- en je kunt alleen je eigen dagen aanpassen. (Al uitgevoerd op 27-10-2026; veilig om opnieuw uit te voeren.)

create table if not exists public.borrels (
  id uuid primary key default gen_random_uuid(),
  naam text not null check (char_length(trim(naam)) between 1 and 60),
  aangemaakt timestamptz not null default now()
);
alter table public.borrels enable row level security;
drop policy if exists "Iedereen leest borrels" on public.borrels;
create policy "Iedereen leest borrels" on public.borrels for select to anon, authenticated using (true);
drop policy if exists "Iedereen maakt borrels" on public.borrels;
create policy "Iedereen maakt borrels" on public.borrels for insert to anon, authenticated with check (true);

-- Beschikbaarheid hoort nu bij een borrel en heeft een eigenaar:
-- de sha256 van een geheime sleutel die alleen in de browser (of het account) van die persoon staat.
alter table public.beschikbaarheid add column if not exists borrel_id uuid references public.borrels on delete cascade;
alter table public.beschikbaarheid add column if not exists eigenaar text;
delete from public.beschikbaarheid where borrel_id is null or eigenaar is null; -- oude rijen zonder borrel
alter table public.beschikbaarheid alter column borrel_id set not null;
alter table public.beschikbaarheid alter column eigenaar set not null;
create index if not exists beschikbaarheid_borrel on public.beschikbaarheid (borrel_id);

-- Lezen mag iedereen; schrijven en verwijderen gaat alleen nog via borrel_zet_dagen
drop policy if exists "Iedereen mag beschikbaarheid toevoegen" on public.beschikbaarheid;
drop policy if exists "Iedereen mag beschikbaarheid verwijderen" on public.beschikbaarheid;
drop policy if exists "iedereen mag toevoegen" on public.beschikbaarheid;
drop policy if exists "iedereen mag lezen" on public.beschikbaarheid;
drop policy if exists "Iedereen mag beschikbaarheid lezen" on public.beschikbaarheid;
create policy "Iedereen mag beschikbaarheid lezen" on public.beschikbaarheid for select to anon, authenticated using (true);

-- Zet jouw dagen voor een borrel: vervangt alles wat onder jouw sleutel stond en ruimt verlopen dagen op.
create or replace function public.borrel_zet_dagen(borrel uuid, naam text, dagen date[], sleutel text)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  h text;
begin
  if char_length(coalesce(sleutel, '')) < 20 then
    raise exception 'Ongeldige sleutel';
  end if;
  naam := trim(naam);
  if char_length(coalesce(naam, '')) not between 1 and 40 then
    raise exception 'Vul een naam in van maximaal 40 tekens';
  end if;
  if coalesce(array_length(dagen, 1), 0) > 120 then
    raise exception 'Te veel dagen gekozen';
  end if;
  h := encode(sha256(convert_to(sleutel, 'UTF8')), 'hex');
  delete from public.beschikbaarheid where borrel_id = borrel and (eigenaar = h or datum < current_date);
  insert into public.beschikbaarheid (borrel_id, naam, datum, eigenaar)
    select borrel, naam, x.d, h from (select distinct unnest(dagen) as d) x where x.d >= current_date;
end
$$;

revoke execute on function public.borrel_zet_dagen(uuid, text, date[], text) from public;
grant execute on function public.borrel_zet_dagen(uuid, text, date[], text) to anon, authenticated;
