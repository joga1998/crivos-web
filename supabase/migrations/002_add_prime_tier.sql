-- ==============================================================================
-- CRIVOS // ATUALIZAÇÃO DE SCHEMA: SUPORTE AO 4º PLANO (CRIVOS PRIME)
-- ==============================================================================

-- 1. Atualiza a restrição CHECK da tabela public.orders para aceitar 'prime'
ALTER TABLE public.orders 
  DROP CONSTRAINT IF EXISTS orders_plan_tier_check;

ALTER TABLE public.orders 
  ADD CONSTRAINT orders_plan_tier_check 
  CHECK (plan_tier IN ('tatico', 'arsenal', 'elite', 'prime'));

-- 2. Atualiza a restrição CHECK da tabela public.user_panels para aceitar 'prime'
ALTER TABLE public.user_panels 
  DROP CONSTRAINT IF EXISTS user_panels_plan_tier_check;

ALTER TABLE public.user_panels 
  ADD CONSTRAINT user_panels_plan_tier_check 
  CHECK (plan_tier IN ('tatico', 'arsenal', 'elite', 'prime'));
