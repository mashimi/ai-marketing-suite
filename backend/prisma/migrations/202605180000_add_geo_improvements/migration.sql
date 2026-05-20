-- Add new GEO models for citation tracking, entity analysis, A/B testing, and review queue

-- Citation sources - tracks which domains AI engines actually cite
CREATE TABLE "geo_citation_sources" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    "project_id" TEXT NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
    "platform" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "cited_url" TEXT NOT NULL,
    "cited_domain" TEXT NOT NULL,
    "snippet" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "citation_count" INTEGER NOT NULL DEFAULT 1,
    "last_seen_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_citation_sources_project ON "geo_citation_sources"("project_id", "platform", "query");
CREATE INDEX idx_citation_sources_domain ON "geo_citation_sources"("project_id", "cited_domain");

-- Query clusters - groups semantically similar queries
CREATE TABLE "geo_query_clusters" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    "project_id" TEXT NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
    "cluster_name" TEXT NOT NULL,
    "queries" TEXT[] NOT NULL DEFAULT '{}',
    "topic_category" TEXT,
    "avg_position" DOUBLE PRECISION DEFAULT 0,
    "citation_rate" DOUBLE PRECISION DEFAULT 0,
    "content_gap_score" INTEGER DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_query_clusters_project ON "geo_query_clusters"("project_id");

-- Entity coverage - tracks entity coverage vs competitors
CREATE TABLE "geo_entity_coverage" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    "project_id" TEXT NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
    "entity_name" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL DEFAULT 'general',
    "our_coverage" DOUBLE PRECISION DEFAULT 0,
    "competitor_avg_coverage" DOUBLE PRECISION DEFAULT 0,
    "semantic_relevance" DOUBLE PRECISION DEFAULT 0,
    "implicit_questions" TEXT[] DEFAULT '{}',
    "last_scraped_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_entity_coverage_project ON "geo_entity_coverage"("project_id", "entity_type");

-- A/B test tracking
CREATE TABLE "geo_ab_tests" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    "project_id" TEXT NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
    "content_id" TEXT REFERENCES "content_pieces"("id") ON DELETE SET NULL,
    "query" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'running',
    "started_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "completed_at" TIMESTAMPTZ,
    "winner_variant_id" TEXT,
    "conclusion" TEXT
);

CREATE INDEX idx_ab_tests_project ON "geo_ab_tests"("project_id", "status");

CREATE TABLE "geo_ab_test_variants" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    "test_id" TEXT NOT NULL REFERENCES "geo_ab_tests"("id") ON DELETE CASCADE,
    "variant_name" TEXT NOT NULL,
    "original_content" TEXT NOT NULL,
    "optimized_content" TEXT NOT NULL,
    "changes_applied" JSONB NOT NULL DEFAULT '{}',
    "current_position" INTEGER,
    "baseline_position" INTEGER,
    "citation_rate" DOUBLE PRECISION DEFAULT 0,
    "baseline_citation_rate" DOUBLE PRECISION DEFAULT 0,
    "traffic_change" INTEGER DEFAULT 0,
    "statistical_significance" DOUBLE PRECISION DEFAULT 0
);

CREATE INDEX idx_ab_test_variants_test ON "geo_ab_test_variants"("test_id");

-- Review queue for auto-optimize approvals
CREATE TABLE "geo_review_queue" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    "project_id" TEXT NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
    "content_id" TEXT REFERENCES "content_pieces"("id") ON DELETE SET NULL,
    "query" TEXT NOT NULL,
    "original_content" TEXT NOT NULL,
    "optimized_content" TEXT NOT NULL,
    "changes_summary" JSONB NOT NULL DEFAULT '{}',
    "severity" TEXT NOT NULL DEFAULT 'medium',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "auto_applied" BOOLEAN NOT NULL DEFAULT false,
    "reviewed_by" TEXT REFERENCES "users"("id") ON DELETE SET NULL,
    "reviewed_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_review_queue_project ON "geo_review_queue"("project_id", "status");

-- Extend GEOOptimization with traffic and variant tracking
ALTER TABLE "geo_optimizations" ADD COLUMN IF NOT EXISTS "traffic_before" INTEGER;
ALTER TABLE "geo_optimizations" ADD COLUMN IF NOT EXISTS "traffic_after" INTEGER;
ALTER TABLE "geo_optimizations" ADD COLUMN IF NOT EXISTS "citation_rate" DOUBLE PRECISION;
ALTER TABLE "geo_optimizations" ADD COLUMN IF NOT EXISTS "variant_id" TEXT;
ALTER TABLE "geo_optimizations" ADD COLUMN IF NOT EXISTS "brand_voice_profile" JSONB;

-- GEOCompetitorMonitor - track competitor citations
CREATE TABLE "geo_competitor_citations" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    "project_id" TEXT NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
    "competitor_domain" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "cited_url" TEXT NOT NULL,
    "snippet" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "first_seen_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "last_seen_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "citation_count" INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX idx_competitor_citations_project ON "geo_competitor_citations"("project_id", "platform", "query");