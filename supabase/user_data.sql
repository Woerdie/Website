-- Eenmalig uitvoeren in de Supabase SQL-editor.
-- Per account per app één rij met de gegevens van die app (Legenda-maker, Pubgolf, Borrelplanner).
create table if not exists public.user_data (
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  app text not null,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, app)
);

alter table public.user_data enable row level security;

-- Iedereen ziet en wijzigt alleen zijn eigen rijen.
create policy "Eigen data lezen" on public.user_data
  for select to authenticated using (auth.uid() = user_id);
create policy "Eigen data toevoegen" on public.user_data
  for insert to authenticated with check (auth.uid() = user_id);
create policy "Eigen data wijzigen" on public.user_data
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Eigen data verwijderen" on public.user_data
  for delete to authenticated using (auth.uid() = user_id);
