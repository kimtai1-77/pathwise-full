drop trigger if exists enqueue_logo_delete_after_row_delete on public.logos;
drop function if exists public.enqueue_logo_delete_job();
drop table if exists public.logo_delete_jobs;
drop extension if exists pg_net;