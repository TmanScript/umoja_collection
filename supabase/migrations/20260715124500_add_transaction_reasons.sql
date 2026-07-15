alter table public."Swap_History"
  add column if not exists "Reason" text;

update public."Swap_History"
set "Reason" = 'Not recorded'
where "Reason" is null or btrim("Reason") = '';

alter table public."Swap_History"
  alter column "Reason" set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'swap_history_reason_required'
      and conrelid = 'public."Swap_History"'::regclass
  ) then
    alter table public."Swap_History"
      add constraint swap_history_reason_required
      check (char_length(btrim("Reason")) between 1 and 500);
  end if;
end $$;

alter table public."Collection_History"
  add column if not exists "Reason" text;

update public."Collection_History"
set "Reason" = 'Not recorded'
where "Reason" is null or btrim("Reason") = '';

alter table public."Collection_History"
  alter column "Reason" set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'collection_history_reason_required'
      and conrelid = 'public."Collection_History"'::regclass
  ) then
    alter table public."Collection_History"
      add constraint collection_history_reason_required
      check (char_length(btrim("Reason")) between 1 and 500);
  end if;
end $$;
