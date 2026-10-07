create table public.matches (
    match_id bigint primary key,
    match_date date,
    home_team text not null default 'Unknown',
    away_team text not null default 'Unknown',
    home_team_id bigint,
    away_team_id bigint,
    home_score integer not null default 0,
    away_score integer not null default 0,
    has_360 boolean not null default false
);

create table public.events (
    event_id uuid primary key,
    match_id bigint not null references public.matches (match_id) on delete cascade,
    event_index integer not null,
    event_type text,
    timestamp text,
    period integer,
    player_id bigint,
    player_name text,
    team_id bigint,
    team_name text,
    location jsonb,
    pass_end_location jsonb,
    recipient_id bigint,
    recipient_name text,
    shot_outcome text,
    shot_xg double precision,
    pass_xg double precision,
    goal_assist boolean not null default false,
    card_type text,
    has_360 boolean not null default false
);

create index events_match_index_idx on public.events (match_id, event_index);
create index events_player_idx on public.events (player_id) where player_id is not null;
create index events_type_idx on public.events (match_id, event_type);

create table public.freeze_frames (
    event_id uuid primary key references public.events (event_id) on delete cascade,
    match_id bigint not null references public.matches (match_id) on delete cascade,
    timestamp text,
    period integer,
    ball_location jsonb,
    players jsonb not null
);

create index freeze_frames_match_idx on public.freeze_frames (match_id);

create view public.player_directory
with (security_invoker = true) as
select distinct player_id, player_name, team_id
from public.events
where player_id is not null;

alter table public.matches enable row level security;
alter table public.events enable row level security;
alter table public.freeze_frames enable row level security;

create policy "Public can read match data"
    on public.matches for select to anon, authenticated using (true);
create policy "Public can read event data"
    on public.events for select to anon, authenticated using (true);
create policy "Public can read freeze frames"
    on public.freeze_frames for select to anon, authenticated using (true);

revoke all on public.matches, public.events, public.freeze_frames, public.player_directory
    from anon, authenticated;
grant select on public.matches, public.events, public.freeze_frames, public.player_directory
    to anon, authenticated;
