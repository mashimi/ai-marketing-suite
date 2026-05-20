# AI Marketing Suite 🚀

A high-performance, enterprise-grade AI Marketing Automation platform. This suite integrates state-of-the-art AI agents with real-time analytics to automate SEO, content strategy, and social monitoring. Built with a robust event-driven architecture using React, Node.js, PostgreSQL (pgvector), and Redis.

## 📱 UI Preview

<div align="center">
  <img src="public/screenshots/workflow_builder.png" alt="Workflow Architect" width="800" />
  <p><em>Advanced Visual Workflow Architect: Orchestrate multi-agent autonomous pipelines with logic nodes and CMS integration.</em></p>
  
  <br />
  
  <img src="public/screenshots/seo_audit.png" alt="SEO Performance Lab" width="800" />
  <p><em>SEO Performance Lab: Real-time technical auditing with competitive intelligence and automated PDF report generation.</em></p>
</div>

## 🌟 Enterprise Features

The AI Marketing Suite moves beyond simple content generation. It provides a **synchronized ecosystem** where AI agents monitor the web, audit technical health, and execute marketing workflows autonomously.

- **Visual Workflow Orchestration**: Build complex agent pipelines using a drag-and-drop React Flow interface.
- **Multi-Model AI Routing**: Intelligent routing between OpenAI, DeepSeek, and local models with semantic caching and cost tracking.
- **Vector-Based Long Term Memory**: Agents utilize `pgvector` for persistent context and semantic retrieval across sessions.
- **Real-Time Event Bus**: Redis-backed event distribution system for bi-directional communication via WebSockets (Socket.io).
- **Automated Reporting Engine**: Puppeteer-driven PDF generation for professional, branded SEO audits and performance reports.
- **CMS Auto-Publishing**: Direct integration for publishing generated content to various platforms (WordPress, Webflow, etc.).

---

## 🛠️ Tech Stack & Architecture

### Frontend (Modern Client)
- **Framework**: [React 18](https://reactjs.org/) with [Vite](https://vitejs.dev/)
- **Visual Logic**: [React Flow](https://reactflow.dev/) for interactive workflow orchestration.
- **State Management**: [Zustand](https://github.com/pmndrs/zustand) with `persist` middleware.
- **Real-time**: [Socket.io Client](https://socket.io/) for live event updates and notifications.
- **Styling**: Vanilla CSS + [Tailwind CSS](https://tailwindcss.com/) with a custom Glassmorphic design system.
- **Motion UX**: [Framer Motion](https://www.framer.com/motion/) for fluid transitions.

### Backend (Production Grade)
- **Runtime**: [Node.js](https://nodejs.org/) with [TypeScript](https://www.typescriptlang.org/).
- **Database**: [PostgreSQL](https://www.postgresql.org/) with **pgvector** for semantic search.
- **ORM**: [Prisma](https://www.prisma.io/) for type-safe database access.
- **Messaging**: [Redis](https://redis.io/) Streams/PubSub for the distributed Event Bus.
- **Automation**: [Puppeteer](https://pptr.dev/) for high-fidelity PDF report generation.
- **AI Integration**: Custom **AI Router** with support for multi-provider streaming and caching.

---

## 🤖 AI Agent Ecosystem

| Agent Type | Capability | Use Case |
| :--- | :--- | :--- |
| **SEO Audit** | Deep technical crawl & score | Website health & optimization |
| **Workflow Architect**| Multi-step orchestration | Automating repetitive marketing tasks |
| **Content Strategist**| Long-form SEO blog generation | Content marketing at scale |
| **Social Lead Gen** | Reddit, HN, X tracking | Lead gen & brand sentiment |
| **Vector Memory** | Semantic retrieval of context | Persistent knowledge across agents |
| **Reporting Agent** | Automated PDF delivery | Stakeholder reporting & transparency |

---

## 🚀 Getting Started

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **PostgreSQL**: With `pgvector` extension enabled
- **Redis**: A running instance for Event Bus and Caching

### 1. Backend Setup
```bash
cd backend
npm install
cp .env.example .env  # Configure DATABASE_URL, REDIS_URL, and OPENAI_API_KEY
npx prisma generate
npx prisma migrate dev
npm run dev           # Runs on http://localhost:3002
```

### 2. Frontend Setup
```bash
# From root directory
npm install
npm run dev           # Runs on http://localhost:3000
```

---

## 📡 Advanced Architecture

### Real-Time Notification System
The suite features a persistent notification engine driven by the Redis Event Bus.
1. **Trigger**: An agent completes a task (e.g., SEO Audit finished).
2. **Event Bus**: The backend worker emits an event to the Redis stream.
3. **Socket.io**: The server broadcasts the event to the specific user's socket.
4. **Zustand**: The frontend store updates in real-time, triggering the notification bell and toast alerts.

### AI Routing & Semantic Cache
To optimize costs and latency, all AI requests pass through the `AIRouter`:
- **Caching**: Results are cached in Redis using semantic hashing.
- **Cost Tracking**: Every token usage is logged to PostgreSQL for enterprise billing/usage transparency.
- **Streaming**: Supports Server-Sent Events (SSE) for real-time content generation previews.

---

## 🎨 Design Philosophy

We adhere to a **Premium Enterprise Aesthetic**:
- **Glassmorphism**: Using `backdrop-blur` and sleek border gradients for depth.
- **Micro-animations**: Subtle hover effects and layout transitions for a "responsive" feel.
- **Dynamic Gauges**: Custom SVG-based visualizations for SEO scores and performance metrics.

---

## 📄 License
MIT License - Developed by Antigravity (DeepMind Advanced Agentic Coding).
