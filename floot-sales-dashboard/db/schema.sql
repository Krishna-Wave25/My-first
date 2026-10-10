-- Postgres schema for the Krishna Agency sales dashboard (as run in Floot).
CREATE TYPE deal_stage AS ENUM ('discovery', 'proposal', 'negotiation', 'contract', 'won', 'lost');
CREATE TYPE lead_status AS ENUM ('new', 'contacted', 'qualified', 'unqualified');
CREATE TYPE lead_source AS ENUM ('referral', 'website', 'linkedin', 'event', 'outbound');

CREATE TABLE monthly_revenue (
  month date PRIMARY KEY,
  revenue integer NOT NULL DEFAULT 0,
  target integer NOT NULL DEFAULT 0
);

CREATE TABLE deals (
  id serial PRIMARY KEY,
  name text NOT NULL,
  client text NOT NULL,
  value integer NOT NULL,
  stage deal_stage NOT NULL DEFAULT 'discovery',
  owner text NOT NULL,
  expected_close date,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE leads (
  id serial PRIMARY KEY,
  name text NOT NULL,
  company text NOT NULL,
  email text,
  source lead_source NOT NULL,
  status lead_status NOT NULL DEFAULT 'new',
  est_value integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX leads_created_at_idx ON leads (created_at DESC);
CREATE INDEX deals_stage_idx ON deals (stage);
