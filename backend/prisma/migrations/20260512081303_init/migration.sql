-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('admin', 'member', 'viewer');

-- CreateEnum
CREATE TYPE "Plan" AS ENUM ('free', 'pro', 'enterprise');

-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('active', 'paused', 'archived');

-- CreateEnum
CREATE TYPE "AgentType" AS ENUM ('seo_audit', 'geo_optimization', 'content_writer', 'reddit_monitor', 'hackernews_monitor', 'twitter_monitor', 'linkedin_monitor', 'competitor_analysis', 'keyword_research', 'backlink_builder', 'technical_seo', 'content_optimizer');

-- CreateEnum
CREATE TYPE "AgentStatus" AS ENUM ('idle', 'running', 'completed', 'error', 'paused');

-- CreateEnum
CREATE TYPE "Frequency" AS ENUM ('manual', 'hourly', 'daily', 'weekly');

-- CreateEnum
CREATE TYPE "AgentResultStatus" AS ENUM ('success', 'warning', 'error');

-- CreateEnum
CREATE TYPE "ContentType" AS ENUM ('blog', 'social', 'email', 'landing', 'ad');

-- CreateEnum
CREATE TYPE "ContentStatus" AS ENUM ('draft', 'review', 'approved', 'published');

-- CreateEnum
CREATE TYPE "Trend" AS ENUM ('up', 'down', 'stable');

-- CreateEnum
CREATE TYPE "SearchIntent" AS ENUM ('informational', 'navigational', 'transactional', 'commercial');

-- CreateEnum
CREATE TYPE "TriggerType" AS ENUM ('manual', 'scheduled', 'event');

-- CreateEnum
CREATE TYPE "WorkflowStatus" AS ENUM ('active', 'paused', 'draft');

-- CreateEnum
CREATE TYPE "WorkflowRunStatus" AS ENUM ('running', 'completed', 'failed');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('success', 'warning', 'error', 'info');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "avatar" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'member',
    "plan" "Plan" NOT NULL DEFAULT 'free',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "description" TEXT,
    "status" "ProjectStatus" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "user_id" TEXT NOT NULL,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agents" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "AgentType" NOT NULL,
    "status" "AgentStatus" NOT NULL DEFAULT 'idle',
    "description" TEXT NOT NULL,
    "icon" TEXT NOT NULL DEFAULT 'Sparkles',
    "last_run" TIMESTAMP(3),
    "next_run" TIMESTAMP(3),
    "frequency" "Frequency" NOT NULL DEFAULT 'manual',
    "config" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "project_id" TEXT NOT NULL,

    CONSTRAINT "agents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_results" (
    "id" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "type" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "status" "AgentResultStatus" NOT NULL DEFAULT 'success',
    "agent_id" TEXT NOT NULL,

    CONSTRAINT "agent_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_metrics" (
    "id" TEXT NOT NULL,
    "tasks_completed" INTEGER NOT NULL DEFAULT 0,
    "success_rate" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "avg_execution_time" INTEGER NOT NULL DEFAULT 0,
    "impact_score" INTEGER NOT NULL DEFAULT 0,
    "agent_id" TEXT NOT NULL,

    CONSTRAINT "agent_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seo_audits" (
    "id" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "overall_score" INTEGER NOT NULL,
    "categories" JSONB NOT NULL,
    "issues" JSONB NOT NULL,
    "recommendations" JSONB NOT NULL,
    "competitors" JSONB NOT NULL,
    "project_id" TEXT NOT NULL,

    CONSTRAINT "seo_audits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_pieces" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" "ContentType" NOT NULL,
    "status" "ContentStatus" NOT NULL DEFAULT 'draft',
    "content" TEXT NOT NULL,
    "seo_score" INTEGER,
    "readability_score" INTEGER,
    "keywords" TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "published_at" TIMESTAMP(3),
    "project_id" TEXT NOT NULL,

    CONSTRAINT "content_pieces_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_engagement" (
    "id" TEXT NOT NULL,
    "views" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "shares" INTEGER NOT NULL DEFAULT 0,
    "comments" INTEGER NOT NULL DEFAULT 0,
    "avg_time_on_page" INTEGER NOT NULL DEFAULT 0,
    "content_id" TEXT NOT NULL,

    CONSTRAINT "content_engagement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "social_monitors" (
    "id" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "keywords" TEXT[],
    "mentions" JSONB NOT NULL,
    "trending" JSONB NOT NULL,
    "sentiment" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "project_id" TEXT NOT NULL,

    CONSTRAINT "social_monitors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "keywords" (
    "id" TEXT NOT NULL,
    "keyword" TEXT NOT NULL,
    "volume" INTEGER NOT NULL,
    "difficulty" INTEGER NOT NULL,
    "cpc" DOUBLE PRECISION NOT NULL,
    "current_position" INTEGER,
    "previous_position" INTEGER,
    "trend" "Trend" NOT NULL DEFAULT 'stable',
    "intent" "SearchIntent" NOT NULL DEFAULT 'informational',
    "serp_features" TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "project_id" TEXT NOT NULL,

    CONSTRAINT "keywords_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analytics_data" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "traffic" INTEGER NOT NULL,
    "organic" INTEGER NOT NULL,
    "direct" INTEGER NOT NULL,
    "referral" INTEGER NOT NULL,
    "social" INTEGER NOT NULL,
    "conversions" INTEGER NOT NULL,
    "revenue" DOUBLE PRECISION NOT NULL,
    "bounce_rate" DOUBLE PRECISION NOT NULL,
    "avg_session_duration" DOUBLE PRECISION NOT NULL,
    "project_id" TEXT NOT NULL,

    CONSTRAINT "analytics_data_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflows" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "trigger" "TriggerType" NOT NULL DEFAULT 'manual',
    "schedule" TEXT,
    "status" "WorkflowStatus" NOT NULL DEFAULT 'draft',
    "last_run" TIMESTAMP(3),
    "next_run" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "project_id" TEXT NOT NULL,

    CONSTRAINT "workflows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_agents" (
    "workflow_id" TEXT NOT NULL,
    "agent_id" TEXT NOT NULL,

    CONSTRAINT "workflow_agents_pkey" PRIMARY KEY ("workflow_id","agent_id")
);

-- CreateTable
CREATE TABLE "workflow_runs" (
    "id" TEXT NOT NULL,
    "status" "WorkflowRunStatus" NOT NULL DEFAULT 'running',
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "results" JSONB,
    "error" TEXT,
    "workflow_id" TEXT NOT NULL,

    CONSTRAINT "workflow_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "action_url" TEXT,
    "action_label" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_id" TEXT NOT NULL,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "api_keys" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_id" TEXT NOT NULL,

    CONSTRAINT "api_keys_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "agent_metrics_agent_id_key" ON "agent_metrics"("agent_id");

-- CreateIndex
CREATE UNIQUE INDEX "content_engagement_content_id_key" ON "content_engagement"("content_id");

-- CreateIndex
CREATE UNIQUE INDEX "keywords_project_id_keyword_key" ON "keywords"("project_id", "keyword");

-- CreateIndex
CREATE UNIQUE INDEX "analytics_data_project_id_date_key" ON "analytics_data"("project_id", "date");

-- CreateIndex
CREATE UNIQUE INDEX "api_keys_key_key" ON "api_keys"("key");

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agents" ADD CONSTRAINT "agents_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_results" ADD CONSTRAINT "agent_results_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_metrics" ADD CONSTRAINT "agent_metrics_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seo_audits" ADD CONSTRAINT "seo_audits_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_pieces" ADD CONSTRAINT "content_pieces_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_engagement" ADD CONSTRAINT "content_engagement_content_id_fkey" FOREIGN KEY ("content_id") REFERENCES "content_pieces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social_monitors" ADD CONSTRAINT "social_monitors_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "keywords" ADD CONSTRAINT "keywords_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analytics_data" ADD CONSTRAINT "analytics_data_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflows" ADD CONSTRAINT "workflows_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_agents" ADD CONSTRAINT "workflow_agents_workflow_id_fkey" FOREIGN KEY ("workflow_id") REFERENCES "workflows"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_agents" ADD CONSTRAINT "workflow_agents_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_runs" ADD CONSTRAINT "workflow_runs_workflow_id_fkey" FOREIGN KEY ("workflow_id") REFERENCES "workflows"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
