-- ==============================================================================
-- CRIVOS // SCHEMA OFICIAL DO BANCO DE DADOS (SUPABASE POSTGRESQL + RLS)
-- Versão: 1.1.0 (Sincronizado com produção Supabase)
-- Descrição: Tabelas de perfis, pedidos, painéis individualizados, arquivos do
--            aluno, progresso sincronizado, webhooks e solicitações de ajuste.
-- ==============================================================================

-- 1. EXTENSÕES NECESSÁRIAS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TABELA: PROFILES (Extensão de auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT DEFAULT 'Candidato CRIVOS',
  avatar_url TEXT DEFAULT '',
  whatsapp TEXT DEFAULT '',
  cpf TEXT DEFAULT '',
  role TEXT DEFAULT 'candidate' CHECK (role IN ('candidate', 'admin')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. TABELA: ORDERS (Pedidos & Intake de Checkout)
CREATE TABLE IF NOT EXISTS public.orders (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  concurso_nome TEXT NOT NULL,
  cargo TEXT NOT NULL,
  horas_semanais TEXT,
  plan_tier TEXT NOT NULL CHECK (plan_tier IN ('tatico', 'arsenal', 'elite')),
  status TEXT DEFAULT 'pending_payment' CHECK (status IN ('pending_payment', 'approved', 'in_calibration', 'delivered', 'refunded', 'cancelled')),
  payment_method TEXT CHECK (payment_method IN ('pix', 'credit_card')),
  payment_id TEXT,
  amount_cents INTEGER NOT NULL,
  edital_file_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. TABELA: USER_PANELS (Painéis Individuais sob Demanda)
CREATE TABLE IF NOT EXISTS public.user_panels (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  order_id TEXT REFERENCES public.orders(id) ON DELETE SET NULL,
  plan_tier TEXT NOT NULL CHECK (plan_tier IN ('tatico', 'arsenal', 'elite')),
  status TEXT NOT NULL DEFAULT 'calibrating' CHECK (status IN ('calibrating', 'ready', 'archived')),
  concurso TEXT NOT NULL,
  cargo TEXT NOT NULL,
  delivery_deadline_at TIMESTAMPTZ NOT NULL,
  published_at TIMESTAMPTZ,
  header_config JSONB DEFAULT '{}'::JSONB,
  content_data JSONB DEFAULT '{}'::JSONB,
  enabled_modules JSONB NOT NULL DEFAULT '{
    "home": "enabled",
    "crono": "enabled",
    "textos": "enabled",
    "cards": "locked_upsell",
    "pomo": "enabled",
    "sim": "locked_upsell",
    "arg": "locked_upsell",
    "mapa": "locked_upsell",
    "links": "enabled",
    "dicas": "enabled",
    "dados": "enabled",
    "perfil": "enabled"
  }'::JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. TABELA: USER_FILES (Catálogo de Arquivos e PDFs Individuais do Aluno)
CREATE TABLE IF NOT EXISTS public.user_files (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  panel_id UUID REFERENCES public.user_panels(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('edital', 'material', 'bibliografia', 'simulado', 'projeto', 'outro')),
  title TEXT NOT NULL,
  filename TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  storage_url TEXT NOT NULL,
  file_size_bytes BIGINT,
  priority TEXT DEFAULT 'ESSENCIAL',
  page_offset INTEGER DEFAULT 0,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. TABELA: USER_PROGRESS (Sincronização Nuvem do Objeto S do localStorage)
CREATE TABLE IF NOT EXISTS public.user_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  panel_id UUID REFERENCES public.user_panels(id) ON DELETE CASCADE,
  state_data JSONB NOT NULL DEFAULT '{}'::JSONB,
  last_tab TEXT DEFAULT 'home',
  study_minutes_total INTEGER DEFAULT 0,
  cards_reviewed_total INTEGER DEFAULT 0,
  tasks_completed_count INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. TABELA: RECALIBRATION_REQUESTS (Garantia de 7 dias de ajuste fino)
CREATE TABLE IF NOT EXISTS public.recalibration_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  panel_id UUID NOT NULL REFERENCES public.user_panels(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  new_hours_per_week TEXT,
  details TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

-- 8. TABELA: WEBHOOK_EVENTS (Auditoria & Idempotência de Webhooks)
CREATE TABLE IF NOT EXISTS public.webhook_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  gateway TEXT NOT NULL DEFAULT 'mercadopago',
  event_type TEXT NOT NULL,
  external_event_id TEXT,
  payload JSONB NOT NULL,
  processed BOOLEAN DEFAULT FALSE,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. SEGURANÇA: ROW LEVEL SECURITY (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_panels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recalibration_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;
