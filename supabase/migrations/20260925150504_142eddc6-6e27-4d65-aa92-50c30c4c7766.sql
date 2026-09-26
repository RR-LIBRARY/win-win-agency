-- Least-privilege table grants (defense in depth behind RLS).
-- Until now the anonymous and signed-in database roles held full table rights
-- on every table and the invoice counter; RLS was the only barrier. This
-- trims the grants to exactly what the existing policies allow.

-- 1) Reset: strip everything from the two browser-facing roles.
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;

-- 2) Anonymous visitors: public catalogue reads + two insert-only forms.
GRANT SELECT ON public.templates, public.site_settings, public.site_videos, public.product_docs, public.product_reviews TO anon;
GRANT INSERT ON public.contact_messages, public.bookings TO anon;

-- 3) Signed-in users (buyers + the admin), mirroring the RLS policies per table.
GRANT SELECT, INSERT, UPDATE ON public.bookings TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.contact_messages TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.coupons TO authenticated;
GRANT SELECT, UPDATE ON public.license_keys TO authenticated;
GRANT SELECT, UPDATE ON public.orders TO authenticated;
GRANT SELECT ON public.payment_events TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_docs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_reviews TO authenticated;
GRANT SELECT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.security_findings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.security_scans TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.site_settings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.site_videos TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.template_deliverables TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.templates TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.user_roles TO authenticated;

-- 4) The invoice counter is only ever advanced by the server (SECURITY DEFINER
--    function owned by postgres); the service role keeps full access.
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- 5) Future tables/sequences created by migrations no longer inherit blanket
--    rights for the browser-facing roles; every new table must grant explicitly.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon, authenticated;