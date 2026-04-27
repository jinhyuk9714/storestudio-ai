create table if not exists public.users (
  id text primary key,
  email text not null unique,
  plan text not null default 'trial',
  credits integer not null default 3,
  created_at timestamptz not null default now()
);

create table if not exists public.projects (
  id text primary key,
  user_id text not null references public.users(id) on delete cascade,
  product_name text not null,
  category text not null,
  tone text not null,
  hero_copy text not null,
  channel text not null,
  source_asset_ids text[] not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists public.assets (
  id text primary key,
  user_id text not null references public.users(id) on delete cascade,
  project_id text not null references public.projects(id) on delete cascade,
  kind text not null,
  output_type text,
  url text not null,
  bucket_key text,
  public_url text,
  signed_url text,
  storage_driver text,
  format text,
  width integer not null,
  height integer not null,
  mime_type text not null,
  prompt text,
  created_at timestamptz not null default now()
);

create table if not exists public.generation_jobs (
  id text primary key,
  user_id text not null references public.users(id) on delete cascade,
  project_id text not null references public.projects(id) on delete cascade,
  status text not null,
  output_types text[] not null,
  prompt text not null default '',
  cost integer not null default 1,
  result_asset_ids text[] not null default '{}',
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.credit_ledger (
  id text primary key,
  user_id text not null references public.users(id) on delete cascade,
  amount integer not null,
  reason text not null,
  job_id text,
  billing_event_id text,
  idempotency_key text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.billing_events (
  id text primary key,
  provider text not null,
  user_id text references public.users(id) on delete set null,
  event_type text not null,
  payment_key text,
  order_id text,
  product_id text,
  credits_granted integer not null,
  raw jsonb not null,
  created_at timestamptz not null default now(),
  unique (payment_key),
  unique (order_id)
);

create table if not exists public.waitlist (
  id text primary key,
  email text not null,
  store_url text,
  created_at timestamptz not null default now()
);

create index if not exists projects_user_id_idx on public.projects(user_id);
create index if not exists assets_project_id_idx on public.assets(project_id);
create index if not exists generation_jobs_user_status_idx on public.generation_jobs(user_id, status);
create index if not exists credit_ledger_user_id_idx on public.credit_ledger(user_id);

alter table public.users enable row level security;
alter table public.projects enable row level security;
alter table public.assets enable row level security;
alter table public.generation_jobs enable row level security;
alter table public.credit_ledger enable row level security;
alter table public.billing_events enable row level security;
alter table public.waitlist enable row level security;
