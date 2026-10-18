-- ==============================================================================
-- CRIVOS // SCHEMA OFICIAL DO BANCO DE DADOS (SUPABASE POSTGRESQL + RLS)
-- Versão: 1.0.0
-- Descrição: Tabelas de perfis, pedidos, painéis individualizados, arquivos do
--            aluno, progresso sincronizado, webhooks e solicitações de ajuste.
-- ==============================================================================

-- 1. EXTENSÕES NECESSÁRIAS
create extension if not exists "uuid-ossp";

-- 2. TABELA: PROFILES (Extensão de auth.users)
create table if not exists public.profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    email text unique not null,
    full_name text,
    doc_type text default 'CPF',
    doc_number text,
    phone_whatsapp text,
    avatar_url text,
    role text default 'student' check (role in ('student', 'admin')),
    must_change_password boolean default true,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. TABELA: ORDERS (Pedidos & Leads de Checkout)
create table if not exists public.orders (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid references public.profiles(id) on delete set null,
    email text not null,
    full_name text,
    doc_number text,
    plan_tier text not null check (plan_tier in ('tatico', 'arsenal', 'elite')),
    amount numeric(10, 2) not null,
    concurso text not null,
    cargo text not null,
    availability_text text not null,
    edital_storage_path text,
    mp_payment_id text unique,
    payment_method text check (payment_method in ('pix', 'credit_card')),
    status text default 'pending_payment' check (status in ('pending_payment', 'paid', 'rejected', 'refunded')),
    paid_at timestamp with time zone,
    credentials_sent_at timestamp with time zone,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists idx_orders_email on public.orders(email);
create index if not exists idx_orders_mp_payment_id on public.orders(mp_payment_id);
create index if not exists idx_orders_status on public.orders(status);

-- 4. TABELA: USER_PANELS (Configuração e Dados do Painel Individual por Aluno)
create table if not exists public.user_panels (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid unique not null references public.profiles(id) on delete cascade,
    order_id uuid references public.orders(id) on delete set null,
    status text default 'calibrating' check (status in ('calibrating', 'ready', 'suspended', 'archived')),
    plan_tier text not null check (plan_tier in ('tatico', 'arsenal', 'elite')),
    -- Flags finas de módulos ativos/bloqueados: {"crono": "enabled", "cards": "locked_upsell", "arg": "hidden", ...}
    enabled_modules jsonb default '{"home": "enabled", "crono": "enabled", "textos": "enabled", "cards": "enabled", "pomo": "enabled", "sim": "enabled", "arg": "enabled", "mapa": "enabled", "links": "enabled", "dicas": "enabled", "dados": "enabled", "perfil": "enabled"}'::jsonb not null,
    -- Configurações de cabeçalho: { "title": "PPGHS / UERJ 2027", "subtitle": "HISTÓRIA SOCIAL DO TERRITÓRIO", "badge": "// SISTEMA TÁTICO", "dates": [...] }
    header_config jsonb default '{}'::jsonb not null,
    -- Objeto D completo: { "sched": [...], "texts": [...], "sim": [...], "rubric": "...", "arg": [...], "fracos": "...", "tabs": [...], "vespera": "..." }
    content_data jsonb default '{}'::jsonb not null,
    delivery_deadline_at timestamp with time zone,
    published_at timestamp with time zone,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists idx_user_panels_user_id on public.user_panels(user_id);
create index if not exists idx_user_panels_status on public.user_panels(status);

-- 5. TABELA: USER_FILES (Catálogo de Arquivos e PDFs Individuais do Aluno)
create table if not exists public.user_files (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid not null references public.profiles(id) on delete cascade,
    panel_id uuid references public.user_panels(id) on delete cascade,
    category text not null check (category in ('edital', 'guia', 'apostila', 'texto', 'prova_anterior', 'projeto', 'outro')),
    title text not null,
    filename text not null,
    storage_path text not null, -- Caminho exato no bucket 'user-materials'
    priority text default 'ESSENCIAL' check (priority in ('ESSENCIAL', 'IMPORTANTE', 'SECUNDARIO', 'GERAL')),
    page_offset integer default 0,
    sort_order integer default 0,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists idx_user_files_user_id on public.user_files(user_id);
create index if not exists idx_user_files_category on public.user_files(category);

-- 6. TABELA: USER_PROGRESS (Sincronização Nuvem do Objeto S do localStorage)
create table if not exists public.user_progress (
    user_id uuid primary key references public.profiles(id) on delete cascade,
    panel_id uuid references public.user_panels(id) on delete cascade,
    -- Estado completo: { "days": {}, "moved": {}, "texts": {}, "notes": {}, "cards": {}, "log": [], "sims": [], "args": {}, "theme": "...", "pomo": {...} }
    state_data jsonb default '{}'::jsonb not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 7. TABELA: RECALIBRATION_REQUESTS (Garantia de 7 dias de ajuste fino)
create table if not exists public.recalibration_requests (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid not null references public.profiles(id) on delete cascade,
    panel_id uuid not null references public.user_panels(id) on delete cascade,
    requested_changes text not null,
    status text default 'pending' check (status in ('pending', 'analyzing', 'applied', 'rejected')),
    admin_notes text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    resolved_at timestamp with time zone
);

create index if not exists idx_recalibration_user_id on public.recalibration_requests(user_id);

-- 8. TABELA: WEBHOOK_EVENTS (Auditoria & Idempotência de Webhooks)
create table if not exists public.webhook_events (
    id uuid primary key default uuid_generate_v4(),
    provider text not null default 'mercadopago',
    event_id text unique not null,
    topic text,
    payload jsonb not null,
    processed boolean default false,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists idx_webhook_events_event_id on public.webhook_events(event_id);

-- 9. TRIGGERS AUTOMÁTICOS DE UPDATED_AT
create or replace function public.set_updated_at()
returns trigger as $$
begin
    new.updated_at = timezone('utc'::text, now());
    return new;
end;
$$ language plpgsql;

create trigger trigger_profiles_updated_at before update on public.profiles
    for each row execute function public.set_updated_at();

create trigger trigger_orders_updated_at before update on public.orders
    for each row execute function public.set_updated_at();

create trigger trigger_user_panels_updated_at before update on public.user_panels
    for each row execute function public.set_updated_at();

create trigger trigger_user_progress_updated_at before update on public.user_progress
    for each row execute function public.set_updated_at();

-- 10. SEGURANÇA: ROW LEVEL SECURITY (RLS)
alter table public.profiles enable row level security;
alter table public.orders enable row level security;
alter table public.user_panels enable row level security;
alter table public.user_files enable row level security;
alter table public.user_progress enable row level security;
alter table public.recalibration_requests enable row level security;
alter table public.webhook_events enable row level security;

-- POLÍTICAS: PROFILES
create policy "Usuários podem visualizar o próprio perfil" on public.profiles
    for select using (auth.uid() = id);

create policy "Usuários podem atualizar o próprio perfil" on public.profiles
    for update using (auth.uid() = id) with check (auth.uid() = id);

-- POLÍTICAS: USER_PANELS
create policy "Usuários podem visualizar o próprio painel" on public.user_panels
    for select using (auth.uid() = user_id);

-- POLÍTICAS: USER_FILES
create policy "Usuários podem visualizar seus próprios arquivos" on public.user_files
    for select using (auth.uid() = user_id);

-- POLÍTICAS: USER_PROGRESS
create policy "Usuários podem visualizar seu próprio progresso" on public.user_progress
    for select using (auth.uid() = user_id);

create policy "Usuários podem atualizar seu próprio progresso" on public.user_progress
    for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- POLÍTICAS: RECALIBRATION_REQUESTS
create policy "Usuários podem visualizar suas solicitações de recalibração" on public.recalibration_requests
    for select using (auth.uid() = user_id);

create policy "Usuários podem criar solicitação de recalibração" on public.recalibration_requests
    for insert with check (auth.uid() = user_id);

-- POLÍTICAS: ORDERS
create policy "Usuários podem visualizar seus próprios pedidos" on public.orders
    for select using (auth.uid() = user_id or email = (select email from auth.users where id = auth.uid()));

-- STORAGE: POLÍTICAS DE RLS RECOMENDADAS PARA BUCKET 'user-materials'
-- Nota: Execute no Supabase Storage:
-- insert into storage.buckets (id, name, public) values ('user-materials', 'user-materials', false);
-- insert into storage.buckets (id, name, public) values ('intake-editais', 'intake-editais', false);
--
-- Policy para leitura de arquivos:
-- create policy "Acesso exclusivo aos materiais do aluno"
-- on storage.objects for select
-- using (bucket_id = 'user-materials' and auth.uid()::text = (storage.foldername(name))[1]);
