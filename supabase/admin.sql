-- Eenmalig uitvoeren in de Supabase SQL-editor (na user_data.sql).
-- Admins (app_metadata.admin = true) kunnen via de site kiezen wie toegang heeft tot de privéprojecten.
-- app_metadata kan een gebruiker niet zelf aanpassen, dus alleen jij (via deze SQL) bepaalt wie admin is.

create or replace function public.is_admin()
returns boolean
language sql stable
as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'admin')::boolean, false)
$$;

-- Lijst met alle accounts, alleen voor admins.
create or replace function public.admin_gebruikers()
returns table (id uuid, email text, prive boolean, admin boolean, aangemaakt timestamptz)
language plpgsql security definer set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Alleen voor admins';
  end if;
  return query
    select u.id, u.email::text,
           coalesce((u.raw_app_meta_data ->> 'prive')::boolean, false),
           coalesce((u.raw_app_meta_data ->> 'admin')::boolean, false),
           u.created_at
    from auth.users u
    order by u.created_at desc;
end
$$;

-- Privétoegang aan- of uitzetten voor één account, alleen voor admins.
create or replace function public.admin_zet_prive(gebruiker uuid, toegang boolean)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Alleen voor admins';
  end if;
  update auth.users
     set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('prive', toegang)
   where id = gebruiker;
end
$$;

revoke execute on function public.admin_gebruikers() from public, anon;
revoke execute on function public.admin_zet_prive(uuid, boolean) from public, anon;
grant execute on function public.admin_gebruikers() to authenticated;
grant execute on function public.admin_zet_prive(uuid, boolean) to authenticated;

-- Daan is admin (met privétoegang). Log daarna opnieuw in op de site.
update auth.users set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"admin": true, "prive": true}' where email = 'daan.woerdman@gmail.com';
