
-- Roles enum + table
create type public.app_role as enum ('admin', 'kitchen', 'customer');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  reward_points integer not null default 0,
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role app_role not null,
  unique (user_id, role)
);
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

-- Auto-create profile + assign customer role on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, phone)
  values (new.id, new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'phone')
  on conflict (id) do nothing;
  insert into public.user_roles (user_id, role) values (new.id, 'customer')
  on conflict do nothing;
  return new;
end;
$$;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Profiles policies
create policy "profiles_select_own" on public.profiles for select using (auth.uid() = id);
create policy "profiles_select_admin" on public.profiles for select using (public.has_role(auth.uid(),'admin'));
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id);

-- Roles policies
create policy "roles_select_self" on public.user_roles for select using (auth.uid() = user_id);
create policy "roles_admin_all" on public.user_roles for all using (public.has_role(auth.uid(),'admin'));

-- Menu categories + items
create table public.menu_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  sort_order int not null default 0
);
alter table public.menu_categories enable row level security;
create policy "menu_categories_public_read" on public.menu_categories for select using (true);
create policy "menu_categories_admin_write" on public.menu_categories for all using (public.has_role(auth.uid(),'admin'));

create table public.menu_items (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.menu_categories(id) on delete set null,
  name text not null,
  description text,
  price numeric(10,2) not null check (price >= 0),
  image_url text,
  rating numeric(2,1) default 4.5,
  is_available boolean not null default true,
  is_special boolean not null default false,
  spice_level_options text[] default array['Mild','Medium','Spicy'],
  created_at timestamptz not null default now()
);
alter table public.menu_items enable row level security;
create policy "menu_items_public_read" on public.menu_items for select using (true);
create policy "menu_items_admin_write" on public.menu_items for all using (public.has_role(auth.uid(),'admin'));

-- Orders
create type public.order_status as enum ('placed','confirmed','preparing','ready','served','completed','cancelled');
create type public.payment_method as enum ('upi','card','wallet','netbanking','cash');
create type public.payment_status as enum ('pending','paid','failed');

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  table_number int,
  status order_status not null default 'placed',
  payment_method payment_method,
  payment_status payment_status not null default 'pending',
  subtotal numeric(10,2) not null default 0,
  tax numeric(10,2) not null default 0,
  total numeric(10,2) not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.orders enable row level security;
create policy "orders_select_own" on public.orders for select using (auth.uid() = user_id);
create policy "orders_select_staff" on public.orders for select using (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'kitchen'));
create policy "orders_insert_own" on public.orders for insert with check (auth.uid() = user_id);
create policy "orders_update_staff" on public.orders for update using (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'kitchen'));

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  menu_item_id uuid references public.menu_items(id) on delete set null,
  name text not null,
  quantity int not null check (quantity > 0),
  unit_price numeric(10,2) not null,
  spice_level text,
  special_instructions text
);
alter table public.order_items enable row level security;
create policy "order_items_select_own" on public.order_items for select using (
  exists(select 1 from public.orders o where o.id = order_id and (o.user_id = auth.uid() or public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'kitchen')))
);
create policy "order_items_insert_own" on public.order_items for insert with check (
  exists(select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid())
);

-- Feedback + rewards
create table public.feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  order_id uuid references public.orders(id) on delete set null,
  food_rating int check (food_rating between 1 and 5),
  service_rating int check (service_rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now()
);
alter table public.feedback enable row level security;
create policy "feedback_select_own" on public.feedback for select using (auth.uid() = user_id);
create policy "feedback_select_admin" on public.feedback for select using (public.has_role(auth.uid(),'admin'));
create policy "feedback_insert_own" on public.feedback for insert with check (auth.uid() = user_id);

-- Award 20 points per feedback
create or replace function public.award_feedback_points()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.profiles set reward_points = reward_points + 20 where id = new.user_id;
  return new;
end;
$$;
create trigger feedback_reward
  after insert on public.feedback
  for each row execute function public.award_feedback_points();

create table public.reward_redemptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  reward_name text not null,
  points_spent int not null,
  created_at timestamptz not null default now()
);
alter table public.reward_redemptions enable row level security;
create policy "redemptions_select_own" on public.reward_redemptions for select using (auth.uid() = user_id);
create policy "redemptions_insert_own" on public.reward_redemptions for insert with check (auth.uid() = user_id);

-- Realtime for orders + items
alter publication supabase_realtime add table public.orders;
alter publication supabase_realtime add table public.order_items;

-- Seed categories + sample menu
insert into public.menu_categories (name, sort_order) values
  ('Starters',1),('Main Course',2),('Beverages',3),('Desserts',4),('Combos',5),('Chef Specials',6);

insert into public.menu_items (category_id, name, description, price, image_url, rating, is_special) values
  ((select id from public.menu_categories where name='Starters'), 'Crispy Paneer Tikka','Tandoor-fired cottage cheese with mint chutney',280,'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=800',4.7,false),
  ((select id from public.menu_categories where name='Starters'), 'Chilli Garlic Prawns','Wok-tossed prawns, scallions, sesame',420,'https://images.unsplash.com/photo-1625944525200-2b1f9aa66f47?w=800',4.6,false),
  ((select id from public.menu_categories where name='Main Course'), 'Butter Chicken','Slow-cooked tomato cream gravy, fenugreek',460,'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=800',4.9,true),
  ((select id from public.menu_categories where name='Main Course'), 'Truffle Mushroom Risotto','Arborio, parmesan, black truffle',520,'https://images.unsplash.com/photo-1476124369491-e7addf5db371?w=800',4.8,false),
  ((select id from public.menu_categories where name='Main Course'), 'Dal Makhani','Black lentils simmered overnight',260,'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=800',4.7,false),
  ((select id from public.menu_categories where name='Beverages'), 'Saffron Lassi','Yogurt, saffron, pistachio',140,'https://images.unsplash.com/photo-1505252585461-04db1eb84625?w=800',4.5,false),
  ((select id from public.menu_categories where name='Beverages'), 'Cold Brew Coffee','24-hour steeped, single origin',180,'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=800',4.4,false),
  ((select id from public.menu_categories where name='Desserts'), 'Molten Chocolate Lava','Warm valrhona center, vanilla ice cream',240,'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=800',4.9,true),
  ((select id from public.menu_categories where name='Desserts'), 'Gulab Jamun Cheesecake','Indo-fusion dessert with rose syrup',220,'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=800',4.6,false),
  ((select id from public.menu_categories where name='Combos'), 'Nova Feast for Two','2 mains + 2 drinks + 1 dessert',1099,'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800',4.8,false),
  ((select id from public.menu_categories where name='Chef Specials'), 'Lobster Thermidor','Maine lobster, gruyère, brandy cream',1450,'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=800',5.0,true);
