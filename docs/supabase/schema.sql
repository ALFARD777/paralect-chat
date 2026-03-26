create extension if not exists pgcrypto;

create table if not exists public.chats (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  user_id uuid not null,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists chats_user_id_updated_at_idx
  on public.chats (user_id, updated_at desc);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  chat_id uuid not null references public.chats(id) on delete cascade,
  user_id uuid not null,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists messages_chat_id_created_at_idx
  on public.messages (chat_id, created_at asc);

create index if not exists messages_user_id_chat_id_idx
  on public.messages (user_id, chat_id);

create table if not exists public.message_attachments (
  id uuid primary key,
  message_id uuid not null references public.messages(id) on delete cascade,
  chat_id uuid not null references public.chats(id) on delete cascade,
  user_id uuid not null,
  name text not null,
  mime_type text not null,
  storage_path text not null unique,
  type text not null check (type in ('image', 'document')),
  created_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists message_attachments_chat_id_created_at_idx
  on public.message_attachments (chat_id, created_at asc);

create index if not exists message_attachments_message_id_idx
  on public.message_attachments (message_id);

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  chat_id uuid references public.chats(id) on delete cascade,
  message_id uuid references public.messages(id) on delete cascade,
  attachment_id uuid references public.message_attachments(id) on delete cascade,
  name text not null,
  mime_type text not null,
  content text not null,
  created_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists documents_user_id_chat_id_created_at_idx
  on public.documents (user_id, chat_id, created_at desc);

create table if not exists public.guest_message_limits (
  identifier_hash text primary key,
  message_count integer not null default 0,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  last_seen_at timestamptz not null default timezone('utc'::text, now())
);

create or replace function public.consume_guest_message_quota(
  p_identifier_hash text,
  p_limit integer default 3
)
returns table (
  allowed boolean,
  used_count integer,
  remaining_count integer
)
language plpgsql
security definer
as $$
declare
  current_count integer;
begin
  insert into public.guest_message_limits (identifier_hash)
  values (p_identifier_hash)
  on conflict (identifier_hash) do nothing;

  select message_count
  into current_count
  from public.guest_message_limits
  where identifier_hash = p_identifier_hash
  for update;

  if current_count >= p_limit then
    return query
    select false, current_count, greatest(p_limit - current_count, 0);
    return;
  end if;

  update public.guest_message_limits
  set
    message_count = message_count + 1,
    updated_at = timezone('utc'::text, now()),
    last_seen_at = timezone('utc'::text, now())
  where identifier_hash = p_identifier_hash
  returning message_count into current_count;

  return query
  select true, current_count, greatest(p_limit - current_count, 0);
end;
$$;
