# AI Marketing Suite

A production-ready, enterprise-grade AI marketing automation platform built with React, TypeScript, and Tailwind CSS. This application provides a comprehensive suite of AI-powered marketing tools including SEO auditing, content generation, social media monitoring, keyword research, competitor analysis, and automated workflow orchestration.

## Features

### Dashboard
- Real-time traffic analytics with interactive charts
- Agent status monitoring
- Recent content and social mention tracking
- Key performance metrics with trend indicators

### AI Agents (12 Agent Types)
- **SEO Audit Agent** - Comprehensive website SEO analysis
- **GEO Optimization Agent** - Optimize for AI search engines (ChatGPT, Claude, Perplexity)
- **AI Content Writer** - Generate SEO-optimized blog posts and content
- **Reddit Monitor** - Track mentions and opportunities on Reddit
- **Hacker News Monitor** - Monitor HN discussions
- **X/Twitter Monitor** - Track mentions and trends
- **LinkedIn Monitor** - Monitor LinkedIn for B2B opportunities
- **Competitor Analysis** - Analyze competitor strategies
- **Keyword Research** - Discover high-value keywords
- **Backlink Builder** - Find and build quality backlinks
- **Technical SEO** - Fix technical SEO issues
- **Content Optimizer** - Optimize existing content

### SEO Audit
- Overall SEO score with category breakdowns
- Critical issues detection with severity levels
- Actionable recommendations with expected impact
- Competitor analysis comparison table

### Content Studio
- AI-powered content generation
- SEO and readability scoring
- Content status management (draft, review, published)
- Engagement metrics tracking

### Social Monitor
- Multi-platform monitoring (Reddit, HN, X, LinkedIn)
- Sentiment analysis with trend indicators
- Trending topics with growth metrics
- Mention tracking with relevance scoring

### Keyword Research
- Keyword tracking with position monitoring
- Search volume, difficulty, and CPC data
- Search intent classification
- SERP features detection

### Analytics
- Traffic trends with channel breakdown
- Conversion and revenue tracking
- Bounce rate and session duration metrics
- Interactive charts (Area, Bar, Pie)

### Workflows
- Multi-agent orchestration
- Scheduled and manual triggers
- Cron-based scheduling
- Run history and status tracking

### Settings
- Profile management
- Project management with metrics
- Notification preferences
- Integration management
- Billing and plan management

## Tech Stack

- **React 18** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **Zustand** - State management
- **TanStack Query** - Server state management
- **Recharts** - Data visualization
- **Framer Motion** - Animations
- **Lucide React** - Icons
- **Radix UI** - Headless UI primitives
- **React Hot Toast** - Notifications

## Project Structure

```
ai-marketing-suite/
├── public/
│   └── logo.svg
├── src/
│   ├── components/
│   │   ├── agents/
│   │   │   ├── AgentsPage.tsx
│   │   │   ├── SEOAuditPage.tsx
│   │   │   ├── ContentPage.tsx
│   │   │   ├── SocialPage.tsx
│   │   │   ├── KeywordsPage.tsx
│   │   │   └── WorkflowsPage.tsx
│   │   ├── dashboard/
│   │   │   ├── Dashboard.tsx
│   │   │   ├── AnalyticsPage.tsx
│   │   │   ├── TrafficChart.tsx
│   │   │   ├── AgentStatusCard.tsx
│   │   │   └── RecentActivity.tsx
│   │   ├── Layout.tsx
│   │   ├── Sidebar.tsx
│   │   ├── Header.tsx
│   │   ├── LoginPage.tsx
│   │   └── SettingsPage.tsx
│   ├── hooks/
│   ├── services/
│   │   ├── api.ts
│   │   └── mockData.ts
│   ├── store/
│   │   └── index.ts
│   ├── types/
│   │   └── index.ts
│   ├── utils/
│   │   ├── cn.ts
│   │   ├── format.ts
│   │   └── constants.ts
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.js
├── postcss.config.js
└── .eslintrc.cjs
```

## Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation

1. Install dependencies:
```bash
npm install
```

2. Create environment file:
```bash
cp .env.example .env
```

3. Start development server:
```bash
npm run dev
```

4. Open http://localhost:3000 in your browser

### Demo Credentials
Any email and password combination will work for the demo.

## Building for Production

```bash
npm run build
```

The built files will be in the `dist/` directory.

## Architecture

### State Management
- **Zustand** handles global client state (auth, UI, projects, agents)
- **TanStack Query** handles server state with caching, refetching, and mutations
- **Persist middleware** saves user preferences to localStorage

### API Layer
- Centralized API service in `services/api.ts`
- Mock data system for demo purposes
- Real API integration ready (set `USE_MOCK = false`)
- Axios interceptors for auth tokens and error handling

### Component Architecture
- Feature-based folder structure
- Reusable UI components with Radix UI primitives
- Custom hooks for data fetching and state
- Type-safe props with TypeScript interfaces

### Styling
- Tailwind CSS with custom design tokens
- CSS variables for theming (light/dark mode)
- Custom animations and transitions
- Responsive design patterns

## Key Design Decisions

1. **Mock Data First** - All features work with realistic mock data, making the app immediately demoable
2. **Production-Ready API Layer** - The API service is structured to easily swap mock data for real backend calls
3. **Type Safety** - Comprehensive TypeScript types for all data models
4. **Performance** - Code splitting, lazy loading, and optimized re-renders
5. **Accessibility** - Radix UI primitives ensure keyboard navigation and screen reader support

## Customization

### Adding New Agent Types
1. Add the agent configuration to `src/utils/constants.ts`
2. The UI will automatically pick it up in the agent creation modal

### Connecting to Real APIs
1. Set `USE_MOCK = false` in `src/services/api.ts`
2. Configure `VITE_API_URL` in your `.env` file
3. Implement the backend endpoints matching the API interfaces

### Theming
- Modify CSS variables in `src/index.css`
- Update Tailwind config for custom colors and animations

## License

MIT
