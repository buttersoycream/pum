create or replace function public.handle_new_user_couple()
returns trigger language plpgsql security definer set search_path = public as $$
declare new_couple_id uuid;
begin
  insert into public.couples (created_by) values (new.id) returning id into new_couple_id;
  insert into public.couple_members (couple_id, user_id) values (new_couple_id, new.id);
  return new;
end; $$;

create trigger on_auth_user_created_couple
  after insert on auth.users
  for each row execute function public.handle_new_user_couple();
