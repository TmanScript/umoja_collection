alter table public."Swap_History"
  add column if not exists "Province" text;

update public."Swap_History"
set "Province" = case
  when lower(coalesce("Admin_Name", '')) in ('neo', 'ngoako david railo') then 'Limpopo'
  else 'Other'
end
where "Province" is null or btrim("Province") = '';

alter table public."Swap_History"
  alter column "Province" set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'swap_history_province_known'
      and conrelid = 'public."Swap_History"'::regclass
  ) then
    alter table public."Swap_History"
      add constraint swap_history_province_known
      check ("Province" in ('Gauteng', 'Limpopo', 'Other'));
  end if;
end $$;

drop policy if exists "app can insert swap history" on public."Swap_History";
create policy "app can insert swap history"
on public."Swap_History"
for insert
to anon, authenticated
with check (
  "Customer_ID" is not null
  and "Customer_Name" is not null
  and admin_id is not null
  and "Admin_Name" is not null
  and "Old_Device" is not null
  and "New_Device" is not null
  and "Date" is not null
  and status is not null
  and "Province" in ('Gauteng', 'Limpopo', 'Other')
  and char_length(btrim("Reason")) between 1 and 500
);

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
        when "Province" in ('Gauteng', 'Limpopo') then "Province"
        else 'Other'
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
        when "Province" in ('Gauteng', 'Limpopo') then "Province"
        else 'Other'
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
