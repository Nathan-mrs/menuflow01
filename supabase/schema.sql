-- MenuFlow Supabase schema and RLS policies
-- Run this in Supabase SQL Editor after creating the project.

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.restaurants (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  slug text not null unique,
  name text not null,
  tagline text,
  slogan text,
  hero_subtitle text,
  status text not null default 'open',
  status_text text default 'Aberto agora',
  opening_hours text,
  delivery_time text,
  phone text,
  whatsapp text,
  instagram text,
  address text,
  maps_url text,
  logo text,
  cover_image text,
  rating numeric(2,1) not null default 5.0,
  reviews_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  name text not null,
  icon text,
  description text,
  sort_order integer not null default 0,
  is_available boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  category_id uuid references public.categories(id) on delete set null,
  name text not null,
  description text,
  price numeric(10,2) not null default 0,
  image text,
  badge text,
  ingredients text[] not null default '{}',
  servings text,
  prep_time text,
  status text not null default 'active' check (status in ('active', 'paused')),
  featured boolean not null default false,
  rating numeric(2,1) not null default 5.0,
  reviews_count integer not null default 0,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists restaurants_owner_id_idx on public.restaurants(owner_id);
create index if not exists restaurants_slug_idx on public.restaurants(slug);
create index if not exists categories_restaurant_id_idx on public.categories(restaurant_id);
create index if not exists products_restaurant_id_idx on public.products(restaurant_id);
create index if not exists products_category_id_idx on public.products(category_id);

drop trigger if exists restaurants_set_updated_at on public.restaurants;
create trigger restaurants_set_updated_at
before update on public.restaurants
for each row execute function public.set_updated_at();

drop trigger if exists products_set_updated_at on public.products;
create trigger products_set_updated_at
before update on public.products
for each row execute function public.set_updated_at();

alter table public.restaurants enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;

-- Restaurants: public can read the public menu shell; only the owner can write.
drop policy if exists "restaurants public read" on public.restaurants;
create policy "restaurants public read"
on public.restaurants for select
to anon, authenticated
using (true);

drop policy if exists "restaurants owner insert" on public.restaurants;
create policy "restaurants owner insert"
on public.restaurants for insert
to authenticated
with check (owner_id = auth.uid());

drop policy if exists "restaurants owner update" on public.restaurants;
create policy "restaurants owner update"
on public.restaurants for update
to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

drop policy if exists "restaurants owner delete" on public.restaurants;
create policy "restaurants owner delete"
on public.restaurants for delete
to authenticated
using (owner_id = auth.uid());

-- Categories: public reads only visible categories; owners can manage all categories for their restaurant.
drop policy if exists "categories public read available" on public.categories;
create policy "categories public read available"
on public.categories for select
to anon, authenticated
using (is_available = true);

drop policy if exists "categories owner read all" on public.categories;
create policy "categories owner read all"
on public.categories for select
to authenticated
using (
  exists (
    select 1 from public.restaurants r
    where r.id = categories.restaurant_id
      and r.owner_id = auth.uid()
  )
);

drop policy if exists "categories owner insert" on public.categories;
create policy "categories owner insert"
on public.categories for insert
to authenticated
with check (
  exists (
    select 1 from public.restaurants r
    where r.id = categories.restaurant_id
      and r.owner_id = auth.uid()
  )
);

drop policy if exists "categories owner update" on public.categories;
create policy "categories owner update"
on public.categories for update
to authenticated
using (
  exists (
    select 1 from public.restaurants r
    where r.id = categories.restaurant_id
      and r.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.restaurants r
    where r.id = categories.restaurant_id
      and r.owner_id = auth.uid()
  )
);

drop policy if exists "categories owner delete" on public.categories;
create policy "categories owner delete"
on public.categories for delete
to authenticated
using (
  exists (
    select 1 from public.restaurants r
    where r.id = categories.restaurant_id
      and r.owner_id = auth.uid()
  )
);

-- Products: public reads only active products; owners can manage all products for their restaurant.
drop policy if exists "products public read active" on public.products;
create policy "products public read active"
on public.products for select
to anon, authenticated
using (status = 'active');

drop policy if exists "products owner read all" on public.products;
create policy "products owner read all"
on public.products for select
to authenticated
using (
  exists (
    select 1 from public.restaurants r
    where r.id = products.restaurant_id
      and r.owner_id = auth.uid()
  )
);

drop policy if exists "products owner insert" on public.products;
create policy "products owner insert"
on public.products for insert
to authenticated
with check (
  exists (
    select 1 from public.restaurants r
    where r.id = products.restaurant_id
      and r.owner_id = auth.uid()
  )
  and (
    category_id is null
    or exists (
      select 1 from public.categories c
      where c.id = products.category_id
        and c.restaurant_id = products.restaurant_id
    )
  )
);

drop policy if exists "products owner update" on public.products;
create policy "products owner update"
on public.products for update
to authenticated
using (
  exists (
    select 1 from public.restaurants r
    where r.id = products.restaurant_id
      and r.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.restaurants r
    where r.id = products.restaurant_id
      and r.owner_id = auth.uid()
  )
  and (
    category_id is null
    or exists (
      select 1 from public.categories c
      where c.id = products.category_id
        and c.restaurant_id = products.restaurant_id
    )
  )
);

drop policy if exists "products owner delete" on public.products;
create policy "products owner delete"
on public.products for delete
to authenticated
using (
  exists (
    select 1 from public.restaurants r
    where r.id = products.restaurant_id
      and r.owner_id = auth.uid()
  )
);

-- Public image bucket. The first folder must be the restaurant UUID.
insert into storage.buckets (id, name, public)
values ('menu-images', 'menu-images', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "menu images public read" on storage.objects;
create policy "menu images public read"
on storage.objects for select
to anon, authenticated
using (bucket_id = 'menu-images');

drop policy if exists "menu images owner insert" on storage.objects;
create policy "menu images owner insert"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'menu-images'
  and exists (
    select 1 from public.restaurants r
    where r.id::text = (storage.foldername(name))[1]
      and r.owner_id = auth.uid()
  )
);

drop policy if exists "menu images owner update" on storage.objects;
create policy "menu images owner update"
on storage.objects for update
to authenticated
using (
  bucket_id = 'menu-images'
  and exists (
    select 1 from public.restaurants r
    where r.id::text = (storage.foldername(name))[1]
      and r.owner_id = auth.uid()
  )
)
with check (
  bucket_id = 'menu-images'
  and exists (
    select 1 from public.restaurants r
    where r.id::text = (storage.foldername(name))[1]
      and r.owner_id = auth.uid()
  )
);

drop policy if exists "menu images owner delete" on storage.objects;
create policy "menu images owner delete"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'menu-images'
  and exists (
    select 1 from public.restaurants r
    where r.id::text = (storage.foldername(name))[1]
      and r.owner_id = auth.uid()
  )
);
-- Data API privileges. Required when "Automatically expose new tables" is disabled.
grant usage on schema public to anon, authenticated;

grant select on public.restaurants to anon, authenticated;
grant select on public.categories to anon, authenticated;
grant select on public.products to anon, authenticated;

grant insert, update, delete on public.restaurants to authenticated;
grant insert, update, delete on public.categories to authenticated;
grant insert, update, delete on public.products to authenticated;

-- Verified review invites and product reviews.
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

-- Review invites: only the authenticated restaurant owner can read or manage invites.
drop policy if exists "review invites owner read" on public.review_invites;
create policy "review invites owner read"
on public.review_invites for select
to authenticated
using (
  exists (
    select 1 from public.restaurants r
    where r.id = review_invites.restaurant_id
      and r.owner_id = auth.uid()
  )
);

drop policy if exists "review invites owner insert" on public.review_invites;
create policy "review invites owner insert"
on public.review_invites for insert
to authenticated
with check (
  exists (
    select 1 from public.restaurants r
    where r.id = review_invites.restaurant_id
      and r.owner_id = auth.uid()
  )
  and exists (
    select 1 from public.products p
    where p.id = review_invites.product_id
      and p.restaurant_id = review_invites.restaurant_id
  )
);

drop policy if exists "review invites owner update" on public.review_invites;
create policy "review invites owner update"
on public.review_invites for update
to authenticated
using (
  exists (
    select 1 from public.restaurants r
    where r.id = review_invites.restaurant_id
      and r.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.restaurants r
    where r.id = review_invites.restaurant_id
      and r.owner_id = auth.uid()
  )
);

drop policy if exists "review invites owner delete" on public.review_invites;
create policy "review invites owner delete"
on public.review_invites for delete
to authenticated
using (
  exists (
    select 1 from public.restaurants r
    where r.id = review_invites.restaurant_id
      and r.owner_id = auth.uid()
  )
);

-- Product reviews: visitors read only public reviews. Owners can read all and moderate visibility.
drop policy if exists "product reviews public read" on public.product_reviews;
create policy "product reviews public read"
on public.product_reviews for select
to anon, authenticated
using (is_public = true);

drop policy if exists "product reviews owner read all" on public.product_reviews;
create policy "product reviews owner read all"
on public.product_reviews for select
to authenticated
using (
  exists (
    select 1 from public.restaurants r
    where r.id = product_reviews.restaurant_id
      and r.owner_id = auth.uid()
  )
);

drop policy if exists "product reviews owner update" on public.product_reviews;
create policy "product reviews owner update"
on public.product_reviews for update
to authenticated
using (
  exists (
    select 1 from public.restaurants r
    where r.id = product_reviews.restaurant_id
      and r.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.restaurants r
    where r.id = product_reviews.restaurant_id
      and r.owner_id = auth.uid()
  )
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
    nullif(trim(coalesce(review_comment, '')), ''),
    nullif(trim(coalesce(review_display_name, '')), ''),
    true,
    true
  ) returning id into review_id;

  update public.review_invites
  set used_at = now()
  where id = invite_row.id;

  return review_id;
end;
$$;

-- Data API privileges for review flow.
grant select, insert, update, delete on public.review_invites to authenticated;
grant select on public.product_reviews to anon, authenticated;
grant update on public.product_reviews to authenticated;
grant execute on function public.get_review_invite_status(text) to anon, authenticated;
grant execute on function public.submit_invited_review(text, integer, text, text) to anon, authenticated;
