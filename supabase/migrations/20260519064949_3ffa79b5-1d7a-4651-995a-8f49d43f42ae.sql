
insert into storage.buckets (id, name, public) values ('menu-images', 'menu-images', true)
on conflict (id) do nothing;

create policy "menu_images_public_read"
on storage.objects for select
using (bucket_id = 'menu-images');

create policy "menu_images_admin_insert"
on storage.objects for insert
with check (bucket_id = 'menu-images' and public.has_role(auth.uid(), 'admin'));

create policy "menu_images_admin_update"
on storage.objects for update
using (bucket_id = 'menu-images' and public.has_role(auth.uid(), 'admin'));

create policy "menu_images_admin_delete"
on storage.objects for delete
using (bucket_id = 'menu-images' and public.has_role(auth.uid(), 'admin'));

-- Allow admins to delete menu items and categories (currently only ALL via admin_write covers this, but verify)
-- menu_items_admin_write uses FOR ALL so delete is already covered. No change needed.
