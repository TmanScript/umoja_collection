create or replace function public.get_operational_drilldown_records(
  p_transaction_type text,
  p_month_sort_key integer,
  p_province text
)
returns table (
  transaction_type text,
  occurred_at text,
  province text,
  customer_name text,
  customer_id text,
  primary_device text,
  secondary_device text,
  reason text,
  agent text,
  status text
)
language sql
security definer
set search_path = public
as $$
  with normalized_input as (
    select
      lower(btrim(coalesce(p_transaction_type, ''))) as transaction_type,
      p_month_sort_key as month_sort_key,
      case
        when p_province = 'Gauteng' then 'Gauteng'
        when p_province = 'Limpopo' then 'Limpopo'
        else null
      end as province
  ),
  swap_rows as (
    select
      'swap'::text as transaction_type,
      sh."Date"::text as occurred_at,
      case
        when sh."Province" = 'Limpopo' then 'Limpopo'
        else 'Gauteng'
      end as province,
      sh."Customer_Name"::text as customer_name,
      sh."Customer_ID"::text as customer_id,
      sh."Old_Device"::text as primary_device,
      sh."New_Device"::text as secondary_device,
      sh."Reason"::text as reason,
      sh."Admin_Name"::text as agent,
      sh.status::text as status
    from public."Swap_History" sh
    cross join normalized_input ni
    where ni.transaction_type = 'swap'
      and ni.province is not null
      and lower(coalesce(sh.status, '')) = 'success'
      and sh."Date" is not null
      and ((extract(year from sh."Date"::timestamptz)::int * 100) + (extract(month from sh."Date"::timestamptz)::int - 1)) = ni.month_sort_key
      and (
        case
          when sh."Province" = 'Limpopo' then 'Limpopo'
          else 'Gauteng'
        end
      ) = ni.province
  ),
  collection_rows as (
    select
      'collection'::text as transaction_type,
      ch."Date"::text as occurred_at,
      case
        when ch."Province" = 'Limpopo' then 'Limpopo'
        else 'Gauteng'
      end as province,
      ch."Full Name"::text as customer_name,
      ch."Customer ID"::text as customer_id,
      ch."Barcode"::text as primary_device,
      ch."SIM"::text as secondary_device,
      ch."Reason"::text as reason,
      ch."Agent"::text as agent,
      'success'::text as status
    from public."Collection_History" ch
    cross join normalized_input ni
    where ni.transaction_type = 'collection'
      and ni.province is not null
      and ch."Date" is not null
      and ((extract(year from ch."Date"::timestamptz)::int * 100) + (extract(month from ch."Date"::timestamptz)::int - 1)) = ni.month_sort_key
      and (
        case
          when ch."Province" = 'Limpopo' then 'Limpopo'
          else 'Gauteng'
        end
      ) = ni.province
  )
  select
    transaction_type,
    occurred_at,
    province,
    customer_name,
    customer_id,
    primary_device,
    secondary_device,
    reason,
    agent,
    status
  from swap_rows
  union all
  select
    transaction_type,
    occurred_at,
    province,
    customer_name,
    customer_id,
    primary_device,
    secondary_device,
    reason,
    agent,
    status
  from collection_rows
  order by occurred_at desc, customer_name nulls last
$$;

revoke all on function public.get_operational_drilldown_records(text, integer, text) from public;
grant execute on function public.get_operational_drilldown_records(text, integer, text) to anon;
grant execute on function public.get_operational_drilldown_records(text, integer, text) to authenticated;
