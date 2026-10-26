-- Eenmalig uitvoeren in de Supabase SQL-editor, NA admin.sql (gebruikt public.is_admin()).
-- Lagen en standaardnetwerken van de Legenda-maker. Iedereen mag ze lezen, alleen admins mogen ze wijzigen.

create table if not exists public.legenda_lagen (
  id text primary key,
  label text not null,
  groep text not null,
  vorm text not null check (vorm in ('icon', 'blok', 'rondje', 'lijn', 'stippel')),
  kleur text,
  icoon text, -- SVG-inhoud voor viewBox 0 0 100 100, alleen bij vorm 'icon'
  volgorde int not null default 0
);

create table if not exists public.legenda_netwerken (
  naam text primary key,
  lagen text[] not null default '{}',
  volgorde int not null default 0
);

alter table public.legenda_lagen enable row level security;
alter table public.legenda_netwerken enable row level security;

drop policy if exists "Iedereen leest lagen" on public.legenda_lagen;
create policy "Iedereen leest lagen" on public.legenda_lagen for select to anon, authenticated using (true);
drop policy if exists "Admins beheren lagen" on public.legenda_lagen;
create policy "Admins beheren lagen" on public.legenda_lagen for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "Iedereen leest netwerken" on public.legenda_netwerken;
create policy "Iedereen leest netwerken" on public.legenda_netwerken for select to anon, authenticated using (true);
drop policy if exists "Admins beheren netwerken" on public.legenda_netwerken;
create policy "Admins beheren netwerken" on public.legenda_netwerken for all to authenticated using (public.is_admin()) with check (public.is_admin());

grant select on public.legenda_lagen, public.legenda_netwerken to anon, authenticated;
grant insert, update, delete on public.legenda_lagen, public.legenda_netwerken to authenticated;

-- De lagen die eerst in de code stonden
insert into public.legenda_lagen (id, label, groep, vorm, kleur, icoon, volgorde) values
  ('landhuis', 'Landhuis', 'Voorzieningen', 'icon', null, '<circle cx="50" cy="50" r="48" fill="#8E2F3C"/><circle cx="50" cy="50" r="43" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="1.5"/><path d="M20 44 L50 24 L80 44 Z" fill="#fff"/>
<rect x="63" y="25" width="6" height="12" fill="#fff"/>
<rect x="25" y="44" width="50" height="28" fill="#fff"/>
<rect x="21" y="71" width="58" height="4" rx="1" fill="#fff"/>
<g fill="#8E2F3C"><rect x="30" y="50" width="8" height="8" rx="1"/><rect x="62" y="50" width="8" height="8" rx="1"/>
<path d="M44 72 V58 a6 6 0 0 1 12 0 V72 Z"/><circle cx="50" cy="36" r="3.5"/></g>', 1),
  ('rustplek', 'Rustplek', 'Voorzieningen', 'icon', null, '<circle cx="50" cy="50" r="48" fill="#8B5A2B"/><circle cx="50" cy="50" r="43" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="1.5"/><rect x="26" y="31" width="48" height="8" rx="3" fill="#fff"/>
<rect x="32" y="38" width="5" height="12" fill="#fff"/><rect x="63" y="38" width="5" height="12" fill="#fff"/>
<rect x="21" y="49" width="58" height="8" rx="3" fill="#fff"/>
<rect x="28" y="56" width="6" height="15" rx="2" fill="#fff"/><rect x="66" y="56" width="6" height="15" rx="2" fill="#fff"/>', 2),
  ('natuurlijke-speelplek', 'Natuurlijke speelplek', 'Voorzieningen', 'icon', null, '<circle cx="50" cy="50" r="48" fill="#2E6B30"/><circle cx="50" cy="50" r="43" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="1.5"/><circle cx="37" cy="30" r="7" fill="#fff"/><circle cx="63" cy="30" r="7" fill="#fff"/>
<rect x="30" y="40" width="14" height="21" rx="6" fill="#fff"/><rect x="56" y="40" width="14" height="21" rx="6" fill="#fff"/>
<g stroke="#fff" stroke-linecap="round" stroke-linejoin="round" fill="none" stroke-width="4.5"><line x1="34" y1="60" x2="34" y2="74"/><line x1="40" y1="60" x2="40" y2="74"/><line x1="60" y1="60" x2="60" y2="74"/><line x1="66" y1="60" x2="66" y2="74"/>
<line x1="43" y1="47" x2="57" y2="47"/><line x1="31" y1="45" x2="24" y2="56"/><line x1="69" y1="45" x2="76" y2="56"/></g>', 3),
  ('uitzichtpunt', 'Uitzichtpunt', 'Voorzieningen', 'icon', null, '<circle cx="50" cy="50" r="48" fill="#E8892B"/><circle cx="50" cy="50" r="43" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="1.5"/><path d="M18 56 Q50 30 82 56 Q50 82 18 56 Z" fill="#fff"/>
<circle cx="50" cy="56" r="11" fill="#E8892B"/><circle cx="54" cy="52" r="3.5" fill="#fff"/>
<g stroke="#fff" stroke-linecap="round" stroke-linejoin="round" fill="none" stroke-width="4"><line x1="50" y1="20" x2="50" y2="29"/><line x1="32" y1="25" x2="37" y2="32"/><line x1="68" y1="25" x2="63" y2="32"/></g>', 4),
  ('verblijfszone', 'Verblijfszone', 'Voorzieningen', 'icon', null, '<circle cx="50" cy="50" r="48" fill="#6BA539"/><circle cx="50" cy="50" r="43" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="1.5"/><path d="M30 70 C30 40 48 26 74 26 C74 52 60 70 30 70 Z" fill="#fff"/>
<path d="M32 68 Q48 52 64 36" stroke="#6BA539" stroke-width="3.5" stroke-linecap="round" fill="none"/>
<line x1="31" y1="69" x2="24" y2="77" stroke="#fff" stroke-linecap="round" stroke-linejoin="round" fill="none" stroke-width="4.5"/>', 5),
  ('waterbeleving', 'Waterbeleving', 'Voorzieningen', 'icon', null, '<circle cx="50" cy="50" r="48" fill="#1F6FA8"/><circle cx="50" cy="50" r="43" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="1.5"/><path d="M22 38 q7 -8 14 0 t14 0 t14 0 t14 0" stroke="#fff" stroke-linecap="round" stroke-linejoin="round" fill="none" stroke-width="5"/><path d="M22 52 q7 -8 14 0 t14 0 t14 0 t14 0" stroke="#fff" stroke-linecap="round" stroke-linejoin="round" fill="none" stroke-width="5"/><path d="M22 66 q7 -8 14 0 t14 0 t14 0 t14 0" stroke="#fff" stroke-linecap="round" stroke-linejoin="round" fill="none" stroke-width="5"/>', 6),
  ('rotonde', 'Rotonde', 'Mobiliteit en infrastructuur', 'icon', null, '<circle cx="50" cy="50" r="48" fill="#4A5A6A"/><circle cx="50" cy="50" r="43" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="1.5"/><path d="M45.63 29.46 A21 21 0 0 0 29.05 48.54" stroke="#fff" stroke-width="7" fill="none" stroke-linecap="butt"/><polygon points="20.79,45.89 27.67,57.97 37.62,48.26" fill="#fff"/><path d="M34.39 64.05 A21 21 0 0 0 59.21 68.87" stroke="#fff" stroke-width="7" fill="none" stroke-linecap="butt"/><polygon points="61.05,77.35 68.07,65.35 54.68,61.59" fill="#fff"/><path d="M69.97 56.49 A21 21 0 0 0 61.74 32.59" stroke="#fff" stroke-width="7" fill="none" stroke-linecap="butt"/><polygon points="68.16,26.75 54.26,26.68 57.70,40.15" fill="#fff"/>', 7),
  ('trein', 'Treinstation', 'Mobiliteit en infrastructuur', 'blok', '#cc1517', null, 8),
  ('bushalte', 'Bushalte', 'Mobiliteit en infrastructuur', 'rondje', '#cc1517', null, 9),
  ('busbaan', 'Busrijbaan', 'Mobiliteit en infrastructuur', 'lijn', '#be4291', null, 10),
  ('hoofdweg', 'Hoofdweg', 'Mobiliteit en infrastructuur', 'lijn', '#f59c1a', null, 11),
  ('weg', 'Weg', 'Mobiliteit en infrastructuur', 'lijn', '#f4e710', null, 12),
  ('fietspad', 'Fietspad', 'Mobiliteit en infrastructuur', 'lijn', '#51ab33', null, 13),
  ('looproute', 'Looproutes', 'Mobiliteit en infrastructuur', 'lijn', '#aa6e14', null, 14),
  ('wandelroute', 'Wandelroutes', 'Mobiliteit en infrastructuur', 'stippel', '#aa6e14', null, 15),
  ('spoor', 'Spoor', 'Mobiliteit en infrastructuur', 'stippel', '#000000', null, 16),
  ('gasleiding', 'Gasleiding', 'Mobiliteit en infrastructuur', 'lijn', '#6750a1', null, 17),
  ('parkeren', 'Parkeren', 'Mobiliteit en infrastructuur', 'blok', '#010101', null, 18),
  ('deelmob', 'Deelmobiliteit', 'Mobiliteit en infrastructuur', 'blok', '#43dda6', null, 19),
  ('water', 'Water', 'Gebieden', 'blok', '#aad3df', null, 20),
  ('bos', 'Bos', 'Gebieden', 'blok', '#085d2b', null, 21),
  ('tussen', 'Tussen groen en bos', 'Gebieden', 'blok', '#add19e', null, 22),
  ('groen', 'Groen', 'Gebieden', 'blok', '#75c043', null, 23),
  ('bebouwing', 'Bebouwing', 'Gebieden', 'blok', '#001511', null, 24),
  ('bebouwing2', 'Bebouwing (bruin)', 'Gebieden', 'blok', '#54491d', null, 25),
  ('winkel', 'Winkelgebied', 'Gebieden', 'blok', '#9361a9', null, 26),
  ('school', 'School', 'Gebieden', 'blok', '#2d3492', null, 27),
  ('sport', 'Sport', 'Gebieden', 'blok', '#feeb8f', null, 28)
on conflict (id) do nothing;

insert into public.legenda_netwerken (naam, lagen, volgorde) values
  ('OV-netwerk', array['trein', 'bushalte', 'busbaan', 'spoor', 'hoofdweg', 'weg', 'bebouwing', 'water'], 1),
  ('Fietsnetwerk', array['fietspad', 'hoofdweg', 'weg', 'deelmob', 'parkeren', 'bebouwing', 'groen', 'water'], 2),
  ('Wandel- en groennetwerk', array['looproute', 'wandelroute', 'rustplek', 'uitzichtpunt', 'natuurlijke-speelplek', 'verblijfszone', 'waterbeleving', 'landhuis', 'bos', 'groen', 'tussen', 'water'], 3),
  ('Autonetwerk', array['hoofdweg', 'weg', 'rotonde', 'parkeren', 'bebouwing', 'water'], 4)
on conflict (naam) do nothing;
