update public."Swap_History"
set "Province" = 'Gauteng'
where "Province" is null
  or btrim("Province") = ''
  or "Province" = 'Other';

create or replace function public.get_operational_monthly_stats()
returns table (
  transaction_type text,
  month_label text,
  sort_key integer,
  province text,
  total integer
)
language sql
security definer
set search_path = public
as $$
  with swap_rows as (
    select
      'swap'::text as transaction_type,
      to_char(date_trunc('month', "Date"::timestamptz), 'Mon YYYY') as month_label,
      ((extract(year from "Date"::timestamptz)::int * 100) + (extract(month from "Date"::timestamptz)::int - 1)) as sort_key,
      case
        when "Province" = 'Limpopo' then 'Limpopo'
        else 'Gauteng'
      end as province,
      count(*)::int as total
    from public."Swap_History"
    where lower(coalesce(status, '')) = 'success'
      and "Date" is not null
    group by 1, 2, 3, 4
  ),
  collection_rows as (
    select
      'collection'::text as transaction_type,
      to_char(date_trunc('month', "Date"::timestamptz), 'Mon YYYY') as month_label,
      ((extract(year from "Date"::timestamptz)::int * 100) + (extract(month from "Date"::timestamptz)::int - 1)) as sort_key,
      case
        when "Province" = 'Limpopo' then 'Limpopo'
        else 'Gauteng'
      end as province,
      count(*)::int as total
    from public."Collection_History"
    where "Date" is not null
    group by 1, 2, 3, 4
  )
  select * from swap_rows
  union all
  select * from collection_rows
  order by sort_key, transaction_type, province
$$;

revoke all on function public.get_operational_monthly_stats() from public;
grant execute on function public.get_operational_monthly_stats() to anon;
grant execute on function public.get_operational_monthly_stats() to authenticated;
