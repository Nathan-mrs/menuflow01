-- Incremental migration for MenuFlow first sellable version.
-- Run after the previous schema.sql has already been applied.
-- It restricts administration to explicit MenuFlow admins and adds product sizes.

create extension if not exists pgcrypto;

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;

drop policy if exists "admin users can read themselves" on public.admin_users;
create policy "admin users can read themselves"
on public.admin_users for select
to authenticated
using (user_id = auth.uid());

create or replace function public.is_menuflow_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_users au
    where au.user_id = auth.uid()
  );
$$;

revoke all on function public.is_menuflow_admin() from public;
grant execute on function public.is_menuflow_admin() to authenticated;

create unique index if not exists products_id_restaurant_id_key on public.products(id, restaurant_id);

create table if not exists public.product_sizes (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  name text not null,
  price numeric(10,2) not null check (price > 0),
  sort_order integer not null default 0,
  is_available boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint product_sizes_product_restaurant_unique unique (product_id, name),
  constraint product_sizes_product_restaurant_match
    foreign key (product_id, restaurant_id)
    references public.products(id, restaurant_id)
    on delete cascade
);

create index if not exists product_sizes_restaurant_id_idx on public.product_sizes(restaurant_id);
create index if not exists product_sizes_product_id_idx on public.product_sizes(product_id);

drop trigger if exists product_sizes_set_updated_at on public.product_sizes;
create trigger product_sizes_set_updated_at
before update on public.product_sizes
for each row execute function public.set_updated_at();

alter table public.product_sizes enable row level security;

-- Create review tables here too, so this migration works when only the original schema was applied.
create table if not exists public.review_invites (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  token text not null unique,
  order_reference text,
  expires_at timestamptz not null default (now() + interval '30 days'),
  used_at timestamptz,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null
);

create table if not exists public.product_reviews (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  invite_id uuid not null unique references public.review_invites(id) on delete restrict,
  rating integer not null check (rating between 1 and 5),
  comment text,
  display_name text,
  verified_purchase boolean not null default true,
  is_public boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.review_invites add column if not exists order_reference text;
alter table public.review_invites add column if not exists expires_at timestamptz not null default (now() + interval '30 days');
alter table public.review_invites add column if not exists used_at timestamptz;
alter table public.review_invites add column if not exists created_by uuid references auth.users(id) on delete set null;
alter table public.product_reviews add column if not exists verified_purchase boolean not null default true;
alter table public.product_reviews add column if not exists is_public boolean not null default true;
alter table public.product_reviews add column if not exists updated_at timestamptz not null default now();

create index if not exists review_invites_restaurant_id_idx on public.review_invites(restaurant_id);
create index if not exists review_invites_product_id_idx on public.review_invites(product_id);
create index if not exists review_invites_token_idx on public.review_invites(token);
create index if not exists product_reviews_restaurant_id_idx on public.product_reviews(restaurant_id);
create index if not exists product_reviews_product_id_idx on public.product_reviews(product_id);

drop trigger if exists product_reviews_set_updated_at on public.product_reviews;
create trigger product_reviews_set_updated_at
before update on public.product_reviews
for each row execute function public.set_updated_at();

alter table public.review_invites enable row level security;
alter table public.product_reviews enable row level security;
-- Replace owner-based administration with explicit developer/admin allowlist.
drop policy if exists "restaurants owner insert" on public.restaurants;
drop policy if exists "restaurants owner update" on public.restaurants;
drop policy if exists "restaurants owner delete" on public.restaurants;
drop policy if exists "restaurants admin insert" on public.restaurants;
drop policy if exists "restaurants admin update" on public.restaurants;
drop policy if exists "restaurants admin delete" on public.restaurants;
create policy "restaurants admin insert" on public.restaurants for insert to authenticated with check (public.is_menuflow_admin());
create policy "restaurants admin update" on public.restaurants for update to authenticated using (public.is_menuflow_admin()) with check (public.is_menuflow_admin());
create policy "restaurants admin delete" on public.restaurants for delete to authenticated using (public.is_menuflow_admin());

drop policy if exists "categories owner read all" on public.categories;
drop policy if exists "categories owner insert" on public.categories;
drop policy if exists "categories owner update" on public.categories;
drop policy if exists "categories owner delete" on public.categories;
drop policy if exists "categories admin read all" on public.categories;
drop policy if exists "categories admin insert" on public.categories;
drop policy if exists "categories admin update" on public.categories;
drop policy if exists "categories admin delete" on public.categories;
create policy "categories admin read all" on public.categories for select to authenticated using (public.is_menuflow_admin());
create policy "categories admin insert" on public.categories for insert to authenticated with check (public.is_menuflow_admin());
create policy "categories admin update" on public.categories for update to authenticated using (public.is_menuflow_admin()) with check (public.is_menuflow_admin());
create policy "categories admin delete" on public.categories for delete to authenticated using (public.is_menuflow_admin());

drop policy if exists "products owner read all" on public.products;
drop policy if exists "products owner insert" on public.products;
drop policy if exists "products owner update" on public.products;
drop policy if exists "products owner delete" on public.products;
drop policy if exists "products admin read all" on public.products;
drop policy if exists "products admin insert" on public.products;
drop policy if exists "products admin update" on public.products;
drop policy if exists "products admin delete" on public.products;
create policy "products admin read all" on public.products for select to authenticated using (public.is_menuflow_admin());
create policy "products admin insert" on public.products for insert to authenticated with check (
  public.is_menuflow_admin()
  and (
    category_id is null
    or exists (
      select 1 from public.categories c
      where c.id = products.category_id
        and c.restaurant_id = products.restaurant_id
    )
  )
);
create policy "products admin update" on public.products for update to authenticated using (public.is_menuflow_admin()) with check (
  public.is_menuflow_admin()
  and (
    category_id is null
    or exists (
      select 1 from public.categories c
      where c.id = products.category_id
        and c.restaurant_id = products.restaurant_id
    )
  )
);
create policy "products admin delete" on public.products for delete to authenticated using (public.is_menuflow_admin());

-- Product sizes: public reads available sizes for active products; only admins write.
drop policy if exists "product sizes public read available" on public.product_sizes;
drop policy if exists "product sizes admin read all" on public.product_sizes;
drop policy if exists "product sizes admin insert" on public.product_sizes;
drop policy if exists "product sizes admin update" on public.product_sizes;
drop policy if exists "product sizes admin delete" on public.product_sizes;
create policy "product sizes public read available"
on public.product_sizes for select
to anon, authenticated
using (
  is_available = true
  and exists (
    select 1 from public.products p
    where p.id = product_sizes.product_id
      and p.restaurant_id = product_sizes.restaurant_id
      and p.status = 'active'
  )
);
create policy "product sizes admin read all" on public.product_sizes for select to authenticated using (public.is_menuflow_admin());
create policy "product sizes admin insert" on public.product_sizes for insert to authenticated with check (
  public.is_menuflow_admin()
  and exists (
    select 1 from public.products p
    where p.id = product_sizes.product_id
      and p.restaurant_id = product_sizes.restaurant_id
  )
);
create policy "product sizes admin update" on public.product_sizes for update to authenticated using (public.is_menuflow_admin()) with check (
  public.is_menuflow_admin()
  and exists (
    select 1 from public.products p
    where p.id = product_sizes.product_id
      and p.restaurant_id = product_sizes.restaurant_id
  )
);
create policy "product sizes admin delete" on public.product_sizes for delete to authenticated using (public.is_menuflow_admin());

-- Invites and reviews: no public token listing; only admins list/manage. Public submits only through RPC.
drop policy if exists "review invites owner read" on public.review_invites;
drop policy if exists "review invites owner insert" on public.review_invites;
drop policy if exists "review invites owner update" on public.review_invites;
drop policy if exists "review invites owner delete" on public.review_invites;
drop policy if exists "review invites admin read" on public.review_invites;
drop policy if exists "review invites admin insert" on public.review_invites;
drop policy if exists "review invites admin update" on public.review_invites;
drop policy if exists "review invites admin delete" on public.review_invites;
create policy "review invites admin read" on public.review_invites for select to authenticated using (public.is_menuflow_admin());
create policy "review invites admin insert" on public.review_invites for insert to authenticated with check (
  public.is_menuflow_admin()
  and exists (
    select 1 from public.products p
    where p.id = review_invites.product_id
      and p.restaurant_id = review_invites.restaurant_id
  )
);
create policy "review invites admin update" on public.review_invites for update to authenticated using (public.is_menuflow_admin()) with check (public.is_menuflow_admin());
create policy "review invites admin delete" on public.review_invites for delete to authenticated using (public.is_menuflow_admin());

drop policy if exists "product reviews public read" on public.product_reviews;
create policy "product reviews public read"
on public.product_reviews for select
to anon, authenticated
using (is_public = true);
drop policy if exists "product reviews owner read all" on public.product_reviews;
drop policy if exists "product reviews owner update" on public.product_reviews;
drop policy if exists "product reviews admin read all" on public.product_reviews;
drop policy if exists "product reviews admin update" on public.product_reviews;
create policy "product reviews admin read all" on public.product_reviews for select to authenticated using (public.is_menuflow_admin());
create policy "product reviews admin update" on public.product_reviews for update to authenticated using (public.is_menuflow_admin()) with check (public.is_menuflow_admin());

-- Storage: public image reads; only admins can write under a restaurant UUID folder.
drop policy if exists "menu images owner insert" on storage.objects;
drop policy if exists "menu images owner update" on storage.objects;
drop policy if exists "menu images owner delete" on storage.objects;
drop policy if exists "menu images admin insert" on storage.objects;
drop policy if exists "menu images admin update" on storage.objects;
drop policy if exists "menu images admin delete" on storage.objects;
create policy "menu images admin insert" on storage.objects for insert to authenticated with check (
  bucket_id = 'menu-images'
  and public.is_menuflow_admin()
  and exists (select 1 from public.restaurants r where r.id::text = (storage.foldername(name))[1])
);
create policy "menu images admin update" on storage.objects for update to authenticated using (
  bucket_id = 'menu-images' and public.is_menuflow_admin()
) with check (
  bucket_id = 'menu-images'
  and public.is_menuflow_admin()
  and exists (select 1 from public.restaurants r where r.id::text = (storage.foldername(name))[1])
);
create policy "menu images admin delete" on storage.objects for delete to authenticated using (
  bucket_id = 'menu-images' and public.is_menuflow_admin()
);

create or replace function public.get_review_invite_status(invite_token text)
returns table (
  is_valid boolean,
  reason text,
  restaurant_name text,
  product_name text
)
language sql
security definer
set search_path = public
as $$
  select
    case
      when ri.id is null then false
      when ri.used_at is not null then false
      when ri.expires_at < now() then false
      else true
    end as is_valid,
    case
      when ri.id is null then 'not_found'
      when ri.used_at is not null then 'used'
      when ri.expires_at < now() then 'expired'
      else 'valid'
    end as reason,
    coalesce(r.name, '') as restaurant_name,
    coalesce(p.name, '') as product_name
  from (select invite_token as token) input
  left join public.review_invites ri on ri.token = input.token
  left join public.restaurants r on r.id = ri.restaurant_id
  left join public.products p on p.id = ri.product_id;
$$;

create or replace function public.submit_invited_review(
  invite_token text,
  review_rating integer,
  review_comment text default null,
  review_display_name text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  invite_row public.review_invites%rowtype;
  review_id uuid;
begin
  if review_rating < 1 or review_rating > 5 then
    raise exception 'Nota invalida.';
  end if;

  select * into invite_row
  from public.review_invites
  where token = invite_token
  for update;

  if invite_row.id is null then
    raise exception 'Convite invalido.';
  end if;

  if invite_row.used_at is not null then
    raise exception 'Este convite ja foi usado.';
  end if;

  if invite_row.expires_at < now() then
    raise exception 'Este convite expirou.';
  end if;

  insert into public.product_reviews (
    restaurant_id,
    product_id,
    invite_id,
    rating,
    comment,
    display_name,
    verified_purchase,
    is_public
  ) values (
    invite_row.restaurant_id,
    invite_row.product_id,
    invite_row.id,
    review_rating,
    nullif(trim(left(coalesce(review_comment, ''), 400)), ''),
    nullif(trim(left(coalesce(review_display_name, ''), 40)), ''),
    true,
    true
  ) returning id into review_id;

  update public.review_invites
  set used_at = now()
  where id = invite_row.id;

  return review_id;
end;
$$;

-- Data API privileges when automatic exposure is disabled.
grant usage on schema public to anon, authenticated;
grant select on public.product_sizes to anon, authenticated;
grant insert, update, delete on public.product_sizes to authenticated;
grant select on public.admin_users to authenticated;
grant select, insert, update, delete on public.review_invites to authenticated;
grant select on public.product_reviews to anon, authenticated;
grant update on public.product_reviews to authenticated;
grant execute on function public.get_review_invite_status(text) to anon, authenticated;
grant execute on function public.submit_invited_review(text, integer, text, text) to anon, authenticated;



