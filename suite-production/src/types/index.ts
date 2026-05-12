export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  role: 'admin' | 'member' | 'viewer';
  plan: 'free' | 'pro' | 'enterprise';
  createdAt: string;
}

export interface Project {
  id: string;
  name: string;
  url: string;
  description?: string;
  status: 'active' | 'paused' | 'archived';
  createdAt: string;
  updatedAt: string;
  metrics: ProjectMetrics;
}

export interface ProjectMetrics {
  totalTraffic: number;
  organicTraffic: number;
  backlinks: number;
  domainAuthority: number;
  pageAuthority: number;
  keywordRankings: number;
  socialEngagement: number;
  conversionRate: number;
}

export interface Agent {
  id: string;
  name: string;
  type: AgentType;
  status: 'idle' | 'running' | 'completed' | 'error' | 'paused';
  description: string;
  icon: string;
  lastRun?: string;
  nextRun?: string;
  frequency: 'manual' | 'hourly' | 'daily' | 'weekly';
  projectId: string;
  config: AgentConfig;
  results: AgentResult[];
  metrics: AgentMetrics;
}

export type AgentType = 
  | 'seo-audit'
  | 'geo-optimization'
  | 'content-writer'
  | 'reddit-monitor'
  | 'hackernews-monitor'
  | 'twitter-monitor'
  | 'linkedin-monitor'
  | 'competitor-analysis'
  | 'keyword-research'
  | 'backlink-builder'
  | 'technical-seo'
  | 'content-optimizer';

export interface AgentConfig {
  [key: string]: unknown;
}

export interface AgentResult {
  id: string;
  timestamp: string;
  type: string;
  data: Record<string, unknown>;
  status: 'success' | 'warning' | 'error';
}

export interface AgentMetrics {
  tasksCompleted: number;
  successRate: number;
  avgExecutionTime: number;
  impactScore: number;
}

export interface SEOAudit {
  id: string;
  projectId: string;
  timestamp: string;
  overallScore: number;
  categories: AuditCategory[];
  issues: SEOIssue[];
  recommendations: SEORecommendation[];
  competitors: CompetitorData[];
}

export interface AuditCategory {
  name: string;
  score: number;
  weight: number;
  status: 'good' | 'warning' | 'critical';
}

export interface SEOIssue {
  id: string;
  category: string;
  severity: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  url?: string;
  fix?: string;
  impact: 'high' | 'medium' | 'low';
}

export interface SEORecommendation {
  id: string;
  priority: number;
  category: string;
  title: string;
  description: string;
  expectedImpact: string;
  difficulty: 'easy' | 'medium' | 'hard';
  estimatedTime: string;
}

export interface CompetitorData {
  domain: string;
  authority: number;
  backlinks: number;
  keywords: number;
  traffic: number;
  overlap: number;
}

export interface ContentPiece {
  id: string;
  projectId: string;
  title: string;
  type: 'blog' | 'social' | 'email' | 'landing' | 'ad';
  status: 'draft' | 'review' | 'approved' | 'published';
  content: string;
  seoScore: number;
  readabilityScore: number;
  keywords: string[];
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
  engagement?: ContentEngagement;
}

export interface ContentEngagement {
  views: number;
  clicks: number;
  shares: number;
  comments: number;
  avgTimeOnPage: number;
}

export interface SocialMonitor {
  id: string;
  platform: 'reddit' | 'hackernews' | 'twitter' | 'linkedin';
  projectId: string;
  keywords: string[];
  mentions: SocialMention[];
  trending: TrendingTopic[];
  sentiment: SentimentAnalysis;
}

export interface SocialMention {
  id: string;
  platform: string;
  url: string;
  title: string;
  content: string;
  author: string;
  upvotes: number;
  comments: number;
  sentiment: 'positive' | 'neutral' | 'negative';
  timestamp: string;
  relevance: number;
}

export interface TrendingTopic {
  topic: string;
  volume: number;
  growth: number;
  sentiment: number;
  relatedKeywords: string[];
}

export interface SentimentAnalysis {
  positive: number;
  neutral: number;
  negative: number;
  overall: number;
  trend: 'up' | 'down' | 'stable';
}

export interface KeywordData {
  keyword: string;
  volume: number;
  difficulty: number;
  cpc: number;
  currentPosition?: number;
  previousPosition?: number;
  trend: 'up' | 'down' | 'stable';
  intent: 'informational' | 'navigational' | 'transactional' | 'commercial';
  serpFeatures: string[];
}

export interface BacklinkData {
  domain: string;
  url: string;
  anchorText: string;
  authority: number;
  type: 'dofollow' | 'nofollow' | 'ugc' | 'sponsored';
  firstSeen: string;
  lastChecked: string;
  status: 'active' | 'lost' | 'broken';
}

export interface AnalyticsData {
  date: string;
  traffic: number;
  organic: number;
  direct: number;
  referral: number;
  social: number;
  conversions: number;
  revenue: number;
  bounceRate: number;
  avgSessionDuration: number;
}

export interface Notification {
  id: string;
  type: 'success' | 'warning' | 'error' | 'info';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  action?: {
    label: string;
    url: string;
  };
}

export interface Workflow {
  id: string;
  name: string;
  description: string;
  agents: string[];
  trigger: 'manual' | 'scheduled' | 'event';
  schedule?: string;
  status: 'active' | 'paused' | 'draft';
  lastRun?: string;
  nextRun?: string;
  runs: WorkflowRun[];
}

export interface WorkflowRun {
  id: string;
  status: 'running' | 'completed' | 'failed';
  startedAt: string;
  completedAt?: string;
  results: Record<string, unknown>;
}
