
-- profiles table
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nickname text not null unique,
  full_name text not null,
  place text not null,
  district text not null,
  avatar_url text,
  bonus_points integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Profiles are viewable by authenticated users"
  on public.profiles for select
  to authenticated
  using (true);

create policy "Users can insert own profile"
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id);

-- index for leaderboard
create index profiles_bonus_points_idx on public.profiles (bonus_points desc);

-- get email by nickname (for login flow)
create or replace function public.get_email_by_nickname(_nickname text)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select u.email
  from public.profiles p
  join auth.users u on u.id = p.id
  where lower(p.nickname) = lower(_nickname)
  limit 1
$$;

grant execute on function public.get_email_by_nickname(text) to anon, authenticated;

-- award bonus points to current user
create or replace function public.award_bonus(_delta integer)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  new_points integer;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  if _delta is null or _delta < 0 or _delta > 50 then
    raise exception 'Invalid delta';
  end if;
  update public.profiles
  set bonus_points = bonus_points + _delta
  where id = auth.uid()
  returning bonus_points into new_points;
  return coalesce(new_points, 0);
end;
$$;

grant execute on function public.award_bonus(integer) to authenticated;

-- storage bucket for avatars (public read)
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy "Avatars are publicly accessible"
  on storage.objects for select
  using (bucket_id = 'avatars');

create policy "Users can upload their own avatar"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users can update their own avatar"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
