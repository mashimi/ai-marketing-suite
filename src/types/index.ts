export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  role: 'admin' | 'member' | 'viewer';
  plan: 'free' | 'pro' | 'enterprise' | 'starter';
  createdAt: string;
  wallet?: TokenWallet;
}

export interface TokenWallet {
  id: string;
  userId: string;
  balance: number;
  reserved: number;
  monthlyAllowance: number;
  lastReset: string;
}

export interface TokenTransaction {
  id: string;
  walletId: string;
  amount: number;
  type: 'CREDIT' | 'DEBIT';
  description: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface TokenPackage {
  id: string;
  name: string;
  description?: string;
  tokenAmount: number;
  priceUsd: number;
  stripePriceId: string;
  isActive: boolean;
}

export interface PlanDefinition {
  id: string;
  plan: 'free' | 'starter' | 'pro' | 'enterprise';
  name: string;
  description?: string;
  monthlyTokens: number;
  maxAgents: number;
  maxProjects: number;
  maxWorkflows: number;
  features: string[];
  stripePriceId: string;
  isActive: boolean;
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
  | 'content-optimizer'
  | 'tiktok-monitor'
  | 'tiktok-scriptwriter'
  | 'meta-ad-manager'
  | 'facebook-community'
  | 'whatsapp-concierge';

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
  status: 'draft' | 'review' | 'approved' | 'published' | 'scheduled';
  content: string;
  seoScore: number;
  readabilityScore: number;
  keywords: string[];
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
  scheduledDate?: string;
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
  platform: 'reddit' | 'hackernews' | 'twitter' | 'linkedin' | 'instagram';
  projectId: string;
  keywords: string[];
  hashtags?: string[];
  mentions: SocialMention[];
  trending: TrendingTopic[];
  sentiment: SentimentAnalysis;
  influencerMentions?: InfluencerMention[];
  competitorProfiles?: string[];
  lastSyncedAt?: string;
}

export interface InfluencerMention {
  username: string;
  followers: number;
  engagement_rate: number;
  mention_type: 'direct' | 'hashtag' | 'keyword';
  reach: number;
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

export interface Swarm {
  id: string;
  name: string;
  description: string;
  goal: string;
  status: SwarmStatus;
  strategy: SwarmStrategy;
  projectId: string;
  createdAt: string;
  updatedAt: string;
  members: SwarmMember[];
  sessions: SwarmSession[];
  _count?: {
    sessions: number;
  };
}

export interface SwarmMember {
  id: string;
  swarmId: string;
  agentId: string;
  agent: Agent;
  role: SwarmRole;
  order: number;
  canDelegate: boolean;
  config: Record<string, unknown>;
}

export interface SwarmSession {
  id: string;
  swarmId: string;
  status: SessionStatus;
  input: Record<string, unknown>;
  output?: Record<string, unknown>;
  startedAt: string;
  completedAt?: string;
  messages: SwarmMessage[];
  artifacts: SwarmArtifact[];
}

export interface SwarmMessage {
  id: string;
  sessionId: string;
  fromAgentId: string;
  toAgentId?: string;
  type: MessageType;
  content: string;
  payload: Record<string, unknown>;
  createdAt: string;
}

export interface SwarmArtifact {
  id: string;
  sessionId: string;
  agentId: string;
  type: string;
  name: string;
  content: Record<string, unknown>;
  approved: boolean;
  approvedBy?: string;
  createdAt: string;
}

export type SwarmStatus = 'idle' | 'running' | 'completed' | 'error' | 'paused';
export type SwarmStrategy = 'sequential' | 'parallel' | 'debate' | 'hierarchical';
export type SwarmRole = 'coordinator' | 'researcher' | 'executor' | 'critic' | 'optimizer';
export type SessionStatus = 'running' | 'synthesizing' | 'completed' | 'failed';
export type MessageType = 'task' | 'observation' | 'question' | 'critique' | 'consensus' | 'delegate';

export interface Competitor {
  id: string;
  domain: string;
  name?: string;
  logo?: string;
  description?: string;
  domainAuthority?: number;
  backlinks: number;
  organicKeywords: number;
  organicTraffic: number;
  contentPieces: number;
  strengths: string[];
  weaknesses: string[];
  opportunities: string[];
  threats: string[];
  techStack: string[];
  topTopics: string[];
  lastAnalyzedAt?: string;
  projectId: string;
  snapshots?: CompetitorSnapshot[];
  gaps?: CompetitorGap[];
  _count?: {
    snapshots: number;
    gaps: number;
  };
}

export interface CompetitorSnapshot {
  id: string;
  competitorId: string;
  capturedAt: string;
  domainAuthority?: number;
  backlinks: number;
  organicKeywords: number;
  organicTraffic: number;
  contentPieces: number;
}

export interface CompetitorGap {
  id: string;
  competitorId: string;
  type: 'keyword' | 'content' | 'backlink' | 'technical';
  priority: 'high' | 'medium' | 'low';
  status: 'identified' | 'analyzing' | 'resolved';
  theirAdvantage: string;
  theirExample?: string;
  ourState: string;
  action: string;
  estimatedImpact?: string;
  difficulty: 'easy' | 'moderate' | 'hard';
  createdAt: string;
}
