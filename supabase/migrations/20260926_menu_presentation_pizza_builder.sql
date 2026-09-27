-- Incremental migration for MenuFlow presentation and pizza builder.
-- Run after 20260926_admin_allowlist_product_sizes.sql.
-- Do not run schema.sql again on an existing project.

alter table public.restaurants add column if not exists public_menu_url text;
alter table public.product_sizes add column if not exists size_key text;

update public.product_sizes
set size_key = upper(regexp_replace(split_part(name, ' ', 1), '[^a-zA-Z0-9]', '', 'g'))
where size_key is null or trim(size_key) = '';

alter table public.product_sizes alter column size_key set not null;
alter table public.product_sizes add constraint product_sizes_size_key_not_blank check (length(trim(size_key)) > 0) not valid;
alter table public.product_sizes validate constraint product_sizes_size_key_not_blank;

create table if not exists public.pizza_border_options (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  name text not null,
  sort_order integer not null default 0,
  is_available boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pizza_border_options_name_unique unique (restaurant_id, name),
  constraint pizza_border_options_id_restaurant_unique unique (id, restaurant_id),
  constraint pizza_border_options_name_not_blank check (length(trim(name)) > 0)
);

create table if not exists public.pizza_border_prices (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  border_option_id uuid not null references public.pizza_border_options(id) on delete cascade,
  size_key text not null,
  price_delta numeric(10,2) not null default 0 check (price_delta >= 0),
  is_available boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pizza_border_prices_unique unique (border_option_id, size_key),
  constraint pizza_border_prices_size_key_not_blank check (length(trim(size_key)) > 0),
  constraint pizza_border_prices_restaurant_match foreign key (border_option_id, restaurant_id)
    references public.pizza_border_options(id, restaurant_id)
    on delete cascade
);

create index if not exists pizza_border_options_restaurant_id_idx on public.pizza_border_options(restaurant_id);
create index if not exists pizza_border_prices_restaurant_id_idx on public.pizza_border_prices(restaurant_id);
create index if not exists pizza_border_prices_option_id_idx on public.pizza_border_prices(border_option_id);

drop trigger if exists pizza_border_options_set_updated_at on public.pizza_border_options;
create trigger pizza_border_options_set_updated_at
before update on public.pizza_border_options
for each row execute function public.set_updated_at();

drop trigger if exists pizza_border_prices_set_updated_at on public.pizza_border_prices;
create trigger pizza_border_prices_set_updated_at
before update on public.pizza_border_prices
for each row execute function public.set_updated_at();

alter table public.pizza_border_options enable row level security;
alter table public.pizza_border_prices enable row level security;

drop policy if exists "pizza border options public read available" on public.pizza_border_options;
drop policy if exists "pizza border options admin read all" on public.pizza_border_options;
drop policy if exists "pizza border options admin insert" on public.pizza_border_options;
drop policy if exists "pizza border options admin update" on public.pizza_border_options;
drop policy if exists "pizza border options admin delete" on public.pizza_border_options;

create policy "pizza border options public read available"
on public.pizza_border_options for select
to anon, authenticated
using (is_available = true);

create policy "pizza border options admin read all"
on public.pizza_border_options for select
to authenticated
using (public.is_menuflow_admin());

create policy "pizza border options admin insert"
on public.pizza_border_options for insert
to authenticated
with check (public.is_menuflow_admin());

create policy "pizza border options admin update"
on public.pizza_border_options for update
to authenticated
using (public.is_menuflow_admin())
with check (public.is_menuflow_admin());

create policy "pizza border options admin delete"
on public.pizza_border_options for delete
to authenticated
using (public.is_menuflow_admin());

drop policy if exists "pizza border prices public read available" on public.pizza_border_prices;
drop policy if exists "pizza border prices admin read all" on public.pizza_border_prices;
drop policy if exists "pizza border prices admin insert" on public.pizza_border_prices;
drop policy if exists "pizza border prices admin update" on public.pizza_border_prices;
drop policy if exists "pizza border prices admin delete" on public.pizza_border_prices;

create policy "pizza border prices public read available"
on public.pizza_border_prices for select
to anon, authenticated
using (
  is_available = true
  and exists (
    select 1 from public.pizza_border_options pbo
    where pbo.id = pizza_border_prices.border_option_id
      and pbo.restaurant_id = pizza_border_prices.restaurant_id
      and pbo.is_available = true
  )
);

create policy "pizza border prices admin read all"
on public.pizza_border_prices for select
to authenticated
using (public.is_menuflow_admin());

create policy "pizza border prices admin insert"
on public.pizza_border_prices for insert
to authenticated
with check (
  public.is_menuflow_admin()
  and exists (
    select 1 from public.pizza_border_options pbo
    where pbo.id = pizza_border_prices.border_option_id
      and pbo.restaurant_id = pizza_border_prices.restaurant_id
  )
);

create policy "pizza border prices admin update"
on public.pizza_border_prices for update
to authenticated
using (public.is_menuflow_admin())
with check (
  public.is_menuflow_admin()
  and exists (
    select 1 from public.pizza_border_options pbo
    where pbo.id = pizza_border_prices.border_option_id
      and pbo.restaurant_id = pizza_border_prices.restaurant_id
  )
);

create policy "pizza border prices admin delete"
on public.pizza_border_prices for delete
to authenticated
using (public.is_menuflow_admin());

create or replace function public.replace_product_sizes(target_product_id uuid, new_sizes jsonb)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  product_row public.products%rowtype;
  item jsonb;
  item_name text;
  item_size_key text;
  item_price numeric(10,2);
  item_sort_order integer;
  item_is_available boolean;
begin
  if not public.is_menuflow_admin() then
    raise exception 'Acesso administrativo negado.';
  end if;

  select * into product_row
  from public.products
  where id = target_product_id
  for update;

  if product_row.id is null then
    raise exception 'Produto nao encontrado.';
  end if;

  if jsonb_typeof(coalesce(new_sizes, '[]'::jsonb)) <> 'array' then
    raise exception 'Lista de tamanhos invalida.';
  end if;

  for item in select * from jsonb_array_elements(coalesce(new_sizes, '[]'::jsonb)) loop
    item_name := nullif(trim(coalesce(item->>'name', '')), '');
    item_size_key := upper(regexp_replace(nullif(trim(coalesce(item->>'sizeKey', item->>'size_key', item_name, '')), ''), '[^a-zA-Z0-9]', '', 'g'));
    item_price := nullif(item->>'price', '')::numeric;
    item_sort_order := coalesce(nullif(item->>'sortOrder', '')::integer, nullif(item->>'sort_order', '')::integer, 0);
    item_is_available := coalesce((item->>'isAvailable')::boolean, (item->>'is_available')::boolean, true);

    if item_name is null then
      raise exception 'Tamanho sem nome.';
    end if;
    if item_size_key is null or length(item_size_key) = 0 then
      raise exception 'Tamanho % sem chave.', item_name;
    end if;
    if item_price is null or item_price <= 0 then
      raise exception 'Tamanho % sem preco valido.', item_name;
    end if;
  end loop;

  delete from public.product_sizes where product_id = target_product_id;

  for item in select * from jsonb_array_elements(coalesce(new_sizes, '[]'::jsonb)) loop
    item_name := trim(item->>'name');
    item_size_key := upper(regexp_replace(coalesce(nullif(trim(item->>'sizeKey'), ''), nullif(trim(item->>'size_key'), ''), item_name), '[^a-zA-Z0-9]', '', 'g'));
    item_price := (item->>'price')::numeric;
    item_sort_order := coalesce(nullif(item->>'sortOrder', '')::integer, nullif(item->>'sort_order', '')::integer, 0);
    item_is_available := coalesce((item->>'isAvailable')::boolean, (item->>'is_available')::boolean, true);

    insert into public.product_sizes (restaurant_id, product_id, name, size_key, price, sort_order, is_available)
    values (product_row.restaurant_id, target_product_id, item_name, item_size_key, item_price, item_sort_order, item_is_available);
  end loop;
end;
$$;

revoke all on function public.replace_product_sizes(uuid, jsonb) from public;
grant execute on function public.replace_product_sizes(uuid, jsonb) to authenticated;

grant select on public.pizza_border_options to anon, authenticated;
grant select on public.pizza_border_prices to anon, authenticated;
grant insert, update, delete on public.pizza_border_options to authenticated;
grant insert, update, delete on public.pizza_border_prices to authenticated;
grant execute on function public.replace_product_sizes(uuid, jsonb) to authenticated;

