-- À exécuter manuellement dans Supabase Production lors de la bascule Moneriz.
-- Prérequis : clés/webhook LIVE configurés dans Vercel, prix vérifiés et
-- déploiement Production avec MONERIZ_MODE=live. Voir moneriz-production.md.
-- Ce mode est partagé par toutes les applications utilisant ce Supabase.
BEGIN;
UPDATE public.billing_settings SET mode='live' WHERE singleton=true;
SELECT mode FROM public.billing_settings WHERE singleton=true;
COMMIT;
