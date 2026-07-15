create or replace function public.verify_admin_login(
  p_phone text,
  p_password text
)
returns table (
  admin_id integer,
  name text
)
language sql
security definer
set search_path = public
as $$
  select
    a.admin_id,
    coalesce(to_jsonb(a)->>'name', to_jsonb(a)->>'Name', 'Admin')::text as name
  from public."Admin" a
  where a.phone = p_phone
    and a.password = p_password
  limit 1
$$;

revoke all on function public.verify_admin_login(text, text) from public;
grant execute on function public.verify_admin_login(text, text) to anon;
grant execute on function public.verify_admin_login(text, text) to authenticated;
