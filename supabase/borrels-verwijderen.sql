-- Borrelplanner: wie een borrel maakt, kan hem ook voor iedereen verwijderen.
-- In maker staat de sha256 van de geheime sleutel van de maker (net als eigenaar bij beschikbaarheid).
-- Veilig om opnieuw uit te voeren.

alter table public.borrels add column if not exists maker text;

-- Verwijdert de borrel (en via cascade alle dagen) alleen als de sleutel bij de maker hoort.
create or replace function public.borrel_verwijder(borrel uuid, sleutel text)
returns boolean
language plpgsql security definer set search_path = ''
as $$
declare
  n int;
begin
  delete from public.borrels
   where id = borrel
     and maker is not null
     and maker = encode(sha256(convert_to(coalesce(sleutel, ''), 'UTF8')), 'hex');
  get diagnostics n = row_count;
  return n > 0;
end
$$;

revoke execute on function public.borrel_verwijder(uuid, text) from public;
grant execute on function public.borrel_verwijder(uuid, text) to anon, authenticated;
