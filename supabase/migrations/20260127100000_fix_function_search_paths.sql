-- Fix security warnings: Function Search Path Mutable
-- Sets explicit search_path on functions to prevent search path injection attacks

-- Fix update_updated_at function
ALTER FUNCTION public.update_updated_at()
SET search_path = pg_catalog;

-- Fix trigger_queue_processor function (SECURITY DEFINER - critical)
ALTER FUNCTION public.trigger_queue_processor()
SET search_path = vault, net, pg_catalog;
