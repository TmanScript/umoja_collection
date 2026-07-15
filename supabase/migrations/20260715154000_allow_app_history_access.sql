grant select, insert on public."Swap_History" to anon, authenticated;
grant select, insert on public."Collection_History" to anon, authenticated;

drop policy if exists "app can read swap history" on public."Swap_History";
create policy "app can read swap history"
on public."Swap_History"
for select
to anon, authenticated
using (true);

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
  and char_length(btrim("Reason")) between 1 and 500
);

drop policy if exists "app can read collection history" on public."Collection_History";
create policy "app can read collection history"
on public."Collection_History"
for select
to anon, authenticated
using (true);

drop policy if exists "app can insert collection history" on public."Collection_History";
create policy "app can insert collection history"
on public."Collection_History"
for insert
to anon, authenticated
with check (
  "Customer ID" is not null
  and "Full Name" is not null
  and "Agent" is not null
  and "Province" is not null
  and "Date" is not null
  and char_length(btrim("Reason")) between 1 and 500
  and (
    coalesce(btrim("Barcode"), '') <> ''
    or coalesce(btrim("SIM"), '') <> ''
  )
);
