-- Run this once in Supabase > SQL Editor.
-- Replace YOUR_ADMIN_EMAIL (3 places below, search & replace) with the email you will log in with.

create table if not exists posts (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('update','photo','video','blog')),
  title text not null,
  body text,
  media_url text,
  created_at timestamptz not null default now()
);

alter table posts enable row level security;

create policy "anyone can read posts" on posts
  for select using (true);

create policy "admin can add posts" on posts
  for insert to authenticated
  with check ((auth.jwt() ->> 'email') = 'venki.venkatesh496@gmail.com');

create policy "admin can edit posts" on posts
  for update to authenticated
  using ((auth.jwt() ->> 'email') = 'venki.venkatesh496@gmail.com');

create policy "admin can delete posts" on posts
  for delete to authenticated
  using ((auth.jwt() ->> 'email') = 'venki.venkatesh496@gmail.com');

-- Storage bucket for photos and videos
insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do nothing;

create policy "anyone can view media" on storage.objects
  for select using (bucket_id = 'media');

create policy "admin can upload media" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'media' and (auth.jwt() ->> 'email') = 'venki.venkatesh496@gmail.com');

create policy "admin can delete media" on storage.objects
  for delete to authenticated
  using (bucket_id = 'media' and (auth.jwt() ->> 'email') = 'venki.venkatesh496@gmail.com');
