-- Pryntis Panel — Full Database Schema
-- PostgreSQL DDL — Increments 1-3 + KPI + Tasks + Activity

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================
-- ENUM TYPES
-- ============================================
CREATE TYPE user_role        AS ENUM ('owner', 'admin', 'manager', 'audio_engineer', 'contributor', 'viewer');
CREATE TYPE artist_status    AS ENUM ('active', 'inactive', 'archived');
CREATE TYPE project_status   AS ENUM ('draft', 'in_progress', 'completed', 'archived');
CREATE TYPE subscription_st  AS ENUM ('active', 'expired', 'suspended');
CREATE TYPE asset_file_type  AS ENUM ('beat', 'stem', 'mix', 'master', 'sample');
CREATE TYPE placement_type   AS ENUM ('sync', 'feature', 'license', 'release');
CREATE TYPE placement_status AS ENUM ('pending', 'confirmed', 'completed', 'declined');
CREATE TYPE ownership_type   AS ENUM ('writer', 'producer', 'publisher', 'master');
CREATE TYPE usage_type       AS ENUM ('stream', 'download', 'sync', 'broadcast');
CREATE TYPE task_status      AS ENUM ('open', 'in_progress', 'done', 'cancelled');
CREATE TYPE task_priority    AS ENUM ('low', 'medium', 'high', 'urgent');
CREATE TYPE expense_category AS ENUM ('advance', 'marketing', 'recording', 'distribution', 'legal', 'other');

-- ============================================
-- 1. USERS
-- ============================================
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email           VARCHAR(255) UNIQUE NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,
    first_name      VARCHAR(100) NOT NULL,
    last_name       VARCHAR(100) NOT NULL,
    role            user_role NOT NULL DEFAULT 'viewer',
    is_active       BOOLEAN NOT NULL DEFAULT true,
    token_version   INTEGER NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role  ON users(role);

-- ============================================
-- 2. ARTISTS
-- ============================================
CREATE TABLE artists (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name          VARCHAR(255) NOT NULL,
    stage_name    VARCHAR(255),
    email         VARCHAR(255),
    phone         VARCHAR(50),
    bio           TEXT,
    genre         VARCHAR(100),
    status        artist_status NOT NULL DEFAULT 'active',
    notes         TEXT,
    is_deleted    BOOLEAN NOT NULL DEFAULT false,
    deleted_at    TIMESTAMPTZ,
    updated_by    UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    search_vector tsvector
);
CREATE INDEX idx_artists_status     ON artists(status) WHERE NOT is_deleted;
CREATE INDEX idx_artists_genre      ON artists(genre)  WHERE NOT is_deleted;
CREATE INDEX idx_artists_stage_name ON artists(stage_name);
CREATE INDEX idx_artists_search     ON artists USING GIN(search_vector);
CREATE INDEX idx_artists_deleted    ON artists(is_deleted);

CREATE OR REPLACE FUNCTION artists_search_trigger() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', coalesce(NEW.stage_name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.name, '')),       'A') ||
    setweight(to_tsvector('english', coalesce(NEW.genre, '')),      'B') ||
    setweight(to_tsvector('english', coalesce(NEW.bio, '')),        'C') ||
    setweight(to_tsvector('english', coalesce(NEW.notes, '')),      'D');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER trig_artists_search BEFORE INSERT OR UPDATE ON artists
  FOR EACH ROW EXECUTE FUNCTION artists_search_trigger();

-- ============================================
-- 3. PROJECTS
-- ============================================
CREATE TABLE projects (
    id                     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title                  VARCHAR(255) NOT NULL,
    description            TEXT,
    artist_id              UUID REFERENCES artists(id) ON DELETE SET NULL,
    status                 project_status NOT NULL DEFAULT 'draft',
    start_date             DATE,
    target_completion_date DATE,
    is_deleted             BOOLEAN NOT NULL DEFAULT false,
    deleted_at             TIMESTAMPTZ,
    updated_by             UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    search_vector          tsvector
);
CREATE INDEX idx_projects_status    ON projects(status) WHERE NOT is_deleted;
CREATE INDEX idx_projects_artist_id ON projects(artist_id);
CREATE INDEX idx_projects_search    ON projects USING GIN(search_vector);
CREATE INDEX idx_projects_deleted   ON projects(is_deleted);

CREATE OR REPLACE FUNCTION projects_search_trigger() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', coalesce(NEW.title, '')),       'A') ||
    setweight(to_tsvector('english', coalesce(NEW.description, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW.status::text, '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER trig_projects_search BEFORE INSERT OR UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION projects_search_trigger();

-- ============================================
-- 4. PROJECT COLLABORATORS
-- ============================================
CREATE TABLE project_collaborators (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id       UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    artist_id        UUID NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
    role_description VARCHAR(255),
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(project_id, artist_id)
);
CREATE INDEX idx_collabs_project ON project_collaborators(project_id);
CREATE INDEX idx_collabs_artist  ON project_collaborators(artist_id);

-- ============================================
-- 5. SUBSCRIPTION TIERS (Pass)
-- ============================================
CREATE TABLE subscription_tiers (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name          VARCHAR(100) NOT NULL,
    description   TEXT,
    access_level  INTEGER NOT NULL CHECK (access_level BETWEEN 1 AND 5),
    features      JSONB DEFAULT '[]'::jsonb,
    price_monthly DECIMAL(10,2) DEFAULT 0,
    is_active     BOOLEAN NOT NULL DEFAULT true,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- 6. ARTIST SUBSCRIPTIONS (Pass)
-- ============================================
CREATE TABLE artist_subscriptions (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    artist_id  UUID NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
    tier_id    UUID NOT NULL REFERENCES subscription_tiers(id) ON DELETE RESTRICT,
    status     subscription_st NOT NULL DEFAULT 'active',
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    end_date   DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_subs_artist ON artist_subscriptions(artist_id);
CREATE INDEX idx_subs_tier   ON artist_subscriptions(tier_id);
CREATE INDEX idx_subs_status ON artist_subscriptions(status);

-- ============================================
-- 7. ASSETS (Port)
-- ============================================
CREATE TABLE assets (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title            VARCHAR(255) NOT NULL,
    file_type        asset_file_type NOT NULL,
    file_name        VARCHAR(255),
    storage_key      VARCHAR(500),
    genre            VARCHAR(100),
    bpm              INTEGER,
    key_signature    VARCHAR(10),
    duration_seconds INTEGER,
    artist_id        UUID REFERENCES artists(id) ON DELETE SET NULL,
    project_id       UUID REFERENCES projects(id) ON DELETE SET NULL,
    external_url     VARCHAR(1000),
    notes            TEXT,
    is_deleted       BOOLEAN NOT NULL DEFAULT false,
    deleted_at       TIMESTAMPTZ,
    updated_by       UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_assets_artist    ON assets(artist_id)  WHERE NOT is_deleted;
CREATE INDEX idx_assets_project   ON assets(project_id);
CREATE INDEX idx_assets_file_type ON assets(file_type)  WHERE NOT is_deleted;
CREATE INDEX idx_assets_genre     ON assets(genre)      WHERE NOT is_deleted;
CREATE INDEX idx_assets_deleted   ON assets(is_deleted);

-- ============================================
-- 8. ASSET TAGS (Port)
-- ============================================
CREATE TABLE asset_tags (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    asset_id   UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    tag        VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(asset_id, tag)
);
CREATE INDEX idx_tags_asset ON asset_tags(asset_id);
CREATE INDEX idx_tags_tag   ON asset_tags(tag);

-- ============================================
-- 9. PLACEMENTS (Port)
-- ============================================
CREATE TABLE placements (
    id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    asset_id       UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    placement_type placement_type NOT NULL,
    status         placement_status NOT NULL DEFAULT 'pending',
    placed_with    VARCHAR(255),
    placement_date DATE,
    expected_value DECIMAL(12,2) DEFAULT 0,
    notes          TEXT,
    is_deleted     BOOLEAN NOT NULL DEFAULT false,
    deleted_at     TIMESTAMPTZ,
    updated_by     UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_place_asset   ON placements(asset_id)  WHERE NOT is_deleted;
CREATE INDEX idx_place_status  ON placements(status)    WHERE NOT is_deleted;
CREATE INDEX idx_place_type    ON placements(placement_type);
CREATE INDEX idx_place_deleted ON placements(is_deleted);

-- ============================================
-- 10. OWNERSHIP RECORDS (Port)
-- ============================================
CREATE TABLE ownership_records (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    asset_id        UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    owner_name      VARCHAR(255) NOT NULL,
    ownership_type  ownership_type NOT NULL,
    percentage      DECIMAL(5,2) NOT NULL CHECK (percentage >= 0 AND percentage <= 100),
    pro_affiliation VARCHAR(100),
    ipi_number      VARCHAR(50),
    notes           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(asset_id, owner_name, ownership_type)
);
CREATE INDEX idx_own_asset ON ownership_records(asset_id);
CREATE INDEX idx_own_type  ON ownership_records(ownership_type);

-- ============================================
-- 11. USAGE RECORDS (Port)
-- ============================================
CREATE TABLE usage_records (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    asset_id      UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    usage_type    usage_type NOT NULL,
    platform      VARCHAR(100),
    date_recorded DATE NOT NULL DEFAULT CURRENT_DATE,
    count         INTEGER NOT NULL DEFAULT 0,
    revenue       DECIMAL(12,2) DEFAULT 0,
    notes         TEXT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_usage_asset ON usage_records(asset_id);
CREATE INDEX idx_usage_type  ON usage_records(usage_type);
CREATE INDEX idx_usage_date  ON usage_records(date_recorded);

-- ============================================
-- 12. REVENUE EVENTS (KPI)
-- ============================================
CREATE TABLE revenue_events (
    id                           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    artist_id                    UUID NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
    asset_id                     UUID REFERENCES assets(id) ON DELETE SET NULL,
    placement_id                 UUID REFERENCES placements(id) ON DELETE SET NULL,
    amount                       DECIMAL(12,2) NOT NULL DEFAULT 0,
    amount_applied_to_recoupment DECIMAL(12,2) NOT NULL DEFAULT 0,
    source                       VARCHAR(255),
    description                  TEXT,
    event_date                   DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at                   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_rev_artist ON revenue_events(artist_id);
CREATE INDEX idx_rev_date   ON revenue_events(event_date);

-- ============================================
-- 13. RECOUPABLE EXPENSES (KPI)
-- ============================================
CREATE TABLE recoupable_expenses (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    artist_id    UUID NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
    category     expense_category NOT NULL,
    amount       DECIMAL(12,2) NOT NULL DEFAULT 0,
    description  TEXT,
    expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_exp_artist ON recoupable_expenses(artist_id);

-- ============================================
-- 14. TASKS
-- ============================================
CREATE TABLE tasks (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title               VARCHAR(255) NOT NULL,
    description         TEXT,
    status              task_status NOT NULL DEFAULT 'open',
    priority            task_priority NOT NULL DEFAULT 'medium',
    due_date            DATE,
    assigned_to         UUID REFERENCES users(id) ON DELETE SET NULL,
    related_entity_type VARCHAR(50),
    related_entity_id   UUID,
    artist_id           UUID REFERENCES artists(id) ON DELETE SET NULL,
    created_by          UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_tasks_assigned ON tasks(assigned_to);
CREATE INDEX idx_tasks_status   ON tasks(status);
CREATE INDEX idx_tasks_artist   ON tasks(artist_id);
CREATE INDEX idx_tasks_due      ON tasks(due_date);

-- ============================================
-- 15. ACTIVITY FEED
-- ============================================
CREATE TABLE activity_feed (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_type    VARCHAR(50) NOT NULL,
    actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    entity_type   VARCHAR(50) NOT NULL,
    entity_id     UUID NOT NULL,
    summary       TEXT NOT NULL,
    metadata      JSONB DEFAULT '{}'::jsonb,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_activity_entity  ON activity_feed(entity_type, entity_id);
CREATE INDEX idx_activity_actor   ON activity_feed(actor_user_id);
CREATE INDEX idx_activity_created ON activity_feed(created_at DESC);

-- ============================================
-- 16. CONTACTS
-- ============================================
CREATE TABLE contacts (
    id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name                  VARCHAR(255) NOT NULL,
    organization          VARCHAR(255),
    role                  VARCHAR(100),
    email                 VARCHAR(255),
    phone                 VARCHAR(50),
    notes                 TEXT,
    tags                  TEXT[] DEFAULT '{}',
    relationship_strength INTEGER CHECK (relationship_strength BETWEEN 1 AND 5),
    created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_contacts_org ON contacts(organization);

-- ============================================
-- 17. ACTIVITY REACTIONS (Panel — activity feed)
-- ============================================
CREATE TYPE reaction_type AS ENUM ('thumbs_up', 'eyes', 'check', 'alert');

CREATE TABLE activity_reactions (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    activity_id   UUID NOT NULL REFERENCES activity_feed(id) ON DELETE CASCADE,
    user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reaction      reaction_type NOT NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(activity_id, user_id, reaction)
);
CREATE INDEX idx_reactions_activity ON activity_reactions(activity_id);

-- ============================================
-- 18. ACTIVITY COMMENTS (Panel — threading)
-- ============================================
CREATE TABLE activity_comments (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    activity_id   UUID NOT NULL REFERENCES activity_feed(id) ON DELETE CASCADE,
    user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    body          TEXT NOT NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_comments_activity ON activity_comments(activity_id);

-- ============================================
-- 19. AUDIT LOG (Pass — tier changes)
-- ============================================
CREATE TABLE audit_log (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id       UUID REFERENCES users(id) ON DELETE SET NULL,
    action        VARCHAR(100) NOT NULL,
    entity_type   VARCHAR(50) NOT NULL,
    entity_id     UUID,
    details       JSONB DEFAULT '{}'::jsonb,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_audit_entity ON audit_log(entity_type, entity_id);
CREATE INDEX idx_audit_user   ON audit_log(user_id);
CREATE INDEX idx_audit_date   ON audit_log(created_at DESC);

-- ============================================
-- 20. TEMPLATES (Port — SOP library)
-- ============================================
CREATE TABLE templates (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title             VARCHAR(255) NOT NULL,
    category          VARCHAR(100) NOT NULL,
    body              TEXT NOT NULL,
    source_url        VARCHAR(1000),
    last_verified_at  TIMESTAMPTZ,
    verification_status VARCHAR(50) DEFAULT 'unverified',
    created_by        UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_templates_category ON templates(category);

-- ============================================
-- 21. ASSET VERSIONS (Port — provenance)
-- ============================================
CREATE TABLE asset_versions (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    asset_id          UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    version_number    INTEGER NOT NULL DEFAULT 1,
    title             VARCHAR(255),
    file_name         VARCHAR(255),
    storage_key       VARCHAR(500),
    status            VARCHAR(50) DEFAULT 'draft',
    notes             TEXT,
    uploaded_by       UUID REFERENCES users(id) ON DELETE SET NULL,
    parent_version_id UUID REFERENCES asset_versions(id),
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_asset_ver_asset  ON asset_versions(asset_id);
CREATE INDEX idx_asset_ver_parent ON asset_versions(parent_version_id);

-- ============================================
-- 22. ENTITY COMMENTS (Collaboration)
-- ============================================
CREATE TABLE entity_comments (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_type   VARCHAR(50) NOT NULL,
    entity_id     UUID NOT NULL,
    user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    body          TEXT NOT NULL,
    mentions      UUID[] DEFAULT '{}',
    timestamp_ref DECIMAL(10,2),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_ecomments_entity ON entity_comments(entity_type, entity_id);
CREATE INDEX idx_ecomments_user   ON entity_comments(user_id);

-- ============================================
-- UPDATED_AT TRIGGERS
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_ts      BEFORE UPDATE ON users               FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_artists_ts    BEFORE UPDATE ON artists             FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_projects_ts   BEFORE UPDATE ON projects            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_collabs_ts    BEFORE UPDATE ON project_collaborators FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tiers_ts      BEFORE UPDATE ON subscription_tiers  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_subs_ts       BEFORE UPDATE ON artist_subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_assets_ts     BEFORE UPDATE ON assets              FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_place_ts      BEFORE UPDATE ON placements          FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_own_ts        BEFORE UPDATE ON ownership_records   FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_usage_ts      BEFORE UPDATE ON usage_records       FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tasks_ts      BEFORE UPDATE ON tasks               FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_contacts_ts   BEFORE UPDATE ON contacts            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_comments_ts  BEFORE UPDATE ON activity_comments   FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_templates_ts BEFORE UPDATE ON templates           FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
