-- MédiJ : contrôle d'accès (à coller dans Supabase → SQL Editor → New query → Run)
-- 1. Une ligne par compte : en attente, accepté ou refusé (+ Pro pour plus tard)
create table if not exists public.medij_access (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text,
  statut text not null default 'en_attente' check (statut in ('en_attente','accepte','refuse')),
  pro boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.medij_access enable row level security;
drop policy if exists "voir son acces" on public.medij_access;
create policy "voir son acces" on public.medij_access for select to authenticated using (auth.uid() = user_id);
-- personne ne peut se valider soi-même : seule Mariame modifie cette table depuis Supabase

-- 2. Chaque nouveau compte arrive automatiquement « en attente »
create or replace function public.medij_nouveau_compte() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.medij_access (user_id, email) values (new.id, new.email) on conflict do nothing;
  return new;
end $$;
drop trigger if exists medij_nouveau_compte on auth.users;
create trigger medij_nouveau_compte after insert on auth.users for each row execute function public.medij_nouveau_compte();

-- 3. Les comptes déjà créés (le tien) sont ajoutés et acceptés
insert into public.medij_access (user_id, email, statut)
select id, email, 'accepte' from auth.users on conflict (user_id) do update set statut = 'accepte';

-- 4. Seuls les comptes acceptés peuvent enregistrer leurs données
create or replace function public.medij_accepte() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.medij_access where user_id = auth.uid() and statut = 'accepte')
$$;
drop policy if exists "lire ses donnees" on public.medij_state;
drop policy if exists "creer ses donnees" on public.medij_state;
drop policy if exists "modifier ses donnees" on public.medij_state;
drop policy if exists "supprimer ses donnees" on public.medij_state;
create policy "lire ses donnees" on public.medij_state for select to authenticated using (auth.uid() = user_id and public.medij_accepte());
create policy "creer ses donnees" on public.medij_state for insert to authenticated with check (auth.uid() = user_id and public.medij_accepte());
create policy "modifier ses donnees" on public.medij_state for update to authenticated using (auth.uid() = user_id and public.medij_accepte()) with check (auth.uid() = user_id and public.medij_accepte());
create policy "supprimer ses donnees" on public.medij_state for delete to authenticated using (auth.uid() = user_id and public.medij_accepte());
