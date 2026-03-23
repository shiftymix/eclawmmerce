-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Use cases (seed data)
create table use_cases (
  id text primary key,
  name text not null,
  description text not null,
  color text not null,
  icon text not null
);

insert into use_cases values
  ('business-in-a-box', 'Business in a Box', 'Complete tool stacks for launching specific niche businesses', '#e8392e', '📦'),
  ('ecom-ops', 'Ecom Ops', 'Operations tooling for marketplaces and DTC brands', '#d4943a', '🛒'),
  ('paid-media', 'Agentic Paid Media', 'AI-driven advertising on Meta, Amazon, and Google PPC', '#4a9eff', '📢'),
  ('workflow-automations', 'Workflow Automations', 'Proactive agentic workflow automation', '#43c59e', '⚡'),
  ('api-integration', 'API Discovery & Integration', 'Discovering and integrating APIs into automated workflows', '#9b59b6', '🔌'),
  ('short-form-video', 'Short-Form Video', 'Agentic short-form video creation and distribution', '#ff6b6b', '🎬'),
  ('ugc-creation', 'UGC Creation', 'Automated user-generated content creation', '#ffd93d', '🎨'),
  ('demand-discovery', 'Demand Discovery', 'Organic demand discovery and trend monitoring', '#6bcb77', '📈'),
  ('work-docs-external', 'External Documentation', 'Agentic work documentation for external-facing content', '#ff9f43', '📄'),
  ('work-docs-internal', 'Internal SOPs', 'Agentic documentation for internal SOP creation', '#a8a8b3', '📋');

-- Tools table
create table tools (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  description text not null,
  url text not null unique,
  logo_url text,
  github_url text,
  is_open_source boolean default false,
  pricing_model text, -- 'free', 'freemium', 'paid', 'open-source'
  status text default 'active', -- 'active', 'deprecated', 'pending'
  discovered_at timestamptz default now(),
  submitted_by_user_id uuid references auth.users(id),
  discovery_source text, -- 'auto', 'user_submission'
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- LLM assessments per tool per use case
create table llm_assessments (
  id uuid primary key default uuid_generate_v4(),
  tool_id uuid references tools(id) on delete cascade not null,
  use_case_id text references use_cases(id) not null,
  score numeric(3,1) check (score >= 0 and score <= 10),
  reasoning text not null,
  assessed_at timestamptz default now(),
  model_version text default 'claude-haiku-4-5',
  unique(tool_id, use_case_id)
);

-- Community ratings (auth required)
create table community_ratings (
  id uuid primary key default uuid_generate_v4(),
  tool_id uuid references tools(id) on delete cascade not null,
  user_id uuid references auth.users(id) not null,
  use_case_id text references use_cases(id) not null,
  score integer check (score >= 1 and score <= 10) not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(tool_id, user_id, use_case_id)
);

-- Comments (auth required)
create table comments (
  id uuid primary key default uuid_generate_v4(),
  tool_id uuid references tools(id) on delete cascade not null,
  user_id uuid references auth.users(id) not null,
  content text not null,
  created_at timestamptz default now()
);

-- Discovery run log
create table discovery_runs (
  id uuid primary key default uuid_generate_v4(),
  run_at timestamptz default now(),
  tools_found integer default 0,
  tools_added integer default 0,
  status text default 'success', -- 'success', 'error'
  error_message text,
  model_used text
);

-- Computed avg scores view
create view tool_scores as
select
  t.id as tool_id,
  t.name,
  uc.id as use_case_id,
  uc.name as use_case_name,
  la.score as llm_score,
  la.reasoning as llm_reasoning,
  round(avg(cr.score), 1) as community_score,
  count(cr.id) as community_rating_count
from tools t
cross join use_cases uc
left join llm_assessments la on la.tool_id = t.id and la.use_case_id = uc.id
left join community_ratings cr on cr.tool_id = t.id and cr.use_case_id = uc.id
group by t.id, t.name, uc.id, uc.name, la.score, la.reasoning;

-- RLS Policies
alter table tools enable row level security;
alter table llm_assessments enable row level security;
alter table community_ratings enable row level security;
alter table comments enable row level security;

-- Tools: anyone can read
create policy "Tools are publicly readable" on tools for select using (true);
create policy "Authenticated users can insert tools" on tools for insert with check (auth.uid() is not null);

-- LLM assessments: anyone can read, only service role can write
create policy "LLM assessments are publicly readable" on llm_assessments for select using (true);

-- Community ratings: anyone can read, auth users can write their own
create policy "Ratings are publicly readable" on community_ratings for select using (true);
create policy "Users can insert own ratings" on community_ratings for insert with check (auth.uid() = user_id);
create policy "Users can update own ratings" on community_ratings for update using (auth.uid() = user_id);

-- Comments: anyone can read, auth users can write
create policy "Comments are publicly readable" on comments for select using (true);
create policy "Authenticated users can comment" on comments for insert with check (auth.uid() = user_id);
