drop policy if exists collabspace_boards_public on public.collabspace_boards;
drop policy if exists collabspace_elements_public on public.collabspace_elements;

alter table public.collabspace_boards enable row level security;
alter table public.collabspace_elements enable row level security;

create policy collabspace_boards_select on public.collabspace_boards
  for select to anon, authenticated using (true);

create policy collabspace_boards_insert on public.collabspace_boards
  for insert to anon, authenticated with check (true);

create policy collabspace_boards_update on public.collabspace_boards
  for update to anon, authenticated using (true) with check (true);

create policy collabspace_elements_select on public.collabspace_elements
  for select to anon, authenticated using (true);

create policy collabspace_elements_insert on public.collabspace_elements
  for insert to anon, authenticated with check (true);

create policy collabspace_elements_update on public.collabspace_elements
  for update to anon, authenticated using (true) with check (true);

create policy collabspace_elements_delete on public.collabspace_elements
  for delete to anon, authenticated using (true);

revoke delete, truncate, references, trigger on public.collabspace_boards from anon, authenticated;
revoke truncate, references, trigger on public.collabspace_elements from anon, authenticated;

create table if not exists public.collabspace_board_tokens (
  board_id text primary key references public.collabspace_boards(id) on delete cascade,
  token uuid not null,
  created_at timestamptz not null default now()
);

alter table public.collabspace_board_tokens enable row level security;
revoke all on public.collabspace_board_tokens from public, anon, authenticated;

create or replace function public.create_collabspace_board(
  p_id text,
  p_name text,
  p_token uuid
) returns setof public.collabspace_boards
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.collabspace_boards (id, name) values (p_id, p_name);
  insert into public.collabspace_board_tokens (board_id, token) values (p_id, p_token);
  return query select * from public.collabspace_boards where id = p_id;
end;
$$;

create or replace function public.delete_collabspace_board(
  p_id text,
  p_token uuid
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  removed integer;
begin
  delete from public.collabspace_boards b
  using public.collabspace_board_tokens t
  where b.id = p_id and t.board_id = b.id and t.token = p_token;
  get diagnostics removed = row_count;
  return removed > 0;
end;
$$;

revoke all on function public.create_collabspace_board(text, text, uuid) from public;
revoke all on function public.delete_collabspace_board(text, uuid) from public;
grant execute on function public.create_collabspace_board(text, text, uuid) to anon, authenticated;
grant execute on function public.delete_collabspace_board(text, uuid) to anon, authenticated;

notify pgrst, 'reload schema';
